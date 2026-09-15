/**
 * Renderizador de los bloques de un instrumento de la valoración (un componente por
 * `Block["type"]`, ver `types.ts`). Todo corre sobre el `useForm()` del instrumento. El
 * modo solo lectura lo da un `<fieldset disabled>` alrededor de cada bloque, salvo los de
 * `SELF_READONLY`: esos tienen acciones que también usa quien solo lee (descargar, ver el
 * PDF, mostrar la clave) y deshabilitan sus propios campos.
 */

import { useState } from "react";
import { Controller, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Download, Eye, FileText, Loader2, Upload } from "lucide-react";

import { apiFetch, apiUrl, API_ENDPOINTS } from "@/utils/api";
import { fileRuleError } from "@/components/admisiones/admissionTypes";
import { SchemaSection } from "@/components/ui/fields/registry";
import type { FieldDescriptor, SectionValues } from "@/components/ui/fields/types";
import { FieldGrid } from "@/components/admisiones/formFields";
import {
  iconBtnClass,
  iconClass,
  iconHover,
  inputClass,
  labelClass,
  outlineBtnClass,
  textareaClass,
} from "@/components/ui/formStyles";
import {
  cardTitleClass,
  dataLabelClass,
  dataValueClass,
  itemTitleClass,
  metaTextClass,
  quoteClass,
} from "@/components/ui/textStyles";
import {
  SCORE_OPTIONS,
  scoreLabel,
  type ActivityDetail,
  type AnswerKey,
  type Block,
  type ExamResult,
  type ExamStructure,
} from "@/components/admisiones/valoracion/types";

/** Bloques que resuelven solos el modo solo lectura (ver cabecera). */
export const SELF_READONLY = new Set<Block["type"]>(["materials", "attachment", "exam_scoring"]);

export interface BlockProps {
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
  detail: ActivityDetail;
  canEdit: boolean;
  /** Clave del examen (solo docente asignado y rectora; la carga la página), si ya llegó. */
  answerKey: AnswerKey | null;
  onDetail: (detail: ActivityDetail) => void;
  flash: (type: "success" | "error", msg: string) => void;
}

const smallInputClass = `${inputClass} input-sm`;

/**
 * react-hook-form toma un segmento numérico de la ruta (`items.1`) como índice de un
 * arreglo. En el formulario las preguntas del examen van como `n1`, `n2`…; el servidor
 * las guarda por número. Estas dos funciones traducen en el borde (cargar / guardar).
 */
function mapExamItems(
  instrument: { blocks: Block[] },
  values: Record<string, unknown>,
  rename: (key: string) => string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const block of instrument.blocks) {
    if (block.type !== "exam_scoring") continue;
    const scoring = (values[block.id] as Record<string, unknown> | undefined) ?? {};
    const items = (scoring.items as Record<string, unknown> | undefined) ?? {};
    out[block.id] = {
      ...scoring,
      items: Object.fromEntries(Object.entries(items).map(([k, v]) => [rename(k), v])),
    };
  }
  return out;
}

export const toFormValues = (instrument: { blocks: Block[] }, values: Record<string, unknown>) =>
  mapExamItems(instrument, values, (k) => (k.startsWith("n") ? k : `n${k}`));

export const toServerValues = (instrument: { blocks: Block[] }, values: Record<string, unknown>) =>
  mapExamItems(instrument, values, (k) => k.replace(/^n/, ""));

/** Botones de opción única (escala 0–5, validez, concepto). */
function ChoicePills({
  name,
  control,
  options,
  ariaLabel,
}: {
  name: string;
  control: Control<SectionValues>;
  options: readonly { value: string; label: string; title?: string }[];
  ariaLabel: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field }) => (
        <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const active = field.value === o.value;
            return (
              <label
                key={o.value}
                title={o.title}
                className={`flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium tabular-nums transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200"
                }`}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={o.value}
                  checked={active}
                  onChange={() => field.onChange(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
    />
  );
}

function BlockTitle({ block }: { block: Block }) {
  if (!block.title) return null;
  return (
    <h4 className={`${cardTitleClass} mb-3`}>
      {block.title}
      {block.required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
    </h4>
  );
}

// ---------------------------------------------------------------------------

function NoticeBlock({ block }: { block: Extract<Block, { type: "notice" }> }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      {block.title && <p className="font-medium text-primary">{block.title}</p>}
      <p className="mt-1 text-base-content/80">{block.text}</p>
    </div>
  );
}

function RulesBlock({ block }: { block: Extract<Block, { type: "rules" }> }) {
  return (
    <div>
      <BlockTitle block={block} />
      <dl className="divide-y divide-base-200 rounded-lg border border-base-300">
        {block.items.map((r) => (
          <div key={r.moment} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-base-content">{r.moment}</dt>
            <dd className="text-sm text-base-content/70">{r.rule}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ContextBlock({ block, detail }: { block: Extract<Block, { type: "context" }>; detail: ActivityDetail }) {
  return (
    <div>
      <BlockTitle block={block} />
      <dl className="grid gap-4 rounded-lg bg-base-200 p-4 sm:grid-cols-2">
        {block.items.map((item) => (
          <div key={item.source}>
            <dt className={dataLabelClass}>{item.label}</dt>
            <dd className={dataValueClass}>{detail.context[item.source] || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FieldsBlock({ block, control, register, setValue }: BlockProps & { block: Extract<Block, { type: "fields" }> }) {
  return (
    <div>
      <BlockTitle block={{ ...block, required: false }} />
      <FieldGrid>
        <SchemaSection
          schema={block.fields as unknown as FieldDescriptor[]}
          control={control}
          register={register}
          setValue={setValue}
        />
      </FieldGrid>
    </div>
  );
}

function QuestionnaireBlock({ block, register }: BlockProps & { block: Extract<Block, { type: "questionnaire" }> }) {
  return (
    <div>
      <BlockTitle block={block} />
      <ol className="space-y-4">
        {block.items.map((item, i) => (
          <li key={item.id}>
            <label htmlFor={`q-${item.id}`} className="mb-1.5 flex gap-2 text-sm text-base-content">
              <span className="shrink-0 font-medium tabular-nums text-primary">{i + 1}.</span>
              <span>{item.text}</span>
            </label>
            <textarea
              id={`q-${item.id}`}
              rows={2}
              className={textareaClass}
              placeholder="Registro de la respuesta y observaciones"
              {...register(item.id)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScoredIndicatorsBlock({
  block,
  control,
  register,
  detail,
}: BlockProps & { block: Extract<Block, { type: "scored_indicators" }> }) {
  const scale = detail.package.scale;
  const options = SCORE_OPTIONS.map((v) => {
    const desc = scale.find((s) => s.code === (v === "NO" ? "N/O" : v));
    return { value: v, label: scoreLabel(v), title: desc ? `${desc.label}: ${desc.criterion}` : undefined };
  });
  return (
    <div>
      <BlockTitle block={block} />
      <ol className="space-y-3">
        {block.items.map((item, i) => (
          <li key={item.id} className="rounded-lg border border-base-300 p-4">
            {item.prompt && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                  {i + 1}. {item.moment}
                </p>
                <p className={`mt-1 ${quoteClass}`}>{item.prompt}</p>
                {item.evidence && <p className={`mt-1 ${metaTextClass}`}>Evidencia: {item.evidence}</p>}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={itemTitleClass}>
                {!item.prompt && <span className="mr-1 tabular-nums text-primary">{i + 1}.</span>}
                {item.text}
              </p>
              <ChoicePills
                name={`${block.id}.${item.id}.score`}
                control={control}
                options={options}
                ariaLabel={`Puntaje: ${item.text}`}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                aria-label={`Apoyo utilizado: ${item.text}`}
                className={smallInputClass}
                placeholder="Apoyo utilizado"
                {...register(`${block.id}.${item.id}.support`)}
              />
              <input
                aria-label={`Evidencia breve: ${item.text}`}
                className={smallInputClass}
                placeholder="Evidencia breve"
                {...register(`${block.id}.${item.id}.evidence`)}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SupportsBlock({ block, register }: BlockProps & { block: Extract<Block, { type: "supports" }> }) {
  return (
    <div>
      <BlockTitle block={block} />
      <div className="space-y-3">
        {block.categories.map((cat) => (
          <div key={cat.id} className="rounded-lg border border-base-300 p-4">
            <p className={itemTitleClass}>{cat.label}</p>
            <p className={metaTextClass}>{cat.examples}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["support", "Apoyo autorizado"],
                  ["moment", "Momento / ítems"],
                  ["effect", "Efecto observado"],
                ] as const
              ).map(([key, label]) => (
                <input
                  key={key}
                  aria-label={`${label}: ${cat.label}`}
                  className={smallInputClass}
                  placeholder={label}
                  {...register(`${block.id}.${cat.id}.${key}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidityBlock({ block, control, register, detail }: BlockProps & { block: Extract<Block, { type: "validity" }> }) {
  const options = detail.package.validity.map((v) => ({
    value: v.code,
    label: `${v.code} · ${v.label}`,
    title: v.use,
  }));
  return (
    <div>
      <BlockTitle block={block} />
      <ChoicePills name={`${block.id}.level`} control={control} options={options} ariaLabel={block.title ?? "Validez"} />
      <label htmlFor={`${block.id}-reason`} className={`${labelClass} mt-3`}>
        Fundamento
      </label>
      <textarea id={`${block.id}-reason`} rows={2} className={textareaClass} {...register(`${block.id}.reason`)} />
    </div>
  );
}

function ConsolidationGridBlock({
  block,
  control,
  register,
}: BlockProps & { block: Extract<Block, { type: "consolidation_grid" }> }) {
  return (
    <div>
      <BlockTitle block={block} />
      <div className="space-y-3">
        {block.dimensions.map((dim) => (
          <div key={dim.id} className="rounded-lg border border-base-300 p-4">
            <p className={itemTitleClass}>{dim.label}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <textarea
                aria-label={`Fortalezas o evidencias: ${dim.label}`}
                rows={2}
                className={textareaClass}
                placeholder="Fortalezas / evidencias"
                {...register(`${block.id}.${dim.id}.strengths`)}
              />
              <textarea
                aria-label={`Necesidades o apoyos: ${dim.label}`}
                rows={2}
                className={textareaClass}
                placeholder="Necesidades / apoyos"
                {...register(`${block.id}.${dim.id}.needs`)}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm text-base-content/70">Fuente:</span>
              <Controller
                name={`${block.id}.${dim.id}.sources`}
                control={control}
                render={({ field }) => {
                  const current: string[] = Array.isArray(field.value) ? field.value : [];
                  return (
                    <>
                      {block.sources.map((s) => (
                        <label key={s.value} className="flex cursor-pointer items-center gap-1.5 text-sm" title={s.label}>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary"
                            checked={current.includes(s.value)}
                            onChange={(e) =>
                              field.onChange(
                                e.target.checked ? [...current, s.value] : current.filter((v) => v !== s.value),
                              )
                            }
                          />
                          {s.value}
                        </label>
                      ))}
                    </>
                  );
                }}
              />
            </div>
            <input
              aria-label={`Qué verificar: ${dim.label}`}
              className={`${smallInputClass} mt-3`}
              placeholder="Qué falta verificar"
              {...register(`${block.id}.${dim.id}.verify`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptBlock({ block, control }: BlockProps & { block: Extract<Block, { type: "concept" }> }) {
  return (
    <div>
      <BlockTitle block={block} />
      <Controller
        name={block.id}
        control={control}
        defaultValue=""
        render={({ field }) => (
          <div role="radiogroup" aria-label="Categoría del concepto" className="grid gap-2">
            {block.options.map((o) => {
              const active = field.value === o.value;
              return (
                <label
                  key={o.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${
                    active ? "border-primary bg-primary/5" : "border-base-300 hover:bg-base-200/60"
                  }`}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={o.value}
                    checked={active}
                    onChange={() => field.onChange(o.value)}
                    className="radio radio-primary radio-sm mt-0.5"
                  />
                  <span>
                    <span className={`block ${itemTitleClass}`}>{o.label}</span>
                    <span className={`block ${metaTextClass}`}>{o.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Examen

/** Puntos de una pregunta con lo que hay en el formulario (`null` = sin calificar). La
 * pregunta de la rúbrica cuenta solo con todos sus criterios. */
function pointsOf(
  structure: ExamStructure,
  n: number,
  items: Record<string, unknown>,
  rubric: Record<string, unknown>,
): number | null {
  const num = (v: unknown) => (v === "" || v === undefined || v === null ? null : Number(v));
  if (n !== structure.rubric_item) return num(items[`n${n}`]);
  const values = structure.rubric.map((c) => num(rubric[c.id]));
  return values.some((v) => v === null) ? null : values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/**
 * Puntaje de una pregunta: botones de 0 al máximo ("Incorrecta"/"Correcta" si vale un
 * punto). Otro clic sobre el elegido lo borra (vuelve a "sin calificar").
 */
function ScorePills({
  name,
  control,
  max,
  disabled,
  ariaLabel,
}: {
  name: string;
  control: Control<SectionValues>;
  max: number;
  disabled: boolean;
  ariaLabel: string;
}) {
  const binary = max === 1;
  const options = binary
    ? [
        { value: 0, label: "Incorrecta", active: "border-error bg-error/10 text-error" },
        { value: 1, label: "Correcta", active: "border-success bg-success/10 text-success" },
      ]
    : Array.from({ length: max + 1 }, (_, i) => ({
        value: i,
        label: String(i),
        active: "border-primary bg-primary/10 text-primary",
      }));
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const current = field.value === "" || field.value == null ? null : Number(field.value);
        return (
          <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
            {options.map((o) => {
              const active = current === o.value;
              return (
                <label
                  key={o.value}
                  className={`flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium tabular-nums transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${
                    binary ? "min-w-24" : "min-w-10"
                  } ${
                    active
                      ? o.active
                      : `border-base-300 bg-base-100 text-base-content/70 ${disabled ? "" : "hover:bg-base-200"}`
                  } ${disabled ? "cursor-default" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={o.value}
                    checked={active}
                    disabled={disabled}
                    onChange={() => field.onChange(o.value)}
                    onClick={() => {
                      if (active) field.onChange("");
                    }}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        );
      }}
    />
  );
}

/** Número de la pregunta: relleno si ya está calificada. */
function ItemNumber({ n, graded }: { n: number; graded: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
        graded ? "bg-primary text-primary-content" : "border border-base-300 text-base-content/60"
      }`}
    >
      {n}
    </span>
  );
}

function ExamScoringBlock({
  block,
  control,
  detail,
  canEdit,
  answerKey,
}: BlockProps & { block: Extract<Block, { type: "exam_scoring" }> }) {
  const structure = detail.exam!.structure;
  const canViewKey = !!detail.exam?.can_view_key;
  const items = (useWatch({ control, name: `${block.id}.items` }) as Record<string, unknown>) ?? {};
  const rubric = (useWatch({ control, name: `${block.id}.rubric` }) as Record<string, unknown>) ?? {};

  const points = new Map(structure.items.map((i) => [i.n, pointsOf(structure, i.n, items, rubric)]));
  const graded = (n: number) => points.get(n) != null;
  const total = [...points.values()].reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const max = structure.items.reduce((acc, i) => acc + i.max, 0);
  const pending = structure.items.filter((i) => !graded(i.n)).map((i) => i.n);

  const goToPending = () => {
    const el = document.getElementById(`exam-item-${pending[0]}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  };

  const expected = (n: number) => (answerKey ? answerKey.items[String(n)] : undefined);
  const dictationRule = block.dictation_rule || answerKey?.dictation_rule;

  return (
    <div>
      <BlockTitle block={block} />
      <p className={`-mt-1 mb-3 ${metaTextClass}`}>
        {canEdit
          ? "Califica cada pregunta con la hoja de respuestas del aspirante; el total se calcula solo."
          : "Puntos registrados por el docente."}
        {canViewKey && !answerKey && " Cargando la clave…"}
      </p>

      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
        <span className="font-display text-2xl font-medium tabular-nums text-primary">
          {total}
          <span className="text-base text-base-content/60"> / {max}</span>
        </span>
        <span className={metaTextClass}>
          {structure.items.length - pending.length} de {structure.items.length} preguntas calificadas
        </span>
        {canEdit && pending.length > 0 && (
          <button type="button" onClick={goToPending} className={`${outlineBtnClass} btn-sm ml-auto`}>
            Ir a la pregunta {pending[0]}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {structure.subcomponents.map((sub) => {
          const done = sub.items.filter(graded).length;
          const score = sub.items.reduce((acc, n) => acc + (points.get(n) ?? 0), 0);
          return (
            <section key={sub.key} aria-labelledby={`sub-${sub.key}`}>
              <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h5 id={`sub-${sub.key}`} className={itemTitleClass}>
                  {sub.label}
                </h5>
                <span className={`tabular-nums ${metaTextClass}`}>
                  {done} de {sub.items.length} calificadas · {score} / {sub.max} puntos
                </span>
              </header>
              <ol className="divide-y divide-base-200 rounded-lg border border-base-300">
                {sub.items.map((n) => {
                  const item = structure.items.find((i) => i.n === n)!;
                  const answer = expected(n);

                  if (n === structure.rubric_item) {
                    return (
                      <li key={n} id={`exam-item-${n}`} className="px-4 py-3">
                        <div className="flex gap-3">
                          <ItemNumber n={n} graded={graded(n)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-base-content">{item.text}</p>
                            <p className={metaTextClass}>Se califica con la rúbrica de producción escrita.</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-3 sm:pl-10">
                          {structure.rubric.map((c) => (
                            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0 flex-1 basis-64">
                                <p className="text-sm font-medium text-base-content">{c.label}</p>
                                <p className={metaTextClass}>{c.descriptor}</p>
                              </div>
                              <ScorePills
                                name={`${block.id}.rubric.${c.id}`}
                                control={control}
                                max={c.max}
                                disabled={!canEdit}
                                ariaLabel={`Pregunta ${n}, ${c.label}: puntos de 0 a ${c.max}`}
                              />
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  }

                  const isDictation = sub.key === "dictado" && !!answerKey?.dictation_words.length;
                  return (
                    <li key={n} id={`exam-item-${n}`} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
                      <ItemNumber n={n} graded={graded(n)} />
                      <div className="min-w-0 flex-1 basis-64">
                        <p className="text-sm text-base-content">{item.text}</p>
                        {answer && !isDictation && (
                          <p className={`mt-1 ${metaTextClass}`}>
                            <span className="font-medium text-base-content/70">Respuesta esperada:</span> {answer}
                          </p>
                        )}
                        {isDictation && (
                          <div className="mt-2">
                            <ul className="flex flex-wrap gap-1.5" aria-label="Palabras del dictado">
                              {answerKey!.dictation_words.map((w) => (
                                <li key={w} className="rounded-md bg-base-200 px-2 py-0.5 text-sm text-base-content">
                                  {w}
                                </li>
                              ))}
                            </ul>
                            <p className={`mt-1 ${metaTextClass}`}>
                              Un punto por palabra escrita de forma reconocible.
                              {dictationRule && ` ${dictationRule}`}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <ScorePills
                          name={`${block.id}.items.n${n}`}
                          control={control}
                          max={item.max}
                          disabled={!canEdit}
                          ariaLabel={
                            item.max === 1
                              ? `Pregunta ${n}: correcta o incorrecta`
                              : `Pregunta ${n}: puntos de 0 a ${item.max}`
                          }
                        />
                        {item.max > 1 && <span className="text-xs text-base-content/60">/ {item.max}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ExamProfileBlock({ block, register, detail }: BlockProps & { block: Extract<Block, { type: "exam_profile" }> }) {
  const structure = detail.exam!.structure;
  const result = detail.exam!.result;
  return (
    <div>
      <BlockTitle block={block} />
      <ExamResultTable structure={structure} result={result} observation={(key) => (
        <input
          aria-label={`Observación: ${key}`}
          className={smallInputClass}
          placeholder="Observación"
          {...register(`${block.id}.observations.${key}`)}
        />
      )} />
      <p className={`mt-2 ${metaTextClass}`}>
        Los puntajes salen de la calificación guardada. {structure.bands_warning}
      </p>
    </div>
  );
}

/** Tabla del perfil (también la usa el consolidado, en solo lectura). */
export function ExamResultTable({
  structure,
  result,
  observation,
}: {
  structure: ExamStructure;
  result: ExamResult | null | undefined;
  observation?: (key: string) => React.ReactNode;
}) {
  const byKey = new Map(result?.subcomponents.map((s) => [s.key, s]) ?? []);
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-300 bg-base-200 text-left">
            <th className="px-3 py-2 font-medium text-base-content/70">Subcomponente</th>
            <th className="px-3 py-2 font-medium text-base-content/70">Ítems</th>
            <th className="px-3 py-2 font-medium text-base-content/70">Puntaje</th>
            {observation && <th className="px-3 py-2 font-medium text-base-content/70">Observación</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-base-200">
          {structure.subcomponents.map((sub) => {
            const s = byKey.get(sub.key);
            const range = sub.items.length > 1 ? `${sub.items[0]}–${sub.items[sub.items.length - 1]}` : String(sub.items[0]);
            return (
              <tr key={sub.key}>
                <td className="px-3 py-2">{sub.label}</td>
                <td className="px-3 py-2 tabular-nums text-base-content/60">{range}</td>
                <td className="px-3 py-2 tabular-nums">
                  {s ? `${s.score} / ${sub.max}` : `— / ${sub.max}`}
                  {s && !s.complete && <span className="ml-1 text-xs text-warning">(incompleto)</span>}
                </td>
                {observation && <td className="px-3 py-2">{observation(sub.key)}</td>}
              </tr>
            );
          })}
          <tr className="bg-base-200/60 font-medium">
            <td className="px-3 py-2">Total</td>
            <td />
            <td className="px-3 py-2 tabular-nums">{result ? `${result.total} / ${result.max}` : "—"}</td>
            {observation && (
              <td className="px-3 py-2 text-base-content/80">
                {result?.band ? `${result.band.age} años · ${result.band.range}: ${result.band.label}` : "Banda: con el examen completo"}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Material y adjunto

/** Descarga un archivo protegido (el enlace directo no lleva el token). */
async function downloadProtected(url: string, fallbackName: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("download");
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = match?.[1] ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function MaterialsBlock({ block, detail, flash }: BlockProps & { block: Extract<Block, { type: "materials" }> }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (detail.materials.length === 0) return null;
  const download = async (key: string, label: string) => {
    setBusy(key);
    try {
      await downloadProtected(API_ENDPOINTS.admissionsMaterial(detail.application.id, key), `${label}.docx`);
    } catch {
      flash("error", "No pudimos descargar el material.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div>
      <BlockTitle block={block} />
      <ul className="divide-y divide-base-200 rounded-lg border border-base-300">
        {detail.materials.map((m) => (
          <li key={m.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {m.label}
            </span>
            <button
              type="button"
              title="Descargar"
              aria-label={`Descargar ${m.label}`}
              onClick={() => download(m.key, m.label)}
              disabled={busy === m.key}
              className={`${iconBtnClass} ${iconHover.primary}`}
            >
              {busy === m.key ? <Loader2 className={`${iconClass} animate-spin`} /> : <Download className={iconClass} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttachmentBlock({
  block,
  detail,
  canEdit,
  onDetail,
  flash,
}: BlockProps & { block: Extract<Block, { type: "attachment" }> }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const rule = detail.attachment_rule;

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      // FormData: sin Content-Type manual; el Bearer lo pone el interceptor global.
      const res = await fetch(apiUrl(API_ENDPOINTS.admissionsExamAttachment(detail.application.id)), {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFile(null);
        onDetail(data as ActivityDetail);
        flash("success", "Hoja de respuestas guardada.");
      } else {
        flash("error", typeof data?.detail === "string" ? data.detail : "No pudimos subir el PDF.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <BlockTitle block={block} />
      {detail.has_attachment && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className={itemTitleClass}>{block.label}</span>
          </span>
          {detail.attachment_url && (
            <a
              href={detail.attachment_url}
              target="_blank"
              rel="noreferrer"
              title="Ver"
              aria-label={`Ver ${block.label}`}
              className={`${iconBtnClass} ${iconHover.primary}`}
            >
              <Eye className={iconClass} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="escaneo" className={labelClass}>
              {detail.has_attachment ? "Reemplazar la hoja de respuestas" : block.label}
            </label>
            <input
              id="escaneo"
              type="file"
              accept={rule?.accept ?? block.accept}
              aria-describedby={rule ? "escaneo-hint" : undefined}
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                const problem = picked ? fileRuleError(picked, rule) : null;
                if (problem) {
                  flash("error", problem);
                  e.target.value = "";
                  setFile(null);
                  return;
                }
                setFile(picked);
              }}
              className="file-input file-input-bordered w-full"
            />
            {rule && (
              <p id="escaneo-hint" className={`mt-1 ${metaTextClass}`}>
                {rule.hint}
              </p>
            )}
          </div>
          <button type="button" onClick={upload} disabled={!file || uploading} className={outlineBtnClass}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Subiendo…" : "Subir PDF"}
          </button>
        </div>
      )}
      {!detail.has_attachment && !canEdit && <p className={metaTextClass}>Sin cargar.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function BlockView(props: BlockProps & { block: Block }) {
  const { block } = props;
  switch (block.type) {
    case "notice":
      return <NoticeBlock block={block} />;
    case "rules":
      return <RulesBlock block={block} />;
    case "context":
      return <ContextBlock block={block} detail={props.detail} />;
    case "fields":
      return <FieldsBlock {...props} block={block} />;
    case "questionnaire":
      return <QuestionnaireBlock {...props} block={block} />;
    case "scored_indicators":
      return <ScoredIndicatorsBlock {...props} block={block} />;
    case "supports":
      return <SupportsBlock {...props} block={block} />;
    case "validity":
      return <ValidityBlock {...props} block={block} />;
    case "consolidation_grid":
      return <ConsolidationGridBlock {...props} block={block} />;
    case "concept":
      return <ConceptBlock {...props} block={block} />;
    case "exam_scoring":
      return <ExamScoringBlock {...props} block={block} />;
    case "exam_profile":
      return <ExamProfileBlock {...props} block={block} />;
    case "materials":
      return <MaterialsBlock {...props} block={block} />;
    case "attachment":
      return <AttachmentBlock {...props} block={block} />;
    default:
      return null;
  }
}

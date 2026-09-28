/** Representación recursiva del contrato jerárquico de GIMPA AVANZA. */
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Download, Eye, FileText, Info, Loader2, Upload } from "lucide-react";
import { apiFetch, apiUrl, API_ENDPOINTS } from "@/utils/api";
import { fileRuleError } from "@/components/admisiones/admissionTypes";
import { SchemaSection } from "@/components/ui/fields/registry";
import type { FieldDescriptor, SectionValues } from "@/components/ui/fields/types";
import { FieldGrid } from "@/components/admisiones/formFields";
import { iconBtnClass, iconClass, iconHover, inputClass, labelClass, outlineBtnClass, textareaClass } from "@/components/ui/formStyles";
import { cardTitleClass, dataLabelClass, dataValueClass, itemTitleClass, metaTextClass } from "@/components/ui/textStyles";
import { walkNodes, type ContentNode, type Instrument, type ActivityDetail, type AnswerKey, type ExamResult, type ExamStructure } from "./types";

interface BlockProps {
  control: Control<SectionValues>; register: UseFormRegister<SectionValues>; setValue: UseFormSetValue<SectionValues>;
  detail: ActivityDetail; canEdit: boolean; answerKey: AnswerKey | null;
  onDetail: (detail: ActivityDetail) => void; flash: (type: "success" | "error", msg: string) => void;
  onReference?: (id: string) => void;
}
const smallInputClass = `${inputClass} input-sm`;
function BlockTitle({ block }: { block: { title?: string; required?: boolean } }) {
  return block.title ? <h4 className={`${cardTitleClass} mb-3`}>{block.title}{block.required && <span className="ml-1 text-error">*</span>}</h4> : null;
}
export const SELF_READONLY = new Set(["materials", "attachment", "reference_image", "answer_guide"]);
/** Los identificadores semánticos no contienen segmentos numéricos ni puntos. */
export const toFormValues = (_instrument: Instrument, values: Record<string, unknown>) => structuredClone(values);
export const toServerValues = (_instrument: Instrument, values: Record<string, unknown>) => structuredClone(values);

function ProtectedImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null); setError(false);
    apiFetch(src).then(async (res) => {
      if (!res.ok) throw new Error("recurso");
      const blob = await res.blob();
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  return error ? <p role="alert" className="text-error">No pudimos cargar la lámina. Recarga para reintentar.</p> : url ?
    <img src={url} alt={alt} className="h-auto max-w-full rounded-lg" /> : <p className={metaTextClass}>Cargando lámina…</p>;
}

function Average({ node, control }: { node: ContentNode; control: Control<SectionValues> }) {
  const values = useWatch({ control });
  if (node.type !== "indicator_group" || !node.config?.average) return null;
  const cfg = node.config.average;
  const scores = [...walkNodes(node.children ?? [])].filter((n) => n.type === "indicator")
    .map((n) => (values[n.id] as { score?: string } | undefined)?.score)
    .filter((v): v is string => v !== undefined && v !== "" && !cfg.exclude.includes(v)).map(Number).filter(Number.isFinite);
  return <p className={metaTextClass}>Promedio excluyendo {cfg.exclude.join(", ")}: {scores.length ? `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(cfg.decimals)} / 5` : "sin evidencia"} · {scores.length} indicadores observados.</p>;
}

function LiveSubtotal({ node, control }: { node: ContentNode; control: Control<SectionValues> }) {
  const values = useWatch({ control });
  if ((node.type !== "question_group" && node.type !== "area") || node.config?.aggregation !== "sum") return null;
  const questions = [...walkNodes(node.children ?? [])].filter((n) => n.type === "question" && n.config?.scoring);
  let total = 0, maximum = 0, complete = 0;
  for (const q of questions) {
    if (q.type !== "question" || !q.config?.scoring) continue;
    const scoring = q.config.scoring;
    maximum += scoring.max ?? 0;
    const value = (values[q.id] ?? {}) as { score?: number | null; rubric?: Record<string, number | null> };
    const points = scoring.rubric ? scoring.rubric.map((c) => value.rubric?.[c.id]) : [value.score];
    if (points.every((v) => typeof v === "number" && Number.isFinite(v))) {
      total += points.reduce((sum, v) => sum + (v ?? 0), 0); complete++;
    }
  }
  return <p className={metaTextClass}>Subtotal del formulario: {total} / {maximum} · {complete} de {questions.length} preguntas calificadas. Se registra al guardar.</p>;
}

function ScoreInput({ name, label, max, step, control, canEdit }: {
  name: string; label: string; max: number; step: number; control: Control<SectionValues>; canEdit: boolean;
}) {
  return <Controller name={name} control={control} defaultValue={null} render={({ field }) => (
    <label className="flex flex-wrap items-center gap-3 text-sm">
      <span>{label} · máximo {max}</span>
      <input type="number" min={0} max={max} step={step} aria-label={label} disabled={!canEdit}
        value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
        onBlur={field.onBlur} ref={field.ref} className={`${smallInputClass} w-28`} />
    </label>
  )} />;
}

/** Las indicaciones siempre tienen un título, aunque el JSON no lo declare. */
export function InstructionNotice({ title = "Indicaciones", children }: { title?: string | null; children: ReactNode }) {
  return (
    <section className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">
        <h4 className={cardTitleClass}>{title || "Indicaciones"}</h4>
        <div className="text-sm text-base-content/80">{children}</div>
      </div>
    </section>
  );
}

/** Agrupa solo los datos consecutivos del expediente, conservando el orden del contenido. */
function NodeChildren({ nodes, ...props }: BlockProps & { nodes: ContentNode[] }) {
  const groups: ContentNode[][] = [];
  for (const node of nodes) {
    const last = groups.at(-1);
    if (node.type === "context_item" && last?.[0].type === "context_item") last.push(node);
    else groups.push([node]);
  }
  return (
    <div className="space-y-4">
      {groups.map((group) => group[0].type === "context_item" ? (
        <dl key={group[0].id} className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {group.map((node) => <NodeView key={node.id} {...props} node={node} />)}
        </dl>
      ) : <NodeView key={group[0].id} {...props} node={group[0]} />)}
    </div>
  );
}

/** Cada rama responde al type declarado; null conserva los hijos sin inventar controles. */
export function NodeView(props: BlockProps & { node: ContentNode }) {
  const { node, detail, register, control, setValue, answerKey, canEdit } = props;
  const children = node.children ?? [];
  const title = node.title ? <h4 className={`${cardTitleClass} mb-2`}>{node.title}</h4> : null;
  const descendants = <NodeChildren {...props} nodes={children} />;
  switch (node.type) {
    case "instrument": case "section": case "area": case "question_group": case "indicator_group": case "support_group": case "exam_profile":
      return <section id={node.id} className="space-y-3">
        {title}{node.content?.text && <p className="whitespace-pre-line text-sm text-base-content/80">{node.content.text}</p>}
        {node.config?.duration && <p className={metaTextClass}>Duración: {node.config.duration}</p>}
        {node.config?.expected_evidence && <p className={metaTextClass}>Evidencia esperada: {node.config.expected_evidence}</p>}
        {node.config?.criterion && <p className={metaTextClass}>Criterio: {node.config.criterion}</p>}
        {node.type === "exam_profile" && detail.exam?.structure && <ExamResultTable structure={detail.exam.structure} result={detail.exam.result} />}
        {descendants}<Average node={node} control={control} /><LiveSubtotal node={node} control={control} />
      </section>;
    case "notice":
      return node.content?.text ? <div id={node.id}>
        <InstructionNotice title={node.title}>
          <p className="whitespace-pre-line">{node.content.text}</p>
          {children.length > 0 && <div className="mt-3">{descendants}</div>}
        </InstructionNotice>
      </div> : children.length ? descendants : null;
    case "reference_text": case "reference_material":
      return node.content ? <div id={node.id} className="text-sm">
        {title}<p className="whitespace-pre-line text-base-content/80">{node.content.text}</p>{descendants}
      </div> : children.length ? descendants : null;
    case "reference_table":
      return node.content ? <div id={node.id}>{title}<div className="overflow-x-auto rounded-lg border border-base-300"><table className="w-full text-sm">
        <thead className="bg-base-200 text-left"><tr>{node.content.headers.map((h, i) => <th key={i} className="px-3 py-2" scope="col">{h}</th>)}</tr></thead>
        <tbody>{node.content.rows.map((r, i) => <tr key={i} className="border-t border-base-200">{r.map((c, j) => <td key={j} className="whitespace-pre-line px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody>
      </table></div></div> : null;
    case "reference_image":
      return node.content ? <figure id={node.id}>{title}<ProtectedImage src={node.content.src} alt={node.content.alt} /></figure> : null;
    case "context_item":
      return node.config ? <div id={node.id} className="min-w-0">
        <dt className={dataLabelClass}>{node.title}</dt>
        <dd className={`whitespace-pre-line ${dataValueClass}`}>{detail.context[node.config.source] || "—"}</dd>
        {children.length > 0 && descendants}
      </div> : null;
    case "field": {
      const cfg = node.config;
      if (!cfg) return null;
      const field = { name: node.id, label: node.title ?? "", type: cfg.input, required: cfg.required,
        options: cfg.options ?? undefined, full: cfg.layout.full, startsRow: cfg.layout.starts_row ?? undefined,
        placeholder: cfg.placeholder ?? undefined } as FieldDescriptor;
      return <FieldGrid><SchemaSection schema={[field]} control={control} register={register} setValue={setValue} /></FieldGrid>;
    }
    case "question": {
      const cfg = node.config;
      if (!cfg) return null;
      const expected = answerKey && detail.exam?.can_view_key ? [...walkNodes(answerKey.content)].find((n) => n.type === "expected_answer" && n.config?.question_id === node.id) : null;
      const scoring = cfg.scoring;
      return <div id={node.id} className="space-y-3 border-b border-base-200 pb-4">
        {title}{node.content && <p className="whitespace-pre-line text-sm">{node.content.text}</p>}
        {(cfg.reference_ids?.length ?? 0) > 0 && <div className="flex flex-wrap gap-3">{cfg.reference_ids?.map((id) => {
          const ref = [...walkNodes(detail.instruments)].find((n) => n.id === id);
          return <a key={id} href={`#${id}`} onClick={(event) => { if (props.onReference) { event.preventDefault(); props.onReference(id); } }} className="text-sm text-primary underline">{ref?.title ?? "Ver referencia"}</a>;
        })}</div>}
        {expected?.type === "expected_answer" && <p className="whitespace-pre-line rounded-lg bg-base-200 p-3 text-sm"><span className="font-medium">Respuesta esperada: </span>{expected.content?.text}</p>}
        {cfg.response && <label className="block text-sm">Registro de la respuesta<textarea className={`${textareaClass} mt-1`} rows={3} {...register(node.id)} /></label>}
        {scoring?.rubric ? scoring.rubric.map((c) => <div key={c.id} className="space-y-1">
          <ScoreInput name={`${node.id}.rubric.${c.id}`} label={c.label} max={c.max} step={c.step ?? 1} control={control} canEdit={canEdit} />
          <p className={metaTextClass}>{c.descriptor}</p>
        </div>) : scoring?.max != null && <ScoreInput name={`${node.id}.score`} label={`Puntaje: ${node.title}`} max={scoring.max} step={scoring.step ?? 1} control={control} canEdit={canEdit} />}
        {descendants}
      </div>;
    }
    case "indicator": {
      const cfg = node.config;
      if (!cfg) return null;
      const label = node.content?.text ?? node.title ?? node.id;
      const options = (detail.methodology.scale ?? []).map((s) => ({ value: s.code, label: s.code, title: `${s.label}: ${s.criterion}` }));
      return <div className="space-y-3 border-b border-base-200 pb-4"><p className={itemTitleClass}>{label}</p>
        <ChoicePills name={`${node.id}.score`} options={options} control={control} ariaLabel={`Puntaje: ${label}`} />
        <div className="grid gap-3 sm:grid-cols-2">
          {cfg.record.support && <input aria-label={`Apoyo utilizado: ${label}`} placeholder="Apoyo utilizado" className={smallInputClass} {...register(`${node.id}.support`)} />}
          {cfg.record.evidence && <input aria-label={`Evidencia: ${label}`} placeholder="Evidencia breve" className={smallInputClass} {...register(`${node.id}.evidence`)} />}
        </div>{descendants}
      </div>;
    }
    case "validity":
      return <section className="space-y-3">{title}<ChoicePills name={`${node.id}.level`} control={control}
        options={(detail.methodology.validity ?? []).map((v) => ({value: v.code, label: `${v.code} · ${v.label}`, title: v.use}))} ariaLabel={node.title ?? "Validez"} />{descendants}</section>;
    case "concept":
      return <div className="space-y-3">{title}<ChoicePills name={node.id} control={control}
        options={(node.config?.options ?? []).map((o) => ({value: o.value, label: o.label, title: o.description}))} ariaLabel="Concepto del Comité" />
        {(node.config?.options ?? []).map((o) => <p key={o.value} className={metaTextClass}><strong>{o.label}:</strong> {o.description}</p>)}{descendants}</div>;
    case "consolidation_dimension":
      return <div className="space-y-3 border-b border-base-200 pb-4">{title}<div className="grid gap-3 sm:grid-cols-2">
        {[["strengths", "Fortalezas / evidencias"], ["needs", "Necesidades / apoyos"], ["verify", "Qué falta verificar"]].map(([k, label]) => <label key={k} className="text-sm">{label}<textarea className={`${textareaClass} mt-1`} rows={2} {...register(`${node.id}.${k}`)} /></label>)}
      </div><Controller name={`${node.id}.sources`} control={control} render={({field}) => <div className="flex flex-wrap gap-3">{(node.config?.sources ?? []).map((s) => {
        const current: string[] = Array.isArray(field.value) ? field.value : [];
        return <label key={s.value} className="flex items-center gap-2 text-sm"><input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={current.includes(s.value)} onChange={(e) => field.onChange(e.target.checked ? [...current, s.value] : current.filter((v) => v !== s.value))} />{s.label}</label>;
      })}</div>} />{descendants}</div>;
    case "answer_guide":
      return <section>{title}{detail.exam?.can_view_key ? answerKey ? <div className="space-y-4">{answerKey.content.filter((n) => n.type !== "expected_answer").map((n) => <NodeView key={n.id} {...props} node={n} />)}</div> : <p className={metaTextClass}>Cargando guía…</p> : <p className={metaTextClass}>Guía reservada al docente asignado y a rectoría.</p>}</section>;
    case "expected_answer": return null;
    case "materials": return <MaterialsBlock {...props} block={{id: node.id, type: "materials", title: node.title ?? undefined}} />;
    case "attachment": return node.config ? <AttachmentBlock {...props} block={{id: node.id, type: "attachment", title: node.title ?? undefined, ...node.config}} /> : null;
    default: {
      const unknown: never = node;
      throw new Error(`Tipo de nodo desconocido: ${String(unknown)}`);
    }
  }
}
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

function MaterialsBlock({ block, detail, flash }: BlockProps & { block: { id: string; type: "materials"; title?: string } }) {
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
}: BlockProps & { block: { id: string; type: "attachment"; title?: string; label: string; accept: string; required: boolean } }) {
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

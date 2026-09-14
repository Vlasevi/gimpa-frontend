/**
 * Pestaña de Agenda + Evaluación (P10–P13) del panel de staff.
 *
 * Quien agenda fija fecha/hora/modalidad/enlace **y asigna un usuario** a cada entrevista
 * (se notifica al acudiente y al asignado). El **usuario asignado** —desde su propia
 * sesión— es el único que registra las respuestas del formulario (preguntas dinámicas del
 * esquema sembrado). Un usuario que no agenda solo ve las entrevistas que le asignaron.
 *
 * Paso 7 del refactor de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md): la parte de
 * REGISTRO (respuestas + concepto + observación) migra a react-hook-form, por consistencia
 * con el resto del módulo. La parte de AGENDAR/reprogramar (fecha/hora/modalidad/enlace +
 * `assigned_to`) se deja tal cual con `useState` — el plan no la pide explícitamente y
 * migrarla no aporta nada (no tiene lógica condicional ni campos dinámicos; es la que
 * asigna usuario, no la que llena preguntas), así que se prioriza no introducir riesgo.
 *
 * El formulario de registro usa un único `useForm()` cuyos valores están indexados por
 * `kind` (`{ [kind]: { answers, concept, general_note } }`), hidratado con `reset()` al
 * cargar. Cada entrevista tiene su propio botón "Guardar registro" — en vez de un submit
 * de formulario único, se lee el valor vigente de esa fila con `getValues(kind)` al pulsar
 * el botón (no se usa `watch()` en el render, para no perder el beneficio de RHF). El
 * payload enviado al backend no cambia.
 */

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import {
  Loader2,
  CalendarClock,
  Video,
  MapPin,
  Lock,
  CheckCircle2,
  ClipboardList,
  UserCheck,
} from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import type { SectionPermissions } from "@/components/Login/loginLogic";
import {
  inputClass,
  textareaClass,
  labelClass,
  adminPrimaryBtnClass,
  adminGhostBtnClass,
} from "@/components/ui/formStyles";
import { Select } from "@/components/ui/Select";
import type { FlashFn } from "@/components/admisiones/admin/adminTypes";

type QuestionType = "text" | "textarea" | "select" | "bool" | "scale";

interface Question {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
}

interface InterviewRow {
  kind: string;
  label: string;
  status: string;
  status_label: string;
  scheduled_at: string | null;
  modality: string;
  meeting_link: string;
  sensitivity: string;
  form?: { version: number; questions: Question[] };
  can_conduct?: boolean;
  assigned_to?: number | null;
  assigned_to_name?: string;
  answers?: Record<string, unknown>;
  concept?: string;
  concept_label?: string;
  general_note?: string;
  registered_at?: string | null;
  restricted?: boolean;
}

interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/** Valores del formulario de REGISTRO, indexados por `kind` (una entrevista por fila). */
interface RegisterFormValues {
  [kind: string]: {
    answers: Record<string, unknown>;
    concept: string;
    general_note: string;
  };
}

const CONCEPTS = [
  { value: "FAVORABLE", label: "Favorable" },
  { value: "FAVORABLE_CON_OBSERVACIONES", label: "Favorable con observaciones" },
  { value: "REQUIERE_COMITE", label: "Requiere comité" },
  { value: "DESFAVORABLE", label: "Desfavorable" },
];

// "Sin concepto" es una opción elegible: el concepto es opcional.
const CONCEPT_OPTIONS = [{ value: "", label: "Sin concepto" }, ...CONCEPTS];

const MODALITIES = [
  { value: "VIRTUAL", label: "Virtual (Teams)" },
  { value: "PRESENCIAL", label: "Presencial" },
];

// Preguntas opcionales del registro: "—" deja la respuesta vacía.
const BOOL_OPTIONS = [
  { value: "", label: "—" },
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

const SCALE_OPTIONS = [
  { value: "", label: "—" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export function InterviewsPanel({
  code,
  perms,
  flash,
  onChanged,
}: {
  code: string;
  perms: SectionPermissions;
  flash: FlashFn;
  onChanged: () => void;
}) {
  const canSchedule = Boolean(perms.canScheduleInterviews);

  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  // Agenda/reprogramación (no migra a RHF — ver comentario del archivo).
  const [sched, setSched] = useState<
    Record<
      string,
      { scheduled_at: string; modality: string; meeting_link: string; assigned_to: string }
    >
  >({});

  // Registro (respuestas + concepto + observación) — RHF.
  const { control, register, getValues, reset } = useForm<RegisterFormValues>({
    defaultValues: {},
  });

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsInterviews(code));
      if (!res.ok) return;
      const rows: InterviewRow[] = (await res.json()).interviews ?? [];
      setInterviews(rows);
      const s: typeof sched = {};
      const registerValues: RegisterFormValues = {};
      for (const row of rows) {
        s[row.kind] = {
          scheduled_at: toLocalInput(row.scheduled_at),
          modality: row.modality || "VIRTUAL",
          meeting_link: row.meeting_link || "",
          assigned_to: row.assigned_to ? String(row.assigned_to) : "",
        };
        registerValues[row.kind] = {
          answers: { ...(row.answers ?? {}) },
          concept: row.concept ?? "",
          general_note: row.general_note ?? "",
        };
      }
      setSched(s);
      reset(registerValues);
    } finally {
      setLoading(false);
    }
  }, [code, reset]);

  useEffect(() => {
    load();
  }, [load]);

  // Lista de usuarios asignables (solo para quien agenda).
  useEffect(() => {
    if (!canSchedule) return;
    apiFetch(API_ENDPOINTS.admissionsAssignableUsers)
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d) => setStaff(d.users ?? []))
      .catch(() => undefined);
  }, [canSchedule]);

  const post = async (
    path: string,
    body: unknown,
    pendingKey: string,
    successMsg: string,
  ) => {
    setPending(pendingKey);
    try {
      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(
          "error",
          typeof data?.detail === "string" ? data.detail : "No se pudo completar la acción.",
        );
        return;
      }
      setInterviews((await res.json()).interviews ?? []);
      onChanged();
      flash("success", successMsg);
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setPending(null);
    }
  };

  const schedule = (kind: string) => {
    const form = sched[kind];
    if (!form?.scheduled_at) {
      flash("error", "Indica la fecha y hora de la cita.");
      return;
    }
    if (!form.assigned_to) {
      flash("error", "Asigna un usuario a la entrevista.");
      return;
    }
    post(
      API_ENDPOINTS.admissionsInterviews(code),
      {
        kind,
        scheduled_at: form.scheduled_at,
        modality: form.modality,
        meeting_link: form.meeting_link,
        assigned_to: Number(form.assigned_to),
      },
      `sched-${kind}`,
      "Cita agendada y asignada.",
    );
  };

  const registerInterview = (kind: string) => {
    const values = getValues(kind);
    post(
      API_ENDPOINTS.admissionsInterviewRegister(code),
      {
        kind,
        answers: values?.answers ?? {},
        concept: values?.concept ?? "",
        general_note: values?.general_note ?? "",
      },
      `reg-${kind}`,
      "Entrevista registrada.",
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-base-content/60">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando agenda…
      </div>
    );
  }

  // Quien no agenda (un asignado) solo ve las entrevistas que le tocan.
  const visible = canSchedule ? interviews : interviews.filter((iv) => iv.can_conduct);

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        No tienes entrevistas asignadas en este expediente.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {visible.map((iv) => {
        const isDone = iv.status === "REALIZADA";
        const form = sched[iv.kind];
        return (
          <div key={iv.kind} className="rounded-xl border border-base-300 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display font-semibold text-secondary">
                {iv.label}
                {iv.sensitivity === "sensitive" && (
                  <span className="rounded-full border border-base-300 px-2 py-0.5 text-xs text-base-content/50">
                    sensible
                  </span>
                )}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isDone
                    ? "bg-accent/10 text-accent"
                    : iv.status === "PROGRAMADA"
                      ? "bg-primary/10 text-primary"
                      : "bg-base-200 text-base-content/60"
                }`}
              >
                {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                {iv.status_label}
              </span>
            </div>

            {/* Asignado actual */}
            {iv.assigned_to_name && (
              <p className="mb-3 flex items-center gap-1.5 text-sm text-base-content/60">
                <UserCheck className="h-4 w-4 text-primary" />
                Asignada a: {iv.assigned_to_name}
              </p>
            )}

            {/* --- Agenda + asignación (solo quien agenda) --- */}
            {canSchedule ? (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Fecha y hora</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={form?.scheduled_at ?? ""}
                    onChange={(e) =>
                      setSched((p) => ({
                        ...p,
                        [iv.kind]: { ...p[iv.kind], scheduled_at: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Modalidad</label>
                  <Select
                    value={form?.modality ?? "VIRTUAL"}
                    onChange={(modality) =>
                      setSched((p) => ({
                        ...p,
                        [iv.kind]: { ...p[iv.kind], modality },
                      }))
                    }
                    options={MODALITIES}
                  />
                </div>
                <div>
                  <label className={labelClass}>Asignar a</label>
                  <Select
                    value={form?.assigned_to ?? ""}
                    onChange={(assigned_to) =>
                      setSched((p) => ({
                        ...p,
                        [iv.kind]: { ...p[iv.kind], assigned_to },
                      }))
                    }
                    options={staff.map((u) => ({
                      value: String(u.id),
                      label: `${u.name} · ${u.role}`,
                    }))}
                    placeholder="Elige un usuario…"
                  />
                </div>
                <div>
                  <label className={labelClass}>Enlace de Teams o lugar</label>
                  <input
                    className={inputClass}
                    placeholder="https://teams.microsoft.com/…"
                    value={form?.meeting_link ?? ""}
                    onChange={(e) =>
                      setSched((p) => ({
                        ...p,
                        [iv.kind]: { ...p[iv.kind], meeting_link: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => schedule(iv.kind)}
                    disabled={pending !== null}
                    className={adminGhostBtnClass}
                  >
                    {pending === `sched-${iv.kind}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarClock className="h-4 w-4" />
                    )}
                    {iv.scheduled_at ? "Reprogramar / reasignar" : "Agendar y asignar"}
                  </button>
                </div>
              </div>
            ) : (
              iv.scheduled_at && (
                <p className="mb-4 flex items-center gap-2 text-sm text-base-content/70">
                  {iv.modality === "VIRTUAL" ? (
                    <Video className="h-4 w-4 text-primary" />
                  ) : (
                    <MapPin className="h-4 w-4 text-primary" />
                  )}
                  {formatWhen(iv.scheduled_at)}
                  {iv.meeting_link && iv.meeting_link.startsWith("http") && (
                    <a
                      href={iv.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      · Abrir enlace
                    </a>
                  )}
                </p>
              )
            )}

            {/* --- Registro de respuestas (RHF) --- */}
            {iv.restricted ? (
              <p className="flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/60">
                <Lock className="h-4 w-4" />
                Contenido restringido para tu rol.
              </p>
            ) : iv.can_conduct && iv.form ? (
              <div className="space-y-3 rounded-lg border border-base-300 bg-base-100 p-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-base-content/70">
                  <ClipboardList className="h-4 w-4" />
                  Registro de la entrevista
                </h4>
                {iv.form.questions.map((q) => (
                  <Controller
                    key={q.key}
                    name={`${iv.kind}.answers.${q.key}`}
                    control={control as unknown as Control<Record<string, unknown>>}
                    render={({ field }) => (
                      <QuestionField
                        question={q}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ))}
                <div>
                  <label className={labelClass}>Concepto</label>
                  <Controller
                    name={`${iv.kind}.concept`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={CONCEPT_OPTIONS}
                        placeholder="Sin concepto"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Observación general</label>
                  <textarea
                    rows={2}
                    className={textareaClass}
                    {...register(`${iv.kind}.general_note`)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => registerInterview(iv.kind)}
                  disabled={pending !== null}
                  className={adminPrimaryBtnClass}
                >
                  {pending === `reg-${iv.kind}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isDone ? "Actualizar registro" : "Guardar registro"}
                </button>
              </div>
            ) : (
              isDone && (
                <ReadOnlyAnswers
                  form={iv.form}
                  answers={iv.answers}
                  conceptLabel={iv.concept_label}
                  note={iv.general_note}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{question.label}</label>
      {question.type === "textarea" ? (
        <textarea
          rows={2}
          className={textareaClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : question.type === "select" ? (
        <Select
          value={value == null ? "" : String(value)}
          onChange={onChange}
          options={[
            { value: "", label: "—" },
            ...(question.options ?? []).map((o) => ({ value: o, label: o })),
          ]}
          placeholder="—"
        />
      ) : question.type === "bool" ? (
        <Select
          value={value === true ? "si" : value === false ? "no" : ""}
          onChange={(v) => onChange(v === "" ? null : v === "si")}
          options={BOOL_OPTIONS}
          placeholder="—"
        />
      ) : question.type === "scale" ? (
        <Select
          value={value == null ? "" : String(value)}
          onChange={(v) => onChange(v ? Number(v) : null)}
          options={SCALE_OPTIONS}
          placeholder="—"
        />
      ) : (
        <input
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ReadOnlyAnswers({
  form,
  answers,
  conceptLabel,
  note,
}: {
  form?: { questions: Question[] };
  answers?: Record<string, unknown>;
  conceptLabel?: string;
  note?: string;
}) {
  if (!form) return null;
  const render = (v: unknown) =>
    v === true
      ? "Sí"
      : v === false
        ? "No"
        : v === null || v === undefined || v === ""
          ? "—"
          : String(v);
  return (
    <dl className="grid gap-x-6 rounded-lg bg-base-200 p-3 sm:grid-cols-2">
      {form.questions.map((q) => (
        <div key={q.key} className="py-1">
          <dt className="text-xs text-base-content/50">{q.label}</dt>
          <dd className="text-sm text-base-content">{render(answers?.[q.key])}</dd>
        </div>
      ))}
      {conceptLabel && (
        <div className="py-1">
          <dt className="text-xs text-base-content/50">Concepto</dt>
          <dd className="text-sm text-base-content">{conceptLabel}</dd>
        </div>
      )}
      {note && (
        <div className="py-1 sm:col-span-2">
          <dt className="text-xs text-base-content/50">Observación</dt>
          <dd className="text-sm text-base-content">{note}</dd>
        </div>
      )}
    </dl>
  );
}

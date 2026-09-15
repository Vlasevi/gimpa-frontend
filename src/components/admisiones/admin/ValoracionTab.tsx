/**
 * Pestaña "Valoración" del expediente (reemplaza a Evaluación y Decisión).
 *
 * - La rectora asigna paquete, responsables y fechas: el formulario va directo en la
 *   pestaña y sus botones en el pie del expediente (portal a `footerSlot`), sin recuadro
 *   propio dentro del modal.
 * - Todos ven las actividades con su responsable, fecha y estado; quien puede abrir una la
 *   abre en otra pestaña (`/admisiones/:id/:actividad`).
 * La decisión de la rectora vive en la pestaña "Avanzar" (`DecisionSection`).
 */

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ExternalLink, Pencil, RotateCcw } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { FormInput, FormSelect, FormGrid } from "@/components/ui/FormDialog";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { LoadingState } from "@/components/ui/LoadingState";
import { outlineBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { timeOptionsWith } from "@/components/ui/timeOptions";
import { cardTitleClass, itemTitleClass, metaTextClass } from "@/components/ui/textStyles";
import type { FlashFn } from "@/components/admisiones/admin/adminTypes";
import {
  ACTIVITY_LABELS,
  formatWhen,
  type ActivityKind,
  type ActivityRow,
  type AssignableUser,
  type EvaluationSummary,
} from "@/components/admisiones/valoracion/types";

interface Perms {
  canScheduleInterviews?: boolean;
}

const SCHEDULED: ActivityKind[] = ["ENTREVISTA_FAMILIAR", "ENTREVISTA_ASPIRANTE", "EXAMEN"];
const MODALITY_OPTIONS = [
  { value: "VIRTUAL", label: "Virtual (Teams)" },
  { value: "PRESENCIAL", label: "Presencial" },
];
const STATUS_BADGE: Record<ActivityRow["status"], string> = {
  PENDIENTE: "badge-ghost",
  PROGRAMADA: "badge-info badge-soft",
  EN_CURSO: "badge-warning badge-soft",
  COMPLETADA: "badge-success badge-soft",
};

/** ISO del servidor → fecha ("AAAA-MM-DD") y hora ("HH:mm") en hora local. */
function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

interface Slot {
  date: string;
  time: string;
  modality: string;
  meeting_link: string;
}

/** El examen académico solo es presencial (el backend lo exige igual). */
const IN_PERSON_ONLY: ActivityKind[] = ["EXAMEN"];

// ---------------------------------------------------------------------------
// Asignación

function AssignForm({
  id,
  summary,
  onSaved,
  onCancel,
  flash,
  footerSlot,
  onFooterInUse,
}: {
  id: number;
  summary: EvaluationSummary;
  onSaved: (s: EvaluationSummary) => void;
  /** Pie del expediente, donde van "Cancelar" y "Guardar asignación". */
  footerSlot: HTMLDivElement | null;
  onFooterInUse: (inUse: boolean) => void;
  /** Sin `onCancel` (primera asignación) no hay botón Cancelar: no hay a qué volver. */
  onCancel?: () => void;
  flash: FlashFn;
}) {
  const byKind = new Map(summary.activities.map((a) => [a.kind, a]));
  const [users, setUsers] = useState<Record<string, AssignableUser[]> | null>(null);
  const [stage, setStage] = useState(summary.evaluation?.stage ?? summary.stages.suggested ?? "");
  const [psych, setPsych] = useState(String(byKind.get("ENTREVISTA_FAMILIAR")?.assigned_to ?? ""));
  const [teacher, setTeacher] = useState(String(byKind.get("EXAMEN")?.assigned_to ?? ""));
  const [committee, setCommittee] = useState(String(byKind.get("CONCEPTO")?.assigned_to ?? ""));
  const [slots, setSlots] = useState<Record<string, Slot>>(() =>
    Object.fromEntries(
      SCHEDULED.map((k) => {
        const a = byKind.get(k);
        return [k, {
          ...splitLocal(a?.scheduled_at ?? null),
          modality: IN_PERSON_ONLY.includes(k) ? "PRESENCIAL" : (a?.modality ?? "VIRTUAL"),
          meeting_link: a?.meeting_link ?? "",
        }];
      }),
    ),
  );
  const [saving, setSaving] = useState(false);
  const formId = useId();

  // Mientras el formulario está abierto, el pie del expediente muestra sus botones.
  useEffect(() => {
    onFooterInUse(true);
    return () => onFooterInUse(false);
  }, [onFooterInUse]);

  useEffect(() => {
    apiFetch(API_ENDPOINTS.admissionsAssignableUsers)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUsers(data ?? { psychologists: [], teachers: [], committee: [] }))
      .catch(() => setUsers({ psychologists: [], teachers: [], committee: [] }));
  }, []);

  const setSlot = (kind: string, patch: Partial<Slot>) =>
    setSlots((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // La hora es un Select (no un campo nativo): el navegador no la valida solo.
    const incomplete = SCHEDULED.find((k) => !slots[k].date || !slots[k].time);
    if (incomplete) {
      flash("error", `Falta la fecha o la hora de: ${ACTIVITY_LABELS[incomplete]}.`);
      return;
    }
    setSaving(true);
    const assignee = (kind: ActivityKind) =>
      Number(kind === "EXAMEN" ? teacher : kind === "CONCEPTO" ? committee : psych) || null;
    const activities = Object.fromEntries(
      (Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((kind) => {
        const slot = slots[kind];
        return [kind, {
          assigned_to: assignee(kind),
          ...(slot
            ? {
                scheduled_at: new Date(`${slot.date}T${slot.time}`).toISOString(),
                modality: IN_PERSON_ONLY.includes(kind) ? "PRESENCIAL" : slot.modality,
                meeting_link: slot.meeting_link,
              }
            : {}),
        }];
      }),
    );
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsEvaluation(id), {
        method: "PUT",
        body: JSON.stringify({ stage, activities }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("success", "Valoración asignada. Avisamos a los responsables y a la familia.");
        onSaved(data as EvaluationSummary);
      } else {
        flash("error", typeof data?.detail === "string" ? data.detail : "Revisa los datos de la asignación.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (!users) return <LoadingState compact label="Cargando responsables…" />;

  const toOptions = (list: AssignableUser[]) => list.map((u) => ({ value: String(u.id), label: u.name }));
  const stageOptions = summary.stages.options
    .filter((o) => o.available)
    .map((o) => ({ value: o.value, label: o.value === summary.stages.suggested ? `${o.label} · sugerido` : o.label }));
  const pending = summary.stages.options.filter((o) => !o.available).map((o) => o.value);

  return (
    <form id={formId} onSubmit={submit} className="space-y-5">
      <h3 className={cardTitleClass}>{summary.evaluation ? "Editar asignación" : "Asignar valoración"}</h3>

      <FormGrid>
        <FormSelect
          label="Paquete"
          value={stage}
          onChange={setStage}
          options={stageOptions}
          placeholder="Elige el paquete"
          emptyText="No hay paquetes disponibles."
          required
          hint={`Edad del aspirante: ${summary.stages.age || "sin fecha de nacimiento"}. Aún no disponibles: ${pending.join(", ")}.`}
        />
        <FormSelect
          label="Psicóloga"
          value={psych}
          onChange={setPsych}
          options={toOptions(users.psychologists)}
          placeholder="Elige a la psicóloga"
          emptyText="No hay funcionarios de Psicología para mostrar."
          required
          hint="Hace las entrevistas y el consolidado."
        />
        <FormSelect
          label="Docente"
          value={teacher}
          onChange={setTeacher}
          options={toOptions(users.teachers)}
          placeholder="Elige al docente"
          emptyText="No hay docentes para mostrar."
          required
          hint="Aplica y califica el examen."
        />
        <FormSelect
          label="Responsable del concepto"
          value={committee}
          onChange={setCommittee}
          options={toOptions(users.committee)}
          placeholder="Elige quién lo registra"
          emptyText="No hay funcionarios para mostrar."
          required
          hint="Registra el concepto después de la reunión del Comité."
        />
      </FormGrid>

      <div className="space-y-4">
        {SCHEDULED.map((kind) => {
          const inPerson = IN_PERSON_ONLY.includes(kind);
          return (
            <fieldset key={kind} className="rounded-lg bg-base-200/60 p-4">
              <legend className="px-1 text-sm font-medium text-base-content">{ACTIVITY_LABELS[kind]}</legend>
              <FormGrid>
                <FormInput
                  label="Fecha"
                  type="date"
                  required
                  value={slots[kind].date}
                  onChange={(e) => setSlot(kind, { date: e.target.value })}
                />
                <FormSelect
                  label="Hora"
                  value={slots[kind].time}
                  onChange={(v) => setSlot(kind, { time: v })}
                  options={timeOptionsWith(slots[kind].time)}
                  placeholder="Elige la hora"
                  required
                />
                {inPerson ? (
                  <FormInput
                    label="Modalidad"
                    value="Presencial"
                    readOnly
                    aria-readonly="true"
                    hint="El examen académico se presenta en el colegio."
                  />
                ) : (
                  <FormSelect
                    label="Modalidad"
                    value={slots[kind].modality}
                    onChange={(v) => setSlot(kind, { modality: v })}
                    options={MODALITY_OPTIONS}
                  />
                )}
                <FormInput
                  label={inPerson ? "Lugar" : "Enlace de Teams o lugar"}
                  placeholder={inPerson ? "Salón o sede" : undefined}
                  value={slots[kind].meeting_link}
                  onChange={(e) => setSlot(kind, { meeting_link: e.target.value })}
                />
              </FormGrid>
            </fieldset>
          );
        })}
      </div>

      {/* Botones en el pie del expediente; `form={formId}` los enlaza a este formulario. */}
      {footerSlot &&
        createPortal(
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} disabled={saving} className={outlineBtnClass}>
                Cancelar
              </button>
            )}
            <button type="submit" form={formId} disabled={saving || !stage} className={primaryBtnClass}>
              <BusyLabel busy={saving} busyText="Guardando…">
                Guardar asignación
              </BusyLabel>
            </button>
          </>,
          footerSlot,
        )}
    </form>
  );
}

// ---------------------------------------------------------------------------

export function ValoracionTab({
  id,
  perms,
  flash,
  onChanged,
  footerSlot,
  onFooterInUse,
}: {
  id: number;
  perms: Perms;
  flash: FlashFn;
  onChanged: () => void;
  footerSlot: HTMLDivElement | null;
  onFooterInUse: (inUse: boolean) => void;
}) {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState<ActivityKind | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsEvaluation(id));
      if (res.ok) setSummary(await res.json());
    } catch {
      flash("error", "No pudimos cargar la valoración.");
    }
  }, [id, flash]);

  useEffect(() => {
    load();
  }, [load]);

  const reopen = async (kind: ActivityKind) => {
    setBusy(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsEvaluationReopen(id), {
        method: "POST",
        body: JSON.stringify({ activities: [kind] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSummary(data as EvaluationSummary);
        flash("success", "Actividad reabierta.");
        onChanged();
        load();
      } else {
        flash("error", typeof data?.detail === "string" ? data.detail : "No pudimos reabrir la actividad.");
      }
    } finally {
      setBusy(false);
      setConfirmReopen(null);
    }
  };

  if (!summary) return <LoadingState compact label="Cargando valoración…" />;

  const open = (slug: string) => window.open(`/admisiones/${id}/${slug}`, "_blank", "noopener");
  // Habilitada y sin asignar: el formulario sale abierto de una vez, sin botón previo.
  const firstAssignment = summary.can_assign && !summary.evaluation;

  return (
    <div className="space-y-5">
      {/* Encabezado (no se dibuja vacío: en la primera asignación el formulario ya trae
          su título, y un bloque vacío sumaría espacio arriba). */}
      {!firstAssignment && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {summary.evaluation ? (
              <>
                <p className={itemTitleClass}>{summary.evaluation.stage_label}</p>
                <p className={metaTextClass}>
                  {summary.evaluation.package}
                  {summary.evaluation.round > 1 && ` · ronda ${summary.evaluation.round}`}
                  {summary.evaluation.assigned_by_name &&
                    ` · asignada por ${summary.evaluation.assigned_by_name} el ${formatWhen(summary.evaluation.assigned_at)}`}
                </p>
              </>
            ) : (
              <p className={metaTextClass}>
                Para asignar la valoración, primero envía la solicitud al paso Valoración desde Avanzar.
              </p>
            )}
          </div>
          {summary.can_assign && summary.evaluation && !editing && (
            <button type="button" onClick={() => setEditing(true)} className={outlineBtnClass}>
              <Pencil className="h-4 w-4" />
              Editar asignación
            </button>
          )}
        </div>
      )}

      {(editing || firstAssignment) && (
        <AssignForm
          id={id}
          summary={summary}
          flash={flash}
          footerSlot={footerSlot}
          onFooterInUse={onFooterInUse}
          onCancel={firstAssignment ? undefined : () => setEditing(false)}
          onSaved={(s) => {
            setSummary(s);
            setEditing(false);
            onChanged();
          }}
        />
      )}

      {/* Actividades */}
      {summary.activities.length > 0 && (
        <ul className="divide-y divide-base-200 rounded-lg border border-base-300">
          {summary.activities.map((a) => (
            <li key={a.kind} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={itemTitleClass}>{a.label}</span>
                  <span className={`badge badge-sm ${STATUS_BADGE[a.status]}`}>{a.status_label}</span>
                  {a.is_mine && <span className="badge badge-sm badge-primary badge-soft">Tuya</span>}
                </p>
                <p className={metaTextClass}>
                  {a.assigned_to_name || "Sin responsable"}
                  {a.scheduled_at && (
                    <>
                      {" · "}
                      <CalendarClock className="inline h-3.5 w-3.5 align-[-2px]" /> {formatWhen(a.scheduled_at)} ·{" "}
                      {a.modality === "VIRTUAL" ? "Virtual" : "Presencial"}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {summary.can_assign && a.status === "COMPLETADA" &&
                  (confirmReopen === a.kind ? (
                    <>
                      <span className="text-sm text-base-content/70">¿Reabrir?</span>
                      <button type="button" disabled={busy} onClick={() => reopen(a.kind)} className="btn btn-sm btn-warning">
                        Sí, reabrir
                      </button>
                      <button type="button" disabled={busy} onClick={() => setConfirmReopen(null)} className={`${outlineBtnClass} btn-sm`}>
                        No
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmReopen(a.kind)} className={`${outlineBtnClass} btn-sm`}>
                      <RotateCcw className="h-4 w-4" />
                      Reabrir
                    </button>
                  ))}
                {a.can_open && (
                  <button
                    type="button"
                    onClick={() => open(a.slug)}
                    className={a.is_mine && a.status !== "COMPLETADA" ? `${primaryBtnClass} btn-sm` : `${outlineBtnClass} btn-sm`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {a.is_mine && a.status !== "COMPLETADA" ? "Llenar" : "Ver"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

export default ValoracionTab;

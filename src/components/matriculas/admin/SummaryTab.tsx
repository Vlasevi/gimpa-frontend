/**
 * Pestaña "Resumen" del detalle: lo que falta (datos incompletos, documentos
 * pendientes) y el historial de la matrícula como línea de tiempo, con el paso que
 * sigue al final.
 */

import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  Clock,
  FilePlus2,
  Send,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { EnrollmentDetail } from "@/components/matriculas/enrollmentApi";
import {
  getDocumentStatusBadgeClass,
  getDocumentStatusLabel,
  INACTIVE_REASON_LABELS,
} from "@/utils/statusHelpers";
import { formatDateTime, profileIssues } from "./shared";

type Tone = "neutral" | "info" | "success" | "warning" | "error";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-base-200 text-base-content/70",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/10 text-error",
};

interface HistoryEvent {
  at: string;
  title: string;
  by?: string | null;
  note?: string | null;
  tone: Tone;
  icon: LucideIcon;
}

/** Dos marcas de tiempo del mismo envío (el backend las escribe casi juntas). */
const sameMoment = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

function historyOf(detail: EnrollmentDetail): HistoryEvent[] {
  const events: HistoryEvent[] = [
    { at: detail.enrollment_date, title: `Matrícula creada · ${detail.origin_label}`, tone: "neutral", icon: FilePlus2 },
  ];

  for (const correction of detail.corrections) {
    events.push({
      at: correction.requested_at,
      title: "Devuelta para corrección",
      by: correction.requested_by,
      note: correction.comment,
      tone: "warning",
      icon: Undo2,
    });
    if (correction.resolved_at) {
      events.push({ at: correction.resolved_at, title: "Reenviada con correcciones", tone: "info", icon: Send });
    }
  }

  // `submitted_at` guarda solo el último envío; si coincide con un reenvío ya está.
  const submitted = detail.submitted_at;
  if (submitted && !detail.corrections.some((c) => c.resolved_at && sameMoment(c.resolved_at, submitted))) {
    events.push({ at: submitted, title: "Enviada a revisión", tone: "info", icon: Send });
  }

  if (detail.approved_at) {
    events.push({ at: detail.approved_at, title: "Aprobada", by: detail.approved_by, tone: "success", icon: CheckCircle2 });
  }

  if (detail.closed_at) {
    const closing: Record<string, { title: string; tone: Tone; icon: LucideIcon }> = {
      REJECTED: { title: "Rechazada", tone: "error", icon: XCircle },
      CANCELLED: { title: "Anulada", tone: "error", icon: Ban },
      INACTIVE: {
        title: `Inactivada · ${INACTIVE_REASON_LABELS[detail.inactive_reason ?? ""] ?? "sin tipo"}`,
        tone: "neutral",
        icon: Archive,
      },
    };
    const kind = closing[detail.status];
    if (kind) events.push({ at: detail.closed_at, by: detail.closed_by, note: detail.closed_reason, ...kind });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/** Lo que sigue según el estado; `null` si la matrícula ya no espera nada. */
function nextStep(detail: EnrollmentDetail): string | null {
  switch (detail.status) {
    case "CREATED":
    case "DRAFT":
      return "Pendiente: el estudiante diligencia y envía la matrícula.";
    case "RETURNED":
      return "Pendiente: el estudiante corrige y reenvía.";
    case "SUBMITTED":
      return "Pendiente: revisión de la institución (aprobar, devolver o rechazar).";
    case "ACTIVE":
      return detail.has_pending_documents ? "Pendiente: el estudiante sube los documentos que faltan." : null;
    default:
      return null;
  }
}

export function SummaryTab({ detail }: { detail: EnrollmentDetail }) {
  const issues = profileIssues(detail);
  const pendingKeys = new Set(detail.pending_documents);
  const pendingDocs = detail.documents.filter((doc) => pendingKeys.has(doc.key));
  // Sin permiso para ver documentos médicos o sensibles, el backend no los lista.
  const hiddenPending = detail.pending_documents.length - pendingDocs.length;
  const events = historyOf(detail);
  const next = nextStep(detail);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Historial: riel propio alineado a la izquierda. La `timeline` de daisyUI con
          `timeline-compact` + `timeline-snap-icon` deja una columna vacía de 1fr a la
          izquierda y centra la línea en la columna. */}
      <section aria-labelledby="resumen-historial" className="rounded-lg border border-base-300 p-4">
        <h3 id="resumen-historial" className="mb-4 font-semibold text-base-content">
          Historial
        </h3>
        <ol>
          {events.map((event, index) => {
            const Icon = event.icon;
            const hasNext = index < events.length - 1 || Boolean(next);
            return (
              <li key={`${event.title}-${event.at}`} className="relative flex gap-3 pb-5 last:pb-0">
                {hasNext && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-8 bottom-1 left-3.5 -translate-x-1/2 border-l-2 ${
                      index === events.length - 1 ? "border-dashed border-base-300" : "border-base-300"
                    }`}
                  />
                )}
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[event.tone]}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="font-medium leading-6 text-base-content">{event.title}</p>
                  <p className="text-xs text-base-content/55">
                    <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                    {event.by && <> · por {event.by}</>}
                  </p>
                  {event.note && (
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/80">
                      {event.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          {next && (
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-base-300 text-base-content/40">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 pt-0.5 text-sm leading-6 text-base-content/60">{next}</p>
            </li>
          )}
        </ol>
      </section>

      <div className="space-y-4">
        {/* Datos incompletos */}
        {issues.length > 0 && (
          <section
            aria-labelledby="resumen-datos"
            className="rounded-lg border border-warning/30 bg-warning/5 p-4"
          >
            <h3 id="resumen-datos" className="flex items-center gap-2 font-semibold text-base-content">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              Datos incompletos ({issues.length})
            </h3>
            <p className="mt-1 text-sm text-base-content/60">
              La ficha no pasa la validación. El estudiante debe completarla antes de enviar.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {issues.map((issue) => (
                <li key={issue.path} className="text-base-content/80">
                  <span className="font-medium">{issue.label}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Documentos pendientes */}
        <section aria-labelledby="resumen-documentos" className="rounded-lg border border-base-300 p-4">
          <h3 id="resumen-documentos" className="font-semibold text-base-content">
            {detail.pending_documents.length
              ? `Documentos pendientes (${detail.pending_documents.length})`
              : "Documentos"}
          </h3>
          {detail.pending_documents.length ? (
            <>
              <p className="mt-1 text-sm text-base-content/60">
                Obligatorios que aún no están aprobados ni marcados como «no aplica».
              </p>
              <ul className="mt-3 divide-y divide-base-300">
                {pendingDocs.map((doc) => (
                  <li key={doc.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 text-base-content/80">{doc.label}</span>
                    <span className={`badge badge-sm shrink-0 whitespace-nowrap ${getDocumentStatusBadgeClass(doc.status)}`}>
                      {getDocumentStatusLabel(doc.status)}
                    </span>
                  </li>
                ))}
              </ul>
              {hiddenPending > 0 && (
                <p className="mt-2 text-xs text-base-content/50">
                  {hiddenPending === 1
                    ? "Hay 1 más que tu rol no puede ver."
                    : `Hay ${hiddenPending} más que tu rol no puede ver.`}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-sm text-base-content/70">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              Todos los obligatorios están aprobados o no aplican.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

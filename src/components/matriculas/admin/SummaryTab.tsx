/**
 * Pestaña "Resumen" del detalle: el historial de la matrícula como línea de tiempo, con el
 * paso que sigue al final. Los documentos y los datos tienen su propia pestaña.
 *
 * Con varias correcciones se ve cada vuelta: enviada → corrección solicitada → reenviada → …
 * Cada corrección guarda el envío que devolvió (`submitted_at`), porque la matrícula solo
 * guarda el último.
 */

import {
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
  cardClass,
  cardHeaderClass,
  cardTitleClass,
  itemTitleClass,
  metaTextClass,
  quoteClass,
} from "@/components/ui/textStyles";
import { INACTIVE_REASON_LABELS } from "@/utils/statusHelpers";
import { formatDateTime } from "./shared";

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
  /** Documentos que se pidieron corregir en una corrección. */
  documents?: string[];
  tone: Tone;
  icon: LucideIcon;
}

/** Dos marcas de tiempo del mismo envío (el backend las escribe casi juntas). */
const sameMoment = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

function historyOf(detail: EnrollmentDetail): HistoryEvent[] {
  const events: HistoryEvent[] = [
    { at: detail.enrollment_date, title: `Matrícula creada · ${detail.origin_label}`, tone: "neutral", icon: FilePlus2 },
  ];
  // Envíos ya en la línea de tiempo (para no repetir el último, que también está en la matrícula).
  const submissions: string[] = [];

  const corrections = [...detail.corrections].sort(
    (a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime(),
  );
  for (const correction of corrections) {
    const sent = correction.submitted_at;
    if (sent && !submissions.some((at) => sameMoment(at, sent))) {
      events.push({ at: sent, title: "Enviada a revisión", tone: "info", icon: Send });
      submissions.push(sent);
    }
    events.push({
      at: correction.requested_at,
      title: "Corrección solicitada",
      by: correction.requested_by,
      note: correction.comment,
      documents: correction.rejected_documents.map((doc) => doc.label),
      tone: "warning",
      icon: Undo2,
    });
    if (correction.resolved_at) {
      events.push({ at: correction.resolved_at, title: "Reenviada con correcciones", tone: "info", icon: Send });
      submissions.push(correction.resolved_at);
    }
  }

  const submitted = detail.submitted_at;
  if (submitted && !submissions.some((at) => sameMoment(at, submitted))) {
    events.push({ at: submitted, title: "Enviada a revisión", tone: "info", icon: Send });
  }

  if (detail.approved_at) {
    events.push({ at: detail.approved_at, title: "Aprobada", by: detail.approved_by, tone: "success", icon: CheckCircle2 });
  }

  if (detail.closed_at) {
    const closing: Record<string, { title: string; tone: Tone; icon: LucideIcon }> = {
      REJECTED: { title: "Rechazada", tone: "error", icon: XCircle },
      CANCELLED: { title: "Cancelada", tone: "error", icon: Ban },
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
      return "Pendiente: revisión de la institución (aprobar, solicitar corrección o rechazar).";
    case "ACTIVE":
      return detail.has_pending_documents ? "Pendiente: el estudiante sube los documentos que faltan." : null;
    default:
      return null;
  }
}

export function SummaryTab({ detail }: { detail: EnrollmentDetail }) {
  const events = historyOf(detail);
  const next = nextStep(detail);

  return (
    <section aria-labelledby="resumen-historial" className={cardClass}>
      <header className={cardHeaderClass}>
        <h3 id="resumen-historial" className={cardTitleClass}>
          Historial
        </h3>
      </header>

      <ol className="p-5">
        {events.map((event, index) => {
          const Icon = event.icon;
          const isLastEvent = index === events.length - 1;
          return (
            <li key={`${event.title}-${event.at}`} className="relative flex gap-4 pb-6 last:pb-0">
              {(!isLastEvent || next) && (
                <span
                  aria-hidden="true"
                  className={`absolute top-10 bottom-1.5 left-4 -translate-x-1/2 border-l-2 border-base-300 ${
                    isLastEvent ? "border-dashed" : ""
                  }`}
                />
              )}
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[event.tone]}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className={itemTitleClass}>{event.title}</p>
                <p className={metaTextClass}>
                  <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                  {event.by && <> · por {event.by}</>}
                </p>
                {event.note && <p className={`mt-2 ${quoteClass}`}>{event.note}</p>}
                {event.documents && event.documents.length > 0 && (
                  <p className={`mt-2 ${metaTextClass}`}>
                    <span className="font-medium text-base-content/70">Documentos a corregir:</span>{" "}
                    {event.documents.join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {next && (
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-base-300 text-base-content/50">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 pt-1 text-base-content/70">{next}</p>
          </li>
        )}
      </ol>
    </section>
  );
}

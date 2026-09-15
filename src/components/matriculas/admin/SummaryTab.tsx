/**
 * Pestaña "Resumen" del detalle: el historial de la matrícula como línea de tiempo, con el
 * paso que sigue al final. Los documentos y los datos tienen su propia pestaña. La línea
 * de tiempo la pinta `ui/HistoryTimeline` (compartida con Admisiones).
 *
 * Con varias correcciones se ve cada vuelta: enviada → corrección solicitada → reenviada → …
 * Cada corrección guarda el envío que devolvió (`submitted_at`), porque la matrícula solo
 * guarda el último.
 */

import {
  Archive,
  Ban,
  CheckCircle2,
  FilePlus2,
  Send,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { EnrollmentDetail } from "@/components/matriculas/enrollmentApi";
import { HistoryTimeline, type HistoryEvent, type HistoryTone } from "@/components/ui/HistoryTimeline";
import { INACTIVE_REASON_LABELS } from "@/utils/statusHelpers";

type Tone = HistoryTone;

/** Dos marcas de tiempo del mismo envío (el backend las escribe casi juntas). */
const sameMoment = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

function historyOf(detail: EnrollmentDetail): HistoryEvent[] {
  const events: HistoryEvent[] = [
    { at: detail.enrollment_date, title: `Matrícula creada · ${detail.origin_label}`, tone: "success", icon: FilePlus2 },
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
      items: correction.rejected_documents.map((doc) => doc.label),
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
      return "A la espera de que el acudiente diligencie y envíe la matrícula.";
    case "RETURNED":
      return "A la espera de corrección por parte del acudiente.";
    case "SUBMITTED":
      return "A la espera de revisión por parte de la institución.";
    case "ACTIVE":
      return detail.has_pending_documents ? "A la espera de los documentos pendientes por parte del acudiente." : null;
    default:
      return null;
  }
}

export function SummaryTab({ detail }: { detail: EnrollmentDetail }) {
  return <HistoryTimeline events={historyOf(detail)} next={nextStep(detail)} itemsLabel="Documentos a corregir" />;
}

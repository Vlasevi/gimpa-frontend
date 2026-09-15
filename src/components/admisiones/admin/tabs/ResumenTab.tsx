/**
 * Pestaña "Resumen" del expediente: el historial como línea de tiempo (igual que en
 * Matrículas, con `ui/HistoryTimeline`) y el paso que sigue. Los eventos los arma el
 * backend (`history_service`): transiciones, correcciones, asignación y actividades.
 */

import {
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Send,
  ShieldCheck,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { HistoryTimeline, type HistoryEvent } from "@/components/ui/HistoryTimeline";
import type { AdmissionApplication, AdmissionHistoryEvent } from "@/components/admisiones/admissionTypes";

const ICONS: Record<AdmissionHistoryEvent["kind"], LucideIcon> = {
  created: FilePlus2,
  consent: ShieldCheck,
  status: CheckCircle2,
  correction: Undo2,
  resubmitted: Send,
  assigned: Users,
  activity: ClipboardCheck,
};

export function ResumenTab({ application }: { application: AdmissionApplication }) {
  const events: HistoryEvent[] = (application.history ?? []).map((e) => ({
    at: e.at,
    title: e.title,
    by: e.by,
    note: e.note,
    items: e.items,
    tone: e.tone,
    icon: e.kind === "status" && e.status === "SOLICITUD_ENVIADA" ? Send : ICONS[e.kind],
  }));
  return <HistoryTimeline events={events} next={application.next_step ?? null} />;
}

export default ResumenTab;

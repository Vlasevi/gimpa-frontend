/**
 * Pestaña "Solicitud" del expediente: todo lo que llenó el acudiente, de solo lectura.
 * Extraída de `ApplicationDetail.tsx` — Paso 7 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md). Siempre visible, sin gateo por capability.
 */

import { ApplicationDataView } from "@/components/admisiones/admin/ApplicationDataView";
import type { AdmissionApplication } from "@/components/admisiones/admissionTypes";

export function SolicitudTab({ data }: { data: AdmissionApplication["data"] }) {
  return <ApplicationDataView data={data} />;
}

export default SolicitudTab;

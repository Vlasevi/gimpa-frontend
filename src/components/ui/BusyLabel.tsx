/**
 * Contenido de un botón que trabaja: el spinner **y** el texto en gerundio ("Guardando…"),
 * nunca el spinner solo (DESIGN_SYSTEM §6). El botón se deshabilita aparte.
 *
 *   <button className="btn btn-primary" disabled={saving}>
 *     <BusyLabel busy={saving} busyText="Guardando…">Guardar</BusyLabel>
 *   </button>
 */

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function BusyLabel({
  busy,
  busyText,
  children,
}: {
  busy: boolean;
  /** "Guardando…", "Enviando…" */
  busyText: string;
  children: ReactNode;
}) {
  if (!busy) return <>{children}</>;
  return (
    <>
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      {busyText}
    </>
  );
}

export default BusyLabel;

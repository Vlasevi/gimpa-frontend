/**
 * Área del acudiente en `/admisiones`: lista → nueva / detalle → formulario.
 *
 * Una sola ruta, como Matrículas. La pantalla actual vive en el historial del navegador
 * (ver `acudiente/guardianNav.ts`), así que "atrás" y recargar se comportan como si cada
 * pantalla tuviera su propia URL.
 */

import { useEffect } from "react";

import { useGuardianNav } from "@/components/admisiones/acudiente/guardianNav";
import MisAdmisiones from "@/components/admisiones/acudiente/MisAdmisiones";
import NuevaAdmision from "@/components/admisiones/acudiente/NuevaAdmision";
import DetalleAdmision from "@/components/admisiones/acudiente/DetalleAdmision";
import SolicitudWizard from "@/components/admisiones/acudiente/SolicitudWizard";

export function AdmisionesAcudiente() {
  const { current } = useGuardianNav();

  // Cada pantalla empieza arriba: el scroll vive en el <main> del layout, no en la ventana,
  // así que el navegador no lo reinicia solo al cambiar de pantalla.
  const screenKey = current.view === "list" || current.view === "new"
    ? current.view
    : `${current.view}-${current.id}`;
  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0 });
  }, [screenKey]);

  switch (current.view) {
    case "new":
      return <NuevaAdmision />;
    case "detail":
      return <DetalleAdmision key={current.id} id={current.id} />;
    case "form":
      return <SolicitudWizard key={current.id} id={current.id} />;
    default:
      return <MisAdmisiones />;
  }
}

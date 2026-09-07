import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

/**
 * Marco de las pantallas del acudiente (admisiones).
 *
 * Antes tenía su propio header + sidebar "parecidos pero no iguales" a los del área de
 * staff (logo sin el texto del colegio, clases de NavLink copiadas a mano) — la misma
 * clase de duplicación que el resto de este refactor viene eliminando en otras partes
 * del módulo. Ahora reutiliza literalmente `Sidebar`/`Navbar` (el mismo componente que
 * usa `Layout.tsx`, sin copiar su JSX): `Sidebar` ya sabe detectar `isGuardianOnly(user)`
 * y renderizar el menú de un solo ítem que le corresponde a un acudiente, con el mismo
 * logo (con el texto del colegio incluido) y el mismo estilo de NavLink que ve el staff.
 */
export default function AcudienteLayout() {
  return (
    <div className="flex min-h-screen bg-base-100">
      <div className="h-screen sticky top-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-base-200 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

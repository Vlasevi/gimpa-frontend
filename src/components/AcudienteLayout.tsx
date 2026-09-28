import { Outlet } from "react-router-dom";

import { Sidebar, SIDEBAR_DRAWER_ID, useSidebarDrawerState } from "./Sidebar";
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
 *
 * Mismo patrón de `drawer` que `Layout.tsx` (ver los comentarios ahí para el porqué de
 * cada pieza) — se duplica aquí porque los dos marcos ya eran independientes desde
 * antes; no es una regresión nueva de este cambio.
 */
export default function AcudienteLayout() {
  const [drawerOpen, setDrawerOpen] = useSidebarDrawerState();

  return (
    <div className="drawer h-dvh overflow-hidden lg:drawer-open">
      <input
        id={SIDEBAR_DRAWER_ID}
        type="checkbox"
        className="drawer-toggle"
        checked={drawerOpen}
        onChange={(e) => setDrawerOpen(e.target.checked)}
      />

      <div className="drawer-content flex h-dvh min-h-0 flex-col overflow-hidden bg-base-100">
        <Navbar showDrawerToggle />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-base-200 p-6">
          <Outlet />
        </main>
      </div>

      <Sidebar />
    </div>
  );
}

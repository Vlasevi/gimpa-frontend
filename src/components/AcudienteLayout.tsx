import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

import Logo from "@/assets/logo.png";
import { Navbar } from "./Navbar";

/**
 * Marco de las pantallas del acudiente (admisiones).
 *
 * Antes de esta versión, este layout NO tenía el sidebar institucional (solo una barra
 * superior mínima) — la justificación era que un acudiente es una familia externa, no
 * personal del colegio. En la práctica esto hacía que Admisiones se sintiera como una
 * plataforma distinta a Matrículas para el mismo tipo de usuario: un padre llenando una
 * matrícula SÍ ve el sidebar institucional completo (entra con una cuenta rol `student`,
 * que cae dentro de `Layout`/`StaffArea`), mientras que un padre llenando una admisión
 * (cuenta de acudiente puro) no lo veía. Se revierte esa decisión: mismo esqueleto que
 * `Layout.tsx` (sidebar fijo + `Navbar` + `<Outlet/>`), reutilizando el `Navbar`
 * compartido tal cual, con un sidebar propio para acudiente (mismos tokens visuales que
 * `Sidebar.tsx`, un solo ítem — "Mis solicitudes" — porque es lo único a lo que un
 * acudiente puro tiene acceso).
 */
export default function AcudienteLayout() {
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
      isActive
        ? "bg-[hsl(var(--accent-dark))] text-white shadow-sm"
        : "text-base-content/80 hover:bg-white/60 hover:text-primary"
    }`;

  return (
    <div className="flex min-h-screen bg-base-100">
      {/* Sidebar fijo, sin scroll — mismos tokens que Sidebar.tsx (área de staff). */}
      <div className="h-screen sticky top-0">
        <aside className="w-64 min-h-screen border-r border-base-300 bg-[hsl(var(--accentlight))]">
          <div className="mb-4 flex h-18 items-center justify-center border-b border-base-300 px-4 py-6">
            <img
              onClick={() => navigate("/admisiones", { replace: true })}
              src={Logo}
              alt="Escudo de Gimnasio El Paraíso"
              className="h-9 w-auto cursor-pointer select-none"
              draggable={false}
            />
          </div>

          <nav className="space-y-1 px-4">
            <NavLink to="/admisiones" className={navLinkClass} end>
              <FileText className="h-5 w-5 shrink-0" />
              Mis solicitudes
            </NavLink>
          </nav>
        </aside>
      </div>

      {/* Contenido principal con scroll independiente */}
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-base-200 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

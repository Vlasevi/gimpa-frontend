import { Outlet } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";

import Logo from "@/assets/logo.png";
import { useAuth } from "./Login/loginLogic";

/**
 * Marco de las pantallas del acudiente (admisiones).
 *
 * Deliberadamente **sin el Sidebar institucional**: quien entra aquí es una familia
 * externa, no personal del colegio. Solo barra mínima con la marca y su cuenta —
 * la misma pieza "header + <Outlet/>" de `Layout.tsx`, sin el slot de `<Sidebar/>`.
 *
 * El filo de acento superior es el mismo device de marca del hero de Login y del
 * encabezado de los correos.
 *
 * Decisión del Paso 6 (docs/plan-admisiones-ui-rhf-acordeon.md): el "menú de cuenta"
 * de abajo está casi calcado del de `Navbar.tsx` (ver docs/paso0-informe-admisiones.md
 * §6) y es candidato a un `ui/AccountMenu.tsx` compartido. NO se extrajo en este paso
 * a propósito: hacerlo bien requiere tocar también `Navbar.tsx` (usado por el layout
 * de staff), que queda fuera de la lista de archivos de este paso, y extraer solo la
 * mitad no elimina la duplicación real. Queda como hallazgo pendiente para un paso de
 * limpieza aparte (bajo riesgo, ya con la firma de props propuesta en el informe).
 */
export default function AcudienteLayout() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      {/* Filo de acento: marca de agua institucional */}
      <div className="h-1 w-full bg-accent" />

      <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Marca */}
          <div className="flex items-center gap-3">
            <img
              src={Logo}
              alt="Escudo de Gimnasio El Paraíso"
              className="h-9 w-auto select-none"
              draggable={false}
            />
            <span className="hidden h-6 w-px bg-base-300 sm:block" />
            <span className="hidden font-display text-lg font-semibold text-secondary sm:block">
              Admisiones
            </span>
          </div>

          {/* Cuenta */}
          {user && (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-base-content">
                    {user.displayname || "Mi cuenta"}
                  </p>
                  <p className="text-xs text-base-content/60">{user.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-base-content/40" />
              </div>

              <ul
                tabIndex={0}
                className="dropdown-content menu z-50 w-56 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg"
              >
                <li className="px-4 py-2 sm:hidden">
                  <p className="text-sm font-medium text-base-content">
                    {user.displayname || "Mi cuenta"}
                  </p>
                  <p className="text-xs text-base-content/60">{user.email}</p>
                </li>
                <li>
                  <button
                    onClick={logout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-error transition-colors hover:bg-error/10 disabled:opacity-70"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-base-300 bg-base-100 py-5">
        <p className="text-center text-xs text-base-content/50">
          © {new Date().getFullYear()} Gimnasio El Paraíso
        </p>
      </footer>
    </div>
  );
}

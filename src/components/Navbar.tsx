import { useAuth } from "./Login/loginLogic";
import { SIDEBAR_DRAWER_ID } from "./Sidebar";
import { ChevronDown, PanelLeft, User, LogOut } from "lucide-react";

interface NavbarProps {
  /** Botón que abre/cierra el sidebar (el mismo checkbox `drawer-toggle`
   * que usa `Sidebar`) — solo tiene sentido mostrarlo cuando de verdad hay
   * un sidebar montado (Layout.tsx lo apaga en el estado "sin acceso",
   * donde no se renderiza `<Sidebar />`).
   * SIN `lg:hidden`: a diferencia del intento anterior, este botón hace
   * doble función según el breakpoint — en mobile abre/cierra el overlay,
   * en desktop colapsa/expande el riel de íconos (antes ese segundo botón
   * vivía DENTRO del sidebar; el usuario lo quería acá, en el navbar).
   * Ocultarlo en desktop (como antes) dejaba un solo hijo flex visible en
   * el header, y con `justify-between` un hijo único se va a la
   * IZQUIERDA en vez de a la derecha — así se corrió el menú de usuario.
   * Manteniéndolo visible en los dos breakpoints, ese bug desaparece
   * solo (siempre hay dos hijos reales para repartir en los extremos). */
  showDrawerToggle?: boolean;
}

export const Navbar = ({ showDrawerToggle = true }: NavbarProps) => {
  const { user, logout, isLoggingOut } = useAuth();

  const handleLogout = () => {
    // El feedback de carga lo muestra el overlay global del AuthProvider.
    logout();
  };

  const handleProfile = () => {
    // TODO: Implementar vista de perfil
    console.log("Ver perfil de:", user?.email);
  };

  return (
    // El título de la sección lo pone cada página (su propio H1), no el navbar.
    // `justify-between` (no `justify-end` como antes): ahora hay un grupo a
    // la izquierda (el botón hamburguesa) además del de la derecha (menú de
    // usuario) — con un solo hijo `justify-end` ya bastaba, con dos hace
    // falta repartirlos en los extremos.
    <header className="flex h-18 items-center justify-between border-b border-base-300 bg-base-100 px-6">
      {showDrawerToggle ? (
        <label
          htmlFor={SIDEBAR_DRAWER_ID}
          aria-label="Mostrar u ocultar el menú"
          className="btn btn-square btn-ghost drawer-button"
        >
          <PanelLeft className="h-5 w-5" />
        </label>
      ) : (
        // Mantiene el grupo de la derecha pegado al borde incluso sin botón
        // (con `justify-between` y un solo hijo, ese hijo se iría al centro).
        <span />
      )}

      <div className="flex items-center gap-4">
        {user && (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-base-content">
                  {user.displayname || "Usuario"}
                </p>
                <p className="text-xs text-base-content/60">{user.email}</p>
              </div>
              {/* Placeholder mientras no haya foto real (pendiente traerla de la
                  API) — `avatar avatar-placeholder` de daisyUI: el div interno
                  es el círculo recortado (aspect-ratio:1 + overflow:hidden viene
                  del propio componente), el fondo/color y el tamaño son clases
                  nuestras. Cuando haya URL real, este `User` se reemplaza por un
                  `<img src={...} />` dentro del mismo div y se quita
                  `avatar-placeholder` (esa clase es solo para centrar contenido
                  que no sea una imagen). */}
              <div className="avatar avatar-placeholder">
                <div className="w-9 rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-base-content/40" />
            </div>

            {/* Menú desplegable */}
            <ul
              tabIndex={0}
              className="dropdown-content menu z-50 w-52 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg"
            >
              <li>
                <button
                  onClick={handleProfile}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-base-content/80 transition-colors hover:bg-base-200"
                >
                  <User className="h-4 w-4" />
                  Ver Perfil
                </button>
              </li>
              <div className="divider my-0"></div>
              <li>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-error transition-colors hover:bg-error/10 disabled:opacity-70"
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

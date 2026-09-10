import { Sidebar, SIDEBAR_DRAWER_ID, useSidebarDrawerState } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Outlet } from "react-router-dom";
import { useAuth } from "./Login/loginLogic";
import NoAccess from "@/pages/NoAccess";

export default function Layout() {
  const { user } = useAuth();
  // Sin permisos → cuenta sin accesos: ni sidebar ni contenido, solo el aviso.
  const noAccess = Boolean(user) && !user?.permissions;
  const [drawerOpen, setDrawerOpen] = useSidebarDrawerState();

  return (
    // `lg:drawer-open`: el sidebar queda SIEMPRE montado en desktop —
    // alterna entre ancho completo/riel de íconos con el checkbox de abajo.
    // En mobile, sin ese modificador, el mecanismo nativo del drawer lo
    // esconde fuera de pantalla hasta que se abre como overlay.
    <div className="drawer lg:drawer-open">
      <input
        id={SIDEBAR_DRAWER_ID}
        type="checkbox"
        className="drawer-toggle"
        checked={drawerOpen}
        onChange={(e) => setDrawerOpen(e.target.checked)}
      />

      <div className="drawer-content flex min-h-screen flex-col bg-base-100">
        <Navbar showDrawerToggle={!noAccess} />
        <main className="flex-1 overflow-y-auto bg-base-200 p-6">
          {noAccess ? <NoAccess /> : <Outlet />}
        </main>
      </div>

      {!noAccess && <Sidebar />}
    </div>
  );
}

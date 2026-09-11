import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  useAuth,
  isGuardianOnly,
  type UserPermissions,
  type PermissionSection,
  type SectionPermissions,
} from "./Login/loginLogic";
// `platform-logo.png` (escudo + wordmark "Gimnasio El Paraíso / Plataforma
// Web"). El archivo original era 3347×1000px con el escudo y el wordmark
// separados por un hueco vacío enorme (~16% del ancho) — al reescalar TODO
// el lienzo para caber en el sidebar, ese hueco diluía el trazo del texto
// (delgado de por sí) hasta volverlo casi blanco, sin importar cuán bueno
// fuera el algoritmo de reescalado (se probó con canvas + smoothing
// 'high'). Se regeneró recortando el escudo y el wordmark por separado
// (a partir de una versión previa comiteada en git, 1000×391 — el archivo
// de 3347×1000 nunca se comiteó y se perdió al sobreescribirlo durante
// esta prueba) y componiéndolos juntos SIN el hueco antes de reescalar:
// así el texto sí sobrevive nítido a 640px de ancho.
import logo from "@/assets/platform-logo.svg";
// Escudo solo (sin wordmark) — versión compacta del logo para cuando el
// sidebar está colapsado a modo "riel de íconos" (w-14 = 56px, donde el
// wordmark completo no cabe).
import compactLogo from "@/assets/logo.png";
import {
  CreditCard,
  NotebookPen,
  BookUser,
  NotebookText,
  Users,
  FileSignature,
  FileText,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Id compartido entre el checkbox oculto (`drawer-toggle`, vive en
// Layout.tsx/AcudienteLayout.tsx — es quien de verdad controla el estado
// abierto/cerrado), el overlay de aquí (para cerrar en mobile tocando
// afuera del sidebar) y el botón que abre/cierra o colapsa/expande, que
// vive en Navbar.tsx (no aquí). Exportado para que Layout/AcudienteLayout/
// Navbar usen el MISMO id sin repetirlo a mano (evita que se
// desincronicen si algún día cambia).
export const SIDEBAR_DRAWER_ID = "app-drawer";

// = breakpoint `lg` de Tailwind (sin overrides en tailwind.config.ts).
const DESKTOP_QUERY = "(min-width: 1024px)";

/** Estado abierto/cerrado del drawer, con el valor inicial correcto según
 * el ancho de pantalla: abierto en desktop, cerrado en mobile. Un solo
 * checkbox no puede tener DOS valores "por defecto" distintos según el
 * breakpoint solo con CSS — `lg:drawer-open` (en Layout/AcudienteLayout)
 * fuerza el sidebar visible en desktop, pero no decide su ANCHO
 * (riel/completo), eso lo sigue controlando el checkbox. Inicializador
 * perezoso de `useState` (no `useEffect`) para que el primer render YA
 * tenga el valor correcto, sin parpadeo abierto→cerrado. */
export function useSidebarDrawerState() {
  return useState(() => window.matchMedia(DESKTOP_QUERY).matches);
}

// Estilo compartido de cada ítem del menú. Sidebar en azul institucional
// (--color-primary) — el resaltador de la página activa usa base-200
// (#F3F4F6, el mismo gris muy claro del theme) con texto primary, para que
// contraste con el fondo navy. Se usa tanto para el menú de staff como para
// el de acudiente — un solo lugar donde vive este token.
// `is-drawer-close:*`: cuando el sidebar está colapsado a riel de íconos,
// el ítem centra su ícono (en vez de alinearlo a la izquierda con el texto
// al lado, que ya está oculto) y reduce su padding horizontal propio (si no,
// con `px-4` fijo el ícono de 20px no entra en los 56px del riel) + muestra
// un tooltip con la etiqueta al pasar el mouse (ver `data-tip` en
// `SidebarNavLink`).
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 is-drawer-close:justify-center is-drawer-close:px-2 is-drawer-close:tooltip is-drawer-close:tooltip-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
    isActive
      ? "bg-base-200 text-primary shadow-sm"
      : "text-primary-content/70 hover:bg-white/10 hover:text-primary-content"
  }`;

/** Un ítem del menú del sidebar — envuelve el `<span>` que se esconde en modo
 * riel (`is-drawer-close:hidden`) y el `data-tip` que usa ese mismo modo
 * para mostrar la etiqueta como tooltip, en un solo lugar en vez de
 * repetirlo en cada `<NavLink>`. */
function SidebarNavLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} data-tip={label} className={navLinkClass}>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="is-drawer-close:hidden">{label}</span>
    </NavLink>
  );
}

/** Header del sidebar: escudo compacto en modo riel, logo completo (con
 * wordmark) en modo expandido — los dos conviven en el DOM y `is-drawer-*`
 * decide cuál se ve, sin lógica de React (el estado abierto/cerrado vive
 * solo en el checkbox nativo, no en el árbol de componentes).
 * `h-18` (no `py-[5px]` solo): mismo alto fijo que `Navbar.tsx` (también
 * `h-18`) — antes este div no tenía alto fijo, solo padding + lo que
 * ocupara el logo, así que su borde inferior quedaba a una altura distinta
 * a la del navbar (dos líneas horizontales paralelas, pero no alineadas).
 * Con la misma altura fija en los dos, sus bordes caen en el mismo punto —
 * y de paso, el borde ya no salta un par de px cuando el header cambia
 * entre escudo compacto (riel) y logo completo (expandido), que miden
 * distinto de alto. */
function SidebarHeader({ onClick }: { onClick: () => void }) {
  return (
    <div className="mb-4 flex h-18 items-center justify-center border-b border-white/10">
      <img
        onClick={onClick}
        src={compactLogo}
        alt="GIMPA"
        className="h-8 w-auto cursor-pointer select-none is-drawer-open:hidden"
        draggable={false}
      />
      {/* Fondo del PNG ya transparente (se deja ver el navy del sidebar
          directo, sin tarjeta clara) — el wordmark ("Gimnasio El Paraíso /
          Plataforma Web") está recoloreado a blanco en el propio archivo
          (antes era texto negro, invisible sobre navy sin una tarjeta;
          ahora es un "negativo" pensado para este fondo). El escudo
          conserva sus colores originales. */}
      <img
        onClick={onClick}
        src={logo}
        alt="GIMPA"
        className="h-auto w-[180px] cursor-pointer select-none is-drawer-close:hidden"
        draggable={false}
      />
    </div>
  );
}

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  section: PermissionSection;
  anyOf: Array<keyof SectionPermissions>;
}

const featureEnvMap: Record<string, boolean> = {
  Notas: import.meta.env.VITE_FEATURE_NOTAS === "true",
  Matriculas: import.meta.env.VITE_FEATURE_MATRICULAS === "true",
  Pagos: import.meta.env.VITE_FEATURE_PAGOS === "true",
  Certificados: import.meta.env.VITE_FEATURE_CERTIFICADOS === "true",
  Usuarios: import.meta.env.VITE_FEATURE_USUARIOS === "true",
  Contratacion: import.meta.env.VITE_FEATURE_CONTRATACION === "true",
  // Admisiones es visible por defecto: se apaga poniendo la variable en "false"
  // (los demás módulos son al revés porque se activaron uno a uno).
  Admisiones: import.meta.env.VITE_FEATURE_ADMISIONES !== "false",
};

const ALL_MENU_ITEMS: MenuItem[] = [
  {
    label: "Notas",
    path: "/notas",
    icon: NotebookPen,
    section: "grades",
    anyOf: ["canView", "canManage"],
  },
  {
    label: "Matriculas",
    path: "/matriculas",
    icon: BookUser,
    section: "enrollments",
    anyOf: ["canView"],
  },
  {
    label: "Pagos",
    path: "/pagos",
    icon: CreditCard,
    section: "payments",
    anyOf: ["canView", "canManage"],
  },
  {
    label: "Certificados",
    path: "/certificados",
    icon: NotebookText,
    section: "certifications",
    anyOf: ["canView", "canManage"],
  },
  {
    label: "Usuarios",
    path: "/usuarios",
    icon: Users,
    section: "users",
    anyOf: ["canView"],
  },
  {
    label: "Admisiones",
    path: "/admisiones-admin",
    icon: GraduationCap,
    section: "admissions",
    anyOf: ["canView"],
  },
];

const hasSectionPermission = (
  permissions: UserPermissions | undefined,
  section: PermissionSection,
  anyOf: Array<keyof SectionPermissions>,
) => {
  if (!permissions) return false;
  const sectionPermissions = permissions[section];
  return anyOf.some((action) => Boolean(sectionPermissions?.[action]));
};

export const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredMenuItems = ALL_MENU_ITEMS.filter(
    (item) =>
      hasSectionPermission(user?.permissions, item.section, item.anyOf) &&
      featureEnvMap[item.label],
  );

  const c = user?.permissions?.contracting;
  const featContrat = featureEnvMap["Contratacion"];
  const showContratacionesAll = featContrat && Boolean(c && (c.canManage || c.canViewAll));
  const showMiContrato = featContrat && Boolean(c && c.canFillOwn);

  if (!user) return null;

  // Un acudiente puro no tiene ningún ítem de ALL_MENU_ITEMS (todos son de secciones
  // de staff, incluido el de "Admisiones" que apunta al panel INTERNO en
  // /admisiones-admin, no al área del acudiente) — se le arma un menú de un solo ítem
  // en vez de intentar reusar el filtro de arriba. Mismo drawer-side/logo/estilo de
  // NavLink que el resto: es el mismo componente, no una copia paralela.
  //
  // Este componente ahora es dueño del `drawer-side` completo (no de un
  // `<aside>` suelto): Layout.tsx/AcudienteLayout.tsx solo ponen el `drawer`
  // + el checkbox `drawer-toggle` + el `drawer-content` alrededor de esto.
  // `is-drawer-close:w-14 is-drawer-open:w-64`: en desktop (`lg:drawer-open`
  // en el wrapper) el sidebar SIEMPRE está montado — alterna entre riel de
  // íconos (56px) y ancho completo (256px) según el checkbox. En mobile (sin
  // `lg:drawer-open`) el mecanismo nativo de daisyUI lo saca fuera de
  // pantalla por completo cuando está "cerrado", así que ahí el w-14 nunca
  // llega a verse — abre como overlay a ancho completo.
  if (isGuardianOnly(user)) {
    return (
      <div className="drawer-side is-drawer-close:overflow-visible">
        <label
          htmlFor={SIDEBAR_DRAWER_ID}
          aria-label="Cerrar menú"
          className="drawer-overlay"
        />
        <div className="flex min-h-full flex-col bg-primary transition-[width] duration-300 is-drawer-close:w-14 is-drawer-open:w-64">
          <SidebarHeader onClick={() => navigate("/admisiones", { replace: true })} />

          <nav className="grow space-y-1 is-drawer-close:px-2 is-drawer-open:px-4">
            <SidebarNavLink to="/admisiones" label="Mis solicitudes" icon={FileText} end />
          </nav>
        </div>
      </div>
    );
  }

  const isAdminRector = user.role === "admin" || user.role === "rector";
  // Cambio visual: los roles que no son admin/rector ven "Matriculas" como "Estudiantes".
  const displayLabel = (label: string) =>
    label === "Matriculas" && !isAdminRector ? "Estudiantes" : label;

  return (
    <div className="drawer-side is-drawer-close:overflow-visible">
      <label
        htmlFor={SIDEBAR_DRAWER_ID}
        aria-label="Cerrar menú"
        className="drawer-overlay"
      />
      <div className="flex min-h-full flex-col bg-primary transition-[width] duration-300 is-drawer-close:w-14 is-drawer-open:w-64">
        <SidebarHeader onClick={() => navigate("/dashboard", { replace: true })} />

        <nav className="grow space-y-1 is-drawer-close:px-2 is-drawer-open:px-4">
          {filteredMenuItems.map((item) => (
            <SidebarNavLink
              key={item.path}
              to={item.path}
              label={displayLabel(item.label)}
              icon={item.icon}
            />
          ))}

          {showContratacionesAll && (
            <SidebarNavLink to="/contratacion" label="Contrataciones" icon={FileSignature} />
          )}

          {showMiContrato && (
            <SidebarNavLink to="/mi-contrato" label="Mi Contrato" icon={FileText} />
          )}

          {user.role === "admin" && (
            <SidebarNavLink to="/roles" label="Roles y Permisos" icon={ShieldCheck} />
          )}
        </nav>
      </div>
    </div>
  );
};

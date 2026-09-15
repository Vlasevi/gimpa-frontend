import { useEffect, useState } from "react";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Info,
  AlertCircle,
  CheckCircle2,
  MailCheck,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "@/assets/logo.png";
import LoginTexture from "@/assets/login-log.svg";
import { useAuth } from "@/components/Login/loginLogic";
import { OtpInput } from "@/components/ui/OtpInput";
import { apiUrl, AUTH_PATHS, API_ENDPOINTS } from "@/utils/api";

// ---- Clases compartidas (ver DESIGN_SYSTEM.md) --------------------------
// Rediseño (mesa de trabajo "Login web" en Illustrator, revisada vía MCP):
// campos con línea inferior en vez de caja, CTA principal verde (accent) en
// vez de navy (primary) — el navy queda para el panel izquierdo y la
// pestaña "Login". Colores verificados 1:1 contra el archivo: el fill del
// botón "Entrar" es RGB(89,175,78) = #59AF4E, exactamente --color-accent.

// Degradado del panel izquierdo. UNA sola fuente de verdad para los dos
// colores — antes `#274978` (el color final) estaba repetido a mano en 3
// lugares sueltos (el propio degradado, el fondo de la pestaña y los dos
// parches de la curva), sin ninguna relación explícita entre ellos: cambiar
// el degradado sin acordarse de los otros 3 sitios los habría desincronizado
// en silencio. PANEL_GRADIENT_FROM ya es --color-primary del theme (mismo
// valor, pero como string literal porque Tailwind no puede leer una var()
// dentro de un degradado armado en JS/inline-style).
const PANEL_GRADIENT_FROM = "#1F3A5F";
const PANEL_GRADIENT_TO = "#274978";

// Geometría de la pestaña "Login" — ver el comentario largo junto al panel
// derecho para el porqué de este enfoque (mordisco recortado, no una pieza
// separada). Medidas fijas (no "auto"): un `clip-path` con `path()` necesita
// coordenadas absolutas, así que el ancho de la pestaña deja de ajustarse
// sola al texto — 150px entra con margen para "Login" + el ícono.
const TAB_TOP = 64; // = top-16 de las versiones anteriores
const TAB_WIDTH = 150;
const TAB_HEIGHT = 54;
const TAB_CORNER_RADIUS = 18;
const CLIP_FAR = 4000; // "infinito" práctico — cualquier panel real es más angosto
// Silueta del panel derecho: un rectángulo (sobredimensionado a propósito;
// el navegador de todos modos no pinta más allá de la caja real del div)
// con un mordisco recortado en la esquina superior izquierda.
// CUATRO esquinas con radio, no dos: además de las dos "normales" donde el
// corte se topa con el material que queda a la derecha (redondeo convexo de
// toda la vida), las otras DOS —donde el corte se topa con la propia costura
// (x=0)— TAMBIÉN llevan radio. Sin esas dos, la conexión con el panel
// izquierdo se veía recta (regresión real: antes, con la técnica vieja de
// dos piezas, sí tenía esa curva en ambos extremos — "se abre hacia afuera
// en los dos lados", confirmado contra el archivo de Illustrator).
// Estas dos esquinas SÍ caben dentro de la caja del panel (x entre 0 y R):
// el arco no necesita "salirse" hacia el panel izquierdo — el centro de cada
// círculo está DENTRO del panel (en x=R, no en x=0), así que el arco completo
// vive en x ∈ [0,R]. Es la misma curva que ya existía en la versión anterior
// (los dos parches de radial-gradient en el costado CLARO de la costura,
// nunca en el oscuro) — aquí, sencillamente, expresada como parte de un solo
// `path()` en vez de dos elementos aparte con degradado.
const RIGHT_PANEL_CLIP_PATH = `path("M0,0 L0,${TAB_TOP - TAB_CORNER_RADIUS} A${TAB_CORNER_RADIUS},${TAB_CORNER_RADIUS} 0 0 0 ${TAB_CORNER_RADIUS},${TAB_TOP} L${TAB_WIDTH - TAB_CORNER_RADIUS},${TAB_TOP} A${TAB_CORNER_RADIUS},${TAB_CORNER_RADIUS} 0 0 1 ${TAB_WIDTH},${TAB_TOP + TAB_CORNER_RADIUS} L${TAB_WIDTH},${TAB_TOP + TAB_HEIGHT - TAB_CORNER_RADIUS} A${TAB_CORNER_RADIUS},${TAB_CORNER_RADIUS} 0 0 1 ${TAB_WIDTH - TAB_CORNER_RADIUS},${TAB_TOP + TAB_HEIGHT} L${TAB_CORNER_RADIUS},${TAB_TOP + TAB_HEIGHT} A${TAB_CORNER_RADIUS},${TAB_CORNER_RADIUS} 0 0 0 0,${TAB_TOP + TAB_HEIGHT + TAB_CORNER_RADIUS} L0,${CLIP_FAR} L${CLIP_FAR},${CLIP_FAR} L${CLIP_FAR},0 Z")`;

const labelClass = "mb-1.5 block text-sm font-semibold text-primary";

const inputClass =
  "h-11 w-full border-0 border-b-2 border-base-300 bg-transparent px-0 pb-2 text-base text-base-content placeholder:text-base-content/40 transition-colors focus:border-primary focus:outline-none focus:ring-0";

// `min-h-*` (no `h-*`): en un teléfono angosto, "Continuar con Microsoft" (ícono +
// texto largo) puede llegar a partirse en dos líneas — con una altura FIJA esa
// segunda línea quedaría recortada. `min-h` deja crecer el botón en ese caso raro,
// sin cambiar nada en el 99% de anchos donde el texto entra en una sola línea.
const primaryBtnClass =
  "flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-accent px-6 text-base font-medium text-accent-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const secondaryBtnClass =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-base-300 bg-base-100 px-6 text-base font-medium text-base-content transition-all duration-200 ease-out hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 motion-reduce:transition-none";

const linkClass =
  "font-medium text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:underline";

// ---- Subcomponentes -----------------------------------------------------
type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
};

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: FieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-4 text-base-content/50 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-base-300" />
      <span className="text-sm text-base-content/50">{label}</span>
      <span className="h-px flex-1 bg-base-300" />
    </div>
  );
}

type NoticeTone = "info" | "error" | "success";

const NOTICE_STYLES: Record<NoticeTone, { box: string; icon: string }> = {
  info: {
    box: "border-base-300 bg-base-200 text-base-content/70",
    icon: "text-primary",
  },
  error: {
    box: "border-error/25 bg-error/5 text-base-content/80",
    icon: "text-error",
  },
  success: {
    box: "border-accent/30 bg-accent/5 text-base-content/80",
    icon: "text-accent",
  },
};

function Notice({
  message,
  tone = "info",
}: {
  message: string;
  tone?: NoticeTone;
}) {
  const styles = NOTICE_STYLES[tone];
  const Icon =
    tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${styles.box}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
      <span>{message}</span>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver
    </button>
  );
}

/** Encabezado de una vista secundaria. */
function ViewHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl font-bold tracking-tight text-secondary">
        {title}
      </h1>
      <p className="mt-1 text-sm text-base-content/60">{subtitle}</p>
    </div>
  );
}

// ---- Pantalla -----------------------------------------------------------
type View = "main" | "email" | "register" | "verify" | "reset" | "resetConfirm";

const RESEND_COOLDOWN_SECONDS = 30;

export default function Login() {
  const navigate = useNavigate();
  const { loginWithPayload } = useAuth();
  const [view, setView] = useState<View>("main");
  const [isConnecting, setIsConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(
    null,
  );
  const [rememberMe, setRememberMe] = useState(false);

  // Login por correo
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registro del acudiente
  const [reg, setReg] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });

  // Verificación / recuperación
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const goTo = (next: View) => {
    setNotice(null);
    setSubmitting(false);
    setView(next);
  };

  const fail = (text: string) => {
    setNotice({ text, tone: "error" });
    setSubmitting(false);
  };

  /** POST JSON al API público (sin token). Devuelve [ok, data]. */
  const postJson = async (path: string, body: unknown) => {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return [res.ok, data] as const;
  };

  /** Extrae un mensaje legible de la respuesta de error de DRF. */
  const errorText = (data: Record<string, unknown>, fallback: string) => {
    if (typeof data?.detail === "string") return data.detail;
    const first = Object.values(data || {})[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    return fallback;
  };

  // SSO de Microsoft: navegación de página completa hacia el back.
  const handleMicrosoftLogin = () => {
    setIsConnecting(true);
    window.location.href = apiUrl(AUTH_PATHS.loginSocial);
  };

  // Login real por correo/contraseña (acudientes de admisiones).
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const [ok, data] = await postJson(AUTH_PATHS.loginAdmissions, {
        email,
        password,
      });
      if (ok) {
        loginWithPayload(data);
        // "/" decide el destino según el acceso del usuario (staff vs acudiente).
        navigate("/", { replace: true });
      } else {
        fail(errorText(data, "Correo o contraseña incorrectos."));
      }
    } catch {
      fail("No pudimos conectar con el servidor. Intenta de nuevo.");
    }
  };

  // Registro real: crea la cuenta y pasa a verificar el correo.
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reg.password !== reg.confirm) {
      fail("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const [ok, data] = await postJson(API_ENDPOINTS.admissionsRegister, {
        email: reg.email,
        password: reg.password,
        first_name: reg.firstName,
        last_name: reg.lastName,
      });
      if (ok) {
        setPendingEmail(reg.email);
        setCode("");
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setView("verify");
        setNotice({
          text: `Enviamos un código de 6 dígitos a ${reg.email}.`,
          tone: "success",
        });
        setSubmitting(false);
      } else {
        fail(errorText(data, "No pudimos crear la cuenta."));
      }
    } catch {
      fail("No pudimos conectar con el servidor. Intenta de nuevo.");
    }
  };

  // Verificación del correo: activa la cuenta y entra directo.
  // `codeOverride`: usado por `OtpInput.onComplete` (autosubmit al completar/pegar el
  // código) para mandar el valor recién completado en vez de leer `code` del estado —
  // en ese punto React todavía no aplicó el `setCode(...)` que disparó este completado
  // (bug real: al pegar el código de un tirón, `code` seguía vacío aquí y el backend
  // respondía "código requerido"). El submit manual del `<form>` sigue sin pasar nada,
  // así que usa `code` normalmente.
  const verifyOtp = async (codeOverride?: string) => {
    setSubmitting(true);
    setNotice(null);
    try {
      const [ok, data] = await postJson(API_ENDPOINTS.admissionsVerifyOtp, {
        email: pendingEmail,
        code: codeOverride ?? code,
      });
      if (ok) {
        loginWithPayload(data);
        // "/" decide el destino según el acceso del usuario (staff vs acudiente).
        navigate("/", { replace: true });
      } else {
        fail(errorText(data, "El código no es válido."));
      }
    } catch {
      fail("No pudimos conectar con el servidor. Intenta de nuevo.");
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtp();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setNotice(null);
    try {
      await postJson(API_ENDPOINTS.admissionsResendOtp, { email: pendingEmail });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      // Código nuevo: casillas vacías y el cursor en la primera.
      setCode("");
      document.getElementById("otp")?.focus();
      setNotice({ text: "Te enviamos un código nuevo.", tone: "success" });
    } catch {
      fail("No pudimos reenviar el código.");
    }
  };

  // Recuperación: solicitar código.
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      await postJson(API_ENDPOINTS.admissionsPasswordReset, {
        email: pendingEmail,
      });
      setCode("");
      setNewPassword("");
      setView("resetConfirm");
      // Mensaje deliberadamente genérico: no revelamos si la cuenta existe.
      setNotice({
        text: `Si ${pendingEmail} corresponde a una cuenta, enviamos un código de recuperación.`,
        tone: "success",
      });
      setSubmitting(false);
    } catch {
      fail("No pudimos conectar con el servidor. Intenta de nuevo.");
    }
  };

  // Recuperación: confirmar código + nueva contraseña.
  // `codeOverride`: mismo motivo que en `verifyOtp` — ver ese comentario.
  const resetPasswordWithCode = async (codeOverride?: string) => {
    setSubmitting(true);
    setNotice(null);
    try {
      const [ok, data] = await postJson(
        API_ENDPOINTS.admissionsPasswordResetConfirm,
        { email: pendingEmail, code: codeOverride ?? code, new_password: newPassword },
      );
      if (ok) {
        setEmail(pendingEmail);
        setPassword("");
        setView("email");
        setNotice({
          text: "Contraseña actualizada. Ya puedes iniciar sesión.",
          tone: "success",
        });
        setSubmitting(false);
      } else {
        fail(errorText(data, "No pudimos actualizar la contraseña."));
      }
    } catch {
      fail("No pudimos conectar con el servidor. Intenta de nuevo.");
    }
  };

  const handleResetConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    resetPasswordWithCode();
  };

  return (
    // `min-h-dvh` (no `min-h-screen`): en móviles, la barra del navegador
    // aparece/desaparece al hacer scroll y cambia el 100vh real — `min-h-screen`
    // (fijo al alto de la PRIMERA carga) deja una franja vacía o recorta contenido
    // según el momento. `dvh` (dynamic viewport height) sigue el alto real en cada
    // instante; en desktop no hay barra dinámica, así que se ve exactamente igual.
    <div className="relative flex min-h-dvh bg-base-200">
      {/* Capa azul de ancho COMPLETO, detrás de todo — así se construye en el
          archivo de Illustrator (comprobado inspeccionándolo con el usuario):
          NO son dos piezas separadas (panel + pestaña) que deban coincidir en
          color; es una sola capa azul de fondo, y el panel CLARO de encima
          tiene un mordisco recortado que la deja ver. Antes intentamos lo
          contrario (una pestaña navy aparte tratando de "adivinar" el mismo
          azul del panel) y esa costura entre dos piezas fue el origen de
          todos los bugs de renderizado que fuimos arreglando uno por uno
          (sombra, línea de subpíxel, etc.) — con esta construcción no hay
          NINGUNA costura que alinear: el azul que se ve en el mordisco es
          literalmente el mismo píxel de fondo, no una copia aproximada.
          `90%`→`45%` en el segundo stop del degradado: antes esto pintaba
          solo el ancho del panel izquierdo (50vw), ahora pinta el ancho
          COMPLETO (100vw) — para que el degradado se vea IGUAL que antes en
          la mitad visible, el punto sólido tiene que caer en el mismo píxel
          absoluto: 90% de 50vw = 45% de 100vw. */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          backgroundImage: `linear-gradient(to right, ${PANEL_GRADIENT_FROM} 0%, ${PANEL_GRADIENT_TO} 45%)`,
        }}
      />

      {/* Escudo + textura del panel izquierdo — ya SIN fondo propio (lo pinta
          la capa azul de atrás); esta caja es puro contenido. */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        {/* Textura decorativa: `login-log.svg` (subida por el usuario a
            assets), un motivo tipo escudo/compás con degradado propio hacia
            transparente. Es puramente ornamental (`aria-hidden`, `alt=""`) y
            va DETRÁS del escudo (antes en el DOM ⇒ pinta primero). POSICIÓN
            A AJUSTAR A OJO (usuario, prueba y error): no es full-bleed, va
            en un punto puntual del panel. */}
        <img
          src={LoginTexture}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 w-[85%] select-none opacity-40"
          draggable={false}
        />
        <img
          src={Logo}
          alt="Escudo de Gimnasio El Paraíso"
          className="relative h-64 w-auto select-none xl:h-90"
          draggable={false}
        />
      </div>

      {/* Pestaña "Login": ya no es una pieza propia (pill/sombra/parches de
          gradiente) — es el TEXTO flotando sobre el mordisco del panel
          derecho, así que se ve directo el azul real de la capa de fondo
          detrás. `left-1/2`: mismo punto que el mordisco (0 relativo al
          panel derecho = 50% del wrapper completo, la costura).
          HERMANO del panel derecho, NO hijo — un `clip-path` recorta TODO
          su subárbol (fondo Y contenido), así que si este texto viviera
          dentro del panel recortado, el mordisco se lo comería a él
          también (pasó: quedaba invisible). Puesto aquí, en el wrapper sin
          recorte, cae en el mismo punto de pantalla pero no lo afecta el
          `clip-path` de su vecino. */}
      <div
        className="pointer-events-none absolute left-1/2 z-10 hidden items-center justify-center gap-2.5 text-base font-semibold text-primary-content lg:flex"
        style={{ top: TAB_TOP, width: TAB_WIDTH, height: TAB_HEIGHT }}
      >
        <User className="h-5 w-5" aria-hidden="true" />
        Login
      </div>

      {/* Panel derecho — acceso.
          `pt-6 sm:pt-10` / `pb-[calc(1.5rem_+_...)] sm:pb-[calc(2.5rem_+_...)]`:
          menos aire arriba/abajo SOLO en celulares (bajo 640px) — el formulario de
          registro (5 campos) es el más largo de las 5 vistas y en un teléfono chico
          pedía scroll; en tablets/desktop queda igual que antes (2.5rem).
          `calc(...+env(safe-area-inset-bottom))` (el `_` es el espacio que exige la
          sintaxis de `calc()` alrededor de `+`/`-`, codificado así porque un valor
          arbitrario de Tailwind no puede llevar espacios literales): en iPhones con
          home indicator (sin botón físico) el sistema reserva una franja abajo — sin
          esto el footer puede quedar tapado o pegado al borde. `env(...)` vale 0 en
          cualquier pantalla sin esa franja (todo lo demás, incluido desktop). */}
      {/* `lg:[clip-path:var(--tab-clip)]` (no `style.clipPath` directo): el
          mordisco solo debe existir en el layout de escritorio partido en
          dos — en mobile este mismo div es el único panel visible, a todo el
          ancho, y el mordisco caería encima del escudo grande de la vista
          principal (mismo rango vertical). `clipPath` en `style` no admite
          un prefijo `lg:` (no es una clase), así que la ruta solo se GUARDA
          en una variable CSS aquí (inocua por sí sola) y una clase con
          prefijo responsive es la que de verdad la activa — por debajo de
          `lg` esa clase ni siquiera se aplica, así que no hay recorte. */}
      <div
        className="relative flex w-full flex-col items-center justify-center overflow-y-auto bg-base-200 px-6 pt-6 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] sm:px-10 sm:pt-10 sm:pb-[calc(2.5rem_+_env(safe-area-inset-bottom))] lg:w-1/2 lg:[clip-path:var(--tab-clip)]"
        style={{ "--tab-clip": RIGHT_PANEL_CLIP_PATH } as React.CSSProperties}
      >
        <div className="w-full max-w-sm">
          <div>
            {/* Marca — solo en mobile Y solo en la vista principal, donde no hay
                panel izquierdo con el escudo grande. En desktop el archivo de
                diseño no repite el escudo aquí. En las vistas secundarias
                (registro, login, verificar, recuperar) se quita: el botón
                "Volver" + el título ya dan contexto de dónde está el usuario,
                y en un celular chico repetir 96px de escudo en CADA paso de
                un formulario largo (registro tiene 5 campos) forzaba scroll
                que no hacía falta. */}
            {view === "main" && (
              <div className="mb-8 flex flex-col items-center text-center lg:hidden">
                <img
                  src={Logo}
                  alt="Escudo de Gimnasio El Paraíso"
                  className="h-16 w-auto select-none"
                  draggable={false}
                />
              </div>
            )}

            {/* ---------------- Vista principal ---------------- */}
            {view === "main" && (
              <div key="main" className="animate-view-in space-y-6">
                <div className="text-center">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-secondary">
                    Bienvenid@s
                  </h1>
                  <p className="mt-2 text-base text-base-content/60">
                    Plataforma de gestión institucional
                  </p>
                </div>

                {notice && <Notice message={notice.text} tone={notice.tone} />}

                {/* Microsoft (staff) queda neutro a propósito: es un botón de SSO de un
                    tercero, no debe teñirse con el verde de marca — ese color se reserva
                    para el CTA real de esta pantalla ("Iniciar sesión con correo"),
                    el mismo rol que tiene "Entrar" en el archivo de diseño. */}
                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isConnecting}
                  className={secondaryBtnClass}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Conectando…
                    </>
                  ) : (
                    <>
                      <MicrosoftIcon />
                      Continuar con Microsoft
                    </>
                  )}
                </button>

                <Divider label="o" />

                <div>
                  <button
                    type="button"
                    onClick={() => goTo("email")}
                    className={primaryBtnClass}
                  >
                    Iniciar sesión con correo
                  </button>
                  <p className="mt-2.5 text-center text-sm text-base-content/60">
                    Solo para{" "}
                    <span className="font-semibold text-primary">
                      aspirantes en proceso de admisión
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* ---------------- Vista correo/contraseña ---------------- */}
            {view === "email" && (
              <div key="email" className="animate-view-in">
                <BackButton onClick={() => goTo("main")} />

                <ViewHeading
                  title="Iniciar sesión"
                  subtitle="Ingresa con tu correo y contraseña."
                />

                {/* Aviso permanente: este acceso es solo para admisiones */}
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-base-content/70">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Acceso exclusivo para{" "}
                    <strong className="font-semibold text-base-content">
                      aspirantes de admisiones
                    </strong>
                    . Si perteneces al colegio, ingresa con Microsoft.
                  </span>
                </div>

                {notice && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <TextField
                    id="email"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                  />
                  <PasswordField
                    id="password"
                    label="Contraseña"
                    value={password}
                    onChange={setPassword}
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                  />

                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="text-sm text-base-content/70">
                        Recuérdame
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingEmail(email);
                        goTo("reset");
                      }}
                      className={`text-sm ${linkClass}`}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={primaryBtnClass}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Verificando…
                      </>
                    ) : (
                      "Iniciar sesión"
                    )}
                  </button>
                </form>

                {/* mt-4 en mobile, sm:mt-6 desde tablets/desktop — mismo motivo que
                    el resto de recortes de espaciado en esta pantalla: menos aire
                    en celulares chicos para no forzar scroll (registro es el
                    formulario más largo de las 5 vistas). */}
                <p className="mt-4 text-center text-sm text-base-content/60 sm:mt-6">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => goTo("register")}
                    className={linkClass}
                  >
                    Regístrate
                  </button>
                </p>
              </div>
            )}

            {/* ---------------- Vista registro ---------------- */}
            {view === "register" && (
              <div key="register" className="animate-view-in">
                <BackButton onClick={() => goTo("email")} />

                <ViewHeading
                  title="Crear cuenta"
                  subtitle="Con esta cuenta gestionas la admisión de tus hijos."
                />

                {notice && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                {/* space-y-4 en mobile (sm:space-y-5 desde tablets/desktop, igual que
                    antes): este es el formulario más largo de las 5 vistas — 16px
                    menos entre sus 5 campos ayuda a no forzar scroll en celulares
                    chicos. */}
                <form onSubmit={handleRegisterSubmit} className="space-y-4 sm:space-y-5">
                  {/* Vuelta a `grid-cols-2` fijo (se probó apilar en 1 columna bajo
                      640px, pero eso sumaba ~82px extra justo en el formulario más
                      largo de las 5 vistas — forzaba scroll en celulares chicos sin
                      necesidad real: son campos cortos ("Nombres"/"Apellidos"),
                      entran bien lado a lado incluso a 320px. */}
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      id="reg-first"
                      label="Nombres"
                      value={reg.firstName}
                      onChange={(v) => setReg({ ...reg, firstName: v })}
                      placeholder="María"
                      autoComplete="given-name"
                    />
                    <TextField
                      id="reg-last"
                      label="Apellidos"
                      value={reg.lastName}
                      onChange={(v) => setReg({ ...reg, lastName: v })}
                      placeholder="Pérez"
                      autoComplete="family-name"
                    />
                  </div>
                  <TextField
                    id="reg-email"
                    label="Correo electrónico"
                    type="email"
                    value={reg.email}
                    onChange={(v) => setReg({ ...reg, email: v })}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                  />
                  <PasswordField
                    id="reg-password"
                    label="Contraseña"
                    value={reg.password}
                    onChange={(v) => setReg({ ...reg, password: v })}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="reg-confirm"
                    label="Confirmar contraseña"
                    value={reg.confirm}
                    onChange={(v) => setReg({ ...reg, confirm: v })}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className={primaryBtnClass}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creando cuenta…
                      </>
                    ) : (
                      "Crear cuenta"
                    )}
                  </button>
                </form>

                {/* mt-4 en mobile, sm:mt-6 desde tablets/desktop — mismo motivo que
                    el resto de recortes de espaciado en esta pantalla: menos aire
                    en celulares chicos para no forzar scroll (registro es el
                    formulario más largo de las 5 vistas). */}
                <p className="mt-4 text-center text-sm text-base-content/60 sm:mt-6">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => goTo("email")}
                    className={linkClass}
                  >
                    Inicia sesión
                  </button>
                </p>
              </div>
            )}

            {/* ---------------- Vista verificación de correo ---------------- */}
            {view === "verify" && (
              <div key="verify" className="animate-view-in">
                <BackButton onClick={() => goTo("register")} />

                <div className="mb-5 flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-secondary">
                    Verifica tu correo
                  </h1>
                  <p className="mt-1 text-sm text-base-content/60">
                    Escribe el código de 6 dígitos que enviamos a{" "}
                    <span className="font-medium text-base-content">
                      {pendingEmail}
                    </span>
                    .
                  </p>
                </div>

                {notice && notice.tone !== "error" && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                <form onSubmit={handleVerifySubmit} className="space-y-5">
                  <div>
                    <OtpInput
                      id="otp"
                      label="Código de verificación"
                      hideLabel
                      value={code}
                      onChange={setCode}
                      autoFocus
                      onComplete={verifyOtp}
                      error={notice?.tone === "error" ? notice.text : undefined}
                    />
                    <p className="mt-2 text-center text-xs text-base-content/50">
                      El código vence en 5 minutos.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || code.length < 6}
                    className={primaryBtnClass}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Verificando…
                      </>
                    ) : (
                      "Verificar y continuar"
                    )}
                  </button>
                </form>

                {/* mt-4 en mobile, sm:mt-6 desde tablets/desktop — mismo motivo que
                    el resto de recortes de espaciado en esta pantalla: menos aire
                    en celulares chicos para no forzar scroll (registro es el
                    formulario más largo de las 5 vistas). */}
                <p className="mt-4 text-center text-sm text-base-content/60 sm:mt-6">
                  ¿No te llegó?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    className={`${linkClass} disabled:cursor-not-allowed disabled:text-base-content/40 disabled:no-underline`}
                  >
                    {cooldown > 0
                      ? `Reenviar en ${cooldown}s`
                      : "Reenviar código"}
                  </button>
                </p>
              </div>
            )}

            {/* ---------------- Vista recuperar: pedir código ---------------- */}
            {view === "reset" && (
              <div key="reset" className="animate-view-in">
                <BackButton onClick={() => goTo("email")} />

                <ViewHeading
                  title="Recuperar contraseña"
                  subtitle="Te enviaremos un código para crear una nueva."
                />

                {notice && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                <form onSubmit={handleResetRequest} className="space-y-5">
                  <TextField
                    id="reset-email"
                    label="Correo electrónico"
                    type="email"
                    value={pendingEmail}
                    onChange={setPendingEmail}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !pendingEmail}
                    className={primaryBtnClass}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      "Enviar código"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ---------------- Vista recuperar: nueva contraseña ---------------- */}
            {view === "resetConfirm" && (
              <div key="resetConfirm" className="animate-view-in">
                <BackButton onClick={() => goTo("reset")} />

                <ViewHeading
                  title="Nueva contraseña"
                  subtitle="Escribe el código que recibiste y tu nueva contraseña."
                />

                {notice && notice.tone !== "error" && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                <form onSubmit={handleResetConfirm} className="space-y-5">
                  <div>
                    <OtpInput
                      id="reset-otp"
                      label="Código de recuperación"
                      hideLabel
                      value={code}
                      onChange={setCode}
                      autoFocus
                      // A diferencia del form de verificación, aquí el código NO es el
                      // único campo requerido — `PasswordField` no tiene `required`
                      // nativo (por el toggle mostrar/ocultar), así que sin esta guarda
                      // se enviaría `new_password: ""` apenas se completa el código.
                      onComplete={(value) => {
                        if (newPassword) resetPasswordWithCode(value);
                      }}
                      error={notice?.tone === "error" ? notice.text : undefined}
                    />
                  </div>
                  <PasswordField
                    id="reset-password"
                    label="Nueva contraseña"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="submit"
                    disabled={submitting || code.length < 6 || !newPassword}
                    className={primaryBtnClass}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Guardando…
                      </>
                    ) : (
                      "Cambiar contraseña"
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer — mt-4 en mobile (mismo motivo que los mt-6→mt-4 de arriba: menos
              aire para no forzar scroll en celulares chicos; sm:mt-6 = igual que
              antes desde tablets/desktop). */}
          <p className="mt-4 text-center text-xs text-base-content/40 sm:mt-6">
            © {new Date().getFullYear()} Gimnasio El Paraíso
          </p>
        </div>
      </div>
    </div>
  );
}

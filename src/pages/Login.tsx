import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Info,
  AlertCircle,
  CheckCircle2,
  MailCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/login-hero.webp";
import Logo from "@/assets/logo.png";
import { useAuth } from "@/components/Login/loginLogic";
import { OtpInput } from "@/components/ui/OtpInput";
import { apiUrl, AUTH_PATHS, API_ENDPOINTS } from "@/utils/api";

// ---- Clases compartidas (ver DESIGN_SYSTEM.md) --------------------------
const labelClass = "mb-1.5 block text-sm font-medium text-base-content/70";

const inputClass =
  "h-12 w-full rounded-lg border border-base-300 bg-base-200 px-4 text-base text-base-content placeholder:text-base-content/40 transition-colors focus:border-primary focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/40";

const primaryBtnClass =
  "flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 text-base font-medium text-primary-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const secondaryBtnClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 px-6 text-base font-medium text-base-content transition-all duration-200 ease-out hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 motion-reduce:transition-none";

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

  // Refs a los 2 `<form>` con OTP, para que `OtpInput.onComplete` pueda autoenviar
  // (`requestSubmit()`) reutilizando el `onSubmit` real de cada uno tal cual, sin
  // duplicar su lógica de validación/POST.
  const verifyFormRef = useRef<HTMLFormElement>(null);
  const resetConfirmFormRef = useRef<HTMLFormElement>(null);

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
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const [ok, data] = await postJson(API_ENDPOINTS.admissionsVerifyOtp, {
        email: pendingEmail,
        code,
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

  const handleResend = async () => {
    if (cooldown > 0) return;
    setNotice(null);
    try {
      await postJson(API_ENDPOINTS.admissionsResendOtp, { email: pendingEmail });
      setCooldown(RESEND_COOLDOWN_SECONDS);
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
  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const [ok, data] = await postJson(
        API_ENDPOINTS.admissionsPasswordResetConfirm,
        { email: pendingEmail, code, new_password: newPassword },
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

  return (
    <div className="flex min-h-screen bg-base-100">
      {/* Panel izquierdo — hero */}
      <div className="relative hidden overflow-hidden lg:block lg:w-1/2 xl:w-3/5">
        <img
          src={heroImage}
          alt="Estudiantes de Gimnasio El Paraíso"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-secondary/95 via-secondary/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          {/* Acento de marca */}
          <div className="mb-4 h-1 w-12 rounded-full bg-accent" />
          <h2 className="font-display text-3xl font-semibold text-white xl:text-4xl">
            Gimnasio El Paraíso
          </h2>
          <p className="mt-3 max-w-md font-display text-lg font-light italic leading-snug text-white/85 xl:text-xl">
            «Con Fe, Esfuerzo y Sabiduría, formamos la Esperanza del Mañana»
          </p>
        </div>
        {/* Filo de acento en el borde interior del hero */}
        <div className="absolute inset-y-0 right-0 w-1 bg-accent/70" />
      </div>

      {/* Panel derecho — acceso */}
      <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-base-100 px-6 py-10 sm:px-10 lg:w-1/2 xl:w-2/5">
        <div className="w-full max-w-sm">
          <div>
            {/* Marca */}
            <div className="mb-8 flex flex-col items-center text-center">
              <img
                src={Logo}
                alt="Escudo de Gimnasio El Paraíso"
                className="h-16 w-auto select-none"
                draggable={false}
              />
            </div>

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

                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isConnecting}
                  className={primaryBtnClass}
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
                    className={secondaryBtnClass}
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

                <p className="mt-6 text-center text-sm text-base-content/60">
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

                <form onSubmit={handleRegisterSubmit} className="space-y-5">
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

                <p className="mt-6 text-center text-sm text-base-content/60">
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

                {notice && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                <form ref={verifyFormRef} onSubmit={handleVerifySubmit} className="space-y-5">
                  <div>
                    <OtpInput
                      id="otp"
                      label="Código de verificación"
                      hideLabel
                      value={code}
                      onChange={setCode}
                      autoFocus
                      onComplete={() => verifyFormRef.current?.requestSubmit()}
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

                <p className="mt-6 text-center text-sm text-base-content/60">
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

                {notice && (
                  <div className="mb-5">
                    <Notice message={notice.text} tone={notice.tone} />
                  </div>
                )}

                <form ref={resetConfirmFormRef} onSubmit={handleResetConfirm} className="space-y-5">
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
                      // `requestSubmit()` no lo bloquearía y se enviaría
                      // `new_password: ""` apenas se completa el código.
                      onComplete={() => {
                        if (newPassword) resetConfirmFormRef.current?.requestSubmit();
                      }}
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

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-base-content/40">
            © {new Date().getFullYear()} Gimnasio El Paraíso
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { apiUrl, AUTH_PATHS } from "@/utils/api";
import { useAuth } from "@/components/Login/loginLogic";

// Aterrizaje del SSO: el back nos redirigió con ?code=... Aquí lo canjeamos por los
// tokens vía POST /login-social/exchange (los tokens nunca viajan en la URL).
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithPayload } = useAuth();
  const [error, setError] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita doble ejecución en StrictMode
    ran.current = true;

    const code = params.get("code");
    const authError = params.get("error");

    if (authError || !code) {
      navigate("/login?error=auth_failed", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch(apiUrl(AUTH_PATHS.loginSocialExchange), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          loginWithPayload(data);
          navigate("/", { replace: true });
        } else {
          setError(true);
          setTimeout(() => navigate("/login?error=exchange_failed", { replace: true }), 1800);
        }
      } catch {
        setError(true);
        setTimeout(() => navigate("/login?error=exchange_failed", { replace: true }), 1800);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-base-100 text-base-content/70">
      {error ? (
        <>
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm">No se pudo completar el inicio de sesión. Redirigiendo…</p>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Iniciando sesión…</p>
        </>
      )}
    </div>
  );
}

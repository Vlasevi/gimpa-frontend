/**
 * Paso 1 — Verificación con código al correo del acudiente (OTP).
 *
 * El OTP se pide cada vez que se entra al asistente (decisión 18: queda como está; es
 * una medida de seguridad). Lo que cambió (hallazgos #4 y #5): la pantalla dice a qué
 * correo llegó el código (enmascarado) y los botones conservan su texto mientras cargan.
 */

import { useState } from "react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";

import { OtpInput } from "@/components/ui/OtpInput";
import { primaryBtnClass } from "@/components/ui/formStyles";
import { ApiError, enrollmentApi } from "@/components/matriculas/enrollmentApi";
import { titleClass } from "@/components/ui/textStyles";

export function StepVerification({ onVerified }: { onVerified: () => void }) {
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await enrollmentApi.requestOtp();
      setMaskedEmail(res.masked_email);
      setCode("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar el código.");
    } finally {
      setSending(false);
    }
  };

  // `value` llega desde `OtpInput.onComplete` (al pegar o completar): el estado `code`
  // todavía no se actualizó en ese instante.
  const validate = async (value?: string) => {
    const typed = value ?? code;
    if (typed.length !== 6) return;
    setValidating(true);
    setError(null);
    try {
      const res = await enrollmentApi.validateOtp(typed);
      if (res.valid) onVerified();
      else setError(res.message || "Código incorrecto.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo validar el código.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <section aria-labelledby="step-title" className="space-y-5">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h2 id="step-title" className={titleClass}>
            Verificación del acudiente
          </h2>
          <p className="mt-1 text-sm text-base-content/70">
            Antes de continuar, el acudiente registrado debe confirmar la matrícula con un
            código que enviamos a su correo.
          </p>
        </div>
      </div>

      {!maskedEmail ? (
        <div className="space-y-3">
          {error && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {error}
            </div>
          )}
          <button type="button" className={primaryBtnClass} onClick={requestCode} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {sending ? "Enviando código…" : "Enviar código"}
          </button>
        </div>
      ) : (
        <div className="mx-auto flex w-fit flex-col gap-4 animate-view-in">
          <p className="flex items-center gap-2 rounded-lg bg-base-200 px-4 py-3 text-sm text-base-content/80" role="status">
            <MailCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Enviamos un código a <strong className="font-semibold">{maskedEmail}</strong>. Vence en 5 minutos.
            </span>
          </p>
          <OtpInput
            label="Código de 6 dígitos"
            value={code}
            onChange={setCode}
            disabled={validating}
            onComplete={validate}
            error={error || undefined}
          />
          <button
            type="button"
            className={`${primaryBtnClass} w-full`}
            onClick={() => validate()}
            disabled={validating || code.length !== 6}
          >
            {validating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {validating ? "Validando…" : "Validar y continuar"}
          </button>
          <p className="text-center text-sm text-base-content/60">
            ¿No llegó?{" "}
            <button
              type="button"
              onClick={requestCode}
              disabled={sending}
              className="font-medium text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-base-content/40"
            >
              {sending ? "Enviando…" : "Enviar otro código"}
            </button>
          </p>
        </div>
      )}
    </section>
  );
}

import { useId } from "react";

import { labelClass } from "@/components/ui/formStyles";

/**
 * Campo de código de verificación (OTP), unificado a partir de 4 instancias casi
 * idénticas que existían por separado: `matriculas/Step1Verification.tsx`,
 * `contratacion/ContratacionEmpleado.tsx` y `pages/Login.tsx` (×2: verificación de
 * registro y recuperación de contraseña). Las 3 primeras usaban un `<input
 * input-bordered>` plano; solo `Login.tsx` tenía una versión "grande" a mano
 * (`otpInputClass`: h-16, text-3xl, tracking-[0.4em]) — visualmente inconsistentes
 * entre sí pese a cumplir la misma función.
 *
 * Construido sobre el componente nativo `otp` de daisyUI (verificado en
 * `node_modules/daisyui/components/otp.css`, presente desde 5.x): un único `<input>`
 * real (con `letter-spacing` calculado por la propia librería para alinear cada dígito
 * con su casilla) envuelto en un `<label className="otp">` junto a N `<span>` vacíos
 * puramente decorativos — el `<label>` que envuelve el `<input>` es lo que permite que
 * un clic en cualquier casilla (incluida un `<span>`, que tiene `pointer-events: none`
 * en el `<input>` real) enfoque el campo, vía el comportamiento nativo del navegador
 * para `<label>` que envuelve su control. El ancho del `.otp` escala solo según cuántos
 * `<span>` hijos tiene (`.otp:has(>span:nth-child(N))`, definido hasta N=8 en la hoja de
 * daisyUI) — no hace falta reproducir a mano el ejemplo de 4 dígitos de la
 * documentación; aquí se generan `length` spans (6 en las 4 instancias reales de GIMPA).
 *
 * Filtrado de dígitos (`replace(/\D/g, "").slice(0, length)`) tomado de la versión de
 * `Login.tsx`, la más completa de las 4 — las otras dos dejaban pasar cualquier
 * carácter y solo confiaban en `maxLength`.
 */
export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Dígitos del código. Las 4 instancias reales de GIMPA usan 6. */
  length?: number;
  /** Texto del label. Si no se pasa, no se renderiza ningún `<label htmlFor>` visible
   * (Login.tsx ya trae su propio encabezado/descripción arriba del campo). */
  label?: string;
  /** Oculta visualmente el label (sr-only) sin quitarlo del árbol de accesibilidad —
   * caso de Login.tsx, que ya muestra el texto equivalente en un `<h1>` cercano. */
  hideLabel?: boolean;
  id?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Se dispara cuando, tras un cambio del usuario, el valor filtrado alcanza `length`
   * dígitos — pensado para autosubmit del formulario contenedor (ver consumidores). No
   * se dispara por cambios que no vengan de una edición real (solo hay un `onChange` de
   * DOM real por interacción, así que no hace falta deduplicar contra el `value` previo). */
  onComplete?: () => void;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  label,
  hideLabel = false,
  id,
  autoFocus,
  disabled,
  required = true,
  onComplete,
}: OtpInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="form-control w-full">
      {label && (
        <label htmlFor={inputId} className={hideLabel ? "sr-only" : labelClass}>
          {label}
        </label>
      )}
      <label className="otp otp-lg otp-primary mx-auto">
        {Array.from({ length }).map((_, i) => (
          <span key={i} />
        ))}
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`[0-9]{${length}}`}
          maxLength={length}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          value={value}
          // Color primario en los dígitos: la CSS de daisyUI (`--input-color`) solo tiñe
          // el borde/outline de las casillas, nunca el texto del `<input>` real — sin
          // esto los dígitos se ven negros (`base-content`) pese a `otp-primary`.
          className="font-bold text-primary"
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(next);
            if (next.length === length) onComplete?.();
          }}
        />
      </label>
    </div>
  );
}

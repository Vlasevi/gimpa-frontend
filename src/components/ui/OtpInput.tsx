import { useEffect, useId, useRef } from "react";

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
  /** Default `true`: el campo aparece siempre justo después de una acción del usuario
   * (pedir/reenviar código), así que lo natural es que el cursor ya esté puesto ahí —
   * sin esto, Backspace/dígitos no hacían nada hasta hacer clic manualmente en las
   * casillas. Antes solo `Login.tsx` lo pasaba explícito; ahora es el comportamiento por
   * defecto de las 4 instancias, pasar `false` para desactivarlo si algún consumidor
   * futuro lo necesita. */
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  /**
   * Se dispara cuando, tras un cambio del usuario, el valor filtrado alcanza `length`
   * dígitos — pensado para autosubmit del formulario contenedor (ver consumidores). No
   * se dispara por cambios que no vengan de una edición real (solo hay un `onChange` de
   * DOM real por interacción, así que no hace falta deduplicar contra el `value` previo).
   *
   * Recibe el valor ya completo como argumento — a propósito, NO hay que leerlo de vuelta
   * del estado del consumidor (`value`/la prop `onChange`). Bug real encontrado con
   * pegar el código (Ctrl+V): `onChange(next)` solo AGENDA el `setState` del consumidor
   * (React no lo aplica hasta que este handler termina), así que si `onComplete` leyera
   * el código desde el cierre de una función del consumidor (closure sobre su propio
   * estado), seguiría viendo el valor ANTERIOR — vacío en el caso de pegar de un tirón,
   * lo que mandaba `code: ""` al backend ("Código requerido"). Con tipeo letra por letra
   * pasaba lo mismo pero corría un dígito atrás, indistinguible de un código real
   * incorrecto. Pasar `next` explícito evita depender de que el re-render ya haya
   * ocurrido.
   */
  onComplete?: (value: string) => void;
  /**
   * Mensaje de error (ej. "Código incorrecto"). Referencia de diseño pegada por el
   * usuario: casillas y dígitos en rojo (`otp-error`/`text-error` en vez de
   * `otp-primary`/`text-primary`) + el mensaje centrado justo debajo de
   * las casillas — no en un `alert` aparte arriba del formulario, que es donde vivía antes en los 3
   * consumidores con `alert alert-error`. Los consumidores deciden cuándo pasar esto
   * (típicamente su propio estado `error`, limpiado al reintentar) y siguen dueños del
   * texto exacto.
   */
  error?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  label,
  hideLabel = false,
  id,
  autoFocus = true,
  disabled,
  required = true,
  onComplete,
  error,
}: OtpInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasError = !!error;
  const inputRef = useRef<HTMLInputElement>(null);
  const wasDisabled = useRef(disabled);

  // El navegador quita el foco solo (sin evento que lo delate) apenas un <input> pasa a
  // `disabled` — pasa aquí durante `loading` mientras se valida el código (ver
  // consumidores: `disabled={loading}`). Al terminar la validación el campo vuelve a
  // habilitarse pero el foco no vuelve solo, así que justo cuando aparece "Código
  // incorrecto" el usuario se queda sin poder corregir sin hacer clic de nuevo. Se
  // restaura explícitamente en la transición disabled→enabled.
  useEffect(() => {
    if (wasDisabled.current && !disabled) inputRef.current?.focus();
    wasDisabled.current = disabled;
  }, [disabled]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={hideLabel ? "sr-only" : labelClass}>
          {label}
        </label>
      )}
      {/* `otp-sm sm:otp-lg` (no `otp-lg` fijo): 6 casillas en `otp-lg` miden ~288px de
          ancho — se desbordan en un teléfono de 320px (iPhone SE y similares) con el
          padding del formulario. `otp-sm` (~216px) entra con margen de sobra ahí;
          `sm:otp-lg` recupera el tamaño grande desde 640px (tablets/desktop), sin
          cambiar nada en pantallas que ya se veían bien. */}
      {/* Centrado con un contenedor flex: daisyUI le da `display: inline-flex` al `.otp`,
          y `mx-auto` no centra un elemento en línea (las casillas quedaban a la izquierda). */}
      <div className="flex justify-center">
        <label
          className={`otp otp-sm sm:otp-lg ${hasError ? "otp-error" : "otp-primary"}`}
        >
          {Array.from({ length }).map((_, i) => (
            <span key={i} />
          ))}
          <input
            ref={inputRef}
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
            aria-invalid={hasError || undefined}
            // Color de los dígitos: la CSS de daisyUI (`--input-color`, movido por
            // `otp-error`) solo tiñe el borde/outline de las casillas, nunca el texto del
            // `<input>` real — sin esto los dígitos se ven negros (`base-content`) pese a
            // `otp-primary`/`otp-error`.
            className={`font-bold ${hasError ? "text-error" : "text-primary"}`}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, length);
              onChange(next);
              if (next.length === length) onComplete?.(next);
            }}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-center text-sm text-error">{error}</p>}
    </div>
  );
}

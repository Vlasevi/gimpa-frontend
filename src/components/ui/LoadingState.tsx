import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  /** Texto junto al spinner, en gerundio (ej. "Cargando usuarios…"). */
  label?: string;
  /** Sin tarjeta (borde/fondo/sombra/padding grande) — para cuando ya se
   * está dentro de otro contenedor con su propio marco (una fila de tabla,
   * un modal chico) y una segunda tarjeta anidada se vería redundante o
   * demasiado pesada para el espacio disponible. */
  compact?: boolean;
  /** Clases extra para el contenedor — ej. `py-12` en vez del `p-12` por
   * defecto, o `min-h-[300px]` para fijar una altura mínima. */
  className?: string;
}

/**
 * Spinner de carga estándar para una SECCIÓN o PÁGINA completa mientras se
 * trae datos de la API (tabla, panel de detalle, formulario cargando datos
 * previos, etc.) — no para loading dentro de un botón (ese caso sigue
 * siendo un `Loader2` suelto junto al texto del botón, sin tarjeta ni esta
 * envoltura; ver DESIGN_SYSTEM.md §6).
 *
 * Único estilo desde 2026-09-10: antes convivían al menos dos variantes
 * visualmente DISTINTAS para el mismo propósito — el spinner nativo de
 * daisyUI (`loading loading-spinner`, un anillo sin ícono) en Usuarios,
 * Matrículas, Contratación y otros; y este mismo patrón (ícono `Loader2` +
 * texto, dentro de una tarjeta) que ya usaba el módulo de Admisiones. Se
 * unificó a este último (el que se quedó fue elegido por el usuario) y se
 * extrajo aquí para que sea imposible que un módulo nuevo introduzca un
 * tercer estilo sin querer — ver DESIGN_SYSTEM.md §6.
 */
export function LoadingState({ label = "Cargando…", compact = false, className = "" }: LoadingStateProps) {
  return (
    <div
      className={
        compact
          ? `flex items-center justify-center gap-3 text-base-content/60 ${className}`
          : `flex items-center justify-center gap-3 rounded-lg border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm ${className}`
      }
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {label}
    </div>
  );
}

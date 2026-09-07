/**
 * Acordeón compartido — Paso 1 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md).
 *
 * Sub-sección plegable, **controlada por el padre** (`open`/`onToggle`, sin estado
 * interno): así el consumidor decide si solo una sección puede estar abierta a la vez
 * (como hace hoy `GuardiansStep` de Admisiones) o si permite varias abiertas a la vez.
 *
 * Promovido desde `components/admisiones/guardianFields.tsx` → `SubSection`, el único
 * acordeón de la app que está realmente en uso, controlado con semántica de "una sola
 * sección abierta", y con accesibilidad básica (`aria-expanded`). Ver el veredicto
 * explícito en docs/paso0-informe-admisiones.md §1.3: los acordeones de
 * `components/matriculas/matriculasUI/` (`GradeAccordion.tsx`, `SectionCard.tsx`) son
 * código muerto sin imports en todo el repo — no se promovió ninguno de los dos, solo
 * se tomó prestada la técnica de animación de `SectionCard.tsx` (ver abajo).
 *
 * Cambios sobre el original:
 * - Animación: `grid-rows-[0fr]/[1fr]` en vez del mount/unmount condicional
 *   (`open && <div>...`) que tenía `SubSection` en `guardianFields.tsx` — técnica
 *   tomada de `matriculasUI/SectionCard.tsx` (código muerto, solo como referencia
 *   técnica, nunca importado).
 * - Nuevo: `subtitle` y `status` ("complete" | "incomplete" | "error"), indicador de
 *   progreso que NINGÚN acordeón actual (ni el original, ni el de Matrículas, ni el
 *   código muerto) soporta.
 * - Ya no envuelve `children` en `FieldGrid` (esa rejilla es específica de los campos
 *   de Admisiones, en `formFields.tsx`) — el layout del contenido queda a criterio de
 *   quien lo consuma, para que este primitivo sirva también a Matrículas sin arrastrar
 *   una decisión de grilla que no le pertenece.
 *
 * Este componente NO se ha conectado todavía a ningún consumidor (Admisiones sigue
 * usando su `SubSection` local en `guardianFields.tsx` sin cambios) — eso es un paso
 * posterior del plan.
 */

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

export type SubSectionStatus = "complete" | "incomplete" | "error";

export interface SubSectionProps {
  title: string;
  /** Línea secundaria opcional bajo el título (p. ej. un resumen corto de la sección). */
  subtitle?: string;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Indicador opcional de progreso. Sin esta prop se comporta como el acordeón original. */
  status?: SubSectionStatus;
  className?: string;
}

const STATUS_ICON = {
  complete: CheckCircle2,
  error: AlertCircle,
} as const;

const STATUS_TONE = {
  complete: "text-success",
  error: "text-error",
} as const;

export function SubSection({
  title,
  subtitle,
  children,
  open,
  onToggle,
  status,
  className,
}: SubSectionProps) {
  const showsStatusIcon = status === "complete" || status === "error";
  const StatusIcon = showsStatusIcon ? STATUS_ICON[status] : null;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-base-100 shadow-sm transition-all duration-200 ease-out motion-reduce:transition-none ${
        status === "error" ? "border-error/40" : "border-base-300"
      } ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {StatusIcon && (
            <StatusIcon
              className={`h-5 w-5 shrink-0 ${STATUS_TONE[status as "complete" | "error"]}`}
              aria-hidden="true"
            />
          )}
          <span className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-secondary">
              {title}
            </h3>
            {subtitle && (
              <p className="truncate text-sm font-normal text-base-content/60">{subtitle}</p>
            )}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-base-content/40 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Animación grid-rows-[0fr]/[1fr]: anima a la altura real del contenido en vez
          de a un max-height arbitrario, y evita el "salto" del mount/unmount condicional. */}
      <div
        className={`grid transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-base-300 p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default SubSection;

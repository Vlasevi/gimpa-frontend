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
 * Consumidores: Admisiones (`SolicitudWizard`, `admisiones/steps.tsx`) y Matrículas
 * (paso 3 del estudiante).
 *
 * Accesibilidad (hallazgo #13 de la prueba E2E de matrícula):
 * - El contenido plegado lleva `inert`: sus campos no reciben foco con Tab ni los lee un
 *   lector de pantalla (antes el foco entraba a campos de alto 0).
 * - Patrón de acordeón de la WAI: el `<h3>` envuelve al `<button>` (no al revés: un
 *   encabezado dentro de un botón no se anuncia como encabezado) y el botón apunta a su
 *   región con `aria-controls`.
 */

import { useId, type ReactNode } from "react";
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
  /** Id del contenedor (p. ej. para llevar el scroll a una sección con errores). */
  id?: string;
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
  id,
}: SubSectionProps) {
  const showsStatusIcon = status === "complete" || status === "error";
  const StatusIcon = showsStatusIcon ? STATUS_ICON[status] : null;
  const regionId = `${useId()}-region`;
  const statusText =
    status === "complete" ? "Completa" : status === "error" ? "Con datos por corregir" : undefined;

  return (
    <div
      id={id}
      className={`rounded-lg border bg-base-100 shadow-sm transition-all duration-200 ease-out motion-reduce:transition-none ${
        status === "error" ? "border-error/40" : "border-base-300"
      } ${className ?? ""}`}
    >
      {/* Antes el `overflow-hidden` vivía en el div de arriba (para que el fondo de hover
          del header respetara las esquinas redondeadas) — cortaba cualquier dropdown
          (ComboBox) del contenido que se saliera del borde inferior de la sección
          abierta, en vez de superponerse sobre lo siguiente. Se reemplaza por redondeo
          directo en el botón: `rounded-t-lg` siempre (el header siempre está arriba) +
          `rounded-b-lg` solo cuando está CERRADO, porque ahí el botón ocupa
          visualmente el bloque completo (sin contenido debajo); abierto, la esquina
          inferior ya no es responsabilidad del botón. */}
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={regionId}
          className={`flex w-full items-center justify-between gap-3 rounded-t-lg px-5 py-4 text-left transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            open ? "" : "rounded-b-lg"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {StatusIcon && (
              <StatusIcon
                className={`h-5 w-5 shrink-0 ${STATUS_TONE[status as "complete" | "error"]}`}
                aria-hidden="true"
              />
            )}
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold text-secondary">
                {title}
                {statusText && <span className="sr-only"> ({statusText})</span>}
              </span>
              {subtitle && (
                <span className="block truncate text-sm font-normal text-base-content/60">{subtitle}</span>
              )}
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-base-content/40 transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </h3>

      {/* Animación grid-rows-[0fr]/[1fr]: anima a la altura real del contenido en vez
          de a un max-height arbitrario, y evita el "salto" del mount/unmount condicional. */}
      <div
        className={`grid transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* `overflow-hidden` solo mientras está cerrada/colapsando — ver comentario
            equivalente en Step3StudentData.tsx (`SectionCard`), mismo bug ahí. */}
        <div
          id={regionId}
          role="region"
          aria-label={title}
          className={open ? "overflow-visible" : "overflow-hidden"}
          // `inert` (React 18 no lo tipa): la sección plegada sale del orden de foco y del
          // árbol de accesibilidad. Abierta, el atributo no se pone.
          {...(open ? {} : { inert: "" })}
        >
          <div className="border-t border-base-300 p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default SubSection;

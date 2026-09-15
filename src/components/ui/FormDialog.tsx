/**
 * Diálogo de formulario: el formato de TODOS los diálogos que crean o editan algo. El modelo
 * es "Registrar nuevo usuario" (Usuarios); lo usan también "Registrar usuario" y
 * "Nueva matrícula" (Matrículas) y "Cambiar grado". Ver DESIGN_SYSTEM §12b.
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ (ícono)  Título en Aleo 24 px                X │  cabecera blanca, línea abajo
 *   │          una línea de ayuda                    │
 *   ├───────────────────────────────────────────────┤
 *   │  ┌ Datos del estudiante * ─────────────────┐   │  fondo gris, secciones en
 *   │  │ ETIQUETA 12 px negrita *                 │   │  tarjetas blancas
 *   │  │ [👤 campo 14 px            ]             │   │
 *   │  └──────────────────────────────────────────┘   │
 *   │  ─────────────────────────────────────────────  │
 *   │                        Cancelar  [Registrar]   │
 *   └───────────────────────────────────────────────┘
 *
 * - `FormDialog`: el marco. No se cierra con un clic en el fondo (se perdería lo escrito);
 *   sí con la X, Escape o "Cancelar". `size="sm"` para un solo campo.
 * - `FormSection`: tarjeta blanca con su título ("Datos del estudiante").
 * - `FormInput` / `FormSelect`: etiqueta + campo (con ícono opcional) + ayuda.
 * - `FormActions`: "Cancelar" + botón principal con spinner y gerundio (`BusyLabel`).
 *
 * El resultado (éxito o error del servidor) va en el toast de la página, no dentro del
 * diálogo: el formulario recibe `flash` de quien lo abre.
 */

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

import { BusyLabel } from "@/components/ui/BusyLabel";
import { Modal } from "@/components/ui/Modal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";

/** Etiqueta de un campo (12 px, negrita). */
export const formLabelClass = "mb-1 block text-xs font-bold text-base-content";
/** Ayuda bajo un campo. */
export const formHintClass = "mt-1 text-xs text-base-content/60";
/** Campo de texto (14 px). Con ícono a la izquierda se le suma `pl-9`. */
export const formInputClass =
  "w-full rounded-lg border border-base-300 bg-base-100 py-2 pr-3 text-sm text-base-content transition-all placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:cursor-not-allowed read-only:bg-base-200 disabled:cursor-not-allowed disabled:bg-base-200";

function Required({ required }: { required?: boolean }) {
  if (!required) return null;
  return (
    <span className="ml-0.5 text-error" aria-hidden="true">
      *
    </span>
  );
}

export function FormDialog({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  size = "md",
  stacked = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Bajo el título: una línea de ayuda o datos del registro (correo, rol…). */
  description?: ReactNode;
  /** Ícono del círculo de la cabecera (p. ej. `UserPlus`, `FilePlus`). */
  icon?: LucideIcon;
  /** El formulario: `<form className="space-y-5">` con `FormSection`s y `FormActions`. */
  children: ReactNode;
  /** `md` (por defecto): `max-w-3xl`. `sm`: `max-w-lg`, para un solo campo. */
  size?: "sm" | "md";
  /** Se abre encima de otro modal (p. ej. desde el detalle de una matrícula). */
  stacked?: boolean;
}) {
  const titleId = useId();
  const dialog = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={false}
      labelledBy={titleId}
      className={`max-h-[90vh] w-[calc(100%-2rem)] ${size === "sm" ? "max-w-lg" : "max-w-3xl"} gap-0 overflow-hidden rounded-lg bg-base-200 p-0 shadow-2xl sm:w-full`}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-base-300 bg-base-100 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          {Icon && (
            <div className="h-16 w-16 shrink-0 rounded-full border-2 border-primary bg-base-100 p-1" aria-hidden="true">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-bold leading-tight text-secondary">
              {title}
            </h2>
            {description && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-base-content/60">{description}</div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className={`${iconBtnClass} ${iconHover.neutral}`}
        >
          <X className={iconClass} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
    </Modal>
  );
  return stacked ? <div className="relative z-[55]">{dialog}</div> : dialog;
}

export function FormSection({
  title,
  required,
  children,
}: {
  title: string;
  /** Asterisco en el título: la sección tiene campos obligatorios. */
  required?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-lg bg-base-100 p-5 shadow-sm">
      <h3 id={headingId} className="mb-4 flex items-center border-b border-base-200 pb-2 text-base font-bold text-primary">
        {title}
        <Required required={required} />
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Grilla de dos columnas para los campos de una sección. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

type FormInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  /** Ícono dentro del campo, a la izquierda (`User`, `Mail`, `Phone`…). */
  icon?: LucideIcon;
  hint?: ReactNode;
  /** Ocupa las dos columnas de `FormGrid`. */
  full?: boolean;
};

export function FormInput({ label, icon: Icon, hint, full, id, required, ...input }: FormInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <label className={formLabelClass} htmlFor={inputId}>
        {label}
        <Required required={required} />
      </label>
      <div className="group relative">
        {Icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/50 transition-colors group-focus-within:text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <input
          id={inputId}
          required={required}
          aria-describedby={hintId}
          className={`${formInputClass} ${Icon ? "pl-9" : "pl-3"}`}
          {...input}
        />
      </div>
      {hint && (
        <p id={hintId} className={formHintClass}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormSelect({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  hint,
  full,
  name,
  emptyText,
}: {
  label: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** Lo que muestra la lista abierta cuando no hay opciones. */
  emptyText?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  full?: boolean;
  name?: string;
}) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <label className={formLabelClass} htmlFor={selectId}>
        {label}
        <Required required={required} />
      </label>
      <Select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        describedBy={hintId}
        emptyText={emptyText}
      />
      {hint && (
        <p id={hintId} className={formHintClass}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormActions({
  onCancel,
  busy,
  submitText,
  busyText,
  submitDisabled = false,
}: {
  onCancel: () => void;
  busy: boolean;
  /** "Registrar" */
  submitText: string;
  /** "Registrando…" */
  busyText: string;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-base-300 pt-4">
      <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary gap-2 shadow-sm" disabled={busy || submitDisabled}>
        <BusyLabel busy={busy} busyText={busyText}>
          {submitText}
        </BusyLabel>
      </button>
    </div>
  );
}

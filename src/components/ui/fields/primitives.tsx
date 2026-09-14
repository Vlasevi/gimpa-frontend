/**
 * Componentes "simples" del esquema declarativo (informe §5.1): mapean 1:1 a un
 * `FieldType` y no coordinan más de un campo entre sí (a diferencia de `GeoCascadeField`
 * y `PhotoField`, los dos compuestos de `./types.ts`).
 *
 * Contrato común: reciben `register`/`control` de react-hook-form directo (nunca
 * `values`/`onChange`), igual que ya hace `components/admisiones/formFields.tsx` desde
 * su migración a RHF. Las clases visuales (`labelClass`/`inputClass`/`selectClass`/
 * `textareaClass`) vienen de `@/components/ui/formStyles`, la fuente única ya
 * compartida por Admisiones y Matrículas — no se inventa un token nuevo aquí.
 *
 * `YesNoField` fusiona el `YesNoField` (modo string "Si"/"No") de
 * `admisiones/formFields.tsx` con el `BoolYesNo` (modo boolean) de
 * `admisiones/steps.tsx`: mismas clases de radio-pill `sr-only`, un solo componente con
 * `mode?: "string" | "boolean"`.
 *
 * `ComboBoxField` envuelve `components/ui/ComboBox.tsx` con `Controller`: queda
 * autocontenido (el consumidor no hace `setValue` a mano para el valor del propio
 * combo). Distinto del uso de `ComboBox` dentro de `GeoCascadeField`, que sí necesita
 * `setValue` propio porque además debe limpiar los campos hijos de la cascada — esa
 * responsabilidad NO vive aquí.
 */

import { useEffect, useState } from "react";
import {
  Controller,
  type Control,
  type UseFormRegister,
} from "react-hook-form";

import {
  labelClass,
  inputClass,
  textareaClass,
} from "@/components/ui/formStyles";
import { ComboBox } from "@/components/ui/ComboBox";
import { Select } from "@/components/ui/Select";
import type { SectionValues } from "./types";
import { errorAria, errorIdFor, FieldErrorText, RequiredMark, useFieldError } from "./fieldErrors";

interface FieldBaseProps {
  /** Nombre del campo para RHF. Soporta paths anidados ("repeated.grade"). */
  name: string;
  /** Id/htmlFor del control. Por defecto es `name`. */
  id?: string;
  label: string;
  register: UseFormRegister<SectionValues>;
  placeholder?: string;
  full?: boolean;
  /** Empieza una fila nueva del grid (ver `FieldDescriptor.startsRow`). */
  startsRow?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Texto de ayuda bajo el control (se asocia con `aria-describedby`). */
  hint?: string;
}

/** Clases de la celda en el grid de 2 columnas: ancho completo y/o inicio de fila. */
function cellClass(full?: boolean, startsRow?: boolean): string | undefined {
  const classes = [full && "sm:col-span-2", startsRow && "sm:col-start-1"].filter(Boolean);
  return classes.length ? classes.join(" ") : undefined;
}

/** Ayuda bajo el control; si hay error, el error la reemplaza. */
function HintText({ htmlId, hint }: { htmlId: string; hint?: string }) {
  if (!hint) return null;
  return (
    <p id={`${htmlId}-hint`} className="mt-1 text-xs text-base-content/50">
      {hint}
    </p>
  );
}

function describedBy(htmlId: string, error?: string, hint?: string) {
  if (error) return errorAria(htmlId, error);
  return hint ? { "aria-describedby": `${htmlId}-hint` } : {};
}

/** `id` HTML válido a partir de una ruta con puntos ("student.birth.date"). */
export const htmlIdFor = (name: string) => name.replace(/\./g, "-");

export function TextField({
  name,
  id,
  label,
  register,
  type = "text",
  placeholder,
  full,
  startsRow,
  disabled,
  required,
  hint,
  min,
  max,
  autoComplete,
  inputMode,
}: FieldBaseProps & {
  type?: "text" | "email" | "tel" | "number" | "date";
  min?: string;
  max?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
}) {
  const htmlId = id ?? htmlIdFor(name);
  const error = useFieldError(name);
  return (
    <div className={cellClass(full, startsRow)}>
      <label htmlFor={htmlId} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      <input
        id={htmlId}
        type={type}
        className={`${inputClass} ${error ? "input-error" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        autoComplete={autoComplete}
        inputMode={inputMode ?? (type === "tel" ? "tel" : undefined)}
        {...describedBy(htmlId, error, hint)}
        {...register(name)}
      />
      {error ? <FieldErrorText htmlId={htmlId} error={error} /> : <HintText htmlId={htmlId} hint={hint} />}
    </div>
  );
}

/**
 * Campo bloqueado que solo muestra un valor (p. ej. un dato calculado como la edad). Se ve
 * igual que los demás campos del grid, deshabilitado. No se registra en RHF: no se guarda
 * ni se envía.
 */
export function LockedField({
  id,
  label,
  value,
  placeholder = "—",
  full,
  startsRow,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  full?: boolean;
  startsRow?: boolean;
  hint?: string;
}) {
  return (
    <div className={cellClass(full, startsRow)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={inputClass}
        value={value}
        placeholder={placeholder}
        disabled
        readOnly
        {...(hint ? { "aria-describedby": `${id}-hint` } : {})}
      />
      <HintText htmlId={id} hint={hint} />
    </div>
  );
}

export type SelectFieldOption = string | { value: string; label: string };

export function SelectField({
  name,
  id,
  label,
  control,
  options,
  full,
  startsRow,
  disabled,
  required,
  placeholder = "Selecciona…",
  hint,
}: Omit<FieldBaseProps, "register"> & {
  control: Control<SectionValues>;
  options: readonly SelectFieldOption[];
}) {
  const htmlId = id ?? htmlIdFor(name);
  const error = useFieldError(name);
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const describedById = error ? errorIdFor(htmlId) : hint ? `${htmlId}-hint` : undefined;
  return (
    <div className={cellClass(full, startsRow)}>
      <label htmlFor={htmlId} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      {/* El `Select` de la plataforma (lista propia, no la del sistema operativo). */}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            id={htmlId}
            value={field.value == null ? "" : String(field.value)}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={normalized}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            invalid={Boolean(error)}
            describedBy={describedById}
          />
        )}
      />
      {error ? <FieldErrorText htmlId={htmlId} error={error} /> : <HintText htmlId={htmlId} hint={hint} />}
    </div>
  );
}

export function TextAreaField({
  name,
  id,
  label,
  register,
  placeholder,
  full = true,
  startsRow,
  disabled,
  required,
  rows = 3,
  hint,
}: FieldBaseProps & { rows?: number }) {
  const htmlId = id ?? htmlIdFor(name);
  const error = useFieldError(name);
  return (
    <div className={cellClass(full, startsRow)}>
      <label htmlFor={htmlId} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      <textarea
        id={htmlId}
        rows={rows}
        className={`${textareaClass} ${error ? "textarea-error" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        {...describedBy(htmlId, error, hint)}
        {...register(name)}
      />
      {error ? <FieldErrorText htmlId={htmlId} error={error} /> : <HintText htmlId={htmlId} hint={hint} />}
    </div>
  );
}

/** Trivial: un `<input type="checkbox">` nativo, RHF lo maneja con `register(name)` sin
 * `Controller`. Sin equivalente previo (no existía en Admisiones ni Matrículas como
 * componente reutilizable — Matrículas usa `<input type="checkbox">` crudo inline). */
export function CheckboxField({
  name,
  id,
  label,
  register,
  full,
  startsRow,
  disabled,
}: Omit<FieldBaseProps, "placeholder" | "required">) {
  const htmlId = id ?? htmlIdFor(name);
  return (
    <div className={cellClass(full, startsRow)}>
      <label htmlFor={htmlId} className="flex cursor-pointer items-center gap-2">
        <input
          id={htmlId}
          type="checkbox"
          className="checkbox checkbox-primary"
          disabled={disabled}
          {...register(name)}
        />
        <span className={`${labelClass} mb-0`}>{label}</span>
      </label>
    </div>
  );
}

const yesNoPillClass = (active: boolean) =>
  `flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-lg border px-5 text-sm font-medium transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/40 motion-reduce:transition-none ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-base-300 bg-base-200 text-base-content/70 hover:bg-base-300/50"
  }`;

/**
 * Pregunta de Sí/No. Fusiona los dos componentes que hoy existen por separado:
 * - `mode: "string"` (default): persiste literalmente `"Si"`/`"No"` — el backend
 *   interpreta ese texto en `apply_alert_rules`. Es el `YesNoField` de
 *   `admisiones/formFields.tsx`.
 * - `mode: "boolean"`: persiste `true`/`false` — es el `BoolYesNo` de
 *   `admisiones/steps.tsx`, usado en paths anidados (`repeated.hasRepeated`).
 *
 * Mismo look en ambos modos (radios reales `sr-only`, sin cambiar el aspecto visual de
 * ninguno de los dos originales).
 */
export function YesNoField({
  name,
  label,
  control,
  mode = "string",
  full = true,
  startsRow,
  required,
}: {
  name: string;
  label: string;
  control: Control<SectionValues>;
  mode?: "string" | "boolean";
  /** Por defecto ocupa la fila entera. Con `full={false}` (y `startsRow`) el campo que
   * revela la respuesta queda a su derecha. */
  full?: boolean;
  startsRow?: boolean;
  required?: boolean;
}) {
  const htmlId = htmlIdFor(name);
  const error = useFieldError(name);
  const options: { text: string; val: string | boolean }[] =
    mode === "boolean"
      ? [
          { text: "Sí", val: true },
          { text: "No", val: false },
        ]
      : [
          { text: "Sí", val: "Si" },
          { text: "No", val: "No" },
        ];
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={mode === "boolean" ? undefined : ""}
      render={({ field }) => {
        const current = field.value;
        return (
          <fieldset
            className={cellClass(full, startsRow)}
            aria-describedby={error ? `${htmlId}-error` : undefined}
          >
            <legend className={labelClass}>
              {label}
              <RequiredMark required={required} />
            </legend>
            <div className="flex gap-2">
              {options.map((o) => {
                const active = current === o.val;
                return (
                  <label key={o.text} className={yesNoPillClass(active)}>
                    <input
                      type="radio"
                      name={field.name}
                      value={typeof o.val === "string" ? o.val : undefined}
                      checked={active}
                      onChange={() => field.onChange(o.val)}
                      onBlur={field.onBlur}
                      className="sr-only"
                    />
                    {o.text}
                  </label>
                );
              })}
            </div>
            <FieldErrorText htmlId={htmlId} error={error} />
          </fieldset>
        );
      }}
    />
  );
}

/** Selección múltiple (se guarda como `string[]`). Idéntico al `CheckboxGroupField` de
 * `admisiones/formFields.tsx`, solo adaptado al contrato común de este archivo. */
export function CheckboxGroupField({
  name,
  label,
  control,
  options,
}: {
  name: string;
  label: string;
  control: Control<SectionValues>;
  options: readonly string[];
}) {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={[]}
      render={({ field }) => {
        const selected = Array.isArray(field.value) ? (field.value as string[]) : [];
        const toggle = (option: string) => {
          const next = selected.includes(option)
            ? selected.filter((o) => o !== option)
            : [...selected, option];
          field.onChange(next);
        };
        return (
          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>{label}</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const active = selected.includes(option);
                return (
                  <label
                    key={option}
                    className={`flex h-10 cursor-pointer items-center rounded-lg border px-4 text-sm font-medium transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/40 motion-reduce:transition-none ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-base-300 bg-base-200 text-base-content/70 hover:bg-base-300/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggle(option)}
                      className="sr-only"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      }}
    />
  );
}

/**
 * Envuelve `components/ui/ComboBox.tsx` (dropdown buscable) con `Controller`.
 * Autocontenido: el consumidor solo pasa `control`/`options`, sin `setValue` manual
 * (a diferencia de `GeoResidenceFields` hoy, que usa `useWatch`+`setValue` porque
 * además coordina campos hijos — ver `GeoCascadeField.tsx` para ese caso).
 *
 * `options` acepta también un loader async (`() => Promise<string[]>`) para
 * comboboxes con datos remotos que no son una cascada geográfica (hoy sin consumidor
 * real; el tipo lo admite para no cerrarle la puerta a un futuro `type: "combobox"`
 * con `options` dinámicas).
 */
export function ComboBoxField({
  name,
  label,
  control,
  options,
  disabled,
  placeholder,
  full,
  startsRow,
  required,
}: {
  name: string;
  label: string;
  control: Control<SectionValues>;
  options: readonly string[] | (() => Promise<readonly string[]>);
  disabled?: boolean;
  placeholder?: string;
  full?: boolean;
  startsRow?: boolean;
  required?: boolean;
}) {
  const isAsync = typeof options === "function";
  const [resolvedOptions, setResolvedOptions] = useState<readonly string[]>(
    isAsync ? [] : (options as readonly string[]),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAsync) {
      setResolvedOptions(options as readonly string[]);
      return;
    }
    let active = true;
    setLoading(true);
    (options as () => Promise<readonly string[]>)()
      .then((o) => active && setResolvedOptions(o))
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isAsync, options]);

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field }) => (
        <div className={cellClass(full, startsRow)}>
          <ComboBox
            name={name}
            label={label}
            value={(field.value as string) ?? ""}
            onChange={field.onChange}
            options={resolvedOptions}
            disabled={disabled}
            loading={loading}
            placeholder={placeholder}
            required={required}
          />
        </div>
      )}
    />
  );
}

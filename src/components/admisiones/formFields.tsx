/**
 * Campos compartidos del wizard de admisión (tokens del DESIGN_SYSTEM).
 *
 * ⚠️ Admisiones usa `react-hook-form` por decisión explícita del equipo: las secciones
 * del wizard son formularios grandes y con `useState` cada tecla re-renderizaba el
 * formulario completo. Matrículas sigue con `useState` por ahora y se migrará después,
 * en un esfuerzo aparte — no está cubierto por este cambio. Si alguien compara ambos
 * módulos y ve la diferencia de patrón, es intencional: no "alinees" este archivo de
 * vuelta a `values`/`onChange`.
 *
 * Por eso los primitivos de aquí ya no reciben `values`/`onChange`: los nativos
 * (`Field`, `SelectField`, `TextAreaField`) reciben `register` de RHF y se spreadean
 * directo sobre el `<input>`/`<select>`/`<textarea>`; los que tienen estado propio o no
 * exponen `ref` (`YesNoField`, `CheckboxGroupField`) reciben `control` y usan
 * `Controller`/`useController` por dentro, para no perder el contrato de valores que
 * persisten hoy (p. ej. `YesNoField` sigue guardando los strings literales "Si"/"No",
 * nunca booleano).
 */

import { Controller, useWatch, type Control, type UseFormRegister } from "react-hook-form";

export type SectionValues = Record<string, unknown>;

export const labelClass = "mb-1.5 block text-sm font-medium text-base-content/70";

// Estilo daisyui, igual que matrículas (input/select "bordered" con foco primary).
export const inputClass = "input input-bordered w-full focus:input-primary transition-all";
export const selectClass = "select select-bordered w-full focus:select-primary transition-all";
export const textareaClass = "textarea textarea-bordered w-full focus:textarea-primary transition-all";
// Alias por compatibilidad (se usa en algunos <select>).
export const controlClass = selectClass;

/** Rejilla responsive de campos. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

type BaseProps = {
  /** Nombre del campo para RHF. Soporta paths anidados ("repeated.grade"). */
  name: string;
  /** Id/htmlFor del control. Por defecto es `name` — pásalo si `name` trae puntos y
   * quieres conservar el `id` plano que tenía el campo antes de la migración. */
  id?: string;
  label: string;
  register: UseFormRegister<SectionValues>;
  placeholder?: string;
  full?: boolean;
};

export function Field({
  name,
  id,
  label,
  register,
  type = "text",
  placeholder,
  full,
}: BaseProps & { type?: string }) {
  const htmlId = id ?? name;
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlId} className={labelClass}>
        {label}
      </label>
      <input
        id={htmlId}
        type={type}
        className={inputClass}
        placeholder={placeholder}
        {...register(name)}
      />
    </div>
  );
}

export function SelectField({
  name,
  id,
  label,
  register,
  options,
  full,
}: BaseProps & { options: readonly string[] }) {
  const htmlId = id ?? name;
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlId} className={labelClass}>
        {label}
      </label>
      <select id={htmlId} className={selectClass} {...register(name)}>
        <option value="">Selecciona…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaField({
  name,
  id,
  label,
  register,
  placeholder,
}: BaseProps) {
  const htmlId = id ?? name;
  return (
    <div className="sm:col-span-2">
      <label htmlFor={htmlId} className={labelClass}>
        {label}
      </label>
      <textarea
        id={htmlId}
        rows={3}
        className={textareaClass}
        placeholder={placeholder}
        {...register(name)}
      />
    </div>
  );
}

/**
 * Pregunta de Sí/No.
 *
 * Guarda `"Si"` / `"No"` — el backend interpreta ese texto en las reglas de alerta
 * de P4 (`_is_yes`). Radios reales para que funcione con teclado y lector de pantalla.
 * Vía `Controller`: el valor no es un único `<input>` nativo (dos radios que comparten
 * `name`) y no queremos que RHF normalice el string a booleano.
 */
export function YesNoField({
  name,
  label,
  control,
  full = true,
}: {
  name: string;
  label: string;
  control: Control<SectionValues>;
  full?: boolean;
}) {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field }) => {
        const current = (field.value as string) ?? "";
        return (
          <fieldset className={full ? "sm:col-span-2" : undefined}>
            <legend className={labelClass}>{label}</legend>
            <div className="flex gap-2">
              {["Si", "No"].map((option) => {
                const active = current === option;
                return (
                  <label
                    key={option}
                    className={`flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-lg border px-5 text-sm font-medium transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/40 motion-reduce:transition-none ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-base-300 bg-base-200 text-base-content/70 hover:bg-base-300/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={option}
                      checked={active}
                      onChange={() => field.onChange(option)}
                      onBlur={field.onBlur}
                      className="sr-only"
                    />
                    {option === "Si" ? "Sí" : "No"}
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
 * Selección múltiple (se guarda como lista de strings). Vía `Controller`: el valor es
 * un array, no lo que produce un único `<input>`.
 */
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
 * Muestra un campo solo cuando la pregunta previa fue "Sí". Se suscribe con `useWatch`
 * al campo puntual del que depende (nunca `watch()` global dentro del render, eso
 * reintroduce el re-render que motivó pasar a RHF).
 */
export function WhenYes({
  when,
  control,
  children,
}: {
  when: string;
  control: Control<SectionValues>;
  children: React.ReactNode;
}) {
  const current = useWatch({ control, name: when });
  if (((current as string) ?? "") !== "Si") return null;
  return <>{children}</>;
}

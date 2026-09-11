/**
 * `FIELD_REGISTRY` (type -> componente) + `<SchemaField>` (resuelve un único
 * `FieldDescriptor`) + `<SchemaSection>` (resuelve una lista completa, informe §4).
 *
 * Consumidores: Admisiones (`steps.tsx`, `guardianFields.tsx`) y Matrículas (paso 3).
 * Los errores por campo llegan por contexto (`FieldErrorsProvider`, `./fieldErrors`).
 */

import { useMemo, type ComponentType } from "react";
import {
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import { labelClass } from "@/components/ui/formStyles";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  YesNoField,
  CheckboxGroupField,
  ComboBoxField,
} from "./primitives";
import { GeoCascadeField } from "./GeoCascadeField";
import { PhotoField } from "./PhotoField";
import {
  conditionDependencies,
  evaluateCondition,
  watchedValuesFrom,
  type FieldDescriptor,
  type FieldType,
  type PhotoFieldValue,
  type SectionValues,
} from "./types";

const EMPTY_PHOTO_VALUE: PhotoFieldValue = { file: null, removed: false };

export interface SchemaFieldProps {
  descriptor: FieldDescriptor;
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
  disabled?: boolean;
  required?: boolean;
  /** dataKey (de un descriptor "photo"/"file") -> URL/base64 de un archivo ya guardado. */
  preloadedUrls?: Readonly<Record<string, string>>;
  /**
   * dataKey -> `{file, removed}` actual de cada campo "photo"/"file" — `PhotoField` es
   * controlado desde afuera (nunca guarda el `File` en RHF, ver `PhotoFieldProps` en
   * `./types.ts`), así que quien use `<SchemaSection>` con un descriptor "photo" debe
   * mantener este estado él mismo (fuera de RHF, igual que `uploadedFiles` en Matrículas)
   * y pasarlo aquí para que el campo sepa qué mostrar. Ningún otro tipo lo necesita: su
   * valor ya vive 100% en el formulario. Esta plomería no estaba en el
   * `FieldDescriptor`/`GeoCascadeFieldProps`/`PhotoFieldProps` del informe — hace falta
   * para que "photo"/"file" sean utilizables a través de `<SchemaSection>`, documentado
   * aquí en vez de en un archivo aparte.
   */
  photoValues?: Readonly<Record<string, PhotoFieldValue>>;
  /** Notifica un cambio en un campo "photo"/"file" (archivo nuevo o quitado) — el padre
   * decide dónde persistir `photoValues` y cuándo subir el archivo (informe §3.2/§3.3). */
  onPhotoChange?: (dataKey: string, next: PhotoFieldValue) => void;
  /** Ayuda que reemplaza la del descriptor (p. ej. "Tomado de tu cuenta de Microsoft"). */
  hint?: string;
}

/** Hoy (AAAA-MM-DD) en hora de Colombia, para `max: "today"`. */
function todayInBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ---------------------------------------------------------------- Adaptadores

function TextTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  switch (d.type) {
    case "text":
    case "email":
    case "tel":
    case "number":
    case "date":
      return (
        <TextField
          name={d.name}
          id={d.id}
          label={d.label}
          register={props.register}
          type={d.type}
          placeholder={d.placeholder}
          full={d.full}
          disabled={props.disabled}
          required={props.required}
          hint={props.hint ?? d.hint}
          min={d.min}
          max={d.max === "today" ? todayInBogota() : d.max}
        />
      );
    default:
      return null;
  }
}

function TextAreaTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "textarea") return null;
  return (
    <TextAreaField
      name={d.name}
      id={d.id}
      label={d.label}
      register={props.register}
      placeholder={d.placeholder}
      full={d.full}
      disabled={props.disabled}
      required={props.required}
      rows={d.rows}
      hint={props.hint ?? d.hint}
    />
  );
}

function SelectTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "select") return null;
  return (
    <SelectField
      name={d.name}
      id={d.id}
      label={d.label}
      register={props.register}
      options={d.options}
      full={d.full}
      disabled={props.disabled}
      required={props.required}
      hint={props.hint ?? d.hint}
    />
  );
}

function ComboBoxTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "combobox") return null;
  return (
    <ComboBoxField
      name={d.name}
      label={d.label}
      control={props.control}
      options={d.options}
      disabled={props.disabled}
      placeholder={d.placeholder}
      full={d.full}
      required={props.required}
    />
  );
}

function YesNoTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "yesno") return null;
  return (
    <YesNoField
      name={d.name}
      label={d.label}
      control={props.control}
      mode={d.mode}
      full={d.full}
      required={props.required}
    />
  );
}

function CheckboxTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "checkbox") return null;
  return (
    <CheckboxField
      name={d.name}
      id={d.id}
      label={d.label}
      register={props.register}
      full={d.full}
      disabled={props.disabled}
    />
  );
}

function CheckboxGroupTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "checkbox-group") return null;
  return (
    <CheckboxGroupField name={d.name} label={d.label} control={props.control} options={d.options} />
  );
}

function GeoCascadeTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "geo-cascade") return null;
  return (
    <GeoCascadeField
      prefix={d.prefix}
      hasBarrio={d.hasBarrio}
      source={d.source}
      control={props.control}
      register={props.register}
      setValue={props.setValue}
      disabled={props.disabled}
      // `GeoCascadeFieldProps.requiredWhen` acepta `boolean | FieldCondition` (mismo
      // tipo que `d.required`), así que se reenvía tal cual — antes se descartaba el
      // caso `required: true` incondicional (Matrículas lo usa en sus 9 cascadas) por
      // solo aceptar el caso `object` (FieldCondition).
      requiredWhen={d.required}
      labels={d.labels}
    />
  );
}

function PhotoTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "photo") return null;
  const preloadedUrl = props.preloadedUrls?.[d.preloadedUrlKey ?? d.dataKey];
  const value = props.photoValues?.[d.dataKey] ?? EMPTY_PHOTO_VALUE;
  return (
    <PhotoField
      dataKey={d.dataKey}
      label={d.label}
      value={value}
      preloadedUrl={preloadedUrl}
      onChange={(next) => props.onPhotoChange?.(d.dataKey, next)}
    />
  );
}

/**
 * `type: "file"` — fuera de alcance de este esfuerzo (informe §3.3/§5.2: la subida de
 * archivos "tipo Admisiones" solo aplica a Step5Documents, no a Step3, y el plan no pide
 * tocar Step5). Implementación mínima, sin consumidor real hoy: misma forma de valor que
 * `photo` (`{file, removed}`, reutiliza `PhotoFieldValue`) pero sin previsualización de
 * imagen — solo el nombre del archivo. Controlado desde afuera vía `photoValues`/
 * `onPhotoChange` (mismo mecanismo que `photo` — ver la corrección de diseño en
 * `PhotoFieldProps`, `./types.ts`: un `File` nunca debe vivir dentro de RHF/`Controller`,
 * porque se serializaría a `{}` en el JSON del autoguardado).
 */
function FileTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "file") return null;
  const preloadedUrl = props.preloadedUrls?.[d.dataKey];
  const value = props.photoValues?.[d.dataKey] ?? EMPTY_PHOTO_VALUE;
  const hasFile = !!value.file || (!value.removed && !!preloadedUrl);
  return (
    <div className={d.full ? "sm:col-span-2" : undefined}>
      <label className={labelClass}>{d.label}</label>
      <div className="flex items-center gap-3">
        <span className="truncate text-sm text-base-content/70">
          {value.file ? value.file.name : hasFile ? "Archivo cargado" : "Sin archivo"}
        </span>
        <label className="btn btn-sm btn-outline btn-primary cursor-pointer gap-2">
          {hasFile ? "Cambiar" : "Subir archivo"}
          <input
            type="file"
            className="hidden"
            accept={d.accept}
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              if (selected) props.onPhotoChange?.(d.dataKey, { file: selected, removed: false });
              e.target.value = "";
            }}
          />
        </label>
        {hasFile && (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            onClick={() => props.onPhotoChange?.(d.dataKey, { file: null, removed: true })}
          >
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- Registro

export const FIELD_REGISTRY: Record<FieldType, ComponentType<SchemaFieldProps>> = {
  text: TextTypeField,
  email: TextTypeField,
  tel: TextTypeField,
  number: TextTypeField,
  date: TextTypeField,
  textarea: TextAreaTypeField,
  select: SelectTypeField,
  combobox: ComboBoxTypeField,
  yesno: YesNoTypeField,
  checkbox: CheckboxTypeField,
  "checkbox-group": CheckboxGroupTypeField,
  "geo-cascade": GeoCascadeTypeField,
  photo: PhotoTypeField,
  file: FileTypeField,
};

/** Resuelve un único `FieldDescriptor` contra `FIELD_REGISTRY`. */
export function SchemaField(props: SchemaFieldProps) {
  const Component = FIELD_REGISTRY[props.descriptor.type];
  return <Component {...props} />;
}

export interface SchemaSectionProps {
  schema: readonly FieldDescriptor[];
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
  preloadedUrls?: Readonly<Record<string, string>>;
  photoValues?: Readonly<Record<string, PhotoFieldValue>>;
  onPhotoChange?: (dataKey: string, next: PhotoFieldValue) => void;
  /** Campos deshabilitados desde afuera (no dependen de otros valores del formulario),
   * p. ej. las partes del nombre que vienen de la cuenta de Microsoft. */
  disabledFields?: readonly string[];
  /** Ayudas por campo que reemplazan la del descriptor. */
  fieldHints?: Readonly<Record<string, string>>;
}

function descriptorKey(d: FieldDescriptor, index: number): string {
  if ("name" in d && d.name) return d.name;
  if (d.type === "geo-cascade") return `geo-${d.prefix}`;
  if (d.type === "photo" || d.type === "file") return `file-${d.dataKey}`;
  return `field-${index}`;
}

/**
 * Renderiza una sección completa a partir de un `schema: FieldDescriptor[]`. Calcula el
 * conjunto MÍNIMO de campos a observar a partir de todos los `showWhen`/`disabledWhen`/
 * `required` condicionales de la sección con un único `useWatch({control, name: [...]})`
 * — nunca un `watch()` global ni un `useWatch` por campo (informe §4, mismo ahorro de
 * renders que motivó migrar Admisiones a RHF).
 */
export function SchemaSection({
  schema,
  control,
  register,
  setValue,
  preloadedUrls,
  photoValues,
  onPhotoChange,
  disabledFields,
  fieldHints,
}: SchemaSectionProps) {
  const watchNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of schema) {
      const conditions = [
        d.showWhen,
        d.disabledWhen,
        typeof d.required === "object" ? d.required : undefined,
      ];
      for (const cond of conditions) {
        if (!cond) continue;
        for (const n of conditionDependencies(cond)) names.add(n);
      }
    }
    return Array.from(names);
  }, [schema]);

  const watched = useWatch({ control, name: watchNames });
  const values = useMemo(() => watchedValuesFrom(watchNames, watched), [watchNames, watched]);

  return (
    <>
      {schema.map((descriptor, index) => {
        const show = descriptor.showWhen ? evaluateCondition(descriptor.showWhen, values) : true;
        if (!show) return null;

        const name = "name" in descriptor ? descriptor.name : undefined;
        const disabled =
          (!!name && !!disabledFields?.includes(name)) ||
          (descriptor.disabledWhen ? evaluateCondition(descriptor.disabledWhen, values) : false);

        const required =
          typeof descriptor.required === "boolean"
            ? descriptor.required
            : descriptor.required
              ? evaluateCondition(descriptor.required, values)
              : false;

        return (
          <SchemaField
            key={descriptorKey(descriptor, index)}
            descriptor={descriptor}
            control={control}
            register={register}
            setValue={setValue}
            disabled={disabled}
            required={required}
            preloadedUrls={preloadedUrls}
            photoValues={photoValues}
            onPhotoChange={onPhotoChange}
            hint={name ? fieldHints?.[name] : undefined}
          />
        );
      })}
    </>
  );
}

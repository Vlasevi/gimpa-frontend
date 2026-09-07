/**
 * `FIELD_REGISTRY` (type -> componente) + `<SchemaField>` (resuelve un único
 * `FieldDescriptor`) + `<SchemaSection>` (resuelve una lista completa, informe §4).
 *
 * Sin consumidores todavía (Paso 1 = solo fundación) — ni Admisiones ni Matrículas usan
 * esto aún, eso es el Paso 2/4 de `docs/plan-schema-driven-fields.md`.
 */

import { useMemo, type ComponentType } from "react";
import {
  Controller,
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
  type SectionValues,
} from "./types";

export interface SchemaFieldProps {
  descriptor: FieldDescriptor;
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
  disabled?: boolean;
  required?: boolean;
  /** dataKey (de un descriptor "photo"/"file") -> URL/base64 de un archivo ya guardado. */
  preloadedUrls?: Readonly<Record<string, string>>;
  /** Notifica que un descriptor "photo"/"file" tiene un archivo nuevo (o fue quitado) —
   * mismo patrón de "staged upload" que ya usa Matrículas hoy; el padre decide cuándo
   * subirlo (informe §3.2/§3.3). Ningún otro tipo lo necesita: su valor ya vive 100% en
   * el formulario. Esta es la única pieza de plomería que NO estaba en el
   * `FieldDescriptor`/`GeoCascadeFieldProps`/`PhotoFieldProps` del informe — hace falta
   * para que "photo"/"file" sean utilizables a través de `<SchemaSection>` (ver
   * "Hallazgos pendientes" del Paso 1). */
  onFileStaged?: (dataKey: string, file: File | null) => void;
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
    />
  );
}

function YesNoTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "yesno") return null;
  return (
    <YesNoField name={d.name} label={d.label} control={props.control} mode={d.mode} full={d.full} />
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
      requiredWhen={typeof d.required === "object" ? d.required : undefined}
    />
  );
}

function PhotoTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "photo") return null;
  const preloadedUrl = props.preloadedUrls?.[d.preloadedUrlKey ?? d.dataKey];
  return (
    <PhotoField
      dataKey={d.dataKey}
      label={d.label}
      control={props.control}
      preloadedUrl={preloadedUrl}
      onFileStaged={(file) => props.onFileStaged?.(d.dataKey, file)}
    />
  );
}

/**
 * `type: "file"` — fuera de alcance de este esfuerzo (informe §3.3/§5.2: la subida de
 * archivos "tipo Admisiones" solo aplica a Step5Documents, no a Step3, y el plan no pide
 * tocar Step5). Implementación mínima, sin consumidor real hoy: misma forma de valor que
 * `photo` (`{file, removed}`) pero sin previsualización de imagen — solo el nombre del
 * archivo.
 */
interface FileFieldValue {
  file: File | null;
  removed: boolean;
}
const EMPTY_FILE_VALUE: FileFieldValue = { file: null, removed: false };

function FileTypeField(props: SchemaFieldProps) {
  const d = props.descriptor;
  if (d.type !== "file") return null;
  const preloadedUrl = props.preloadedUrls?.[d.dataKey];
  return (
    <Controller
      name={d.dataKey}
      control={props.control}
      defaultValue={EMPTY_FILE_VALUE}
      render={({ field }) => {
        const value = (field.value as FileFieldValue | undefined) ?? EMPTY_FILE_VALUE;
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
                    if (selected) {
                      field.onChange({ file: selected, removed: false });
                      props.onFileStaged?.(d.dataKey, selected);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {hasFile && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => {
                    field.onChange({ file: null, removed: true });
                    props.onFileStaged?.(d.dataKey, null);
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        );
      }}
    />
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
  onFileStaged?: (dataKey: string, file: File | null) => void;
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
  onFileStaged,
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

        const disabled = descriptor.disabledWhen
          ? evaluateCondition(descriptor.disabledWhen, values)
          : false;

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
            onFileStaged={onFileStaged}
          />
        );
      })}
    </>
  );
}

/**
 * Tipos del esquema declarativo de campos (Paso 1 de
 * `docs/plan-schema-driven-fields.md`, gimpa-backend).
 *
 * Implementación casi literal del diseño ya aprobado en
 * `docs/paso0-informe-schema-driven-fields.md` §3.1 (cascada geográfica), §3.2 (foto) y
 * §4 (`FieldType`/`FieldDescriptor`/`FieldCondition`) — no se rediseña nada aquí.
 *
 * Este archivo NO tiene consumidores todavía (Paso 1 = solo fundación). Admisiones y
 * Matrículas siguen usando su JSX de campo a mano hasta los Pasos 2 y 4.
 */

import type { Control, UseFormRegister, UseFormSetValue } from "react-hook-form";

export type SectionValues = Record<string, unknown>;

/**
 * Condición "mostrar/requerir/deshabilitar solo si...". Las formas declarativas
 * (`equals`/`notEquals`/`in`) permiten a `<SchemaSection>` saber de antemano qué campos
 * observar con un único `useWatch({control, name: [...]})` — igual al patrón que ya usa
 * `GuardiansStep` de Admisiones para el auto-copiado. La forma `watch`+`predicate` es el
 * escape hatch para lógica que no se reduce a una comparación simple (ej. un array, o
 * "Otro" || "Empresa"); en ese caso el descriptor DEBE declarar `watch` con los nombres
 * de los campos de los que depende, porque `<SchemaSection>` no puede inferirlos de una
 * función arbitraria.
 */
export type FieldCondition =
  | { field: string; equals: unknown }
  | { field: string; notEquals: unknown }
  | { field: string; in: readonly unknown[] }
  | { watch: readonly string[]; predicate: (values: SectionValues) => boolean };

/** Nombres de campos de los que depende una `FieldCondition` (para el `useWatch` mínimo
 * que calcula `<SchemaSection>`). */
export function conditionDependencies(condition: FieldCondition): readonly string[] {
  if ("watch" in condition) return condition.watch;
  return [condition.field];
}

/** Evalúa una `FieldCondition` contra un objeto de valores ya observados (el resultado
 * de un `useWatch` puntual, o de `watchedValuesFrom` más abajo). */
export function evaluateCondition(condition: FieldCondition, values: SectionValues): boolean {
  if ("watch" in condition) return condition.predicate(values);
  if ("equals" in condition) return values[condition.field] === condition.equals;
  if ("notEquals" in condition) return values[condition.field] !== condition.notEquals;
  return condition.in.includes(values[condition.field]);
}

/**
 * Reconstruye un objeto `{nombre: valor}` a partir de un array de nombres y el array de
 * valores que devuelve `useWatch({control, name: [...nombres]})` en el mismo orden.
 * Compartido por `GeoCascadeField` (para `requiredWhen`) y `SchemaSection` (para
 * `showWhen`/`disabledWhen`/`required`) — evita reimplementar el mismo `zip` dos veces.
 */
export function watchedValuesFrom(
  names: readonly string[],
  watched: unknown,
): SectionValues {
  const arr = Array.isArray(watched) ? watched : [watched];
  const out: SectionValues = {};
  names.forEach((n, i) => {
    out[n] = arr[i];
  });
  return out;
}

// -------------------------------------------------------------- Cascada geográfica

/**
 * Fuente de datos de una cascada país→departamento→ciudad→barrio. Ver informe §3.1.
 *
 * `kind: "static"` reproduce Matrículas hoy: `departments`/`citiesByDepartment` son
 * arrays de módulo fijos, nunca fetch. Hoy solo hay una entrada real en
 * `citiesByDepartment` ("Atlántico"); cualquier departamento sin entrada ahí cae
 * automáticamente a un `<input>` de texto libre para ciudad (mismo comportamiento
 * exacto que hoy) — `GeoCascadeField` NO debe inventar un mapa completo que no existe.
 *
 * `kind: "api"` reproduce Admisiones hoy (`GeoResidenceFields`): `fetchDepartments`/
 * `fetchCities` son llamadas reales a api-colombia, con estado `loading` mientras
 * resuelven.
 *
 * Ninguna de las dos ramas incluye la lista de países: en el código real de hoy
 * (`GeoResidenceFields` y el `ComboBox` de país de Matrículas) es literalmente la misma
 * lista estática (`COUNTRIES` de `@/components/shared/formLists`) en los dos módulos —
 * `GeoCascadeField` la usa directo, ver comentario en ese archivo.
 */
export type GeoCascadeSource =
  | {
      kind: "static";
      /** Lista completa de departamentos (no se filtra por país). */
      departments: readonly string[];
      /**
       * Ciudades por departamento. Hoy en Matrículas solo hay una entrada real
       * ("Atlántico" → ATLANTICO_CITIES); cualquier departamento sin entrada aquí cae
       * automáticamente a `<input>` de texto libre para ciudad.
       */
      citiesByDepartment: Readonly<Record<string, readonly string[]>>;
      /** Barrios de una ciudad concreta (hoy solo Barranquilla en ambos módulos). */
      barriosByCity: Readonly<Record<string, readonly string[]>>;
    }
  | {
      kind: "api";
      /** Devuelve [{id, name}] de departamentos de Colombia. */
      fetchDepartments: () => Promise<{ id: number; name: string }[]>;
      /** Devuelve [{id, name}] de ciudades de un departamento por id. */
      fetchCities: (departmentId: number) => Promise<{ id: number; name: string }[]>;
      /** Igual que en "static": barrios por ciudad (Admisiones también hardcodea
       * Barranquilla, vía `barriosByCity`). */
      barriosByCity: Readonly<Record<string, readonly string[]>>;
    };

export interface GeoCascadeFieldProps {
  /** Prefijo de los 3-4 campos coordinados, p.ej. "father_residence_" o "" (estudiante). */
  prefix: string;
  /** false para cascadas de nacimiento/expedición (3 niveles, sin barrio ni dirección);
   * true para residencia (4 niveles + dirección/complemento/estrato). */
  hasBarrio: boolean;
  source: GeoCascadeSource;
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
  disabled?: boolean; // ej. cuando guardian_type === "Padre"/"Madre"
  /**
   * `boolean` para un `required` incondicional (ej. Matrículas: TODAS las 9 instancias
   * de cascada usan `required={true}` fijo en país/depto/ciudad/barrio — ver
   * `Step3StudentData.tsx:1620,1629,1638,1649,1657,1672,1695`) o `FieldCondition` para
   * un `required` condicional (ej. `!father_lives_with_student`). Único lugar de verdad
   * de "requerido" para este componente — no lo dupliques con un segundo campo.
   */
  requiredWhen?: boolean | FieldCondition;
  /** Textos por defecto "País/Departamento/Ciudad/Barrio de Residencia"; sobreescribible
   * para los casos "de Nacimiento"/"de Expedición"/"de la sede". */
  labels?: Partial<
    Record<
      "country" | "department" | "city" | "barrio" | "address" | "addressComplement" | "stratum",
      string
    >
  >;
}

// -------------------------------------------------------------------------- Foto

export interface PhotoFieldValue {
  file: File | null; // seleccionado en esta sesión, aún no subido
  removed: boolean; // equivalente al "_manually_removed" de hoy
}

export interface PhotoFieldProps {
  dataKey: string; // "student_photo" | "father_photo" | "mother_photo"
  label: string;
  control: Control<SectionValues>; // vía Controller — un `File` no cabe en `register`
  preloadedUrl?: string; // base64 o URL absoluta de una foto ya guardada
  /** Notifica al padre para que la incluya en el FormData del envío final — el
   * componente NO decide cuándo se sube (ver informe §3.2/§3.3, los 3 modelos de
   * timing de subida que ya conviven en el repo). */
  onFileStaged: (file: File | null) => void;
}

// ---------------------------------------------------------- Tipos y descriptor

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "combobox"
  | "yesno"
  | "checkbox"
  | "checkbox-group"
  | "geo-cascade"
  | "photo"
  | "file";

interface FieldDescriptorBase {
  /** Path de RHF; admite paths con punto ("repeated.grade"). No aplica a "geo-cascade"
   * (usa `prefix`) ni a "photo"/"file" (usan `dataKey`) — ver discriminated union abajo. */
  name?: string;
  type: FieldType;
  label: string;
  id?: string;
  /** Ocupa las 2 columnas del FieldGrid (sm:col-span-2). */
  full?: boolean;
  placeholder?: string;
  /** Documental por ahora — el plan prohíbe introducir validación real (zod, etc.) en
   * esta tanda; sirve para que el `<input required>` nativo se genere igual que hoy. */
  required?: boolean | FieldCondition;
  /** Oculta el campo por completo (no solo lo deshabilita) si la condición es falsa. */
  showWhen?: FieldCondition;
  /** Deshabilita sin ocultar (ej. campos de acudiente cuando guardian_type=Padre/Madre). */
  disabledWhen?: FieldCondition;
}

export type FieldDescriptor =
  | (FieldDescriptorBase & { type: "text" | "email" | "tel" | "number" | "date"; name: string })
  | (FieldDescriptorBase & { type: "textarea"; name: string; rows?: number })
  | (FieldDescriptorBase & {
      type: "select";
      name: string;
      options: readonly string[] | readonly { value: string; label: string }[];
    })
  | (FieldDescriptorBase & {
      type: "combobox";
      name: string;
      options: readonly string[] | (() => Promise<readonly string[]>);
    })
  | (FieldDescriptorBase & { type: "yesno"; name: string; mode?: "string" | "boolean" })
  | (FieldDescriptorBase & { type: "checkbox"; name: string })
  | (FieldDescriptorBase & { type: "checkbox-group"; name: string; options: readonly string[] })
  | (FieldDescriptorBase & {
      type: "geo-cascade";
      prefix: string;
      hasBarrio: boolean;
      source: GeoCascadeSource;
      /** Reenviado tal cual a `GeoCascadeFieldProps["labels"]` — ver ese tipo arriba.
       * Sin esto el descriptor no tenía forma de pedir "de Nacimiento"/"de Expedición"/
       * "de la sede" en vez de los defaults "...de Residencia". */
      labels?: GeoCascadeFieldProps["labels"];
    })
  | (FieldDescriptorBase & { type: "photo"; dataKey: string; preloadedUrlKey?: string })
  | (FieldDescriptorBase & { type: "file"; dataKey: string; accept?: string });

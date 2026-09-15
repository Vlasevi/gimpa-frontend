/**
 * Bloques reutilizables del wizard: residencia con geo (api-colombia) y datos de una
 * persona. Se parametrizan con un `prefix` para reusarlos en estudiante, padre, madre
 * y acudiente sin repetir 60+ campos.
 *
 * Paso 2 de `docs/plan-schema-driven-fields.md` (gimpa-backend): estos tres
 * componentes ya no arman JSX a mano — cada uno construye un array de
 * `FieldDescriptor` y delega el render a `<SchemaSection>`
 * (`@/components/ui/fields/registry`). `GeoResidenceFields` en particular pasa a ser
 * un envoltorio trivial de un único descriptor `type: "geo-cascade"` con
 * `source: {kind: "api", ...}` — la cascada real (fetch de departamentos/ciudades,
 * limpieza en cascada, combobox↔texto según país) vive ahora en
 * `@/components/ui/fields/GeoCascadeField.tsx` (fundación del Paso 1), no aquí.
 *
 * Contrato sin cambios para quien llama: mismos `prefix`/`control`/`register`/
 * `setValue`, mismos nombres de campo, mismo orden y mismas clases visuales (las
 * clases vienen de `@/components/ui/formStyles`, ya usadas por los primitivos del
 * Paso 1) — cero cambio visual ni de comportamiento, ver
 * `docs/paso0-informe-schema-driven-fields.md`.
 */

import type { Control, UseFormRegister, UseFormSetValue } from "react-hook-form";

import { BARRIOS_BARRANQUILLA, DOCUMENT_TYPES, RELIGIONS } from "@/components/shared/formLists";
import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { SchemaSection } from "@/components/ui/fields/registry";
import type { FieldDescriptor, GeoCascadeSource } from "@/components/ui/fields/types";
import type { SectionValues } from "./formFields";

interface PrefixProps {
  prefix: string;
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
}

/**
 * Fuente `kind: "api"` de Admisiones: fetch real a api-colombia, idéntico a lo que
 * hacía `GeoResidenceFields` antes de esta migración (mismos endpoints, mismo
 * `?department=<id>`). Un único objeto de módulo: las 4 instancias (residencia del
 * aspirante, padre, madre, acudiente) comparten la misma fuente de datos, solo cambia
 * el `prefix`.
 */
const ADMISIONES_GEO_SOURCE: GeoCascadeSource = {
  kind: "api",
  fetchDepartments: () =>
    apiFetch(API_ENDPOINTS.geoDepartments).then((r) => (r.ok ? r.json() : [])),
  fetchCities: (departmentId: number) =>
    apiFetch(`${API_ENDPOINTS.geoCities}?department=${departmentId}`).then((r) =>
      r.ok ? r.json() : [],
    ),
  barriosByCity: { Barranquilla: BARRIOS_BARRANQUILLA },
};

/**
 * Residencia con país/departamento/ciudad/barrio en cascada (api-colombia). Mismos
 * campos y orden que antes de la migración. Claves con `prefix`: p.ej.
 * prefix="father_residence_" → `father_residence_country`.
 */
export function GeoResidenceFields({ prefix, control, register, setValue }: PrefixProps) {
  const schema: FieldDescriptor[] = [
    {
      type: "geo-cascade",
      label: "Residencia", // no se renderiza (ver GeoCascadeTypeField); requerido por FieldDescriptorBase.
      prefix,
      hasBarrio: true,
      source: ADMISIONES_GEO_SOURCE,
    },
  ];
  return (
    <SchemaSection schema={schema} control={control} register={register} setValue={setValue} />
  );
}

interface PersonWorkProps {
  prefix: string;
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
}

/**
 * Datos personales de una persona (nombres, documento, contacto). Claves con `prefix`:
 * p.ej. prefix="father_" → `father_firstname1`. El trabajo va aparte en `WorkFields`,
 * para que el orden sea: nombres → residencia → trabajo.
 */
export function PersonFields({ prefix, control, register, setValue }: PersonWorkProps) {
  const k = (name: string) => `${prefix}${name}`;
  const schema: FieldDescriptor[] = [
    { type: "text", name: k("firstname1"), label: "Primer nombre" },
    { type: "text", name: k("firstname2"), label: "Segundo nombre" },
    { type: "text", name: k("lastname1"), label: "Primer apellido" },
    { type: "text", name: k("lastname2"), label: "Segundo apellido" },
    {
      type: "select",
      name: k("document_type"),
      label: "Tipo de documento",
      options: DOCUMENT_TYPES,
    },
    { type: "text", name: k("id_number"), label: "Número de documento" },
    { type: "email", name: k("email"), label: "Correo electrónico" },
    { type: "tel", name: k("phone"), label: "Celular" },
    { type: "select", name: k("religion"), label: "Religión", options: RELIGIONS },
  ];
  return (
    <SchemaSection schema={schema} control={control} register={register} setValue={setValue} />
  );
}

/** Datos laborales de una persona (van al final, después de la residencia). */
export function WorkFields({ prefix, control, register, setValue }: PersonWorkProps) {
  const k = (name: string) => `${prefix}${name}`;
  const schema: FieldDescriptor[] = [
    { type: "text", name: k("profession"), label: "Profesión / ocupación" },
    { type: "tel", name: k("work_phone"), label: "Teléfono del trabajo" },
    { type: "text", name: k("company_name"), label: "Empresa donde trabaja" },
    { type: "text", name: k("company_address"), label: "Dirección de la empresa", full: true },
  ];
  return (
    <SchemaSection schema={schema} control={control} register={register} setValue={setValue} />
  );
}

// El acordeón local que vivía aquí (`SubSection`) fue promovido a
// `src/components/ui/SubSection.tsx` en el Paso 1 del refactor y conectado en el Paso 3
// (docs/plan-admisiones-ui-rhf-acordeon.md). `steps.tsx` importa ahora el compartido en
// vez de este — no lo dupliques de vuelta aquí.

/**
 * Ficha del estudiante — esquema v1 por secciones (espejo de `core/student_profile.py`).
 *
 * Una sola definición para:
 * - el formulario del paso 3 (`FieldDescriptor[]` por sección, pintados con
 *   `<SchemaSection>`), y
 * - la vista de solo lectura del staff (`profileRows()`), que recorre los mismos
 *   descriptores y resuelve etiquetas de catálogo.
 *
 * Los `name` son rutas con punto de la ficha (`student.birth.date`): react-hook-form los
 * maneja como objetos anidados, así el formulario produce directamente el JSON que
 * espera el backend. Los catálogos guardan **códigos** (`TI`, `CATOLICA`, `FATHER`) y
 * muestran etiquetas.
 *
 * Lo derivado (plan 15.9) NO se escribe en el formulario: la residencia del padre/madre
 * que vive con el estudiante y los datos del acudiente cuando es el padre o la madre los
 * completa el backend al guardar. El formulario solo oculta esos campos y lo explica.
 */

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { BARRIOS_BARRANQUILLA, COUNTRIES, EPS_LIST, RELIGIONS } from "@/components/shared/formLists";

// La lista vive en `shared/formLists` (también la usa Admisiones); se reexporta por compatibilidad.
export { RELIGIONS };
import type { FieldCondition, FieldDescriptor, GeoCascadeSource } from "@/components/ui/fields/types";

// ------------------------------------------------------------------- Catálogos

export type Option = { value: string; label: string };

export const ID_TYPES: Option[] = [
  { value: "RC", label: "Registro Civil (RC)" },
  { value: "TI", label: "Tarjeta de Identidad (TI)" },
  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
  { value: "CE", label: "Cédula de Extranjería (CE)" },
  { value: "PP", label: "Pasaporte (PP)" },
  { value: "PPT", label: "Permiso de Protección Temporal (PPT)" },
];
export const SEXES: Option[] = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];
export const MARITAL_STATUSES: Option[] = [
  { value: "CASADOS", label: "Casados" },
  { value: "DIVORCIADOS", label: "Divorciados" },
  { value: "SEPARADOS", label: "Separados" },
  { value: "UNION_LIBRE", label: "Unión libre" },
  { value: "SOLTERO", label: "Soltero/a" },
  { value: "VIUDO", label: "Viudo/a" },
];
export const BLOOD_TYPES: Option[] = ["A", "B", "AB", "O"].map((v) => ({ value: v, label: v }));
export const BLOOD_RH: Option[] = [
  { value: "+", label: "Positivo (+)" },
  { value: "-", label: "Negativo (−)" },
];
export const GUARDIAN_TYPES: Option[] = [
  { value: "FATHER", label: "El padre" },
  { value: "MOTHER", label: "La madre" },
  { value: "OTHER", label: "Otra persona" },
  { value: "COMPANY", label: "Una empresa" },
];
export const SECOND_SIGNERS: Option[] = [
  { value: "MOTHER", label: "La madre" },
  { value: "FATHER", label: "El padre" },
  { value: "NONE", label: "Nadie más" },
];

export const DIAGNOSIS_NONE = "Ninguno";
export const DIAGNOSIS_OTHER = "Otros";
export const DIAGNOSES = [
  DIAGNOSIS_NONE,
  "TEA - Nivel 1 (requiere apoyo)",
  "TEA - Nivel 2 (requiere apoyo sustancial)",
  "TEA - Nivel 3 (requiere apoyo muy sustancial)",
  "Síndrome de Asperger",
  "TDAH - Tipo inatento",
  "TDAH - Tipo hiperactivo-impulsivo",
  "TDAH - Tipo combinado",
  "Discapacidad Intelectual - Leve",
  "Discapacidad Intelectual - Moderada",
  "Discapacidad Intelectual - Severa",
  "Discapacidad Intelectual - Profunda",
  "Discapacidad Intelectual Límite (BIF)",
  "Trastorno del Desarrollo de la Coordinación (Dispraxia)",
  "Trastorno Específico del Lenguaje (TEL)",
  "Dislexia",
  "Disgrafía",
  "Disortografía",
  "Discalculia",
  "Trastorno fonológico",
  "Trastorno de fluidez (tartamudez)",
  "Trastorno pragmático de la comunicación",
  "Apraxia del habla",
  "Retraso del lenguaje",
  "Baja visión",
  "Ceguera",
  "Ambliopía",
  "Estrabismo severo",
  "Hipoacusia leve, moderada o severa",
  "Sordera profunda",
  "Trastorno del procesamiento auditivo",
  "Parálisis cerebral",
  "Paraplejia / cuadriplejia",
  "Amputaciones",
  "Alteraciones osteomusculares",
  "Enfermedades neuromusculares (distrofias)",
  "Espina bífida",
  "Movilidad reducida (requiere soporte, bastón, férulas o silla de ruedas)",
  "Discapacidades Múltiples",
  "Trastorno negativista desafiante (TND)",
  "Trastorno de conducta",
  "Trastornos de ansiedad",
  "Depresión infantil o adolescente",
  "Trastorno adaptativo",
  "Estrés postraumático",
  "Fobia escolar",
  "Mutismo selectivo",
  "Epilepsia",
  "Síndrome de Down",
  "Síndrome de Williams",
  "Síndrome de Rett",
  "Síndrome X Frágil",
  "Enfermedades huérfanas que requieren ajustes",
  "Déficits nutricionales con impacto cognitivo",
  DIAGNOSIS_OTHER,
];

/** Fuente de la cascada geográfica: catálogo de Colombia del backend (`/api/geo/`). */
export const GEO_SOURCE: GeoCascadeSource = {
  kind: "api",
  fetchDepartments: () =>
    apiFetch(API_ENDPOINTS.geoDepartments).then((r) => (r.ok ? r.json() : [])),
  fetchCities: (departmentId: number) =>
    apiFetch(`${API_ENDPOINTS.geoCities}?department=${departmentId}`).then((r) => (r.ok ? r.json() : [])),
  barriosByCity: { Barranquilla: BARRIOS_BARRANQUILLA },
};

// ------------------------------------------------------------------- Utilidades

export function getPath(data: unknown, path: string): unknown {
  let node: unknown = data;
  for (const part of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Valor de la ficha como texto ("" si está vacío). */
export function getText(data: unknown, path: string): string {
  const value = getPath(data, path);
  return value === null || value === undefined ? "" : String(value);
}

export function labelOf(options: readonly Option[], value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return options.find((o) => o.value === value)?.label ?? String(value);
}

/** Hoy en Colombia (AAAA-MM-DD) para `max` de las fechas (hallazgos #8 y #9). */
export function todayInBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  const [ty, tm, td] = todayInBogota().split("-").map(Number);
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return age >= 0 && age < 120 ? age : null;
}

const is = (field: string, value: unknown): FieldCondition => ({ field, equals: value });
const guardianIs = (...types: string[]): FieldCondition => ({ field: "guardian.type", in: types });

// ------------------------------------------------------------------- Secciones

export type SectionId = "student" | "health" | "residence" | "household" | "father" | "mother" | "guardian";

export interface ProfileSection {
  id: SectionId;
  title: string;
  /** Qué se pide en la sección, en una línea (subtítulo del acordeón). */
  hint: string;
  /** Rutas de la ficha que pertenecen a la sección (para marcar errores). */
  prefixes: string[];
  fields: FieldDescriptor[];
}

// Si el acudiente es el padre o la madre, sus datos personales son obligatorios (van en
// el contrato y el pagaré, y a su correo llega el código de verificación).
const personFields = (who: "father" | "mother", noun: string): FieldDescriptor[] => {
  const ifGuardian = guardianIs(who === "father" ? "FATHER" : "MOTHER");
  return [
    { type: "text", name: `${who}.first_name1`, label: "Primer nombre", required: ifGuardian },
    { type: "text", name: `${who}.first_name2`, label: "Segundo nombre" },
    { type: "text", name: `${who}.last_name1`, label: "Primer apellido", required: ifGuardian },
    { type: "text", name: `${who}.last_name2`, label: "Segundo apellido" },
    { type: "select", name: `${who}.id_type`, label: "Tipo de documento", options: ID_TYPES, required: ifGuardian },
    { type: "text", name: `${who}.id_number`, label: "Número de documento", required: ifGuardian },
    { type: "tel", name: `${who}.phone`, label: "Celular", required: ifGuardian },
    { type: "email", name: `${who}.email`, label: "Correo electrónico", required: ifGuardian },
    { type: "select", name: `${who}.religion`, label: "Religión", options: RELIGIONS },
    {
      type: "geo-cascade",
      prefix: `${who}.birth.`,
      hasBarrio: false,
      source: GEO_SOURCE,
      label: `Lugar de nacimiento ${noun}`,
      labels: { country: "País de nacimiento", department: "Departamento de nacimiento", city: "Ciudad de nacimiento" },
    },
    {
      type: "geo-cascade",
      prefix: `${who}.residence.`,
      hasBarrio: true,
      source: GEO_SOURCE,
      label: `Residencia ${noun}`,
      showWhen: { field: `household.lives_with.${who}`, notEquals: true },
    },
    { type: "text", name: `${who}.work.profession`, label: "Profesión u oficio" },
    { type: "text", name: `${who}.work.company`, label: "Empresa donde trabaja" },
    { type: "text", name: `${who}.work.company_address`, label: "Dirección de la empresa" },
    { type: "tel", name: `${who}.work.phone`, label: "Teléfono del trabajo" },
  ];
};

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "student",
    title: "Estudiante",
    hint: "Nombre, documento, nacimiento y contacto",
    prefixes: ["student.", "photos.student_photo"],
    fields: [
      { type: "text", name: "student.first_name1", label: "Primer nombre", required: true },
      { type: "text", name: "student.first_name2", label: "Segundo nombre" },
      { type: "text", name: "student.last_name1", label: "Primer apellido", required: true },
      { type: "text", name: "student.last_name2", label: "Segundo apellido" },
      { type: "select", name: "student.sex", label: "Género", options: SEXES, required: true },
      { type: "date", name: "student.birth.date", label: "Fecha de nacimiento", required: true, max: "today" },
      // Calculada desde la fecha de nacimiento: un campo más del grid, bloqueado (no se guarda).
      {
        type: "computed",
        id: "student-age",
        label: "Edad",
        watch: ["student.birth.date"],
        compute: (v) => {
          const age = ageFrom(v["student.birth.date"] as string | null);
          return age === null ? "" : `${age} ${age === 1 ? "año" : "años"}`;
        },
      },
      {
        type: "geo-cascade",
        prefix: "student.birth.",
        hasBarrio: false,
        source: GEO_SOURCE,
        label: "Lugar de nacimiento",
        required: true,
        labels: { country: "País de nacimiento", department: "Departamento de nacimiento", city: "Ciudad de nacimiento" },
      },
      { type: "select", name: "student.id_type", label: "Tipo de documento", options: ID_TYPES, required: true },
      { type: "text", name: "student.id_number", label: "Número de documento", required: true },
      { type: "date", name: "student.id_issue.date", label: "Fecha de expedición", required: true, max: "today" },
      {
        type: "geo-cascade",
        prefix: "student.id_issue.",
        hasBarrio: false,
        source: GEO_SOURCE,
        label: "Lugar de expedición",
        required: true,
        labels: { country: "País de expedición", department: "Departamento de expedición", city: "Ciudad de expedición" },
      },
      { type: "select", name: "student.religion", label: "Religión", options: RELIGIONS, required: true },
      // Pregunta Sí/No a la izquierda (empieza fila) y lo que revela a su derecha.
      {
        type: "yesno",
        name: "student.has_cellphone",
        label: "¿Tiene celular propio?",
        mode: "boolean",
        required: true,
        full: false,
        startsRow: true,
      },
      {
        type: "tel",
        name: "student.cellphone",
        label: "Número de celular",
        showWhen: is("student.has_cellphone", true),
      },
      {
        type: "yesno",
        name: "student.has_siblings",
        label: "¿Tiene hermanos?",
        mode: "boolean",
        required: true,
        full: false,
        startsRow: true,
      },
      {
        type: "yesno",
        name: "student.siblings_in_school",
        label: "¿Alguno estudia en el colegio?",
        mode: "boolean",
        full: false,
        showWhen: is("student.has_siblings", true),
      },
    ],
  },
  {
    id: "health",
    title: "Salud",
    hint: "EPS, grupo sanguíneo, antecedentes y diagnóstico",
    prefixes: ["health."],
    fields: [
      { type: "combobox", name: "health.eps", label: "EPS", options: EPS_LIST, required: true },
      { type: "select", name: "health.blood_type", label: "Grupo sanguíneo", options: BLOOD_TYPES, required: true },
      { type: "select", name: "health.blood_rh", label: "Factor RH", options: BLOOD_RH, required: true },
      { type: "yesno", name: "health.has_medical_history", label: "¿Tiene antecedentes médicos?", mode: "boolean", required: true },
      {
        type: "textarea",
        name: "health.medical_history_detail",
        label: "¿Cuáles antecedentes?",
        rows: 2,
        showWhen: is("health.has_medical_history", true),
        required: true,
      },
      { type: "yesno", name: "health.has_medications", label: "¿Toma medicamentos formulados?", mode: "boolean", required: true },
      {
        type: "textarea",
        name: "health.medications_detail",
        label: "¿Cuáles medicamentos y en qué dosis?",
        rows: 2,
        showWhen: is("health.has_medications", true),
        required: true,
      },
      { type: "yesno", name: "health.has_allergies", label: "¿Tiene alergias?", mode: "boolean", required: true },
      {
        type: "textarea",
        name: "health.allergies_detail",
        label: "¿A qué es alérgico?",
        rows: 2,
        showWhen: is("health.has_allergies", true),
        required: true,
      },
      { type: "combobox", name: "health.diagnosis", label: "Diagnóstico o proceso en curso", options: DIAGNOSES, required: true, full: true },
      {
        type: "text",
        name: "health.diagnosis_other",
        label: "¿Cuál diagnóstico?",
        showWhen: is("health.diagnosis", DIAGNOSIS_OTHER),
        required: true,
      },
      {
        type: "text",
        name: "health.diagnosis_additional_info",
        label: "Médico o institución que lo atiende",
        full: true,
        showWhen: {
          watch: ["health.diagnosis"],
          predicate: (v) => !!v["health.diagnosis"] && v["health.diagnosis"] !== DIAGNOSIS_NONE,
        },
      },
    ],
  },
  {
    id: "residence",
    title: "Residencia",
    hint: "Dónde vive el estudiante",
    prefixes: ["residence."],
    fields: [
      {
        type: "geo-cascade",
        prefix: "residence.",
        hasBarrio: true,
        source: GEO_SOURCE,
        label: "Residencia del estudiante",
        required: true,
      },
    ],
  },
  {
    id: "household",
    title: "Hogar",
    hint: "Con quién vive y estado civil de los padres",
    prefixes: ["household."],
    fields: [
      {
        type: "select",
        name: "household.parents_marital_status",
        label: "Estado civil de los padres",
        options: MARITAL_STATUSES,
        required: true,
      },
      { type: "checkbox", name: "household.lives_with.father", label: "Vive con el padre", full: true },
      { type: "checkbox", name: "household.lives_with.mother", label: "Vive con la madre", full: true },
      { type: "checkbox", name: "household.lives_with.other", label: "Vive con otra persona", full: true },
    ],
  },
  {
    id: "father",
    title: "Padre",
    hint: "Datos personales, residencia y trabajo",
    prefixes: ["father.", "photos.father_photo"],
    fields: personFields("father", "del padre"),
  },
  {
    id: "mother",
    title: "Madre",
    hint: "Datos personales, residencia y trabajo",
    prefixes: ["mother.", "photos.mother_photo"],
    fields: personFields("mother", "de la madre"),
  },
  {
    id: "guardian",
    title: "Acudiente / Responsable financiero",
    hint: "Quién responde por el estudiante y firma los documentos",
    prefixes: ["guardian."],
    fields: [
      { type: "select", name: "guardian.type", label: "¿Quién es el acudiente / responsable financiero?", options: GUARDIAN_TYPES, required: true, full: true },
      // Empresa
      { type: "text", name: "guardian.legal_name", label: "Razón social", showWhen: guardianIs("COMPANY"), required: true },
      { type: "text", name: "guardian.id_number", label: "NIT", showWhen: guardianIs("COMPANY"), required: true, placeholder: "900123456-7" },
      // Otra persona
      { type: "text", name: "guardian.relationship", label: "Parentesco con el estudiante", showWhen: guardianIs("OTHER"), required: true, placeholder: "Abuela, tío…" },
      { type: "text", name: "guardian.first_name1", label: "Primer nombre", showWhen: guardianIs("OTHER"), required: true },
      { type: "text", name: "guardian.first_name2", label: "Segundo nombre", showWhen: guardianIs("OTHER") },
      { type: "text", name: "guardian.last_name1", label: "Primer apellido", showWhen: guardianIs("OTHER"), required: true },
      { type: "text", name: "guardian.last_name2", label: "Segundo apellido", showWhen: guardianIs("OTHER") },
      { type: "select", name: "guardian.id_type", label: "Tipo de documento", options: ID_TYPES, showWhen: guardianIs("OTHER"), required: true },
      { type: "text", name: "guardian.id_number", label: "Número de documento", showWhen: guardianIs("OTHER"), required: true },
      // Otra persona o empresa
      { type: "tel", name: "guardian.phone", label: "Teléfono de contacto", showWhen: guardianIs("OTHER", "COMPANY"), required: true },
      { type: "email", name: "guardian.email", label: "Correo electrónico", showWhen: guardianIs("OTHER", "COMPANY"), required: true },
      { type: "select", name: "guardian.religion", label: "Religión", options: RELIGIONS, showWhen: guardianIs("OTHER") },
      {
        type: "geo-cascade",
        prefix: "guardian.residence.",
        hasBarrio: true,
        source: GEO_SOURCE,
        label: "Residencia del acudiente / responsable financiero",
        showWhen: guardianIs("OTHER", "COMPANY"),
      },
      { type: "text", name: "guardian.work.profession", label: "Profesión u oficio", showWhen: guardianIs("OTHER") },
      { type: "text", name: "guardian.work.company", label: "Empresa donde trabaja", showWhen: guardianIs("OTHER") },
      { type: "text", name: "guardian.work.company_address", label: "Dirección de la empresa", showWhen: guardianIs("OTHER") },
      { type: "tel", name: "guardian.work.phone", label: "Teléfono del trabajo", showWhen: guardianIs("OTHER") },
      {
        type: "select",
        name: "guardian.second_signer",
        label: "¿Quién firma también el contrato, el pagaré y la hoja?",
        options: SECOND_SIGNERS,
        showWhen: guardianIs("OTHER", "COMPANY"),
        required: true,
        full: true,
      },
    ],
  },
];

/**
 * Cuando el acudiente es el padre o la madre, el backend copia esa persona en
 * `guardian` (plan 15.9) y sus errores llegan como `guardian.*`. En el formulario esos
 * campos se llenan en la sección del padre/madre: se reubican ahí.
 */
export function relocateGuardianErrors(
  errors: Record<string, string>,
  guardianType: string | null | undefined,
): Record<string, string> {
  const source = guardianType === "FATHER" ? "father" : guardianType === "MOTHER" ? "mother" : null;
  if (!source) return errors;
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(errors)) {
    if (path.startsWith("guardian.") && path !== "guardian.type") {
      out[`${source}.${path.slice("guardian.".length)}`] = message;
    } else {
      out[path] = message;
    }
  }
  return out;
}

export function sectionOfPath(path: string): SectionId | null {
  for (const section of PROFILE_SECTIONS) {
    if (section.prefixes.some((p) => path.startsWith(p))) return section.id;
  }
  return null;
}

// ------------------------------------------------------------ Vista de solo lectura

export interface ProfileRow {
  label: string;
  value: string;
}

type GeoLabelKey = keyof NonNullable<Extract<FieldDescriptor, { type: "geo-cascade" }>["labels"]>;

/** Partes de una cascada geográfica en solo lectura. La etiqueta es corta, como en el
 * formulario: la de la cascada si la trae ("Departamento de nacimiento"); si no, la de
 * residencia (las cascadas sin `labels` son todas de residencia). "Otro" se reemplaza por
 * lo que se escribió en `…_other`. */
const GEO_PARTS: { key: string; labelKey: GeoLabelKey; label: string; other?: string; withBarrio?: boolean }[] = [
  { key: "country", labelKey: "country", label: "País de residencia", other: "country_other" },
  { key: "department", labelKey: "department", label: "Departamento de residencia" },
  { key: "city", labelKey: "city", label: "Ciudad de residencia" },
  { key: "barrio", labelKey: "barrio", label: "Barrio", other: "barrio_other", withBarrio: true },
  { key: "address", labelKey: "address", label: "Dirección", withBarrio: true },
  { key: "address_complement", labelKey: "addressComplement", label: "Complemento", withBarrio: true },
  { key: "stratum", labelKey: "stratum", label: "Estrato", withBarrio: true },
];

function conditionHolds(condition: FieldCondition | undefined, data: unknown): boolean {
  if (!condition) return true;
  if ("watch" in condition) {
    const values: Record<string, unknown> = {};
    for (const name of condition.watch) values[name] = getPath(data, name);
    return condition.predicate(values);
  }
  const value = getPath(data, condition.field) ?? (condition.field.includes("lives_with") ? false : undefined);
  if ("equals" in condition) return value === condition.equals;
  if ("notEquals" in condition) return value !== condition.notEquals;
  return condition.in.includes(value);
}

function display(descriptor: FieldDescriptor, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (descriptor.type === "yesno" || descriptor.type === "checkbox") return value ? "Sí" : "No";
  if (descriptor.type === "select") return labelOf(descriptor.options as Option[], value);
  if (descriptor.type === "date" && typeof value === "string") {
    const [y, m, d] = value.split("-");
    return d ? `${d}/${m}/${y}` : value;
  }
  return String(value);
}

/** Filas `{label, value}` de una sección, con los campos que aplican a esta ficha. */
export function profileRows(section: ProfileSection, data: unknown): ProfileRow[] {
  const rows: ProfileRow[] = [];
  for (const d of section.fields) {
    if (!conditionHolds(d.showWhen, data)) continue;
    if (d.type === "geo-cascade") {
      for (const part of GEO_PARTS) {
        if (part.withBarrio && !d.hasBarrio) continue;
        let value = getPath(data, `${d.prefix}${part.key}`);
        if (value === "Otro" && part.other) value = getPath(data, `${d.prefix}${part.other}`) || value;
        if (value === null || value === undefined || value === "") continue;
        rows.push({ label: d.labels?.[part.labelKey] ?? part.label, value: String(value) });
      }
      continue;
    }
    // Lo calculado (la edad) no es un dato guardado de la ficha.
    if (d.type === "computed" || !("name" in d) || !d.name) continue;
    rows.push({ label: d.label, value: display(d, getPath(data, d.name)) });
  }
  return rows;
}

/** Nota de lo derivado, para la vista y el formulario. */
export function derivedNotes(sectionId: SectionId, data: unknown): string[] {
  const notes: string[] = [];
  if ((sectionId === "father" || sectionId === "mother") && getPath(data, `household.lives_with.${sectionId}`)) {
    notes.push("Vive con el estudiante: su residencia es la del estudiante.");
  }
  if (sectionId === "guardian") {
    const type = getPath(data, "guardian.type");
    if (type === "FATHER") notes.push("El acudiente es el padre: se usan sus datos de la sección Padre.");
    if (type === "MOTHER") notes.push("El acudiente es la madre: se usan sus datos de la sección Madre.");
  }
  return notes;
}

export { COUNTRIES };

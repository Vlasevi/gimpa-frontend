/**
 * Muestra todo lo que llenó el acudiente (`application.data`) de forma legible, para que
 * el staff pueda revisarlo antes de decidir. Renderiza cada sección con sus campos
 * (etiquetas humanizadas), omitiendo lo vacío. Misma tipografía que la ficha de
 * Matrículas (`ProfileTab`): tarjetas por sección y los tokens de `ui/textStyles`.
 */

import {
  cardClass,
  cardHeaderClass,
  cardTitleClass,
  dataLabelClass,
  dataValueClass,
} from "@/components/ui/textStyles";

const SECTION_TITLES: Record<string, string> = {
  residence: "Residencia",
  academic_history: "Historial académico",
  guardians: "Acudientes",
  health: "Salud",
  declarations: "Declaraciones",
};

// Orden de presentación de las secciones.
const SECTION_ORDER = [
  "residence",
  "academic_history",
  "guardians",
  "health",
  "declarations",
];

// Prefijos de persona → etiqueta legible.
const PREFIXES: [string, string][] = [
  ["father_residence_", "Padre · "],
  ["mother_residence_", "Madre · "],
  ["guardian_residence_", "Tutor responsable · "],
  ["father_", "Padre · "],
  ["mother_", "Madre · "],
  ["guardian_", "Tutor responsable · "],
];

const LABELS: Record<string, string> = {
  // Persona / residencia
  firstname1: "Primer nombre", firstname2: "Segundo nombre",
  lastname1: "Primer apellido", lastname2: "Segundo apellido",
  document_type: "Tipo de documento", id_number: "Documento",
  email: "Correo", phone: "Celular", work_phone: "Tel. trabajo",
  profession: "Profesión", religion: "Religión",
  company_name: "Empresa", company_address: "Dirección empresa",
  full_name: "Nombre / Razón social", relationship: "Parentesco",
  relationship_other: "Parentesco (otro)", type: "Tutor responsable",
  lives_with_student: "Vive con el estudiante",
  country: "País", country_other: "País (otro)",
  department: "Departamento", city: "Ciudad",
  barrio: "Barrio", barrio_other: "Barrio (otro)",
  address: "Dirección", address_complement: "Complemento", stratum: "Estrato",
  lives_with_other: "Vive también con",
  // Académico
  previous_school: "Colegio anterior", last_grade_completed: "Último grado",
  last_grade_other: "Último grado (otro)", last_year: "Año cursado",
  change_reason: "Motivo del cambio", change_reason_other: "Motivo (otro)",
  repeated: "Repitió grado", difficulties: "Dificultades académicas",
  hasRepeated: "¿Repitió?", grade: "Grado", reason: "Motivo",
  hasDificulties: "¿Tiene dificultades?", dificulties: "Áreas", other: "Otra",
  // Salud
  eps: "EPS", blood_abo: "Grupo sanguíneo", blood_rh: "RH",
  has_medical_condition: "¿Condición médica?", medical_condition_detail: "Detalle condición",
  takes_medication: "¿Toma medicamento?", medication_detail: "Detalle medicamento",
  has_diagnosis: "¿Diagnóstico?", diagnosis_detail: "Detalle diagnóstico",
  receives_therapy: "¿Recibe terapia?", therapy_detail: "Detalle terapia",
  needs_learning_support: "¿Requiere apoyos?", learning_support_detail: "Detalle apoyos",
  // Declaraciones
  accepts_truthfulness: "Declara veracidad", accepts_data_policy: "Autoriza tratamiento de datos",
  signed_by: "Firma",
};

// Claves internas que no aportan al lector.
const HIDDEN = new Set(["department_id"]);

// Orden lógico de presentación (nombres → residencia → trabajo → …). Lo desconocido
// va al final conservando su orden. Se aplica tanto a las secciones como a cada
// sub-grupo de acudientes.
const FIELD_ORDER = [
  // Persona
  "firstname1", "firstname2", "lastname1", "lastname2", "document_type", "id_number",
  "email", "phone", "religion",
  "type", "relationship", "relationship_other", "full_name", "lives_with_student",
  // Residencia
  "country", "country_other", "department", "city", "barrio", "barrio_other",
  "address", "address_complement", "stratum", "lives_with_other",
  // Trabajo
  "profession", "work_phone", "company_name", "company_address",
  // Académico
  "previous_school", "last_grade_completed", "last_grade_other", "last_year",
  "change_reason", "change_reason_other", "repeated", "difficulties",
  // Salud
  "eps", "blood_abo", "blood_rh",
  "has_medical_condition", "medical_condition_detail", "takes_medication", "medication_detail",
  "has_diagnosis", "diagnosis_detail", "receives_therapy", "therapy_detail",
  "needs_learning_support", "learning_support_detail",
  // Declaraciones
  "accepts_truthfulness", "accepts_data_policy", "signed_by",
];

function orderIndex(key: string): number {
  const i = FIELD_ORDER.indexOf(key);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

function humanizeSuffix(suffix: string) {
  return LABELS[suffix] ?? suffix.replace(/_/g, " ");
}

function humanize(key: string) {
  if (LABELS[key]) return LABELS[key];
  for (const [prefix, prefixLabel] of PREFIXES) {
    if (key.startsWith(prefix)) return prefixLabel + humanizeSuffix(key.slice(prefix.length));
  }
  return key.replace(/_/g, " ");
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function renderValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className={dataLabelClass}>{label}</dt>
      <dd className={`whitespace-pre-line ${dataValueClass}`}>{value}</dd>
    </div>
  );
}

// Sub-grupos de la sección de acudientes.
const GUARDIAN_GROUPS: [string, string][] = [
  ["father_", "Padre"],
  ["mother_", "Madre"],
  ["guardian_", "Tutor responsable / acudiente"],
];

function stripGuardianPrefix(key: string, prefix: string) {
  let rest = key.slice(prefix.length);
  if (rest.startsWith("residence_")) rest = rest.slice("residence_".length);
  return rest;
}

/** Acudientes separados en Padre / Madre / Tutor responsable (no todo en un montón). */
function GuardiansView({ data }: { data: Record<string, unknown> }) {
  const general = Object.entries(data).filter(
    ([k, v]) =>
      !GUARDIAN_GROUPS.some(([p]) => k.startsWith(p)) && !HIDDEN.has(k) && !isEmpty(v),
  );

  return (
    <div className="space-y-4">
      {general.length > 0 && (
        <div>
          <h4 className={`mb-3 ${cardTitleClass}`}>Convivencia</h4>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {general.map(([k, v]) => (
              <Row key={k} label={humanize(k)} value={renderValue(v)} />
            ))}
          </dl>
        </div>
      )}
      {GUARDIAN_GROUPS.map(([prefix, title]) => {
        const entries = Object.entries(data)
          .filter(([k, v]) => k.startsWith(prefix) && !HIDDEN.has(k) && !isEmpty(v))
          .sort(
            ([a], [b]) =>
              orderIndex(stripGuardianPrefix(a, prefix)) -
              orderIndex(stripGuardianPrefix(b, prefix)),
          );
        if (entries.length === 0) return null;
        return (
          <div key={prefix} className="rounded-lg border border-base-300 p-4">
            <h4 className={`mb-3 ${cardTitleClass}`}>{title}</h4>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {entries.map(([k, v]) => (
                <Row key={k} label={humanizeSuffix(stripGuardianPrefix(k, prefix))}
                  value={renderValue(v)} />
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function SectionFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
    .filter(([k, v]) => !HIDDEN.has(k) && !isEmpty(v))
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b));

  if (entries.length === 0) {
    return <p className="text-sm text-base-content/60">Sin diligenciar.</p>;
  }

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        // Objeto anidado (repeated, difficulties): sub-lista.
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const subEntries = Object.entries(value as Record<string, unknown>).filter(
            ([, v]) => !isEmpty(v),
          );
          if (subEntries.length === 0) return null;
          return (
            <div key={key} className="sm:col-span-2">
              <dt className={`mb-2 ${dataLabelClass}`}>{humanize(key)}</dt>
              <dd className="grid gap-x-6 gap-y-4 rounded-lg bg-base-200 p-4 sm:grid-cols-2">
                {subEntries.map(([sk, sv]) => (
                  <Row key={sk} label={humanize(sk)} value={renderValue(sv)} />
                ))}
              </dd>
            </div>
          );
        }
        return <Row key={key} label={humanize(key)} value={renderValue(value)} />;
      })}
    </dl>
  );
}

export function ApplicationDataView({
  data,
}: {
  data: Record<string, Record<string, unknown>>;
}) {
  const sections = SECTION_ORDER.filter((s) => data?.[s]);
  const extra = Object.keys(data ?? {}).filter((s) => !SECTION_ORDER.includes(s));
  const all = [...sections, ...extra];

  if (all.length === 0) {
    return (
      <p className="text-sm text-base-content/60">
        El acudiente aún no ha diligenciado el formulario.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {all.map((sectionKey) => (
        <section key={sectionKey} className={cardClass}>
          <header className={cardHeaderClass}>
            <h3 className={cardTitleClass}>{SECTION_TITLES[sectionKey] ?? sectionKey}</h3>
          </header>
          <div className="p-5">
            {sectionKey === "guardians" ? (
              <GuardiansView data={data[sectionKey] as Record<string, unknown>} />
            ) : (
              <SectionFields data={data[sectionKey] as Record<string, unknown>} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

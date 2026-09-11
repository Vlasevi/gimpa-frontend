/**
 * Pasos del wizard de solicitud de admisión.
 *
 * Cada paso edita **una sección** de `AdmissionApplication.data` y se guarda con
 * `PATCH { sections: { <clave>: {...} } }`.
 *
 * ⚠️ Los campos de Salud (`has_medical_condition`, `takes_medication`,
 * `has_diagnosis`, `receives_therapy`, `needs_learning_support`) deben conservar
 * estos nombres: son los que lee `apply_alert_rules` en el backend.
 *
 * Cada paso recibe `control`/`register`/`setValue`/`getValues` de un `useForm()` de
 * react-hook-form propio de esa sección (uno por sección, creado en
 * `SolicitudWizard.tsx`) en vez de `values`/`onChange`. Ver el comentario al tope de
 * `formFields.tsx` para el porqué de RHF en este módulo.
 *
 * Paso 2 de `docs/plan-schema-driven-fields.md` (gimpa-backend): los campos "simples"
 * de las 5 secciones (texto, select, yesno, checkbox-group, textarea condicionada) ya
 * no son JSX a mano — son arrays de `FieldDescriptor` resueltos por `<SchemaSection>`
 * (`@/components/ui/fields/registry`). Lo que NO es un campo (la cascada geo vive en
 * `guardianFields.tsx`; la auto-copia padre/madre→acudiente, el pre-llenado desde
 * `useAuth().user`, el acordeón interno y la decisión de modo Empresa) sigue siendo
 * código imperativo en `GuardiansStep`, sin cambios de comportamiento — ver el informe
 * `docs/paso0-informe-schema-driven-fields.md` para el porqué de cada decisión.
 */

import { useEffect, useState } from "react";
import {
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import { useAuth } from "@/components/Login/loginLogic";
import { EPS_LIST, BLOOD_ABO, BLOOD_RH } from "@/components/shared/formLists";

import { FieldGrid, controlClass, labelClass, type SectionValues } from "./formFields";
import { GeoResidenceFields, PersonFields, WorkFields } from "./guardianFields";
import { SubSection } from "@/components/ui/SubSection";
import { SchemaSection } from "@/components/ui/fields/registry";
import type { FieldDescriptor } from "@/components/ui/fields/types";

export interface StepProps {
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
  getValues: UseFormGetValues<SectionValues>;
}

// Grados del colegio (para "último grado cursado"). Coincide con `seed_grades`.
const GRADE_OPTIONS = [
  "Prejardín", "Jardín", "Transición", "Primero", "Segundo", "Tercero", "Cuarto",
  "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Undécimo", "Otro",
];

const CHANGE_REASONS = [
  "Traslado de ciudad o domicilio", "Motivos académicos", "Convivencia",
  "Económico", "Familiar", "Inclusión o apoyo", "Otro",
];

const DIFFICULTY_AREAS = [
  "Matemáticas", "Lectura", "Escritura", "Inglés", "Convivencia", "Atención", "Otra",
];

const RELATIONSHIPS = ["Madre", "Padre", "Abuelo/a", "Tío/a", "Tutor/a legal", "Otro"];

// Sufijos de los campos de una persona / su residencia (para el auto-llenado del acudiente).
const PERSON_SUFFIXES = [
  "firstname1", "firstname2", "lastname1", "lastname2", "document_type",
  "id_number", "email", "phone", "work_phone", "profession", "religion",
  "company_name", "company_address",
];
const RESIDENCE_SUFFIXES = [
  "address", "address_complement", "stratum", "country", "country_other",
  "department", "department_id", "city", "barrio", "barrio_other",
];

// ---------------------------------------------------------------- Residencia
export function ResidenceStep({ control, register, setValue }: StepProps) {
  return (
    <FieldGrid>
      <GeoResidenceFields prefix="" control={control} register={register} setValue={setValue} />
    </FieldGrid>
  );
}

// -------------------------------------------------------- Historial académico
export function AcademicHistoryStep({ control, register, setValue }: StepProps) {
  const schema: FieldDescriptor[] = [
    {
      type: "text",
      name: "previous_school",
      label: "Colegio anterior",
      placeholder: "Nombre de la institución",
      full: true,
    },

    { type: "select", name: "last_grade_completed", label: "Último grado cursado", options: GRADE_OPTIONS },
    {
      type: "text",
      name: "last_grade_other",
      label: "¿Cuál grado?",
      showWhen: { field: "last_grade_completed", equals: "Otro" },
    },

    { type: "number", name: "last_year", label: "Año en que lo cursó", placeholder: "2025" },
    {
      type: "select",
      name: "change_reason",
      label: "Motivo del cambio de colegio",
      options: CHANGE_REASONS,
      full: true,
    },
    {
      type: "text",
      name: "change_reason_other",
      label: "¿Cuál motivo?",
      full: true,
      showWhen: { field: "change_reason", equals: "Otro" },
    },

    // Repitió año → { hasRepeated, grade, reason }
    { type: "yesno", name: "repeated.hasRepeated", label: "¿Ha repetido algún grado?", mode: "boolean" },
    {
      type: "select",
      name: "repeated.grade",
      id: "repeated_grade",
      label: "¿Qué grado repitió?",
      options: GRADE_OPTIONS.filter((g) => g !== "Otro"),
      showWhen: { field: "repeated.hasRepeated", equals: true },
    },
    {
      type: "textarea",
      name: "repeated.reason",
      id: "repeated_reason",
      label: "Motivo",
      rows: 2,
      showWhen: { field: "repeated.hasRepeated", equals: true },
    },

    // Dificultades → { hasDificulties, dificulties[], other }
    {
      type: "yesno",
      name: "difficulties.hasDificulties",
      label: "¿Ha presentado dificultades académicas?",
      mode: "boolean",
    },
    {
      type: "checkbox-group",
      name: "difficulties.dificulties",
      label: "¿En qué áreas?",
      options: DIFFICULTY_AREAS,
      showWhen: { field: "difficulties.hasDificulties", equals: true },
    },
    {
      type: "text",
      name: "difficulties.other",
      id: "dif_other",
      label: "Otra dificultad (opcional)",
      full: true,
      showWhen: { field: "difficulties.hasDificulties", equals: true },
    },
  ];

  return (
    <FieldGrid>
      <SchemaSection schema={schema} control={control} register={register} setValue={setValue} />
    </FieldGrid>
  );
}

// ---------------------------------------------------------------- Acudientes
export function GuardiansStep({ control, register, setValue, getValues }: StepProps) {
  const { user } = useAuth();
  const guardianType = (useWatch({ control, name: "guardian_type" }) as string) ?? "";

  // Acordeón: solo una sección abierta a la vez. `null` = todas plegadas (estado inicial).
  const [openSection, setOpenSection] = useState<string | null>(null);
  const section = (key: string) => ({
    open: openSection === key,
    onToggle: () => setOpenSection((s) => (s === key ? null : key)),
  });

  // El acudiente principal ES la cuenta: pre-llenamos una vez, si está vacío. Sin
  // `shouldDirty` a propósito: no es algo que el usuario escribió, así que no deja la
  // sección "con cambios sin guardar" ni crea un borrador local solo por abrir el
  // formulario. "Enviar solicitud" igual lo guarda (compara contra el servidor, no
  // solo `isDirty` — ver `handleSubmit` en SolicitudWizard).
  useEffect(() => {
    if (!user) return;
    const empty =
      !getValues("guardian_email") && !getValues("guardian_firstname1") && !guardianType;
    if (empty) {
      setValue("guardian_firstname1", user.first_name ?? "");
      setValue("guardian_lastname1", user.last_name ?? "");
      setValue("guardian_email", user.email ?? "");
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Campos fuente vigilados para la auto-copia (ambos prefijos: solo uno importa a la
  // vez según `guardianType`, pero los dos se observan porque cuál importa puede
  // cambiar entre renders).
  const fatherWatch = useWatch({
    control,
    name: [
      ...PERSON_SUFFIXES.map((s) => `father_${s}`),
      ...RESIDENCE_SUFFIXES.map((s) => `father_residence_${s}`),
    ],
  }) as unknown[];
  const motherWatch = useWatch({
    control,
    name: [
      ...PERSON_SUFFIXES.map((s) => `mother_${s}`),
      ...RESIDENCE_SUFFIXES.map((s) => `mother_residence_${s}`),
    ],
  }) as unknown[];

  const srcPrefix =
    guardianType === "Padre" ? "father_" : guardianType === "Madre" ? "mother_" : "";
  const srcValues = guardianType === "Padre" ? fatherWatch : motherWatch;
  const srcSignature = srcPrefix ? JSON.stringify(srcValues) : "";

  // Solo COPIA (Padre/Madre); nunca limpia aquí, para no borrar data al reanudar.
  useEffect(() => {
    if (!srcPrefix) return;
    PERSON_SUFFIXES.forEach((s, i) => {
      const val = srcValues[i] ?? "";
      if (getValues(`guardian_${s}`) !== val) {
        setValue(`guardian_${s}`, val, { shouldDirty: true });
      }
    });
    RESIDENCE_SUFFIXES.forEach((s, i) => {
      const val = srcValues[PERSON_SUFFIXES.length + i] ?? "";
      if (getValues(`guardian_residence_${s}`) !== val) {
        setValue(`guardian_residence_${s}`, val, { shouldDirty: true });
      }
    });
    if (getValues("guardian_relationship") !== guardianType) {
      setValue("guardian_relationship", guardianType, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardianType, srcSignature]);

  // Borra lo autollenado. Se llama al cambiar el tipo (acción del usuario), no en un
  // efecto, para que reanudar una solicitud guardada no pierda datos.
  const clearGuardian = () => {
    PERSON_SUFFIXES.forEach((s) => setValue(`guardian_${s}`, "", { shouldDirty: true }));
    RESIDENCE_SUFFIXES.forEach((s) =>
      setValue(`guardian_residence_${s}`, "", { shouldDirty: true }),
    );
    setValue("guardian_relationship", "", { shouldDirty: true });
    setValue("guardian_full_name", "", { shouldDirty: true });
  };

  const onGuardianType = (t: string) => {
    setValue("guardian_type", t, { shouldDirty: true });
    // "Otra persona" o "Empresa": limpiar lo copiado de padre/madre.
    if (t === "Otro" || t === "Empresa") clearGuardian();
  };

  const isCopied = guardianType === "Padre" || guardianType === "Madre";
  const isEmpresa = guardianType === "Empresa";

  const livesWithSchema: FieldDescriptor[] = [
    {
      type: "yesno",
      name: "father_lives_with_student",
      label: "¿Vive con el padre?",
      mode: "boolean",
    },
    {
      type: "yesno",
      name: "mother_lives_with_student",
      label: "¿Vive con la madre?",
      mode: "boolean",
    },
    { type: "text", name: "lives_with_other", label: "¿Con quién más vive? (opcional)", full: true },
  ];

  const guardianEmpresaSchema: FieldDescriptor[] = [
    { type: "text", name: "guardian_full_name", label: "Razón social", full: true },
    { type: "text", name: "guardian_id_number", label: "NIT" },
    { type: "email", name: "guardian_email", label: "Correo de contacto" },
    { type: "tel", name: "guardian_phone", label: "Teléfono" },
  ];

  const guardianPersonSchema: FieldDescriptor[] = [
    { type: "select", name: "guardian_relationship", label: "Parentesco", options: RELATIONSHIPS },
    {
      type: "text",
      name: "guardian_relationship_other",
      label: "¿Cuál parentesco?",
      showWhen: { field: "guardian_relationship", equals: "Otro" },
    },
  ];

  return (
    <div className="space-y-4">
      {/* ¿Con quién vive? */}
      <SubSection title="¿Con quién vive el estudiante?" {...section("lives")}>
        <FieldGrid>
          <SchemaSection
            schema={livesWithSchema}
            control={control}
            register={register}
            setValue={setValue}
          />
        </FieldGrid>
      </SubSection>

      {/* Padre: nombres → residencia → trabajo */}
      <SubSection title="Información del padre" {...section("father")}>
        <FieldGrid>
          <PersonFields prefix="father_" control={control} register={register} setValue={setValue} />
          <GeoResidenceFields prefix="father_residence_" control={control} register={register}
            setValue={setValue} />
          <WorkFields prefix="father_" control={control} register={register} setValue={setValue} />
        </FieldGrid>
      </SubSection>

      {/* Madre */}
      <SubSection title="Información de la madre" {...section("mother")}>
        <FieldGrid>
          <PersonFields prefix="mother_" control={control} register={register} setValue={setValue} />
          <GeoResidenceFields prefix="mother_residence_" control={control} register={register}
            setValue={setValue} />
          <WorkFields prefix="mother_" control={control} register={register} setValue={setValue} />
        </FieldGrid>
      </SubSection>

      {/* Acudiente / Adulto responsable */}
      <SubSection title="Acudiente / Adulto responsable" {...section("guardian")}>
        <FieldGrid>
          <div>
            <label htmlFor="guardian_type" className={labelClass}>Tipo de acudiente</label>
            <select id="guardian_type" className={controlClass} value={guardianType}
              onChange={(e) => onGuardianType(e.target.value)}>
              <option value="">Selecciona…</option>
              <option value="Padre">El padre</option>
              <option value="Madre">La madre</option>
              <option value="Otro">Otra persona</option>
              <option value="Empresa">Una empresa</option>
            </select>
          </div>

          {isCopied && (
            <p className="text-sm text-base-content/60 sm:col-span-2">
              Se tomaron los datos del {guardianType === "Padre" ? "padre" : "la madre"}. Puedes ajustarlos abajo.
            </p>
          )}

          {isEmpresa ? (
            <>
              <SchemaSection
                schema={guardianEmpresaSchema}
                control={control}
                register={register}
                setValue={setValue}
              />
              <GeoResidenceFields prefix="guardian_residence_" control={control} register={register}
                setValue={setValue} />
            </>
          ) : (
            <>
              <SchemaSection
                schema={guardianPersonSchema}
                control={control}
                register={register}
                setValue={setValue}
              />
              <PersonFields prefix="guardian_" control={control} register={register} setValue={setValue} />
              <GeoResidenceFields prefix="guardian_residence_" control={control} register={register}
                setValue={setValue} />
              <WorkFields prefix="guardian_" control={control} register={register} setValue={setValue} />
            </>
          )}
        </FieldGrid>
      </SubSection>
    </div>
  );
}

// --------------------------------------------------------------------- Salud
export function HealthStep({ control, register, setValue }: StepProps) {
  const schema: FieldDescriptor[] = [
    { type: "select", name: "eps", label: "EPS", options: EPS_LIST, full: true },
    { type: "select", name: "blood_abo", label: "Grupo sanguíneo", options: BLOOD_ABO },
    { type: "select", name: "blood_rh", label: "RH", options: BLOOD_RH },

    // ⚠️ Estos nombres los lee `apply_alert_rules` en el backend.
    { type: "yesno", name: "has_medical_condition", label: "¿Tiene alguna condición médica relevante?" },
    {
      type: "textarea",
      name: "medical_condition_detail",
      label: "¿Cuál?",
      placeholder: "Describa la condición y los cuidados que requiere",
      showWhen: { field: "has_medical_condition", equals: "Si" },
    },

    { type: "yesno", name: "takes_medication", label: "¿Toma algún medicamento?" },
    {
      type: "textarea",
      name: "medication_detail",
      label: "¿Cuál y con qué frecuencia?",
      showWhen: { field: "takes_medication", equals: "Si" },
    },

    {
      type: "yesno",
      name: "has_diagnosis",
      label: "¿Tiene algún diagnóstico (aprendizaje, atención, u otro)?",
    },
    {
      type: "textarea",
      name: "diagnosis_detail",
      label: "¿Cuál?",
      showWhen: { field: "has_diagnosis", equals: "Si" },
    },

    { type: "yesno", name: "receives_therapy", label: "¿Recibe alguna terapia?" },
    {
      type: "textarea",
      name: "therapy_detail",
      label: "¿Cuál?",
      showWhen: { field: "receives_therapy", equals: "Si" },
    },

    { type: "yesno", name: "needs_learning_support", label: "¿Requiere apoyos para el aprendizaje?" },
    {
      type: "textarea",
      name: "learning_support_detail",
      label: "¿Cuáles?",
      showWhen: { field: "needs_learning_support", equals: "Si" },
    },
  ];

  return (
    <FieldGrid>
      <SchemaSection schema={schema} control={control} register={register} setValue={setValue} />
    </FieldGrid>
  );
}

// -------------------------------------------------------------- Declaraciones
export function DeclarationsStep({ control, register, setValue }: StepProps) {
  const schema: FieldDescriptor[] = [
    {
      type: "yesno",
      name: "accepts_truthfulness",
      label: "Declaro que la información suministrada es veraz y completa.",
    },
    {
      type: "yesno",
      name: "accepts_data_policy",
      label:
        "Autorizo el tratamiento de datos personales conforme a la política de la institución.",
    },
    {
      type: "text",
      name: "signed_by",
      label: "Nombre de quien declara",
      placeholder: "Tu nombre completo",
      full: true,
    },
  ];

  return (
    <FieldGrid>
      <SchemaSection schema={schema} control={control} register={register} setValue={setValue} />
    </FieldGrid>
  );
}

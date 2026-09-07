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
 */

import { useEffect, useState } from "react";
import {
  useController,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import { useAuth } from "@/components/Login/loginLogic";
import {
  EPS_LIST,
  BLOOD_ABO,
  BLOOD_RH,
  DOCUMENT_TYPES,
} from "@/components/shared/formLists";

import {
  Field,
  FieldGrid,
  SelectField,
  TextAreaField,
  YesNoField,
  WhenYes,
  controlClass,
  inputClass,
  textareaClass,
  labelClass,
  type SectionValues,
} from "./formFields";
import { GeoResidenceFields, PersonFields, WorkFields, SubSection } from "./guardianFields";

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
export function AcademicHistoryStep({ control, register }: StepProps) {
  const lastGrade = (useWatch({ control, name: "last_grade_completed" }) as string) ?? "";
  const changeReason = (useWatch({ control, name: "change_reason" }) as string) ?? "";
  const hasRepeated = useWatch({ control, name: "repeated.hasRepeated" });
  const hasDificulties = useWatch({ control, name: "difficulties.hasDificulties" });

  // Sin `defaultValue`: el fallback a `[]` de abajo ya cubre el caso "aún sin valor",
  // y fijar aquí un literal rompe la inferencia de tipos de RHF sobre un path anidado
  // de un `SectionValues` (Record<string, unknown>).
  const { field: areasField } = useController({
    control,
    name: "difficulties.dificulties",
  });
  const areas = Array.isArray(areasField.value) ? (areasField.value as string[]) : [];
  const toggleArea = (area: string) => {
    const next = areas.includes(area) ? areas.filter((a) => a !== area) : [...areas, area];
    areasField.onChange(next);
  };

  return (
    <FieldGrid>
      <Field name="previous_school" label="Colegio anterior" register={register}
        placeholder="Nombre de la institución" full />

      <SelectField name="last_grade_completed" label="Último grado cursado"
        register={register} options={GRADE_OPTIONS} />
      {lastGrade === "Otro" && (
        <Field name="last_grade_other" label="¿Cuál grado?" register={register} />
      )}

      <Field name="last_year" label="Año en que lo cursó" type="number"
        register={register} placeholder="2025" />
      <SelectField name="change_reason" label="Motivo del cambio de colegio"
        register={register} options={CHANGE_REASONS} full />
      {changeReason === "Otro" && (
        <Field name="change_reason_other" label="¿Cuál motivo?" register={register} full />
      )}

      {/* Repitió año → { hasRepeated, grade, reason } */}
      <BoolYesNo label="¿Ha repetido algún grado?" name="repeated.hasRepeated" control={control} />
      {hasRepeated === true && (
        <>
          <div>
            <label htmlFor="repeated_grade" className={labelClass}>¿Qué grado repitió?</label>
            <select id="repeated_grade" className={controlClass} {...register("repeated.grade")}>
              <option value="">Selecciona…</option>
              {GRADE_OPTIONS.filter((g) => g !== "Otro").map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="repeated_reason" className={labelClass}>Motivo</label>
            <textarea id="repeated_reason" rows={2} className={textareaClass}
              {...register("repeated.reason")} />
          </div>
        </>
      )}

      {/* Dificultades → { hasDificulties, dificulties[], other } */}
      <BoolYesNo label="¿Ha presentado dificultades académicas?"
        name="difficulties.hasDificulties" control={control} />
      {hasDificulties === true && (
        <>
          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>¿En qué áreas?</legend>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_AREAS.map((area) => {
                const active = areas.includes(area);
                return (
                  <label key={area}
                    className={`flex h-10 cursor-pointer items-center rounded-lg border px-4 text-sm font-medium transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/40 ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-base-300 bg-base-200 text-base-content/70 hover:bg-base-300/50"
                    }`}>
                    <input type="checkbox" checked={active} onChange={() => toggleArea(area)}
                      className="sr-only" />
                    {area}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <label htmlFor="dif_other" className={labelClass}>Otra dificultad (opcional)</label>
            <input id="dif_other" className={inputClass} {...register("difficulties.other")} />
          </div>
        </>
      )}
    </FieldGrid>
  );
}

/**
 * Sí/No que guarda un booleano (no "Si"/"No"), para las formas anidadas de la DB.
 * Vía `useController`: es un valor booleano propio, no lo que produce un `<input>`
 * nativo, y en dos de sus tres usos vive en un path anidado (`repeated.hasRepeated`,
 * `difficulties.hasDificulties`).
 */
function BoolYesNo({
  label,
  name,
  control,
}: {
  label: string;
  name: string;
  control: Control<SectionValues>;
}) {
  const { field } = useController({ control, name });
  const value = field.value as boolean | undefined;
  return (
    <fieldset className="sm:col-span-2">
      <legend className={labelClass}>{label}</legend>
      <div className="flex gap-2">
        {[
          { text: "Sí", val: true },
          { text: "No", val: false },
        ].map((o) => {
          const active = value === o.val;
          return (
            <label key={o.text}
              className={`flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-lg border px-5 text-sm font-medium transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/40 ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-base-300 bg-base-200 text-base-content/70 hover:bg-base-300/50"
              }`}>
              <input type="radio" checked={active} onChange={() => field.onChange(o.val)}
                onBlur={field.onBlur} className="sr-only" />
              {o.text}
            </label>
          );
        })}
      </div>
    </fieldset>
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

  // El acudiente principal ES la cuenta: pre-llenamos una vez, si está vacío.
  useEffect(() => {
    if (!user) return;
    const empty =
      !getValues("guardian_email") && !getValues("guardian_firstname1") && !guardianType;
    if (empty) {
      setValue("guardian_firstname1", user.first_name ?? "", { shouldDirty: true });
      setValue("guardian_lastname1", user.last_name ?? "", { shouldDirty: true });
      setValue("guardian_email", user.email ?? "", { shouldDirty: true });
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
  const guardianRelationship =
    (useWatch({ control, name: "guardian_relationship" }) as string) ?? "";

  return (
    <div className="space-y-4">
      {/* ¿Con quién vive? */}
      <SubSection title="¿Con quién vive el estudiante?" {...section("lives")}>
        <BoolYesNo label="¿Vive con el padre?" name="father_lives_with_student" control={control} />
        <BoolYesNo label="¿Vive con la madre?" name="mother_lives_with_student" control={control} />
        <Field name="lives_with_other" label="¿Con quién más vive? (opcional)"
          register={register} full />
      </SubSection>

      {/* Padre: nombres → residencia → trabajo */}
      <SubSection title="Información del padre" {...section("father")}>
        <PersonFields prefix="father_" register={register} />
        <GeoResidenceFields prefix="father_residence_" control={control} register={register}
          setValue={setValue} />
        <WorkFields prefix="father_" register={register} />
      </SubSection>

      {/* Madre */}
      <SubSection title="Información de la madre" {...section("mother")}>
        <PersonFields prefix="mother_" register={register} />
        <GeoResidenceFields prefix="mother_residence_" control={control} register={register}
          setValue={setValue} />
        <WorkFields prefix="mother_" register={register} />
      </SubSection>

      {/* Acudiente / Adulto responsable */}
      <SubSection title="Acudiente / Adulto responsable" {...section("guardian")}>
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
            <Field name="guardian_full_name" label="Razón social" register={register} full />
            <Field name="guardian_id_number" label="NIT" register={register} />
            <Field name="guardian_email" label="Correo de contacto" type="email"
              register={register} />
            <Field name="guardian_phone" label="Teléfono" type="tel" register={register} />
            <GeoResidenceFields prefix="guardian_residence_" control={control} register={register}
              setValue={setValue} />
          </>
        ) : (
          <>
            <SelectField name="guardian_relationship" label="Parentesco" register={register}
              options={RELATIONSHIPS} />
            {guardianRelationship === "Otro" && (
              <Field name="guardian_relationship_other" label="¿Cuál parentesco?"
                register={register} />
            )}
            <PersonFields prefix="guardian_" register={register} />
            <GeoResidenceFields prefix="guardian_residence_" control={control} register={register}
              setValue={setValue} />
            <WorkFields prefix="guardian_" register={register} />
          </>
        )}
      </SubSection>
    </div>
  );
}

// --------------------------------------------------------------------- Salud
export function HealthStep({ control, register }: StepProps) {
  return (
    <FieldGrid>
      <SelectField name="eps" label="EPS" register={register} options={EPS_LIST} full />
      <SelectField name="blood_abo" label="Grupo sanguíneo" register={register} options={BLOOD_ABO} />
      <SelectField name="blood_rh" label="RH" register={register} options={BLOOD_RH} />

      {/* ⚠️ Estos nombres los lee `apply_alert_rules` en el backend. */}
      <YesNoField name="has_medical_condition"
        label="¿Tiene alguna condición médica relevante?" control={control} />
      <WhenYes when="has_medical_condition" control={control}>
        <TextAreaField name="medical_condition_detail" label="¿Cuál?" register={register}
          placeholder="Describa la condición y los cuidados que requiere" />
      </WhenYes>

      <YesNoField name="takes_medication" label="¿Toma algún medicamento?" control={control} />
      <WhenYes when="takes_medication" control={control}>
        <TextAreaField name="medication_detail" label="¿Cuál y con qué frecuencia?"
          register={register} />
      </WhenYes>

      <YesNoField name="has_diagnosis"
        label="¿Tiene algún diagnóstico (aprendizaje, atención, u otro)?" control={control} />
      <WhenYes when="has_diagnosis" control={control}>
        <TextAreaField name="diagnosis_detail" label="¿Cuál?" register={register} />
      </WhenYes>

      <YesNoField name="receives_therapy" label="¿Recibe alguna terapia?" control={control} />
      <WhenYes when="receives_therapy" control={control}>
        <TextAreaField name="therapy_detail" label="¿Cuál?" register={register} />
      </WhenYes>

      <YesNoField name="needs_learning_support"
        label="¿Requiere apoyos para el aprendizaje?" control={control} />
      <WhenYes when="needs_learning_support" control={control}>
        <TextAreaField name="learning_support_detail" label="¿Cuáles?" register={register} />
      </WhenYes>
    </FieldGrid>
  );
}

// -------------------------------------------------------------- Declaraciones
export function DeclarationsStep({ control, register }: StepProps) {
  return (
    <FieldGrid>
      <YesNoField name="accepts_truthfulness"
        label="Declaro que la información suministrada es veraz y completa." control={control} />
      <YesNoField name="accepts_data_policy"
        label="Autorizo el tratamiento de datos personales conforme a la política de la institución."
        control={control} />
      <Field name="signed_by" label="Nombre de quien declara" register={register}
        placeholder="Tu nombre completo" full />
    </FieldGrid>
  );
}

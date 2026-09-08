import { useEffect, useState, useRef } from "react";
import {
  useForm,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { ComboBox } from "@/components/ui/ComboBox";
import { PhotoField } from "@/components/ui/fields/PhotoField";
import { API_ENDPOINTS, apiFetch } from "@/utils/api";

// --- CONSTANTES (Listas para desplegables) ---
const BARRIOS_BARRANQUILLA = [
  "7 de Abril",
  "7 de Agosto",
  "Adela de Char",
  "Alameda del Río",
  "Alfonso López",
  "Alianza",
  "Altamira",
  "Alto Prado",
  "Altos de Riomar",
  "Altos del Limón",
  "América",
  "Andalucia",
  "Atlántico",
  "Barlovento",
  "Barrio Abajo",
  "Bella Arena",
  "Bellavista",
  "Bendición de Dios",
  "Bernardo Hoyos",
  "Bethania",
  "Bosque",
  "Boston",
  "Boyacá",
  "Buena Esperanza",
  "Buenos Aires",
  "California",
  "Campito",
  "Campo Alegre",
  "Carlos Meisel",
  "Carrizal",
  "Casa Blanca",
  "Centro",
  "Centro Histórico",
  "Cevillar",
  "Chiquinquirá",
  "Ciudadela 20 de Julio",
  "Ciudadela de Paz",
  "Colombia",
  "Concepción",
  "Conjunto Residencial",
  "Country",
  "Cuchilla de Villate",
  "El Campito",
  "El Carmen",
  "El Castillo",
  "El Edén",
  "El Ferry",
  "El Golf",
  "El Limón",
  "El Limoncito",
  "El Milagro",
  "El Oasis",
  "El Paraíso",
  "El Parque",
  "El Poblado",
  "El Pueblo",
  "El Recreo",
  "El Santuario",
  "El Silencio",
  "El Valle",
  "Galán",
  "Gerlein y Villate",
  "Granadillo",
  "Hipódromo",
  "Juan Mina (Corregimiento)",
  "Kennedy",
  "La Ceiba",
  "La Chinita",
  "La Cumbre",
  "La Floresta",
  "La Florida",
  "La Luz",
  "La Magdalena",
  "La Manga",
  "La María",
  "La Paz",
  "La Peña",
  "La Playa",
  "La Pradera",
  "La Sierrita",
  "La Trinidad",
  "La Unión",
  "La Victoria",
  "Las Américas",
  "Las Colinas",
  "Las Delicias",
  "Las Estrellas",
  "Las Flores",
  "Las Gardenias",
  "Las Malvinas",
  "Las Mercedes",
  "Las Nieves",
  "Las Palmas",
  "Las Terrazas",
  "Lipaya",
  "Loma Fresca",
  "Los Alpes",
  "Los Andes",
  "Los Continentes",
  "Los Girasoles",
  "Los Jobos",
  "Los Nogales",
  "Los Olivos",
  "Los Pinos",
  "Lucero",
  "Me Quejo",
  "Modelo",
  "Montecristo",
  "Montes",
  "Nueva Colombia",
  "Nueva Granada",
  "Olaya",
  "Pasadena",
  "Pumarejo",
  "Rebolo",
  "Recreo",
  "Riomar",
  "Rosales",
  "San Felipe",
  "San Isidro",
  "San José",
  "San Luis",
  "San Martín",
  "San Nicolás",
  "San Pedro",
  "San Vicente",
  "Santa Ana",
  "Santa Lucía",
  "Santa María",
  "Santa Mónica",
  "Santo Domingo",
  "Santo Domingo de Guzmán",
  "Siape",
  "Simón Bolívar",
  "Tabor",
  "Tayrona",
  "Universal",
  "Villa Blanca",
  "Villa Campestre",
  "Villa Carolina",
  "Villa del Carmen",
  "Villa del Rosario",
  "Villa del Sol",
  "Villa del Sur",
  "Villa San Carlos",
  "Villa San Pedro",
  "Villa Santos",
  "Villate",
  "Villas de San Pablo",
  "Zona Franca",
  "Otro",
];
const COUNTRIES = [
  "Colombia",
  "Venezuela",
  "Estados Unidos",
  "España",
  "México",
  "Ecuador",
  "Perú",
  "Otro",
];
const MARITAL_STATUS = [
  "Casados",
  "Divorciados",
  "Separados",
  "Unión Libre",
  "Soltero/a",
  "Viudo/a",
];
const RELIGIONS = [
  "Católica",
  "Cristiana",
  "Judía",
  "Musulmana",
  "Atea",
  "Otra",
];
const DOCUMENT_TYPES = [
  "Registro Civil (RC)",
  "Tarjeta de Identidad (TI)",
  "Cédula de Ciudadanía (CC)",
  "Cédula de Extranjería (CE)",
  "Pasaporte (PP)",
  "Permiso de Protección Temporal (PPT)",
];
const EPS_LIST = [
  "Nueva EPS",
  "Coosalud EPS-S",
  "Mutual SER",
  "Salud Total EPS S.A.",
  "Asmet Salud",
  "Capital Salud EPS-S S.A.S.",
  "Savia Salud EPS",
  "EPS Sanitas (Actualmente intervenida)",
  "EPS Sura",
  "Compensar EPS",
  "Comfenalco Valle",
  "Famisanar (Actualmente intervenida)",
  "Servicio Occidental de Salud (SOS) (Actualmente intervenida)",
  "Aliansalud EPS",
  "Empresas Públicas de Medellín (EPM)",
  "Fondo de Pasivo Social de Ferrocarriles Nacionales de Colombia",
  "Cajacopi Atlántico",
  "Capresoca",
  "Comfachocó",
  "EPS Familiar de Colombia",
  "Salud Mía",
  "Dusakawi EPSI",
  "Asociación Indígena del Cauca",
  "Anas Wayuu EPSI",
  "Mallamas EPSI",
  "Pijaos Salud EPSI",
];
const ADDRESS_EXAMPLES = [
  "Calle 7 # 13-14",
  "Carrera 45 # 22-10",
  "Transversal 54 # 10-20",
  "Avenida 30 # 5-60",
  "Manzana 12 Casa 4",
];
const ESTRATOS = ["1", "2", "3", "4", "5", "6", "Comercial"];
const COLOMBIA_DEPARTMENTS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
];

// Sufijos usados por el efecto de auto-copia Padre/Madre -> Acudiente (ver
// sección "Acudiente" más abajo). `profession`/`company_name`/`company_address`/
// `work_phone` se leen con `getValues` dentro del efecto (no se "watchean") a
// propósito: así se replica exactamente el comportamiento pre-RHF, donde esos 4
// campos NO estaban en el arreglo de dependencias del `useEffect` original
// (Step3StudentData.tsx, versión useState) y por lo tanto no disparaban una
// nueva copia por sí solos, aunque sí se leían con su valor más fresco cuando el
// efecto se ejecutaba por otro motivo.
const GUARDIAN_WATCHED_SUFFIXES = [
  "lastname1",
  "lastname2",
  "firstname1",
  "firstname2",
  "id_number",
  "email",
  "phone",
  "country",
  "department",
  "city",
  "residence_country",
  "residence_department",
  "residence_city",
  "residence_barrio",
  "residence_address",
  "residence_address_complement",
  "residence_stratum",
  "document_type",
  "religion",
];

// Sufijos de los 7 campos de residencia que se copian de estudiante -> padre/
// madre cuando "vive con el estudiante" está marcado.
const RESIDENCE_COPY_SUFFIXES = [
  "country",
  "department",
  "city",
  "barrio",
  "address",
  "address_complement",
  "stratum",
];

// Únicamente los campos que efectivamente se muestran en el texto del modal
// legal (ver `handleSubmit`/`legalModalSnapshot` más abajo).
type LegalModalSnapshot = {
  guardian_full_name?: string;
  guardian_firstname1?: string;
  guardian_firstname2?: string;
  guardian_lastname1?: string;
  guardian_lastname2?: string;
  guardian_document_type?: string;
  guardian_id_number?: string;
  student_firstname1?: string;
  student_firstname2?: string;
  student_lastname1?: string;
  student_lastname2?: string;
  student_id_type?: string;
  student_id_number?: string;
};

// --- COMPONENTES AUXILIARES ---
const FormInput = ({
  label,
  name,
  register,
  // Opciones extra para `register(name, registerOptions)`. Nunca se
  // spreadea al DOM (a diferencia de `...props`). Ya no se usa para los 4
  // campos "Especifique el barrio" (antes tenían aquí un `onChange` que
  // reescribía el campo de barrio real con cada tecla, corrompiéndolo — bug
  // corregido; ver la nota junto a las "compuertas" más abajo). Se deja el
  // soporte genérico por si algún otro campo lo necesita en el futuro.
  registerOptions,
  type = "text",
  placeholder,
  disabled,
  ...props
}: any) => (
  <div className="form-control w-full">
    <label className="label">
      <span className="label-text font-medium text-gray-600">
        {label}
        {props.required && <span className="text-error ml-1">*</span>}
      </span>
    </label>
    <input
      type={type}
      placeholder={placeholder || label}
      className={`input input-bordered w-full focus:input-primary transition-all ${
        disabled ? "bg-gray-100 text-gray-500" : ""
      }`}
      disabled={disabled}
      {...register(name, registerOptions)}
      {...props}
    />
  </div>
);

const FormSelect = ({
  label,
  name,
  register,
  options,
  disabled,
  placeholder = "Selecciona una opción",
  ...props
}: any) => (
  <div className="form-control w-full">
    <label className="label">
      <span className="label-text font-medium text-gray-600">
        {label}
        {disabled
          ? ""
          : props.required && <span className="text-error ml-1">*</span>}
      </span>
    </label>
    <select
      className={`select select-bordered w-full focus:select-primary ${
        disabled ? "bg-gray-100" : ""
      }`}
      disabled={disabled}
      {...register(name)}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const SectionCard = ({ title, isOpen, onToggle, children }: any) => (
  <div className="collapse collapse-arrow bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md">
    <input
      type="checkbox"
      id={`section-${title}`}
      checked={isOpen}
      onChange={onToggle}
      aria-label={title}
    />
    <div className="collapse-title font-bold text-lg text-primary uppercase tracking-wide bg-gray-50">
      {title}
    </div>
    <div className="collapse-content text-sm border-t border-gray-100">
      <div className="pt-6">{children}</div>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export const Step3StudentData = ({
  next,
  back,
  data,
  update,
  uploadedFiles,
  updateUploadedFiles,
  enrollmentInfo,
  enrollmentId,
  preloadedDocuments,
}: any) => {
  // Motor del formulario (react-hook-form). `data`/`update` (props del padre,
  // `MatriculasEstudiantes.tsx`) siguen siendo la fuente de verdad ENTRE pasos
  // (Step4/5/6 los leen directo) — este `useForm()` es el motor INTERNO de este
  // paso, sembrado con `data` al montar, y se sincroniza de vuelta hacia el
  // padre en el efecto de autoguardado más abajo (con el mismo debounce de
  // 700ms que ya existía, en vez de en cada tecla).
  const rhf = useForm<Record<string, unknown>>({ defaultValues: data });
  const { register, control, getValues, setValue: setFieldValue } = rhf;

  // Estado para el modal legal
  const [showLegalModal, setShowLegalModal] = useState(false);
  // Snapshot de los datos usados dentro del modal legal, tomado en el momento
  // de abrirlo (`handleSubmit`). Evita "watchear" los campos de nombre del
  // estudiante/acudiente (que se tipean carácter a carácter) solo para un
  // texto que de todas formas no se ve hasta que el usuario ya terminó de
  // escribir y le da "Siguiente".
  const [legalModalSnapshot, setLegalModalSnapshot] =
    useState<LegalModalSnapshot>({});

  // Estado para colapsar secciones
  const [openSections, setOpenSections] = useState({
    estudiante: true,
    residencia: false,
    medica: false,
    ahorro: false,
    padre: false,
    madre: false,
    acudiente: false,
  });

  // Fecha actual
  const currentDate = new Date().toISOString().split("T")[0];

  // Datos clave del backend
  const canEnroll = enrollmentInfo?.eligibility?.can_enroll;
  const existingData = enrollmentInfo?.eligibility?.existing_data || {};
  const suggestedGradeObj = enrollmentInfo?.suggested_enrollment?.grade || null;
  const suggestedGrade =
    enrollmentInfo?.suggested_enrollment?.grade?.description || "";
  const targetYear = enrollmentInfo?.suggested_enrollment?.academic_year || "";
  const isFirstEnrollment =
    enrollmentInfo?.actual_enrollment?.is_first_enrollment === true;

  // Inicialización (existing_data + grado + año) solo una vez
  const initializedRef = useRef(false);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const autosaveLastHashRef = useRef<string>("");

  // --- WATCHES puntuales ---
  // Solo se "watchean" los campos que gatillan una rama condicional del JSX
  // (qué widget mostrar, un `disabled`/`required` cruzado) o un efecto
  // reactivo (edad, auto-copias). El resto de los campos usa `register()` sin
  // watch, para no re-renderizar el formulario completo en cada tecla — esa
  // era la razón original para migrar Matrículas a react-hook-form.
  // Flags "_manually_removed" de las 3 fotos (PhotoField, controlado desde afuera — el
  // File real vive en `uploadedFiles`, fuera de RHF; solo el booleano de "quitada
  // manualmente" vive en el formulario, igual que en la versión anterior).
  const studentPhotoRemoved = useWatch({
    control,
    name: "student_photo_manually_removed",
  });
  const fatherPhotoRemoved = useWatch({
    control,
    name: "father_photo_manually_removed",
  });
  const motherPhotoRemoved = useWatch({
    control,
    name: "mother_photo_manually_removed",
  });

  const studentBirthDate = useWatch({ control, name: "student_birth_date" });
  // `as string`: `useForm<Record<string, unknown>>` (línea 592) hace que `useWatch`
  // devuelva `unknown` para cualquier campo — no cambia el valor real en tiempo de
  // ejecución, solo permite pasarlo al `ComboBox` compartido (`value: string`), que
  // ahora tipa en serio a diferencia de la copia local `:any` que reemplaza.
  const studentBirthCountry = useWatch({
    control,
    name: "student_birth_country",
  }) as string;
  const studentBirthDepartment = useWatch({
    control,
    name: "student_birth_department",
  }) as string;
  const studentBirthCity = useWatch({
    control,
    name: "student_birth_city",
  }) as string;
  const studentIdCountry = useWatch({
    control,
    name: "student_id_country",
  }) as string;
  const studentIdDepartment = useWatch({
    control,
    name: "student_id_department",
  }) as string;
  const studentIdCity = useWatch({ control, name: "student_id_city" }) as string;
  const studentHealthEps = useWatch({
    control,
    name: "student_health_eps",
  }) as string;
  const studentHasCellphone = useWatch({
    control,
    name: "student_has_cellphone",
  });
  const studentHasSiblings = useWatch({
    control,
    name: "student_has_siblings",
  });

  const residenceForCopy = useWatch({
    control,
    name: RESIDENCE_COPY_SUFFIXES.map((s) => `residence_${s}`),
  }) as string[];
  const [
    residenceCountry,
    residenceDepartment,
    residenceCity,
    residenceBarrioValue,
    ,
    ,
  ] = residenceForCopy;

  const medicalHasHistory = useWatch({ control, name: "medical_has_history" });
  const medicalHasMedications = useWatch({
    control,
    name: "medical_has_medications",
  });
  const medicalHasAllergies = useWatch({
    control,
    name: "medical_has_allergies",
  });
  const medicalHasDiagnosis = useWatch({
    control,
    name: "medical_has_diagnosis",
  }) as string;

  // `as boolean`: mismo motivo que el `as string` de arriba — `fatherLivesWithStudent`/
  // `motherLivesWithStudent` alimentan `required`/`disabled` (tipados `boolean` en el
  // `ComboBox` compartido); el valor real que persiste el formulario no cambia.
  const fatherLivesWithStudent = useWatch({
    control,
    name: "father_lives_with_student",
  }) as boolean;
  const motherLivesWithStudent = useWatch({
    control,
    name: "mother_lives_with_student",
  }) as boolean;

  const fatherCountry = useWatch({ control, name: "father_country" }) as string;
  const fatherDepartment = useWatch({
    control,
    name: "father_department",
  }) as string;
  const fatherCity = useWatch({ control, name: "father_city" }) as string;
  const fatherResidenceForCopy = useWatch({
    control,
    name: RESIDENCE_COPY_SUFFIXES.map((s) => `father_residence_${s}`),
  }) as string[];
  const [
    fatherResidenceCountry,
    fatherResidenceDepartment,
    fatherResidenceCity,
    fatherResidenceBarrioValue,
    ,
    ,
  ] = fatherResidenceForCopy;
  const fatherGuardianSource = useWatch({
    control,
    name: GUARDIAN_WATCHED_SUFFIXES.map((s) => `father_${s}`),
  }) as unknown[];

  const motherCountry = useWatch({ control, name: "mother_country" }) as string;
  const motherDepartment = useWatch({
    control,
    name: "mother_department",
  }) as string;
  const motherCity = useWatch({ control, name: "mother_city" }) as string;
  const motherResidenceForCopy = useWatch({
    control,
    name: RESIDENCE_COPY_SUFFIXES.map((s) => `mother_residence_${s}`),
  }) as string[];
  const [
    motherResidenceCountry,
    motherResidenceDepartment,
    motherResidenceCity,
    motherResidenceBarrioValue,
    ,
    ,
  ] = motherResidenceForCopy;
  const motherGuardianSource = useWatch({
    control,
    name: GUARDIAN_WATCHED_SUFFIXES.map((s) => `mother_${s}`),
  }) as unknown[];

  const guardianType = useWatch({ control, name: "guardian_type" });
  const guardianCountry = useWatch({
    control,
    name: "guardian_country",
  }) as string;
  const guardianDepartment = useWatch({
    control,
    name: "guardian_department",
  }) as string;
  const guardianCity = useWatch({ control, name: "guardian_city" }) as string;
  const guardianResidenceCountry = useWatch({
    control,
    name: "guardian_residence_country",
  }) as string;
  const guardianResidenceDepartment = useWatch({
    control,
    name: "guardian_residence_department",
  }) as string;
  const guardianResidenceCity = useWatch({
    control,
    name: "guardian_residence_city",
  }) as string;
  const guardianResidenceBarrioValue = useWatch({
    control,
    name: "guardian_residence_barrio",
  }) as string;

  // --- EFFECT: edad del estudiante (persistida, no solo derivada) ---
  useEffect(() => {
    if (studentBirthDate) {
      const birthDate = new Date(studentBirthDate as string);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (getValues("student_age") !== age) {
        setFieldValue("student_age", age, { shouldDirty: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentBirthDate]);

  useEffect(() => {
    if (initializedRef.current) return;

    const updates: Record<string, any> = {};

    // Determinar si necesita corrección
    const needsCorrection =
      enrollmentInfo?.actual_enrollment?.needs_correction || false;

    // Precargar existing_data si:
    // 1. Puede matricularse Y
    // 2. (NO es primera matrícula O necesita corrección) Y
    // 3. Hay datos existentes
    const shouldPreloadExisting =
      canEnroll && existingData && Object.keys(existingData).length > 0;

    if (shouldPreloadExisting) {
      Object.assign(updates, existingData);
    }

    // Fecha del formulario
    if (!getValues("form_date")) {
      updates.form_date = currentDate;
    }

    // Grado sugerido
    if (suggestedGradeObj) {
      if (!getValues("grade")) {
        updates.grade = suggestedGradeObj.description;
      }
      if (!getValues("grade_id")) {
        updates.grade_id = suggestedGradeObj.id;
      }
    }

    // Año escolar
    if (targetYear && !getValues("school_year")) {
      updates.school_year = targetYear;
    }

    if (Object.keys(updates).length > 0) {
      Object.entries(updates).forEach(([key, value]) => {
        setFieldValue(key, value, { shouldDirty: true });
      });
      update(updates);
    }

    initializedRef.current = true;
    // Marca como "ya guardado" el estado recién hidratado, para que el efecto
    // de autoguardado de abajo no dispare un POST redundante con datos que ya
    // vienen del backend (existing_data) o son puramente derivados (grado
    // sugerido, año, fecha).
    autosaveLastHashRef.current = JSON.stringify(getValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canEnroll,
    isFirstEnrollment,
    existingData,
    suggestedGradeObj,
    targetYear,
    currentDate,
  ]);

  // --- EFFECT: puente RHF -> `data` del padre + autoguardado a backend ---
  // Antes: cada `onChange` llamaba `update()` de inmediato (useState en el
  // padre), y un efecto separado, atado a `data`, debounceaba solo el POST.
  // Ahora: una única suscripción imperativa (`rhf.watch`, fuera del render,
  // igual que el autoguardado de Admisiones en SolicitudWizard.tsx) debouncea
  // 700ms tanto la sincronización hacia `data` del padre (que Step4/5/6 leen
  // directamente) como el POST — mismo endpoint, mismo payload
  // (`{ user_data: <objeto plano> }`), mismo hash para evitar POSTs
  // redundantes.
  useEffect(() => {
    const subscription = rhf.watch((_values, { name }) => {
      // `name === undefined` solo ocurre en un `reset()` — este paso no llama
      // `reset()` nunca, pero se deja el chequeo por coherencia con el mismo
      // patrón ya usado en Admisiones.
      if (name === undefined) return;
      if (!initializedRef.current) return;

      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = window.setTimeout(async () => {
        const snapshot = rhf.getValues();

        // Sincroniza `data` en el padre — los demás pasos del wizard (4, 5, 6)
        // leen `data` directamente, no este `useForm()` interno.
        update(snapshot);

        if (!enrollmentId) return;

        const payloadHash = JSON.stringify(snapshot);
        if (payloadHash === autosaveLastHashRef.current) return;

        try {
          const res = await apiFetch(
            API_ENDPOINTS.enrollmentSaveStudentData(enrollmentId),
            {
              method: "POST",
              body: JSON.stringify({ user_data: snapshot }),
            },
          );
          if (res.ok) {
            autosaveLastHashRef.current = payloadHash;
          }
        } catch (error) {
          console.error("Error guardando borrador Step 3:", error);
        }
      }, 700);
    });

    return () => {
      subscription.unsubscribe();
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // --- EFFECT: Auto-llenado acudiente (Padre/Madre) ---
  useEffect(() => {
    const get = (prefix: "father_" | "mother_", suffix: string) =>
      getValues(`${prefix}${suffix}`);

    if (guardianType === "Padre" || guardianType === "Madre") {
      const prefix = guardianType === "Padre" ? "father_" : "mother_";
      const newGuardian = {
        guardian_lastname1: get(prefix, "lastname1"),
        guardian_lastname2: get(prefix, "lastname2"),
        guardian_firstname1: get(prefix, "firstname1"),
        guardian_firstname2: get(prefix, "firstname2"),
        guardian_full_name: [
          get(prefix, "firstname1"),
          get(prefix, "firstname2"),
          get(prefix, "lastname1"),
          get(prefix, "lastname2"),
        ]
          .filter(Boolean)
          .join(" "),
        guardian_id_number: get(prefix, "id_number"),
        guardian_email: get(prefix, "email"),
        guardian_phone: get(prefix, "phone"),
        guardian_country: get(prefix, "country"),
        guardian_department: get(prefix, "department"),
        guardian_city: get(prefix, "city"),
        guardian_residence_country: get(prefix, "residence_country"),
        guardian_residence_department: get(prefix, "residence_department"),
        guardian_residence_city: get(prefix, "residence_city"),
        guardian_residence_barrio: get(prefix, "residence_barrio"),
        guardian_residence_address: get(prefix, "residence_address"),
        guardian_residence_address_complement: get(
          prefix,
          "residence_address_complement",
        ),
        guardian_residence_stratum: get(prefix, "residence_stratum"),
        guardian_document_type: get(prefix, "document_type"),
        guardian_religion: get(prefix, "religion"),
        guardian_relationship: guardianType,
        guardian_profession: get(prefix, "profession"),
        guardian_company_name: get(prefix, "company_name"),
        guardian_company_address: get(prefix, "company_address"),
        guardian_work_phone: get(prefix, "work_phone"),
      };
      const needsUpdate = Object.keys(newGuardian).some(
        (key) => getValues(key) !== newGuardian[key],
      );
      if (needsUpdate) {
        Object.entries(newGuardian).forEach(([key, value]) => {
          setFieldValue(key, value, { shouldDirty: true });
        });
      }
    } else if (guardianType === "Empresa") {
      // Limpiar campos de persona natural cuando se selecciona "Empresa"
      const fieldsToClean: Record<string, string> = {
        // Nombres separados (para Empresa se usa guardian_full_name = Razón Social)
        guardian_lastname1: "",
        guardian_lastname2: "",
        guardian_firstname1: "",
        guardian_firstname2: "",
        // Tipo de documento (para Empresa se usa NIT directamente en guardian_id_number)
        guardian_document_type: "",
        // Datos personales que no aplican para empresas
        guardian_country: "",
        guardian_department: "",
        guardian_city: "",
        guardian_religion: "",
        guardian_residence_stratum: "",
        guardian_relationship: "",
        // Información laboral (no aplica para empresas)
        guardian_profession: "",
        guardian_company_name: "",
        guardian_company_address: "",
        guardian_work_phone: "",
      };
      const needsCleaning = Object.keys(fieldsToClean).some(
        (key) => getValues(key) !== "",
      );
      if (needsCleaning) {
        Object.entries(fieldsToClean).forEach(([key, value]) => {
          setFieldValue(key, value, { shouldDirty: true });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardianType, fatherGuardianSource, motherGuardianSource]);

  // --- EFFECT: Auto-llenado residencia padre si vive con estudiante ---
  useEffect(() => {
    if (fatherLivesWithStudent) {
      const needsUpdate = RESIDENCE_COPY_SUFFIXES.some(
        (_suffix, i) => fatherResidenceForCopy[i] !== residenceForCopy[i],
      );
      if (needsUpdate) {
        RESIDENCE_COPY_SUFFIXES.forEach((suffix, i) => {
          setFieldValue(`father_residence_${suffix}`, residenceForCopy[i], {
            shouldDirty: true,
          });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatherLivesWithStudent, residenceForCopy, fatherResidenceForCopy]);

  // --- EFFECT: Auto-llenado residencia madre si vive con estudiante ---
  useEffect(() => {
    if (motherLivesWithStudent) {
      const needsUpdate = RESIDENCE_COPY_SUFFIXES.some(
        (_suffix, i) => motherResidenceForCopy[i] !== residenceForCopy[i],
      );
      if (needsUpdate) {
        RESIDENCE_COPY_SUFFIXES.forEach((suffix, i) => {
          setFieldValue(`mother_residence_${suffix}`, residenceForCopy[i], {
            shouldDirty: true,
          });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motherLivesWithStudent, residenceForCopy, motherResidenceForCopy]);

  // --- MANEJO DE DATOS / localStorage ---
  const storageKey =
    enrollmentId !== null && enrollmentId !== undefined
      ? `enrollment_step3_${enrollmentId}`
      : null;

  const handleSubmit = async (e?: React.FormEvent) => {
    console.log("🚀 handleSubmit ejecutado");

    if (e) {
      e.preventDefault();
      console.log("✋ preventDefault llamado");
    }

    // Obtener todos los inputs, selects y textareas del formulario
    const form = document.querySelector("form");
    console.log("📋 Formulario encontrado:", form);
    console.log("✅ Formulario válido?:", form?.checkValidity());

    if (form && !form.checkValidity()) {
      // Encontrar el primer campo inválido
      const invalidField = form.querySelector(":invalid") as
        | HTMLInputElement
        | HTMLSelectElement;

      if (invalidField) {
        // Determinar a qué sección pertenece basándose en el nombre del campo
        let sectionToOpen = "";
        const fieldName = invalidField.name || "";

        console.log("🔍 Campo inválido detectado:", fieldName);
        console.log("🔍 Elemento completo:", invalidField);
        console.log("🔍 ID del campo:", invalidField.id);
        console.log(
          "🔍 Placeholder:",
          (invalidField as HTMLInputElement).placeholder,
        );
        console.log(
          "🔍 Label asociado:",
          invalidField.labels?.[0]?.textContent,
        );

        // Si no tiene name, intentar usar el placeholder para identificar la sección
        if (!fieldName) {
          const placeholder =
            (invalidField as HTMLInputElement).placeholder || "";
          console.log("⚠️ Campo sin name, usando placeholder:", placeholder);

          // Identificar sección por palabras clave en el placeholder
          if (
            placeholder.includes("Estudiante") ||
            placeholder.includes("Fecha") ||
            placeholder.includes("Matrícula")
          ) {
            sectionToOpen = "estudiante";
          } else if (
            placeholder.includes("Residencia") ||
            placeholder.includes("Barrio")
          ) {
            sectionToOpen = "residencia";
          } else if (
            placeholder.includes("Médica") ||
            placeholder.includes("EPS") ||
            placeholder.includes("Salud")
          ) {
            sectionToOpen = "medica";
          } else if (placeholder.includes("Padre")) {
            sectionToOpen = "padre";
          } else if (placeholder.includes("Madre")) {
            sectionToOpen = "madre";
          } else if (
            placeholder.includes("Acudiente") ||
            placeholder.includes("Tutor") ||
            placeholder.includes("Guardian")
          ) {
            sectionToOpen = "acudiente";
          }
        }

        if (
          fieldName.startsWith("student_") ||
          fieldName === "enrollment_date" ||
          fieldName === "enrollment_id"
        ) {
          sectionToOpen = "estudiante";
        } else if (fieldName.startsWith("residence_")) {
          sectionToOpen = "residencia";
        } else if (fieldName.startsWith("medical_")) {
          sectionToOpen = "medica";
        } else if (
          fieldName === "father_lives_with_student" ||
          fieldName === "mother_lives_with_student" ||
          fieldName === "lives_with_other"
        ) {
          sectionToOpen = "convivencia";
        } else if (fieldName.startsWith("father_")) {
          sectionToOpen = "padre";
        } else if (fieldName.startsWith("mother_")) {
          sectionToOpen = "madre";
        } else if (fieldName.startsWith("guardian_")) {
          sectionToOpen = "acudiente";
        }

        console.log("📂 Sección a abrir:", sectionToOpen);
        console.log("📊 Estado actual de secciones:", openSections);

        // Expandir la sección si está colapsada
        if (
          sectionToOpen &&
          !openSections[sectionToOpen as keyof typeof openSections]
        ) {
          console.log("✅ Expandiendo sección:", sectionToOpen);
          toggleSection(sectionToOpen as keyof typeof openSections);

          // Esperar un momento para que la sección se expanda antes de mostrar el error
          setTimeout(() => {
            console.log("⏰ Mostrando validación después de expandir");
            form.reportValidity();
            invalidField.focus();
            invalidField.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 300);
          return;
        } else {
          console.log("⚠️ Sección ya está abierta o no se encontró");
        }
      }

      // Si el formulario no es válido, mostrar los mensajes de error nativos
      form.reportValidity();
      return; // No permitir avanzar
    }

    try {
      // Toma el valor MÁS FRESCO del motor RHF (no el `data` prop, que puede
      // ir hasta 700ms detrás por el debounce del autoguardado) para que ni el
      // snapshot de localStorage ni el modal legal pierdan la última tecla
      // escrita antes de avanzar.
      const currentValues = rhf.getValues();
      update(currentValues);

      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(currentValues));
      }
      setLegalModalSnapshot(currentValues as LegalModalSnapshot);
      // Mostrar modal legal antes de avanzar
      setShowLegalModal(true);
    } catch (error) {
      console.error("Error al avanzar:", error);
      setShowLegalModal(true);
    }
  };

  const handleAcceptLegal = () => {
    setShowLegalModal(false);
    next();
  };

  const handleDeclineLegal = () => {
    setShowLegalModal(false);
  };

  // --- NOTA: bug corregido del barrio "Otro" (las 4 secciones) ---
  // Antes, el `<input>` libre "Especifique el barrio" tenía en `registerOptions`
  // un `onChange` extra que, además de guardar su propio texto en
  // `*_otro_barrio`, reescribía el campo del COMBO (`*_residence_barrio` /
  // `residence_barrio` / `guardian_residence_barrio`) con ese mismo texto en
  // cada tecla. Apenas el usuario tecleaba una letra, ese campo dejaba de
  // valer "Otro" y la condición `watch(...) === "Otro"` que mantiene visible
  // el input dejaba de cumplirse, desmontando el campo con el texto truncado
  // ya guardado (bug confirmado en vivo: "Las Nieves" quedaba grabado como
  // "La"). En Residencia y Acudiente esto se enmascaraba parcialmente con una
  // "compuerta" de estado local que no seguía al campo real mientras se
  // tecleaba — el campo real igual quedaba corrompido, solo la UI no se
  // desmontaba.
  //
  // Fix (igual al patrón ya usado en `GeoCascadeField.tsx`): el combo escribe
  // SOLO en el campo de barrio; el input libre escribe SOLO en `*_otro_barrio`
  // (ya no lleva `registerOptions`); la condición de visibilidad lee
  // `watch(campo_barrio) === "Otro"` directamente, sin compuerta — ahora es
  // segura porque nada más escribe en ese campo salvo el combo.

  return (
    <form onSubmit={handleSubmit} noValidate={true}>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
        {/* 1. Datos del Estudiante */}
        <SectionCard
          title="1. Información del Estudiante"
          isOpen={openSections.estudiante}
          onToggle={() => toggleSection("estudiante")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Foto */}
            <div className="row-span-2 mt-3">
              <PhotoField
                dataKey="student_photo"
                label="Foto de perfil"
                value={{
                  file: uploadedFiles.student_photo ?? null,
                  removed: !!studentPhotoRemoved,
                }}
                onChange={(next) => {
                  updateUploadedFiles({ student_photo: next.file });
                  setFieldValue("student_photo_manually_removed", next.removed, {
                    shouldDirty: true,
                  });
                }}
                preloadedUrl={preloadedDocuments?.student_photo?.preview_base64}
              />
            </div>

            {/* Datos de matrícula */}
            <FormInput label="Fecha" name="form_date" register={register} disabled />
            <FormInput label="Grado" name="grade" register={register} disabled />
            <FormInput
              label="Año escolar"
              name="school_year"
              register={register}
              disabled
            />

            {/* Nombres y apellidos */}
            <FormInput
              label="Primer Apellido"
              name="student_lastname1"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={true}
            />
            <FormInput
              label="Segundo Apellido"
              name="student_lastname2"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={true}
            />
            <FormInput
              label="Primer Nombre"
              name="student_firstname1"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={true}
            />
            <FormInput
              label="Segundo Nombre"
              name="student_firstname2"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={true}
            />

            {/* Sexo */}
            <FormSelect
              label="Sexo"
              name="student_gender"
              register={register}
              options={["Masculino", "Femenino"]}
              required={true}
            />

            {/* Nacimiento */}
            <FormInput
              label="Fecha de Nacimiento"
              name="student_birth_date"
              type="date"
              register={register}
              required={true}
            />
            <FormInput label="Edad" name="student_age" register={register} disabled />
            <ComboBox
              value={studentBirthCountry}
              onChange={(value) =>
                setFieldValue("student_birth_country", value, {
                  shouldDirty: true,
                })
              }
              options={COUNTRIES}
              label="País de Nacimiento"
              disabled={false}
              required={true}
            />
            {studentBirthCountry === "Colombia" ? (
              <ComboBox
                value={studentBirthDepartment}
                onChange={(value) =>
                  setFieldValue("student_birth_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento"
                disabled={studentBirthCountry !== "Colombia"}
                required={true}
              />
            ) : (
              <FormInput
                label="Departamento"
                name="student_birth_department"
                register={register}
                disabled={false}
                required={true}
              />
            )}
            {studentBirthCountry === "Colombia" &&
            studentBirthDepartment === "Atlántico" ? (
              <ComboBox
                value={studentBirthCity}
                onChange={(value) =>
                  setFieldValue("student_birth_city", value, {
                    shouldDirty: true,
                  })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad"
                disabled={false}
                required={true}
              />
            ) : (
              <FormInput
                label="Ciudad"
                name="student_birth_city"
                register={register}
                required={true}
              />
            )}

            {/* Identificación */}
            <FormSelect
              label="Tipo de identificación"
              name="student_id_type"
              register={register}
              options={DOCUMENT_TYPES}
              placeholder="Selecciona ID"
              required={true}
            />
            <FormInput
              label="Número de ID"
              name="student_id_number"
              register={register}
              pattern="[0-9]*"
              inputMode="numeric"
              required={true}
            />

            {/* Expedición */}
            <ComboBox
              value={studentIdCountry}
              onChange={(value) =>
                setFieldValue("student_id_country", value, {
                  shouldDirty: true,
                })
              }
              options={COUNTRIES}
              label="País de Expedición"
              disabled={false}
              required={true}
            />
            {studentIdCountry === "Colombia" ? (
              <ComboBox
                value={studentIdDepartment}
                onChange={(value) =>
                  setFieldValue("student_id_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento"
                disabled={studentIdCountry !== "Colombia"}
                required={true}
              />
            ) : (
              <FormInput
                label="Departamento"
                name="student_id_department"
                register={register}
                disabled={false}
                required={true}
              />
            )}
            {studentIdCountry === "Colombia" &&
            studentIdDepartment === "Atlántico" ? (
              <ComboBox
                value={studentIdCity}
                onChange={(value) =>
                  setFieldValue("student_id_city", value, {
                    shouldDirty: true,
                  })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad"
                disabled={false}
                required={true}
              />
            ) : (
              <FormInput
                label="Ciudad"
                name="student_id_city"
                register={register}
                disabled={false}
                required={true}
              />
            )}
            <FormInput
              label="Fecha de expedición"
              name="student_id_issue_date"
              type="date"
              register={register}
              required={true}
            />

            {/* Salud y familiares */}
            <ComboBox
              value={studentHealthEps}
              onChange={(value) =>
                setFieldValue("student_health_eps", value, {
                  shouldDirty: true,
                })
              }
              options={EPS_LIST}
              label="EPS"
              disabled={false}
              required={true}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormSelect
                label="RH"
                name="student_blood_rh"
                register={register}
                options={["+", "-"]}
                placeholder="+/-"
                required={true}
              />
              <FormSelect
                label="Grupo"
                name="student_blood_abo"
                register={register}
                options={["A", "B", "AB", "O"]}
                placeholder="Tipo"
                required={true}
              />
            </div>

            <FormSelect
              label="¿Tiene celular?"
              name="student_has_cellphone"
              register={register}
              options={["Si", "No"]}
              required={true}
            />
            {studentHasCellphone === "Si" && (
              <FormInput
                label="Número de celular"
                name="student_cellphone"
                register={register}
              />
            )}

            <FormSelect
              label="¿Tiene hermanos?"
              name="student_has_siblings"
              register={register}
              options={["Si", "No"]}
              required={true}
            />
            <FormSelect
              label="¿Estudian en la institución?"
              name="student_siblings_in_school"
              register={register}
              options={["Si", "No"]}
              disabled={studentHasSiblings !== "Si"}
            />
            <FormSelect
              label="Religión"
              name="student_religion"
              register={register}
              options={RELIGIONS}
              required={true}
            />
            <FormSelect
              label="Estado civil de los padres"
              name="parents_marital_status"
              register={register}
              options={MARITAL_STATUS}
              required={true}
            />
          </div>
        </SectionCard>

        {/* 2. Residencia */}
        <SectionCard
          title="2. Información de Residencia"
          isOpen={openSections.residencia}
          onToggle={() => toggleSection("residencia")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ComboBox
              value={residenceCountry}
              onChange={(value) =>
                setFieldValue("residence_country", value, {
                  shouldDirty: true,
                })
              }
              options={COUNTRIES}
              label="País de Residencia"
              disabled={false}
              required={true}
            />
            {residenceCountry === "Colombia" ? (
              <ComboBox
                value={residenceDepartment}
                onChange={(value) =>
                  setFieldValue("residence_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento"
                disabled={residenceCountry !== "Colombia"}
                required={true}
              />
            ) : (
              <FormInput
                label="Departamento"
                name="residence_department"
                register={register}
                disabled={false}
                required={true}
              />
            )}
            {residenceCountry === "Colombia" &&
            residenceDepartment === "Atlántico" ? (
              <ComboBox
                value={residenceCity}
                onChange={(value) =>
                  setFieldValue("residence_city", value, {
                    shouldDirty: true,
                  })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad"
                disabled={false}
                required={true}
              />
            ) : (
              <FormInput
                label="Ciudad"
                name="residence_city"
                register={register}
                required={true}
              />
            )}

            {residenceCity === "Barranquilla" ? (
              <>
                <ComboBox
                  value={residenceBarrioValue}
                  onChange={(value) =>
                    setFieldValue("residence_barrio", value, {
                      shouldDirty: true,
                    })
                  }
                  options={BARRIOS_BARRANQUILLA}
                  label="Barrio de Residencia"
                  disabled={false}
                  required={true}
                />
                {residenceBarrioValue === "Otro" && (
                  <FormInput
                    label="Especifique el barrio"
                    name="residence_otro_barrio"
                    register={register}
                  />
                )}
              </>
            ) : (
              <FormInput
                label="Barrio de Residencia"
                name="residence_barrio"
                register={register}
                required={true}
              />
            )}

            <FormInput
              label="Dirección"
              name="residence_address"
              register={register}
              required={true}
            />
            <FormInput
              label="Complemento (Apto, Torre)"
              name="residence_address_complement"
              register={register}
            />
            <FormSelect
              label="Estrato"
              name="residence_stratum"
              register={register}
              options={ESTRATOS}
              required={true}
            />
          </div>
        </SectionCard>

        {/* 3. Información Médica */}
        <SectionCard
          title="3. Información Médica"
          isOpen={openSections.medica}
          onToggle={() => toggleSection("medica")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormSelect
              label="¿Antecedentes médicos?"
              name="medical_has_history"
              register={register}
              options={["Si", "No"]}
              required={true}
            />
            {medicalHasHistory === "Si" && (
              <FormInput
                label="¿Cuál?"
                name="medical_history_detail"
                register={register}
              />
            )}

            <FormSelect
              label="¿Medicamentos prescritos?"
              name="medical_has_medications"
              register={register}
              options={["Si", "No"]}
              required={true}
            />
            {medicalHasMedications === "Si" && (
              <FormInput
                label="¿Cuáles y dosis?"
                name="medical_medications_detail"
                register={register}
              />
            )}

            <FormSelect
              label="¿Alergias?"
              name="medical_has_allergies"
              register={register}
              options={["Si", "No"]}
              required={true}
            />
            {medicalHasAllergies === "Si" && (
              <FormInput
                label="¿A qué?"
                name="medical_allergies_detail"
                register={register}
              />
            )}

            <ComboBox
              label="¿Diagnóstico/Proceso?"
              value={medicalHasDiagnosis}
              onChange={(value) =>
                setFieldValue("medical_has_diagnosis", value, {
                  shouldDirty: true,
                })
              }
              options={[
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
                "Otros",
                "Ninguno",
              ]}
              placeholder="Selecciona..."
              disabled={false}
              required={true}
            />
            {medicalHasDiagnosis === "Otros" && (
              <FormInput
                label="Especifique"
                name="medical_diagnosis_other"
                register={register}
              />
            )}

            {medicalHasDiagnosis && medicalHasDiagnosis !== "Ninguno" && (
              <FormInput
                label="Información adicional (Médico o Institución tratante)"
                name="medical_diagnosis_additional_info"
                register={register}
                placeholder="Nombre del médico o institución"
              />
            )}
          </div>
        </SectionCard>

        {/* 4. Convivencia */}
        <SectionCard
          title="4. ¿Con quién vive el estudiante?"
          isOpen={openSections.ahorro}
          onToggle={() => toggleSection("ahorro")}
        >
          <div className="flex flex-col md:flex-row gap-4 p-2">
            <label className="label cursor-pointer justify-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full md:w-1/3 flex-wrap">
              <input
                type="checkbox"
                className="checkbox checkbox-primary shrink-0"
                {...register("father_lives_with_student")}
              />
              <span className="label-text font-normal text-xs leading-tight">
                ¿El Padre vive con el estudiante?
              </span>
            </label>
            <label className="label cursor-pointer justify-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full md:w-1/3 flex-wrap">
              <input
                type="checkbox"
                className="checkbox checkbox-primary shrink-0"
                {...register("mother_lives_with_student")}
              />
              <span className="label-text font-normal text-xs leading-tight">
                ¿La Madre vive con el estudiante?
              </span>
            </label>
            <label className="label cursor-pointer justify-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full md:w-1/3 flex-wrap">
              <input
                type="checkbox"
                className="checkbox checkbox-primary shrink-0"
                disabled={Boolean(
                  fatherLivesWithStudent || motherLivesWithStudent,
                )}
                {...register("lives_with_other")}
              />
              <span
                className={`label-text font-normal text-xs leading-tight ${
                  fatherLivesWithStudent || motherLivesWithStudent
                    ? "text-gray-400"
                    : ""
                }`}
              >
                Vive con otra persona
              </span>
            </label>
          </div>
        </SectionCard>

        {/* 5. Padre */}
        <SectionCard
          title="5. Información del Padre"
          isOpen={openSections.padre}
          onToggle={() => toggleSection("padre")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Foto del Padre */}
            <div className="row-span-2 mt-3">
              <PhotoField
                dataKey="father_photo"
                label="Foto de perfil del Padre"
                value={{
                  file: uploadedFiles.father_photo ?? null,
                  removed: !!fatherPhotoRemoved,
                }}
                onChange={(next) => {
                  updateUploadedFiles({ father_photo: next.file });
                  setFieldValue("father_photo_manually_removed", next.removed, {
                    shouldDirty: true,
                  });
                }}
                preloadedUrl={preloadedDocuments?.father_photo?.preview_base64}
              />
            </div>

            <FormInput
              label="Primer Apellido"
              name="father_lastname1"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Segundo Apellido"
              name="father_lastname2"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Primer Nombre"
              name="father_firstname1"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Segundo Nombre"
              name="father_firstname2"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={fatherLivesWithStudent}
            />

            <FormSelect
              label="Tipo de Documento"
              name="father_document_type"
              register={register}
              options={DOCUMENT_TYPES}
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Número de ID"
              name="father_id_number"
              register={register}
              pattern="[0-9]*"
              inputMode="numeric"
              required={fatherLivesWithStudent}
            />

            <FormInput
              label="Celular"
              name="father_phone"
              register={register}
              type="tel"
              pattern="[0-9]{10}"
              inputMode="numeric"
              maxLength={10}
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Email"
              name="father_email"
              type="email"
              register={register}
              required={fatherLivesWithStudent}
            />

            <ComboBox
              value={fatherCountry}
              onChange={(value) =>
                setFieldValue("father_country", value, { shouldDirty: true })
              }
              options={COUNTRIES}
              label="País del Padre"
              disabled={false}
              required={fatherLivesWithStudent}
            />
            {fatherCountry === "Colombia" ? (
              <ComboBox
                value={fatherDepartment}
                onChange={(value) =>
                  setFieldValue("father_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento de Nacimiento"
                disabled={fatherCountry !== "Colombia"}
                required={fatherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Departamento de Nacimiento"
                name="father_department"
                register={register}
                disabled={false}
                required={fatherLivesWithStudent}
              />
            )}
            {fatherCountry === "Colombia" &&
            fatherDepartment === "Atlántico" ? (
              <ComboBox
                value={fatherCity}
                onChange={(value) =>
                  setFieldValue("father_city", value, { shouldDirty: true })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad de Nacimiento"
                disabled={false}
                required={fatherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Ciudad de Nacimiento"
                name="father_city"
                register={register}
                disabled={false}
                required={fatherLivesWithStudent}
              />
            )}

            <FormSelect
              label="Religión"
              name="father_religion"
              register={register}
              options={RELIGIONS}
              required={fatherLivesWithStudent}
            />

            <ComboBox
              value={fatherResidenceCountry}
              onChange={(value) =>
                setFieldValue("father_residence_country", value, {
                  shouldDirty: true,
                })
              }
              options={COUNTRIES}
              label="País de Residencia"
              disabled={fatherLivesWithStudent}
              required={!fatherLivesWithStudent}
            />
            {fatherResidenceCountry === "Colombia" ? (
              <ComboBox
                value={fatherResidenceDepartment}
                onChange={(value) =>
                  setFieldValue("father_residence_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento de Residencia"
                disabled={fatherLivesWithStudent}
                required={!fatherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Departamento de Residencia"
                name="father_residence_department"
                register={register}
                disabled={fatherLivesWithStudent}
                required={!fatherLivesWithStudent}
              />
            )}
            {fatherResidenceCountry === "Colombia" &&
            fatherResidenceDepartment === "Atlántico" ? (
              <ComboBox
                value={fatherResidenceCity}
                onChange={(value) =>
                  setFieldValue("father_residence_city", value, {
                    shouldDirty: true,
                  })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad de Residencia"
                disabled={fatherLivesWithStudent}
                required={!fatherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Ciudad de Residencia"
                name="father_residence_city"
                register={register}
                disabled={fatherLivesWithStudent}
                required={!fatherLivesWithStudent}
              />
            )}
            {fatherResidenceCity === "Barranquilla" ? (
              <>
                <ComboBox
                  value={fatherResidenceBarrioValue}
                  onChange={(value) =>
                    setFieldValue("father_residence_barrio", value, {
                      shouldDirty: true,
                    })
                  }
                  options={BARRIOS_BARRANQUILLA}
                  label="Barrio de Residencia"
                  disabled={fatherLivesWithStudent}
                  required={!fatherLivesWithStudent}
                />
                {/*
                  Antes de esta migración, este bloque usaba una variable de
                  estado sombra (`fatherBarrio`) que nunca se sincronizaba con
                  ningún dato real, así que esta condición nunca era
                  verdadera y el campo quedaba inalcanzable (bug documentado
                  en el informe de reconocimiento, §0.4). Al leer
                  directamente el valor real del campo (el mismo que ya usa
                  el ComboBox de arriba) el bug queda corregido: ahora si el
                  usuario elige "Otro" el campo aparece. El `<input>` ya NO
                  lleva `registerOptions` (ver nota sobre el bug de corrupción
                  del barrio "Otro" más arriba): escribe solo en
                  `father_otro_barrio`, sin reescribir
                  `father_residence_barrio`.
                */}
                {fatherResidenceBarrioValue === "Otro" && (
                  <FormInput
                    label="Especifique el barrio"
                    name="father_otro_barrio"
                    register={register}
                  />
                )}
              </>
            ) : (
              <FormInput
                label="Barrio de Residencia"
                name="father_residence_barrio"
                register={register}
                disabled={fatherLivesWithStudent}
                required={!fatherLivesWithStudent}
              />
            )}
            <FormInput
              label="Dirección de Residencia"
              name="father_residence_address"
              register={register}
              disabled={fatherLivesWithStudent}
              required={!fatherLivesWithStudent}
            />
            <FormInput
              label="Complemento (Apto, Torre)"
              name="father_residence_address_complement"
              register={register}
              disabled={fatherLivesWithStudent}
            />
            <FormSelect
              label="Estrato"
              name="father_residence_stratum"
              register={register}
              options={ESTRATOS}
              disabled={fatherLivesWithStudent}
              required={!fatherLivesWithStudent}
            />

            {/* Información Laboral del Padre */}
            <FormInput
              label="Profesión"
              name="father_profession"
              register={register}
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Nombre Empresa donde Labora"
              name="father_company_name"
              register={register}
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Dirección Empresa donde Labora"
              name="father_company_address"
              register={register}
              required={fatherLivesWithStudent}
            />
            <FormInput
              label="Número de contacto laboral"
              name="father_work_phone"
              type="tel"
              register={register}
              pattern="[0-9]*"
              inputMode="numeric"
              required={fatherLivesWithStudent}
            />
          </div>
        </SectionCard>

        {/* 6. Madre */}
        <SectionCard
          title="6. Información de la Madre"
          isOpen={openSections.madre}
          onToggle={() => toggleSection("madre")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Foto de la Madre */}
            <div className="row-span-2 mt-3">
              <PhotoField
                dataKey="mother_photo"
                label="Foto de perfil de la Madre"
                value={{
                  file: uploadedFiles.mother_photo ?? null,
                  removed: !!motherPhotoRemoved,
                }}
                onChange={(next) => {
                  updateUploadedFiles({ mother_photo: next.file });
                  setFieldValue("mother_photo_manually_removed", next.removed, {
                    shouldDirty: true,
                  });
                }}
                preloadedUrl={preloadedDocuments?.mother_photo?.preview_base64}
              />
            </div>

            <FormInput
              label="Primer Apellido"
              name="mother_lastname1"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Segundo Apellido"
              name="mother_lastname2"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Primer Nombre"
              name="mother_firstname1"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Segundo Nombre"
              name="mother_firstname2"
              register={register}
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
              required={motherLivesWithStudent}
            />

            <FormSelect
              label="Tipo de Documento"
              name="mother_document_type"
              register={register}
              options={DOCUMENT_TYPES}
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Número de ID"
              name="mother_id_number"
              register={register}
              pattern="[0-9]*"
              inputMode="numeric"
              required={motherLivesWithStudent}
            />

            <FormInput
              label="Celular"
              name="mother_phone"
              register={register}
              type="tel"
              pattern="[0-9]{10}"
              inputMode="numeric"
              maxLength={10}
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Email"
              name="mother_email"
              type="email"
              register={register}
              required={motherLivesWithStudent}
            />

            <ComboBox
              value={motherCountry}
              onChange={(value) =>
                setFieldValue("mother_country", value, { shouldDirty: true })
              }
              options={COUNTRIES}
              label="País"
              disabled={false}
              required={motherLivesWithStudent}
            />
            {motherCountry === "Colombia" ? (
              <ComboBox
                value={motherDepartment}
                onChange={(value) =>
                  setFieldValue("mother_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento de Nacimiento"
                disabled={motherCountry !== "Colombia"}
                required={motherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Departamento de Nacimiento"
                name="mother_department"
                register={register}
                disabled={false}
                required={motherLivesWithStudent}
              />
            )}
            {motherCountry === "Colombia" &&
            motherDepartment === "Atlántico" ? (
              <ComboBox
                value={motherCity}
                onChange={(value) =>
                  setFieldValue("mother_city", value, { shouldDirty: true })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad de Nacimiento"
                disabled={false}
                required={motherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Ciudad de Nacimiento"
                name="mother_city"
                register={register}
                disabled={false}
                required={motherLivesWithStudent}
              />
            )}

            <FormSelect
              label="Religión"
              name="mother_religion"
              register={register}
              options={RELIGIONS}
              required={motherLivesWithStudent}
            />

            <ComboBox
              value={motherResidenceCountry}
              onChange={(value) =>
                setFieldValue("mother_residence_country", value, {
                  shouldDirty: true,
                })
              }
              options={COUNTRIES}
              label="País de Residencia"
              disabled={motherLivesWithStudent}
              required={!motherLivesWithStudent}
            />
            {motherResidenceCountry === "Colombia" ? (
              <ComboBox
                value={motherResidenceDepartment}
                onChange={(value) =>
                  setFieldValue("mother_residence_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento de Residencia"
                disabled={motherLivesWithStudent}
                required={!motherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Departamento de Residencia"
                name="mother_residence_department"
                register={register}
                disabled={motherLivesWithStudent}
                required={!motherLivesWithStudent}
              />
            )}
            {motherResidenceCountry === "Colombia" &&
            motherResidenceDepartment === "Atlántico" ? (
              <ComboBox
                value={motherResidenceCity}
                onChange={(value) =>
                  setFieldValue("mother_residence_city", value, {
                    shouldDirty: true,
                  })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad de Residencia"
                disabled={motherLivesWithStudent}
                required={!motherLivesWithStudent}
              />
            ) : (
              <FormInput
                label="Ciudad de Residencia"
                name="mother_residence_city"
                register={register}
                disabled={motherLivesWithStudent}
                required={!motherLivesWithStudent}
              />
            )}
            {motherResidenceCity === "Barranquilla" ? (
              <>
                <ComboBox
                  value={motherResidenceBarrioValue}
                  onChange={(value) =>
                    setFieldValue("mother_residence_barrio", value, {
                      shouldDirty: true,
                    })
                  }
                  options={BARRIOS_BARRANQUILLA}
                  label="Barrio de Residencia"
                  disabled={motherLivesWithStudent}
                  required={!motherLivesWithStudent}
                />
                {/* Ver comentario equivalente en la sección "Padre": bug de
                    barrio "Otro" inalcanzable, corregido leyendo el valor
                    real del campo en vez de un estado sombra, y sin
                    `registerOptions` (ya no reescribe
                    `mother_residence_barrio`). */}
                {motherResidenceBarrioValue === "Otro" && (
                  <FormInput
                    label="Especifique el barrio"
                    name="mother_otro_barrio"
                    register={register}
                  />
                )}
              </>
            ) : (
              <FormInput
                label="Barrio de Residencia"
                name="mother_residence_barrio"
                register={register}
                disabled={motherLivesWithStudent}
                required={!motherLivesWithStudent}
              />
            )}
            <FormInput
              label="Dirección de Residencia"
              name="mother_residence_address"
              register={register}
              disabled={motherLivesWithStudent}
              required={!motherLivesWithStudent}
            />
            <FormInput
              label="Complemento (Apto, Torre)"
              name="mother_residence_address_complement"
              register={register}
              disabled={motherLivesWithStudent}
            />
            <FormSelect
              label="Estrato"
              name="mother_residence_stratum"
              register={register}
              options={ESTRATOS}
              disabled={motherLivesWithStudent}
              required={!motherLivesWithStudent}
            />

            {/* Información Laboral de la Madre */}
            <FormInput
              label="Profesión"
              name="mother_profession"
              register={register}
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Nombre Empresa donde Labora"
              name="mother_company_name"
              register={register}
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Dirección Empresa donde Labora"
              name="mother_company_address"
              register={register}
              required={motherLivesWithStudent}
            />
            <FormInput
              label="Número de contacto laboral"
              name="mother_work_phone"
              type="tel"
              register={register}
              pattern="[0-9]*"
              inputMode="numeric"
              required={motherLivesWithStudent}
            />
          </div>
        </SectionCard>

        {/* 7. Acudiente */}
        <SectionCard
          title="7. Acudiente / Adulto Responsable"
          isOpen={openSections.acudiente}
          onToggle={() => toggleSection("acudiente")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormSelect
              label="¿Quién es el acudiente?"
              name="guardian_type"
              register={register}
              options={["Padre", "Madre", "Otro", "Empresa"]}
              placeholder="Seleccionar..."
              required={true}
            />

            {/* Campos para Empresa */}
            {guardianType === "Empresa" && (
              <>
                <FormInput
                  label="Razón Social"
                  name="guardian_full_name"
                  register={register}
                  required={true}
                />
                <FormInput
                  label="NIT"
                  name="guardian_id_number"
                  register={register}
                  placeholder="Ej: 900123456-7"
                  required={true}
                />
              </>
            )}

            {/* Campos para Persona Natural (Padre, Madre, Otro) */}
            {guardianType !== "Empresa" && (
              <>
                <FormInput
                  label="Primer Apellido"
                  name="guardian_lastname1"
                  register={register}
                  pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
                  required={guardianType === "Otro"}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                />
                <FormInput
                  label="Segundo Apellido"
                  name="guardian_lastname2"
                  register={register}
                  pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
                  required={guardianType === "Otro"}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                />
                <FormInput
                  label="Primer Nombre"
                  name="guardian_firstname1"
                  register={register}
                  pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
                  required={guardianType === "Otro"}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                />
                <FormInput
                  label="Segundo Nombre"
                  name="guardian_firstname2"
                  register={register}
                  pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+"
                  required={guardianType === "Otro"}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                />

                <FormSelect
                  label="Tipo de Documento"
                  name="guardian_document_type"
                  register={register}
                  options={DOCUMENT_TYPES}
                  required={guardianType === "Otro"}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                />
                <FormInput
                  label="Número de ID"
                  name="guardian_id_number"
                  register={register}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required={guardianType === "Otro"}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                />
              </>
            )}

            <FormInput
              label={
                guardianType === "Empresa" ? "Teléfono de contacto" : "Celular"
              }
              name="guardian_phone"
              register={register}
              type="tel"
              pattern={guardianType === "Empresa" ? "[0-9]*" : "[0-9]{10}"}
              inputMode="numeric"
              maxLength={guardianType === "Empresa" ? 15 : 10}
              required={guardianType === "Otro" || guardianType === "Empresa"}
              disabled={guardianType === "Padre" || guardianType === "Madre"}
            />
            <FormInput
              label={guardianType === "Empresa" ? "Email corporativo" : "Email"}
              name="guardian_email"
              type="email"
              register={register}
              required={guardianType === "Otro" || guardianType === "Empresa"}
              disabled={guardianType === "Padre" || guardianType === "Madre"}
            />

            {/* Campos de lugar de nacimiento y religión - Solo para personas naturales */}
            {guardianType !== "Empresa" && (
              <>
                <ComboBox
                  value={guardianCountry}
                  onChange={(value) =>
                    setFieldValue("guardian_country", value, {
                      shouldDirty: true,
                    })
                  }
                  options={COUNTRIES}
                  label="País de nacimiento"
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
                {guardianCountry === "Colombia" ? (
                  <ComboBox
                    value={guardianDepartment}
                    onChange={(value) =>
                      setFieldValue("guardian_department", value, {
                        shouldDirty: true,
                      })
                    }
                    options={COLOMBIA_DEPARTMENTS}
                    label="Departamento"
                    disabled={
                      guardianType === "Padre" || guardianType === "Madre"
                    }
                    required={guardianType === "Otro"}
                  />
                ) : (
                  <FormInput
                    label="Departamento"
                    name="guardian_department"
                    register={register}
                    disabled={
                      guardianType === "Padre" || guardianType === "Madre"
                    }
                    required={guardianType === "Otro"}
                  />
                )}
                {guardianCountry === "Colombia" &&
                guardianDepartment === "Atlántico" ? (
                  <ComboBox
                    value={guardianCity}
                    onChange={(value) =>
                      setFieldValue("guardian_city", value, {
                        shouldDirty: true,
                      })
                    }
                    options={ATLANTICO_CITIES}
                    label="Ciudad"
                    disabled={
                      guardianType === "Padre" || guardianType === "Madre"
                    }
                    required={guardianType === "Otro"}
                  />
                ) : (
                  <FormInput
                    label="Ciudad"
                    name="guardian_city"
                    register={register}
                    disabled={
                      guardianType === "Padre" || guardianType === "Madre"
                    }
                    required={guardianType === "Otro"}
                  />
                )}

                <FormSelect
                  label="Religión"
                  name="guardian_religion"
                  register={register}
                  options={RELIGIONS}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
              </>
            )}

            <ComboBox
              value={guardianResidenceCountry}
              onChange={(value) =>
                setFieldValue("guardian_residence_country", value, {
                  shouldDirty: true,
                })
              }
              options={COUNTRIES}
              label={
                guardianType === "Empresa" ? "País de la sede" : "País de Residencia"
              }
              disabled={guardianType === "Padre" || guardianType === "Madre"}
              required={guardianType === "Otro" || guardianType === "Empresa"}
            />
            {guardianResidenceCountry === "Colombia" ? (
              <ComboBox
                value={guardianResidenceDepartment}
                onChange={(value) =>
                  setFieldValue("guardian_residence_department", value, {
                    shouldDirty: true,
                  })
                }
                options={COLOMBIA_DEPARTMENTS}
                label="Departamento"
                disabled={
                  guardianType === "Padre" || guardianType === "Madre"
                }
                required={
                  guardianType === "Otro" || guardianType === "Empresa"
                }
              />
            ) : (
              <FormInput
                label="Departamento"
                name="guardian_residence_department"
                register={register}
                disabled={
                  guardianType === "Padre" || guardianType === "Madre"
                }
                required={guardianType === "Otro"}
              />
            )}
            {guardianResidenceCountry === "Colombia" &&
            guardianResidenceDepartment === "Atlántico" ? (
              <ComboBox
                value={guardianResidenceCity}
                onChange={(value) =>
                  setFieldValue("guardian_residence_city", value, {
                    shouldDirty: true,
                  })
                }
                options={ATLANTICO_CITIES}
                label="Ciudad"
                disabled={
                  guardianType === "Padre" || guardianType === "Madre"
                }
                required={guardianType === "Otro"}
              />
            ) : (
              <FormInput
                label="Ciudad"
                name="guardian_residence_city"
                register={register}
                disabled={
                  guardianType === "Padre" || guardianType === "Madre"
                }
                required={guardianType === "Otro"}
              />
            )}
            {guardianResidenceCity === "Barranquilla" ? (
              <>
                <ComboBox
                  value={guardianResidenceBarrioValue}
                  onChange={(value) =>
                    setFieldValue("guardian_residence_barrio", value, {
                      shouldDirty: true,
                    })
                  }
                  options={BARRIOS_BARRANQUILLA}
                  label="Barrio"
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
                {guardianResidenceBarrioValue === "Otro" && (
                  <FormInput
                    label="Especifique el barrio"
                    name="guardian_otro_barrio"
                    register={register}
                    disabled={
                      guardianType === "Padre" || guardianType === "Madre"
                    }
                  />
                )}
              </>
            ) : (
              <FormInput
                label="Barrio"
                name="guardian_residence_barrio"
                register={register}
                disabled={
                  guardianType === "Padre" || guardianType === "Madre"
                }
                required={guardianType === "Otro"}
              />
            )}
            <FormInput
              label={
                guardianType === "Empresa"
                  ? "Dirección de la sede"
                  : "Dirección de Residencia"
              }
              name="guardian_residence_address"
              register={register}
              disabled={guardianType === "Padre" || guardianType === "Madre"}
              required={guardianType === "Otro" || guardianType === "Empresa"}
            />
            <FormInput
              label="Complemento (Apto, Torre)"
              name="guardian_residence_address_complement"
              register={register}
              disabled={guardianType === "Padre" || guardianType === "Madre"}
            />
            {/* Estrato - Solo para personas naturales */}
            {guardianType !== "Empresa" && (
              <FormSelect
                label="Estrato"
                name="guardian_residence_stratum"
                register={register}
                options={ESTRATOS}
                disabled={
                  guardianType === "Padre" || guardianType === "Madre"
                }
                required={guardianType === "Otro"}
              />
            )}

            {guardianType === "Otro" && (
              <FormInput
                label="Parentesco"
                name="guardian_relationship"
                register={register}
                required={true}
              />
            )}

            {/* Información Laboral del Acudiente - Solo para personas naturales */}
            {guardianType !== "Empresa" && (
              <>
                <FormInput
                  label="Profesión"
                  name="guardian_profession"
                  register={register}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
                <FormInput
                  label="Nombre Empresa donde Labora"
                  name="guardian_company_name"
                  register={register}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
                <FormInput
                  label="Dirección Empresa donde Labora"
                  name="guardian_company_address"
                  register={register}
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
                <FormInput
                  label="Número de contacto laboral"
                  name="guardian_work_phone"
                  type="tel"
                  register={register}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  disabled={
                    guardianType === "Padre" || guardianType === "Madre"
                  }
                  required={guardianType === "Otro"}
                />
              </>
            )}

            {(guardianType === "Otro" || guardianType === "Empresa") && (
              <>
                <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-2 mb-1">
                  <div className="alert alert-info py-2">
                    <span className="text-sm">
                      Segundo firmante para documentos (Contrato, Pagaré y Hoja de matrícula)
                    </span>
                  </div>
                </div>
                <FormSelect
                  label="¿Quién firma como segunda persona?"
                  name="guardian_second_signer"
                  register={register}
                  options={["Madre", "Padre", "No aplica"]}
                  required={true}
                />
              </>
            )}
          </div>
        </SectionCard>

        {/* Botones de navegación */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={back}
            className="btn btn-outline btn-primary w-full sm:w-auto"
          >
            Atrás
          </button>
          <button type="submit" className="btn btn-primary w-full sm:w-auto">
            Siguiente
          </button>
        </div>

        {/* Modal de Advertencia Legal */}
        <Alert
          isOpen={showLegalModal}
          onClose={handleDeclineLegal}
          onAccept={handleAcceptLegal}
          title="Autorización y Consentimiento – Oficialización de Matrícula"
          variant="warning"
          acceptText="ACEPTO"
          cancelText="Cancelar"
          acceptButtonClassName="bg-primary hover:bg-primary/80 text-white"
          requireScrollToBottom={true}
        >
          <p className="text-justify">
            Al hacer clic en el botón <strong>"ACEPTO"</strong>, yo{" "}
            <strong>
              {legalModalSnapshot.guardian_full_name ||
                [
                  legalModalSnapshot.guardian_firstname1,
                  legalModalSnapshot.guardian_firstname2,
                  legalModalSnapshot.guardian_lastname1,
                  legalModalSnapshot.guardian_lastname2,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                "[NOMBRE COMPLETO]"}
            </strong>
            , identificado(a) con{" "}
            <strong>{legalModalSnapshot.guardian_document_type || "[TIPO]"}</strong> No.{" "}
            <strong>{legalModalSnapshot.guardian_id_number || "[NÚMERO]"}</strong>, quien
            realiza el proceso de matrícula del(la) estudiante{" "}
            <strong>
              {[
                legalModalSnapshot.student_firstname1,
                legalModalSnapshot.student_firstname2,
                legalModalSnapshot.student_lastname1,
                legalModalSnapshot.student_lastname2,
              ]
                .filter(Boolean)
                .join(" ") || "[NOMBRE DEL ESTUDIANTE]"}
            </strong>{" "}
            (<strong>{legalModalSnapshot.student_id_type || "[TI/RC/CC]"}</strong> No.{" "}
            <strong>{legalModalSnapshot.student_id_number || "[NÚMERO]"}</strong>), declaro
            que actúo como padre/madre/acudiente y/o responsable y que cuento
            con autorización suficiente para adelantar este trámite y
            cargar/anexar en la plataforma los documentos requeridos, incluidos
            los de otros responsables vinculados al proceso (padre, madre,
            acudiente, responsable financiero u otros), asumiendo la
            responsabilidad por la veracidad de la información y por contar con
            las autorizaciones que correspondan cuando aplique.
          </p>
          <p className="text-justify">
            Asimismo,{" "}
            <strong>
              AUTORIZO Y OTORGO CONSENTIMIENTO PREVIO, EXPRESO E INFORMADO
            </strong>{" "}
            a Gimnasio El Paraíso para utilizar firma electrónica por aceptación
            (clic "ACEPTO") y, cuando aplique, validación biométrica (huella),
            exclusivamente para la identificación, aceptación y oficialización
            de los documentos del proceso de matrícula (formulario/acta de
            matrícula, contrato de prestación del servicio educativo, anexos,
            autorizaciones institucionales y soportes administrativos
            asociados).
          </p>
          <p className="text-justify">
            Entiendo que este consentimiento se otorga conforme a la normativa
            colombiana aplicable, incluyendo la Ley 527 de 1999, el Decreto 2364
            de 2012 y la Ley 1581 de 2012. He sido informado(a) de mis derechos
            como titular de datos personales (conocer, actualizar, rectificar,
            solicitar prueba de la autorización y revocar el consentimiento
            cuando proceda).
          </p>
          <p className="text-justify">
            Huella/biometría: reconozco que corresponde a un dato sensible. Su
            autorización es opcional y la institución dispondrá de un mecanismo
            alterno no biométrico, por lo que la matrícula no se condiciona
            exclusivamente al suministro de huella. Si la autorizo, será solo
            para la finalidad indicada y bajo medidas de seguridad.
          </p>
          <p className="text-justify">
            Autorizo que la institución conserve y custodie evidencias de
            trazabilidad del proceso de aceptación (por ejemplo: fecha y hora,
            usuario/correo, registros de plataforma y demás soportes técnicos)
            para respaldo administrativo y legal. Cuando el(la) estudiante sea
            menor de edad, el tratamiento de datos se realizará respetando el
            interés superior y los derechos prevalentes de los niños, niñas y
            adolescentes.
          </p>
        </Alert>
      </div>
    </form>
  );
};

// --- SELECTS DEPENDIENTES ---
const ATLANTICO_CITIES = [
  "Barranquilla",
  "Baranoa",
  "Campo de la Cruz",
  "Candelaria",
  "Galapa",
  "Juan de Acosta",
  "Luruaco",
  "Malambo",
  "Manatí",
  "Palmar de Varela",
  "Piojó",
  "Polonuevo",
  "Ponedera",
  "Puerto Colombia",
  "Repelón",
  "Sabanagrande",
  "Sabanalarga",
  "Santa Lucía",
  "Santo Tomás",
  "Soledad",
  "Suan",
  "Tubará",
  "Usiacurí",
];

const DepartmentSelect = ({ label, name, value, onChange, disabled }: any) => (
  <FormSelect
    label={label || "Departamento"}
    name={name}
    value={value}
    onChange={onChange}
    options={COLOMBIA_DEPARTMENTS}
    disabled={disabled}
  />
);

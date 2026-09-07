/** Tipos del módulo de admisiones (espejo de los serializers del backend). */

/** Fila del listado — `ApplicationListSerializer`. */
export interface AdmissionApplicationRow {
  code: string;
  applicant_name: string;
  grade_name: string;
  academic_year: number;
  status: string;
  status_label: string;
  submitted_at: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

/** Detalle — `ApplicationDetailSerializer`. */
export interface AdmissionApplicant {
  id: number;
  full_name: string;
  first_name1: string;
  first_name2: string;
  last_name1: string;
  last_name2: string;
  id_type: string;
  id_number: string;
  birth_date: string | null;
  sex: string;
  birth_city: string;
  birth_department: string;
  birth_country: string;
  nationality: string;
}

export interface AdmissionApplication {
  code: string;
  applicant: AdmissionApplicant;
  academic_year: number;
  grade_applied: number;
  grade_name: string;
  aspirant_type: string;
  route: string;
  status: string;
  status_label: string;
  data: Record<string, Record<string, unknown>>;
  /**
   * Contador de versión por sección (concurrencia optimista, Paso 4 del backend —
   * docs/plan-admisiones-ui-rhf-acordeon.md). Una sección ausente cuenta como
   * versión 0. Se envía de vuelta en el PATCH (`versions: { <section>: n }`) para
   * detectar si otra pestaña/dispositivo guardó esa sección primero (409
   * `section_version_conflict`, ver Paso 5).
   */
  data_versions?: Record<string, number>;
  correction_comment: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  /** Solo llega a quien tiene `canViewAdmissions` (el acudiente nunca lo recibe). */
  internal?: {
    assigned_to: string | null;
    alert_health: boolean;
    alert_psychopedagogical: boolean;
    owner_email: string;
  };
  /** Resultado público de la decisión (lo ve también el acudiente). */
  result?: {
    decision: string;
    decision_label: string;
    conditions: string;
    message_public: string;
    decided_at: string | null;
  };
}

/** Estados en los que el acudiente todavía puede editar (espejo de EDITABLE_BY_GUARDIAN). */
export const EDITABLE_STATUSES = [
  "PRE_REGISTRO_INICIADO",
  "SOLICITUD_EN_DILIGENCIAMIENTO",
  "DEVUELTA_PARA_CORRECCION",
] as const;

export const isEditable = (status: string) =>
  (EDITABLE_STATUSES as readonly string[]).includes(status);

/** Estados del tramo de pago (P8). */
const PAYMENT_FLOW = [
  "PENDIENTE_PAGO",
  "PAGO_REPORTADO",
  "PAGO_RECHAZADO",
  "PAGO_VALIDADO",
  "EXENTO_PAGO",
];

/** Estados del tramo de documentos (P9). */
const DOCUMENT_FLOW = [
  "PENDIENTE_DOCUMENTOS",
  "DOCUMENTOS_EN_REVISION",
  "DOCUMENTOS_COMPLETOS",
];

/** El pago sigue visible cuando ya se avanzó a documentos (para poder consultarlo). */
export const showsPayment = (status: string) =>
  PAYMENT_FLOW.includes(status) || DOCUMENT_FLOW.includes(status);

export const showsDocuments = (status: string) => DOCUMENT_FLOW.includes(status);

/** Estados del tramo de agenda + evaluación (P10–P13). */
const EVALUATION_FLOW = [
  "PENDIENTE_AGENDA",
  "CITA_PROGRAMADA",
  "CITA_REALIZADA",
  "ENTREVISTA_REGISTRADA",
  "DIAGNOSTICO_REGISTRADO",
  "REVISION_PSICOPEDAGOGICA",
  "REQUIERE_NUEVA_VALORACION",
  "COMITE_ADMISION",
];

/** El acudiente ve sus citas desde que hay agenda hasta que se decide. */
export const showsInterviews = (status: string) => EVALUATION_FLOW.includes(status);

/** Tipos de documento del aspirante (espejo de `IdDocType`). */
export const ID_DOC_TYPES = [
  { value: "RC", label: "Registro civil" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PP", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
] as const;

export const SEXES = [
  { value: "FEMENINO", label: "Femenino" },
  { value: "MASCULINO", label: "Masculino" },
] as const;

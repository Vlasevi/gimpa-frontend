/** Tipos del módulo de admisiones (espejo de los serializers del backend). */

/** Evento del historial (`history_service.events` del backend). */
export interface AdmissionHistoryEvent {
  at: string;
  kind: "created" | "consent" | "status" | "correction" | "resubmitted" | "assigned" | "activity";
  status?: string;
  title: string;
  by: string | null;
  note: string | null;
  items: string[];
  tone: "neutral" | "info" | "success" | "warning" | "error";
}

/** Formato y tamaño máximo de un archivo (`admissions/documents.py`). */
export interface FileRule {
  accept: string;
  max_mb: number;
  hint: string;
}

/** Aviso si el archivo no cumple la regla (`null` si está bien). */
export function fileRuleError(file: File, rule: FileRule | undefined): string | null {
  if (!rule) return null;
  const types = rule.accept.split(",");
  if (file.type && !types.includes(file.type)) return `Formato no permitido: ${rule.hint}.`;
  if (file.size > rule.max_mb * 1024 * 1024) return `El archivo pesa más de ${rule.max_mb} MB.`;
  return null;
}

/** Fila del listado — `ApplicationListSerializer`. */
export interface AdmissionApplicationRow {
  id: number;
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
  /** Actividades de la valoración asignadas a quien consulta y aún sin completar. */
  my_pending: { kind: string; label: string; scheduled_at: string | null }[];
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
  id: number;
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
  /** Etapas que el colegio ya habilitó alguna vez (se calculan del historial en el
   * backend: el orden pago/documentos lo decide el colegio y puede saltarse etapas). */
  reached_stages: GuardianStage[];
  /** Corrección pedida por el colegio y aún sin reenviar: qué secciones (`residence`…) y
   * qué documentos (`BOLETIN`…) corregir. El comentario solo llega por correo. */
  open_correction?: { sections: string[]; documents: string[] } | null;
  /** Solo staff: la línea de tiempo del expediente y lo que sigue (pestaña Resumen). */
  history?: AdmissionHistoryEvent[];
  next_step?: string | null;
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

/** Etapas del acudiente que el colegio habilita (espejo de `STAGE_STATUSES` del backend). */
export type GuardianStage = "pago" | "documentos" | "entrevistas";

const STAGE_STATUSES: Record<GuardianStage, readonly string[]> = {
  pago: ["PENDIENTE_PAGO", "PAGO_REPORTADO", "PAGO_RECHAZADO", "PAGO_VALIDADO", "EXENTO_PAGO"],
  documentos: ["PENDIENTE_DOCUMENTOS", "DOCUMENTOS_EN_REVISION", "DOCUMENTOS_COMPLETOS"],
  entrevistas: [
    "PENDIENTE_AGENDA",
    "EN_VALORACION",
    "COMITE_ADMISION",
    "PENDIENTE_DECISION",
    "REQUIERE_NUEVA_VALORACION",
  ],
};

/** Etapa en la que está la solicitud ahora mismo (`null`: formulario, validación o decisión). */
export const currentStage = (status: string): GuardianStage | null =>
  (Object.keys(STAGE_STATUSES) as GuardianStage[]).find((stage) =>
    STAGE_STATUSES[stage].includes(status),
  ) ?? null;

/** Pago de inscripción — `GET /api/admissions/<id>/payment/`. */
export interface BankAccount {
  bank: string;
  account_type: string;
  account_number: string;
  holder: string;
  holder_id: string;
}

export interface PaymentInfo {
  status: string;
  rule?: FileRule;
  status_label?: string;
  amount: string;
  bank_account: BankAccount;
  has_receipt?: boolean;
  receipt_url?: string | null;
  admin_note?: string | null;
}

/** Valor en pesos, sin decimales: "$ 90.000". */
export const formatCop = (amount: string | number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(amount));

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

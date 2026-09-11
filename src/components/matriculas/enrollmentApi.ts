/**
 * Cliente y tipos de la API de Matrícula v2 (backend: `enrollment/urls.py`,
 * `docs/plan-matricula-v2.md`).
 *
 * Todas las llamadas pasan por `request()`: devuelve el JSON o lanza `ApiError` con el
 * mensaje del backend (`error`), un `code` estable y, si aplica, `errors` por campo
 * (`{"student.id_number": "Campo obligatorio."}`). El Bearer lo agrega el interceptor
 * global (`utils/authInterceptor`).
 */

import { apiUrl, buildHeaders } from "@/utils/api";

// ---------------------------------------------------------------------------- Tipos

export type EnrollmentStatus =
  | "CREATED"
  | "DRAFT"
  | "RETURNED"
  | "SUBMITTED"
  | "ACTIVE"
  | "REJECTED"
  | "CANCELLED"
  | "INACTIVE";

export type DocumentStatus = "MISSING" | "UPLOADED" | "APPROVED" | "REJECTED" | "NOT_APPLICABLE";

export type EnrollmentOrigin = "ADMISSION" | "NEW" | "RENEWAL";
export type InactiveReason = "SUPERSEDED" | "WITHDRAWN" | "GRADUATED";

export interface GradeInfo {
  id: number;
  name: string;
  description: string | null;
  label: string;
  level: "PREESCOLAR" | "PRIMARIA" | "SECUNDARIA" | "MEDIA" | null;
  order: number | null;
}

export interface EnrollmentDocument {
  key: string;
  label: string;
  kind: "photo" | "signed" | "family";
  sensitivity: "normal" | "medical" | "sensitive";
  status: DocumentStatus;
  required: boolean;
  has_file: boolean;
  original_name: string | null;
  content_type: string | null;
  size: number | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  /** Solo en la vista del estudiante. */
  can_upload?: boolean;
}

export interface RejectedDocument {
  key: string;
  label: string;
  reason: string | null;
}

export interface Correction {
  id: number;
  comment: string;
  rejected_documents: RejectedDocument[];
  requested_by: string | null;
  requested_at: string;
  resolved_at: string | null;
}

/** Ficha del estudiante (esquema v1 por secciones, `core/student_profile.py`). */
export type StudentProfile = Record<string, unknown>;

/** `GET /api/enrollments/me/` → `enrollment`. Los campos presentes dependen del estado. */
export interface StudentEnrollment {
  id: number;
  academic_year: number;
  grade: GradeInfo;
  status: EnrollmentStatus;
  status_label: string;
  origin: EnrollmentOrigin;
  is_editable: boolean;
  enrollment_date: string;
  updated_at: string;
  // Editables (CREATED / DRAFT / RETURNED)
  data?: StudentProfile;
  data_schema_version?: number;
  progress?: { data_saved: boolean; signed: boolean };
  correction?: Correction | null;
  // Con documentos (editables, SUBMITTED, ACTIVE)
  documents?: EnrollmentDocument[];
  pending_documents?: string[];
  has_pending_documents?: boolean;
  submitted_at?: string | null;
  approved_at?: string | null;
  // Cerradas
  closed_reason?: string | null;
  closed_at?: string | null;
  inactive_reason?: InactiveReason | null;
  inactive_reason_label?: string | null;
}

export interface OtherPendingEnrollment {
  id: number;
  academic_year: number;
  grade: string;
  pending_count: number;
}

export interface MyEnrollmentResponse {
  enrollment: StudentEnrollment | null;
  message: string;
  /** Solo en `GET me`: otras matrículas aprobadas con documentos pendientes. */
  other_pending?: OtherPendingEnrollment[];
}

export interface StudentSummary {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

export interface EnrollmentListItem {
  id: number;
  student: StudentSummary;
  student_name: string;
  grade: GradeInfo;
  academic_year: number;
  status: EnrollmentStatus;
  status_label: string;
  origin: EnrollmentOrigin;
  origin_label: string;
  inactive_reason: InactiveReason | null;
  enrollment_date: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  closed_at: string | null;
  has_pending_documents: boolean;
  pending_documents: string[];
}

export type StaffAction =
  | "approve"
  | "return"
  | "reject"
  | "cancel"
  | "inactivate"
  | "reactivate"
  | "review_documents"
  | "change_grade";

export interface EnrollmentDetail extends EnrollmentListItem {
  data: StudentProfile;
  data_schema_version: number;
  documents: EnrollmentDocument[];
  corrections: Correction[];
  approved_by: string | null;
  closed_reason: string | null;
  closed_by: string | null;
  allowed_actions: StaffAction[];
  profile_errors: Record<string, string>;
}

export interface SignatureRect {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type UnsignedKind = "contrato" | "pagare" | "hoja_matricula";

export interface SignatureLayout {
  signers: { key: string; label: string }[];
  signatureFields: Record<UnsignedKind, Record<string, SignatureRect>>;
}

export interface BulkRenewalRow {
  student_id: number;
  email: string;
  name: string;
  from_grade: string;
  to_grade?: string;
  enrollment_id?: number;
  reason?: string;
}

export interface BulkRenewalResult {
  created: BulkRenewalRow[];
  skipped: BulkRenewalRow[];
  dry_run: boolean;
}

// ---------------------------------------------------------------------------- Errores

export class ApiError extends Error {
  status: number;
  code: string;
  errors: Record<string, string>;

  constructor(message: string, status: number, code = "error", errors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

const NETWORK_ERROR = "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";

async function request<T>(path: string, init: RequestInit = {}, { json = true } = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: buildHeaders(init.headers ?? {}, !isForm && init.body !== undefined),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, 0, "network");
  }

  if (!response.ok) {
    let body: { error?: string; detail?: string; code?: string; errors?: Record<string, string> } | null = null;
    try {
      body = await response.json();
    } catch {
      /* respuesta sin JSON */
    }
    const message =
      body?.error ||
      body?.detail ||
      (response.status === 403
        ? "No tienes permisos para esta acción."
        : "No se pudo completar la acción. Intenta de nuevo.");
    throw new ApiError(message, response.status, body?.code ?? "error", body?.errors ?? {});
  }

  if (!json) return response as unknown as T;
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

// ---------------------------------------------------------------------------- Rutas

const E = "/api/enrollments";

export const enrollmentApi = {
  // Estudiante
  me: () => request<MyEnrollmentResponse>(`${E}/me/`),
  /** Otra matrícula del propio estudiante (misma forma que `me`, según su estado). */
  studentDetail: (id: number) => request<MyEnrollmentResponse>(`${E}/${id}/`),
  requestOtp: () =>
    post<{ message: string; masked_email: string; expires_in_minutes: number }>(`${E}/request-otp/`),
  validateOtp: (code: string) =>
    post<{ valid: boolean; message: string }>(`${E}/validate-otp/`, { code }),

  /** Guarda ficha + fotos (paso 3 → 4). `photos`: archivos nuevos por key. */
  saveData: (
    id: number,
    data: StudentProfile,
    photos: Partial<Record<"student_photo" | "father_photo" | "mother_photo", File>>,
    removePhotos: string[],
  ) => {
    const form = new FormData();
    form.append("data", JSON.stringify(data));
    form.append("remove_photos", JSON.stringify(removePhotos));
    for (const [key, file] of Object.entries(photos)) if (file) form.append(key, file);
    return request<MyEnrollmentResponse>(`${E}/${id}/data/`, { method: "PUT", body: form });
  },

  /** PDF sin firmar, en binario (plan 15.3). */
  unsignedPdf: async (id: number, kind: UnsignedKind): Promise<Uint8Array> => {
    const response = await request<Response>(`${E}/${id}/pdfs/${kind}/`, {}, { json: false });
    return new Uint8Array(await response.arrayBuffer());
  },
  signatureLayout: (id: number) => request<SignatureLayout>(`${E}/${id}/pdfs/layout/`),
  uploadSigned: (id: number, files: Record<"contrato_signed" | "pagare_signed" | "hoja_matricula_signed", Blob>) => {
    const form = new FormData();
    for (const [key, blob] of Object.entries(files)) form.append(key, blob, `${key}.pdf`);
    return request<MyEnrollmentResponse>(`${E}/${id}/signed/`, { method: "POST", body: form });
  },
  submit: (id: number) => post<MyEnrollmentResponse>(`${E}/${id}/submit/`),

  // Documentos (estudiante y staff)
  documentUrl: (id: number, key: string) => request<{ url: string }>(`${E}/${id}/documents/${key}/`),
  uploadDocument: (id: number, key: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ document: EnrollmentDocument | null; status: DocumentStatus }>(
      `${E}/${id}/documents/${key}/`,
      { method: "POST", body: form },
    );
  },
  deleteDocument: (id: number, key: string) =>
    request<{ message: string }>(`${E}/${id}/documents/${key}/`, { method: "DELETE" }),
  reviewDocument: (id: number, key: string, status: DocumentStatus, reason?: string) =>
    post<{ key: string; status: DocumentStatus; reject_reason: string | null }>(
      `${E}/${id}/documents/${key}/review/`,
      { status, reason },
    ),

  // Staff
  list: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    const qs = query.toString();
    return request<EnrollmentListItem[]>(`${E}/${qs ? `?${qs}` : ""}`);
  },
  detail: (id: number) => request<EnrollmentDetail>(`${E}/${id}/`),
  create: (body: { student_email: string; grade_id: number; academic_year: number; origin?: EnrollmentOrigin }) =>
    post<EnrollmentDetail>(`${E}/`, body),
  changeGrade: (id: number, gradeId: number) =>
    request<EnrollmentDetail>(`${E}/${id}/`, { method: "PATCH", body: JSON.stringify({ grade_id: gradeId }) }),
  remove: (id: number) => request<void>(`${E}/${id}/`, { method: "DELETE" }),
  approve: (id: number) => post<EnrollmentDetail>(`${E}/${id}/approve/`),
  returnForCorrection: (id: number, comment: string, rejected: { key: string; reason: string }[]) =>
    post<EnrollmentDetail>(`${E}/${id}/return/`, { comment, rejected_documents: rejected }),
  reject: (id: number, reason: string) => post<EnrollmentDetail>(`${E}/${id}/reject/`, { reason }),
  cancel: (id: number, reason: string) => post<EnrollmentDetail>(`${E}/${id}/cancel/`, { reason }),
  inactivate: (id: number, inactiveReason: "WITHDRAWN" | "GRADUATED", reason: string) =>
    post<EnrollmentDetail>(`${E}/${id}/inactivate/`, { inactive_reason: inactiveReason, reason }),
  reactivate: (id: number) => post<EnrollmentDetail>(`${E}/${id}/reactivate/`),
  bulkRenewal: (fromYear: number, toYear: number, dryRun: boolean) =>
    post<BulkRenewalResult>(`${E}/bulk-renewal/`, { from_year: fromYear, to_year: toYear, dry_run: dryRun }),
  grades: () => request<GradeInfo[]>("/api/grades/"),
};

/** Abre un documento en otra pestaña pidiendo antes su URL firmada (1 hora). Se abre
 * la pestaña en el mismo gesto del usuario para que el navegador no la bloquee. */
export async function openDocument(enrollmentId: number, key: string) {
  const tab = window.open("about:blank", "_blank");
  try {
    const { url } = await enrollmentApi.documentUrl(enrollmentId, key);
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

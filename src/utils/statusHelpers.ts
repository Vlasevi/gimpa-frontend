/**
 * Etiquetas y colores de los estados de matrícula y de sus documentos (Matrícula v2).
 * Espejo de `Enrollment.EnrollmentStatus` y de los estados por documento del backend
 * (`enrollment/documents.py`). Los estados de admisiones los pinta
 * `admisiones/StatusBadge.tsx`.
 */

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: "Creada",
  DRAFT: "En diligenciamiento",
  RETURNED: "Devuelta para corrección",
  SUBMITTED: "En revisión",
  ACTIVE: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  INACTIVE: "Inactiva",
};

const ENROLLMENT_STATUS_BADGES: Record<string, string> = {
  CREATED: "badge-ghost",
  DRAFT: "badge-info badge-soft",
  RETURNED: "badge-warning",
  SUBMITTED: "badge-info",
  ACTIVE: "badge-success",
  REJECTED: "badge-error",
  CANCELLED: "badge-error badge-soft",
  INACTIVE: "badge-neutral badge-soft",
};

/** Orden para filtros y resúmenes (el del recorrido de una matrícula). */
export const ENROLLMENT_STATUS_ORDER = [
  "CREATED",
  "DRAFT",
  "RETURNED",
  "SUBMITTED",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "CANCELLED",
] as const;

export const getStatusLabel = (status: string): string => ENROLLMENT_STATUS_LABELS[status] ?? status;

export const getStatusBadgeClass = (status: string): string =>
  ENROLLMENT_STATUS_BADGES[status] ?? "badge-ghost";

export const INACTIVE_REASON_LABELS: Record<string, string> = {
  SUPERSEDED: "Otra matrícula activada",
  WITHDRAWN: "Retiro",
  GRADUATED: "Egresado",
};

export const ORIGIN_LABELS: Record<string, string> = {
  ADMISSION: "Admisión",
  NEW: "Estudiante nuevo",
  RENEWAL: "Renovación",
};

// ------------------------------------------------------------------ Documentos

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  MISSING: "Pendiente de subir",
  UPLOADED: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  NOT_APPLICABLE: "No aplica",
};

const DOCUMENT_STATUS_BADGES: Record<string, string> = {
  MISSING: "badge-warning badge-soft",
  UPLOADED: "badge-info badge-soft",
  APPROVED: "badge-success badge-soft",
  REJECTED: "badge-error badge-soft",
  NOT_APPLICABLE: "badge-ghost",
};

export const getDocumentStatusLabel = (status: string): string =>
  DOCUMENT_STATUS_LABELS[status] ?? status;

export const getDocumentStatusBadgeClass = (status: string): string =>
  DOCUMENT_STATUS_BADGES[status] ?? "badge-ghost";

/** Un requerido está resuelto si fue aprobado o marcado como "no aplica". */
export const isDocumentResolved = (status: string) => status === "APPROVED" || status === "NOT_APPLICABLE";

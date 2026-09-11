/**
 * Utilidades del panel de staff de Matrículas (fechas en hora de Colombia, mensajes de
 * error de la API y el tipo del toast que se pasa a los subcomponentes).
 */

import { ApiError, type EnrollmentDetail } from "@/components/matriculas/enrollmentApi";
import {
  getText,
  PROFILE_SECTIONS,
  relocateGuardianErrors,
  sectionOfPath,
  todayInBogota,
  type SectionId,
} from "@/components/matriculas/profileSchema";
import type { ToastVariant } from "@/hooks/use-toast";

/** `flash()` de `useToast()`, pasado hacia abajo. */
export type FlashFn = (type: ToastVariant, msg: string) => void;

const TIME_ZONE = "America/Bogota";

const DATE = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE.format(date) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE_TIME.format(date) : "—";
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Año calendario actual en Colombia. */
export function currentYear(): number {
  return Number(todayInBogota().slice(0, 4));
}

export function errorMessage(
  error: unknown,
  fallback = "No se pudo completar la acción. Intenta de nuevo.",
): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Límite de subida del backend (`documents.MAX_UPLOAD_BYTES`). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// ------------------------------------------------------------------ Datos incompletos

export interface ProfileIssue {
  path: string;
  sectionId: SectionId | null;
  /** "Estudiante · Número de documento" */
  label: string;
  message: string;
}

function fieldLabel(path: string, detail: EnrollmentDetail): string {
  if (path.startsWith("photos.")) {
    const key = path.slice("photos.".length);
    return detail.documents.find((doc) => doc.key === key)?.label ?? "Foto";
  }
  for (const section of PROFILE_SECTIONS) {
    for (const field of section.fields) {
      if (field.type === "geo-cascade" && path.startsWith(field.prefix)) return field.label;
      if ("name" in field && field.name === path) return field.label.replace(" (opcional)", "");
    }
  }
  return path;
}

/** `profile_errors` del backend con etiquetas legibles. Los errores del acudiente cuando
 * es el padre o la madre se muestran en la sección de esa persona (de ahí salen). */
export function profileIssues(detail: EnrollmentDetail): ProfileIssue[] {
  const errors = relocateGuardianErrors(detail.profile_errors ?? {}, getText(detail.data, "guardian.type"));
  return Object.entries(errors).map(([path, message]) => {
    const sectionId = sectionOfPath(path);
    const section = PROFILE_SECTIONS.find((s) => s.id === sectionId);
    const label = fieldLabel(path, detail);
    return { path, sectionId, label: section ? `${section.title} · ${label}` : label, message };
  });
}

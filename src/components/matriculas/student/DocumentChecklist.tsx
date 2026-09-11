/**
 * Lista de documentos de la familia de una matrícula, con su estado (plan §12).
 *
 * La pinta la metadata que ya trae `GET /api/enrollments/me/` (hallazgo #3): no hay una
 * llamada aparte para listar. Ver un archivo pide su URL firmada a demanda; subir sube
 * ese documento de inmediato (plan 15.2: cada paso guarda lo suyo).
 *
 * Se usa en el paso 5 del asistente y en la pestaña "Documentos" de una matrícula
 * aprobada con pendientes (sin OTP, decisión 14). Qué se puede subir lo decide el
 * backend (`can_upload`).
 */

import { useRef, useState } from "react";
import { CheckCircle2, Eye, FileText, Loader2, Upload } from "lucide-react";

import {
  ApiError,
  enrollmentApi,
  openDocument,
  type EnrollmentDocument,
} from "@/components/matriculas/enrollmentApi";
import { getDocumentStatusBadgeClass, getDocumentStatusLabel } from "@/utils/statusHelpers";
import type { FlashFn } from "./types";

const ACCEPT = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";
const MAX_BYTES = 10 * 1024 * 1024;

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function DocumentRow({
  enrollmentId,
  doc,
  onUploaded,
  flash,
}: {
  enrollmentId: number;
  doc: EnrollmentDocument;
  onUploaded: (doc: EnrollmentDocument) => void;
  flash: FlashFn;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = `doc-${doc.key}-error`;

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError("El archivo pesa más de 10 MB. Comprímelo o escanéalo con menos resolución.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { document } = await enrollmentApi.uploadDocument(enrollmentId, doc.key, file);
      if (document) onUploaded(document);
      flash("success", `${doc.label}: documento subido`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo subir el documento.");
    } finally {
      setUploading(false);
    }
  };

  const view = async () => {
    setOpening(true);
    try {
      await openDocument(enrollmentId, doc.key);
    } catch (e) {
      flash("error", e instanceof ApiError ? e.message : "No se pudo abrir el documento.");
    } finally {
      setOpening(false);
    }
  };

  const needsAction = doc.status === "MISSING" || doc.status === "REJECTED";

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center ${
        doc.status === "REJECTED" ? "border-error/40 bg-error/5" : "border-base-300 bg-base-100"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            doc.status === "APPROVED" ? "bg-success/10 text-success" : "bg-base-200 text-base-content/50"
          }`}
          aria-hidden="true"
        >
          {doc.status === "APPROVED" ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-base-content">
            {doc.label}
            {!doc.required && <span className="ml-2 text-xs font-normal text-base-content/50">(opcional)</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
            <span className={`badge badge-sm ${getDocumentStatusBadgeClass(doc.status)}`}>
              {getDocumentStatusLabel(doc.status)}
            </span>
            {doc.has_file && doc.original_name && (
              <span className="max-w-[16rem] truncate" title={doc.original_name}>
                {doc.original_name}
              </span>
            )}
            {doc.uploaded_at && <span>· {formatDate(doc.uploaded_at)}</span>}
          </div>
          {doc.status === "REJECTED" && doc.reject_reason && (
            <p className="mt-2 text-sm text-error">
              <span className="font-semibold">Motivo del rechazo:</span> {doc.reject_reason}
            </p>
          )}
          {error && (
            <p id={errorId} className="mt-2 text-sm font-medium text-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        {doc.has_file && (
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={view}
            disabled={opening}
            aria-label={`Ver ${doc.label}`}
          >
            {opening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            {opening ? "Abriendo…" : "Ver"}
          </button>
        )}
        {doc.can_upload && (
          <>
            <button
              type="button"
              className={`btn btn-sm gap-1.5 ${needsAction ? "btn-primary" : "btn-outline btn-primary"}`}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-describedby={error ? errorId : undefined}
              aria-label={`${doc.has_file ? "Reemplazar" : "Subir"} ${doc.label}`}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              {uploading ? "Subiendo…" : doc.has_file ? "Reemplazar" : "Subir"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </>
        )}
      </div>
    </li>
  );
}

export function DocumentChecklist({
  enrollmentId,
  documents,
  onDocumentChange,
  flash,
  emptyText = "Esta matrícula no pide documentos.",
}: {
  enrollmentId: number;
  documents: EnrollmentDocument[];
  onDocumentChange: (doc: EnrollmentDocument) => void;
  flash: FlashFn;
  emptyText?: string;
}) {
  const family = documents.filter((d) => d.kind === "family");
  const required = family.filter((d) => d.required);
  const optional = family.filter((d) => !d.required);
  const done = required.filter((d) => d.status === "UPLOADED" || d.status === "APPROVED" || d.status === "NOT_APPLICABLE");

  if (family.length === 0) {
    return <p className="text-sm text-base-content/60">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {required.length > 0 && (
        <div className="flex items-center gap-3">
          <progress
            className="progress progress-primary h-2 flex-1"
            value={done.length}
            max={required.length}
            aria-label="Documentos obligatorios entregados"
          />
          <span className="shrink-0 text-sm text-base-content/70">
            {done.length} de {required.length} obligatorios
          </span>
        </div>
      )}
      <ul className="space-y-3" aria-label="Documentos obligatorios">
        {required.map((doc) => (
          <DocumentRow key={doc.key} enrollmentId={enrollmentId} doc={doc} onUploaded={onDocumentChange} flash={flash} />
        ))}
      </ul>
      {optional.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-semibold text-base-content/70">Otros documentos</h3>
          <ul className="space-y-3" aria-label="Otros documentos">
            {optional.map((doc) => (
              <DocumentRow key={doc.key} enrollmentId={enrollmentId} doc={doc} onUploaded={onDocumentChange} flash={flash} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Reemplaza un documento dentro de la lista (tras subirlo). */
export function replaceDocument(documents: EnrollmentDocument[] | undefined, doc: EnrollmentDocument) {
  return (documents ?? []).map((d) => (d.key === doc.key ? doc : d));
}

/**
 * Pestaña "Documentos": fotos, PDF firmados, documentos y documentos médicos, con su estado.
 *
 * - "Documentos médicos" agrupa los de la familia con flag `sensitivity: "medical"` en su
 *   metadata. El backend solo los manda a quien puede verlos (aprobadores y quien tiene
 *   permiso de documentos médicos); si no llega ninguno, la sección no aparece.
 *
 * - Todos: "Ver" (URL firmada, en otra pestaña).
 * - Con `review_documents` (aprobador, matrícula en revisión o activa): aprobar,
 *   rechazar con motivo, "no aplica" y deshacer la revisión (vuelve a "En revisión").
 * - Aprobador: subir o reemplazar el archivo y borrarlo (con confirmación, en el padre).
 *
 * Acciones por fila solo ícono (DESIGN_SYSTEM §5b), con `title` y `aria-label`.
 */

import { useId, useRef, useState, type FormEvent } from "react";
import {
  Ban,
  Check,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Trash2,
  Undo2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

import type { DocumentStatus, EnrollmentDetail, EnrollmentDocument } from "@/components/matriculas/enrollmentApi";
import { ghostBtnClass, iconBtnClass, iconClass, iconHover, labelClass, textareaClass } from "@/components/ui/formStyles";
import {
  cardClass,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  itemTitleClass,
  metaTextClass,
} from "@/components/ui/textStyles";
import {
  getDocumentStatusBadgeClass,
  getDocumentStatusLabel,
  isDocumentResolved,
} from "@/utils/statusHelpers";
import { formatDateTime, formatFileSize, MAX_UPLOAD_BYTES, type FlashFn } from "./shared";

interface Group {
  id: string;
  title: string;
  match: (doc: EnrollmentDocument) => boolean;
  /** Sección con acceso restringido por el flag de sensibilidad. */
  restricted?: boolean;
}

const GROUPS: Group[] = [
  { id: "photo", title: "Fotos", match: (doc) => doc.kind === "photo" },
  { id: "signed", title: "Documentos firmados", match: (doc) => doc.kind === "signed" },
  { id: "family", title: "Documentos", match: (doc) => doc.kind === "family" && doc.sensitivity !== "medical" },
  {
    id: "medical",
    title: "Documentos médicos",
    match: (doc) => doc.kind === "family" && doc.sensitivity === "medical",
    restricted: true,
  },
];

const ACCEPT: Record<EnrollmentDocument["kind"], string> = {
  photo: "image/jpeg,image/png",
  signed: "application/pdf",
  family: "application/pdf,image/jpeg,image/png",
};

type Tone = "primary" | "success" | "error" | "neutral";

function IconAction({
  label,
  title,
  icon: Icon,
  tone,
  onClick,
  disabled,
  expanded,
}: {
  label: string;
  title: string;
  icon: LucideIcon;
  tone: Tone;
  onClick: () => void;
  disabled: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      disabled={disabled}
      className={`${iconBtnClass} ${iconHover[tone]}`}
    >
      <Icon className={iconClass} aria-hidden="true" />
    </button>
  );
}

interface DocumentsTabProps {
  detail: EnrollmentDetail;
  canReview: boolean;
  canUpload: (doc: EnrollmentDocument) => boolean;
  canDelete: boolean;
  /** Documento con una acción en curso. */
  busyKey: string | null;
  flash: FlashFn;
  onOpen: (doc: EnrollmentDocument) => void;
  onReview: (doc: EnrollmentDocument, status: DocumentStatus, reason?: string) => Promise<boolean>;
  onUpload: (doc: EnrollmentDocument, file: File) => void;
  onDelete: (doc: EnrollmentDocument) => void;
}

export function DocumentsTab({
  detail,
  canReview,
  canUpload,
  canDelete,
  busyKey,
  flash,
  onOpen,
  onReview,
  onUpload,
  onDelete,
}: DocumentsTabProps) {
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<EnrollmentDocument | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);

  const busy = busyKey !== null;

  const chooseFile = (doc: EnrollmentDocument) => {
    const input = fileInput.current;
    if (!input) return;
    uploadTarget.current = doc;
    input.accept = ACCEPT[doc.kind];
    input.click();
  };

  const startReject = (doc: EnrollmentDocument) => {
    if (rejecting === doc.key) {
      setRejecting(null);
      return;
    }
    setRejecting(doc.key);
    setReason("");
    setReasonTouched(false);
  };

  const submitReject = async (event: FormEvent, doc: EnrollmentDocument) => {
    event.preventDefault();
    if (!reason.trim() || busy) return;
    if (await onReview(doc, "REJECTED", reason.trim())) setRejecting(null);
  };

  if (!detail.documents.length) {
    return <p className="py-8 text-center text-sm text-base-content/60">Esta matrícula no tiene documentos registrados.</p>;
  }

  return (
    <div className="space-y-5">
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const doc = uploadTarget.current;
          event.target.value = "";
          if (!file || !doc) return;
          if (file.size > MAX_UPLOAD_BYTES) {
            flash("error", "El archivo no puede pesar más de 10 MB.");
            return;
          }
          onUpload(doc, file);
        }}
      />

      {GROUPS.map((group) => {
        const docs = detail.documents.filter(group.match);
        if (!docs.length) return null;
        const required = docs.filter((doc) => doc.required);
        const resolved = required.filter((doc) => isDocumentResolved(doc.status)).length;
        const headingId = `${ids}-${group.id}`;
        const noteId = `${headingId}-note`;

        return (
          <section
            key={group.id}
            aria-labelledby={headingId}
            aria-describedby={group.restricted ? noteId : undefined}
            className={cardClass}
          >
            <header className={cardHeaderClass}>
              <div className="min-w-0">
                <h3 id={headingId} className={`flex items-center gap-2 ${cardTitleClass}`}>
                  {group.restricted && <Lock className="h-4 w-4 shrink-0 text-base-content/60" aria-hidden="true" />}
                  {group.title}
                </h3>
                {group.restricted && (
                  <p id={noteId} className={cardSubtitleClass}>
                    Acceso restringido: solo los ve el personal con permiso para documentos médicos.
                  </p>
                )}
              </div>
              {required.length > 0 && docs[0].kind === "family" && (
                <span className={metaTextClass}>
                  {resolved} de {required.length} obligatorios resueltos
                </span>
              )}
            </header>

            <ul className="divide-y divide-base-300">
              {docs.map((doc) => {
                const isBusy = busyKey === doc.key;
                const Icon = doc.kind === "photo" ? ImageIcon : FileText;
                const reviewed = doc.status === "APPROVED" || doc.status === "REJECTED" || doc.status === "NOT_APPLICABLE";
                const reasonId = `${ids}-${doc.key}-reason`;
                const reasonError = reasonTouched && !reason.trim();
                const meta = doc.has_file
                  ? [
                      doc.original_name,
                      doc.uploaded_at && `Subido el ${formatDateTime(doc.uploaded_at)}`,
                      formatFileSize(doc.size),
                    ].filter(Boolean)
                  : ["Sin archivo"];

                return (
                  <li key={doc.key} className="px-5 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-base-content/40" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className={itemTitleClass}>
                            {doc.label}
                            {doc.required && (
                              <>
                                <span className="ml-0.5 text-error" aria-hidden="true">
                                  *
                                </span>
                                <span className="sr-only"> (obligatorio)</span>
                              </>
                            )}
                          </p>
                          <p className={`break-words ${metaTextClass}`}>{meta.join(" · ")}</p>
                          {doc.reviewed_at && (
                            <p className={metaTextClass}>Revisado el {formatDateTime(doc.reviewed_at)}</p>
                          )}
                          {doc.status === "REJECTED" && doc.reject_reason && (
                            <p className="mt-1 text-sm text-error">Motivo: {doc.reject_reason}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-0.5 pl-8 sm:pl-3">
                        <span className={`badge badge-sm mr-1 whitespace-nowrap ${getDocumentStatusBadgeClass(doc.status)}`}>
                          {getDocumentStatusLabel(doc.status)}
                        </span>
                        {isBusy ? (
                          <span className="flex items-center gap-2 px-2 text-sm text-base-content/60" role="status">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                            Guardando…
                          </span>
                        ) : (
                          <>
                            {doc.has_file && (
                              <IconAction
                                title="Ver"
                                label={`Ver ${doc.label}`}
                                icon={Eye}
                                tone="primary"
                                disabled={busy}
                                onClick={() => onOpen(doc)}
                              />
                            )}
                            {canReview && doc.has_file && doc.status !== "APPROVED" && (
                              <IconAction
                                title="Aprobar"
                                label={`Aprobar ${doc.label}`}
                                icon={Check}
                                tone="success"
                                disabled={busy}
                                onClick={() => onReview(doc, "APPROVED")}
                              />
                            )}
                            {canReview && doc.has_file && doc.status !== "REJECTED" && !(detail.status === "ACTIVE" && doc.kind !== "family") && (
                              <IconAction
                                title="Rechazar"
                                label={`Rechazar ${doc.label}`}
                                icon={X}
                                tone="error"
                                disabled={busy}
                                expanded={rejecting === doc.key}
                                onClick={() => startReject(doc)}
                              />
                            )}
                            {canReview && doc.kind === "family" && doc.status !== "NOT_APPLICABLE" && (
                              <IconAction
                                title="No aplica"
                                label={`Marcar ${doc.label} como no aplica`}
                                icon={Ban}
                                tone="neutral"
                                disabled={busy}
                                onClick={() => onReview(doc, "NOT_APPLICABLE")}
                              />
                            )}
                            {canReview && doc.has_file && reviewed && (
                              <IconAction
                                title="Deshacer revisión"
                                label={`Deshacer la revisión de ${doc.label}`}
                                icon={Undo2}
                                tone="neutral"
                                disabled={busy}
                                onClick={() => onReview(doc, "UPLOADED")}
                              />
                            )}
                            {canUpload(doc) && (
                              <IconAction
                                title={doc.has_file ? "Reemplazar archivo" : "Subir archivo"}
                                label={`${doc.has_file ? "Reemplazar el archivo de" : "Subir"} ${doc.label}`}
                                icon={Upload}
                                tone="primary"
                                disabled={busy}
                                onClick={() => chooseFile(doc)}
                              />
                            )}
                            {canDelete && doc.has_file && (
                              <IconAction
                                title="Eliminar archivo"
                                label={`Eliminar el archivo de ${doc.label}`}
                                icon={Trash2}
                                tone="error"
                                disabled={busy}
                                onClick={() => onDelete(doc)}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {rejecting === doc.key && (
                      <form
                        noValidate
                        onSubmit={(event) => submitReject(event, doc)}
                        className="mt-3 rounded-lg border border-error/25 bg-error/5 p-3 sm:ml-8"
                      >
                        <label htmlFor={reasonId} className={labelClass}>
                          Motivo del rechazo de «{doc.label}» <span className="text-error" aria-hidden="true">*</span>
                        </label>
                        <textarea
                          id={reasonId}
                          rows={2}
                          required
                          autoFocus
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          onBlur={() => setReasonTouched(true)}
                          aria-invalid={reasonError || undefined}
                          aria-describedby={`${reasonId}-hint${reasonError ? ` ${reasonId}-error` : ""}`}
                          className={`${textareaClass} ${reasonError ? "textarea-error" : ""}`}
                        />
                        <p id={`${reasonId}-hint`} className="mt-1 text-xs text-base-content/60">
                          {detail.status === "ACTIVE"
                            ? "El estudiante lo verá junto al documento y el acudiente recibirá un correo."
                            : "El estudiante lo verá junto al documento. Si devuelves la matrícula, va en la corrección."}
                        </p>
                        {reasonError && (
                          <p id={`${reasonId}-error`} className="mt-1 text-xs text-error">
                            Escribe el motivo del rechazo.
                          </p>
                        )}
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" className={`${ghostBtnClass} btn-sm`} onClick={() => setRejecting(null)} disabled={isBusy}>
                            Cancelar
                          </button>
                          <button type="submit" className="btn btn-error btn-sm gap-2" disabled={!reason.trim() || busy}>
                            {isBusy ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Rechazando…
                              </>
                            ) : (
                              "Rechazar documento"
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

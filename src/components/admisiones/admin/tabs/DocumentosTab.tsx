/**
 * Pestaña "Documentos" del expediente: lista de documentos requeridos + revisión
 * (aprobar/rechazar/marcar no aplica). Extraída de `ApplicationDetail.tsx` — Paso 7 del
 * refactor de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md). Siempre visible; las
 * acciones de revisión se gatean internamente con `canReviewDocuments`.
 */

import { useState } from "react";
import { CheckCircle2, Eye, Loader2, MinusCircle, XCircle } from "lucide-react";

import { API_ENDPOINTS } from "@/utils/api";
import { adminGhostBtnClass, iconBtnClass, iconClass, iconHover, labelClass, textareaClass } from "@/components/ui/formStyles";
import type { DocumentRow, PostFn } from "@/components/admisiones/admin/adminTypes";
import { itemTitleClass, metaTextClass } from "@/components/ui/textStyles";

export function DocumentosTab({
  id,
  documents,
  canReviewDocuments,
  busy,
  pending,
  post,
}: {
  id: number;
  documents: DocumentRow[];
  canReviewDocuments: boolean;
  busy: boolean;
  pending: string | null;
  post: PostFn;
}) {
  const [rejecting, setRejecting] = useState<{ docType: string; reason: string } | null>(null);

  const reviewDocument = (
    docType: string,
    action: "approve" | "reject" | "not_applicable",
    rejectReason?: string,
  ) =>
    post(
      API_ENDPOINTS.admissionsDocumentReview(id),
      { doc_type: docType, action, reject_reason: rejectReason },
      {
        pendingKey: `doc-${docType}-${action}`,
        successMsg:
          action === "approve"
            ? "Documento aprobado."
            : action === "reject"
              ? "Documento rechazado."
              : "Documento marcado como no aplica.",
      },
    );

  return (
    <ul className="divide-y divide-base-300">
      {documents.map((doc) => (
        <li key={doc.doc_type} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={itemTitleClass}>{doc.label}</p>
              <p className={`mt-0.5 ${metaTextClass}`}>
                {doc.status_label}
                {doc.sensitivity !== "normal" && (
                  <span className="ml-2 rounded-full border border-base-300 px-2 py-0.5 text-xs text-base-content/70">
                    {doc.sensitivity === "medical" ? "médico" : "sensible"}
                  </span>
                )}
              </p>
              {doc.reject_reason && (
                <p className="mt-1 text-sm text-error">{doc.reject_reason}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver"
                  aria-label={`Ver ${doc.label ?? doc.doc_type}`}
                  className={`${iconBtnClass} ${iconHover.primary}`}
                >
                  <Eye className={iconClass} aria-hidden="true" />
                </a>
              )}
              {canReviewDocuments && doc.status === "CARGADO" && (
                <>
                  <button
                    type="button"
                    onClick={() => reviewDocument(doc.doc_type, "approve")}
                    disabled={busy}
                    title="Aprobar"
                    aria-label={`Aprobar ${doc.label ?? doc.doc_type}`}
                    className={`${iconBtnClass} ${iconHover.accent}`}
                  >
                    {pending === `doc-${doc.doc_type}-approve` ? (
                      <Loader2 className={`${iconClass} animate-spin text-accent`} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className={iconClass} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting({ docType: doc.doc_type, reason: "" })}
                    disabled={busy}
                    title="Rechazar"
                    aria-label={`Rechazar ${doc.label ?? doc.doc_type}`}
                    className={`${iconBtnClass} ${iconHover.error}`}
                  >
                    <XCircle className={iconClass} aria-hidden="true" />
                  </button>
                </>
              )}
              {canReviewDocuments && doc.status === "NO_CARGADO" && (
                <button
                  type="button"
                  onClick={() => reviewDocument(doc.doc_type, "not_applicable")}
                  disabled={busy}
                  title="Marcar como no aplica"
                  aria-label={`Marcar ${doc.label ?? doc.doc_type} como no aplica`}
                  className={`${iconBtnClass} ${iconHover.neutral}`}
                >
                  {pending === `doc-${doc.doc_type}-not_applicable` ? (
                    <Loader2 className={`${iconClass} animate-spin`} aria-hidden="true" />
                  ) : (
                    <MinusCircle className={iconClass} aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Motivo del rechazo, en línea (sin diálogos nativos, ver DESIGN_SYSTEM §6) */}
          {rejecting?.docType === doc.doc_type && (
            <div className="mt-3 rounded-xl border border-error/25 bg-error/5 p-3">
              <label htmlFor={`reject-${doc.doc_type}`} className={labelClass}>
                ¿Por qué se rechaza? El acudiente lo va a leer.
              </label>
              <textarea
                id={`reject-${doc.doc_type}`}
                rows={2}
                autoFocus
                className={textareaClass}
                value={rejecting.reason}
                onChange={(e) => setRejecting({ ...rejecting, reason: e.target.value })}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy || !rejecting.reason.trim()}
                  onClick={async () => {
                    const ok = await reviewDocument(doc.doc_type, "reject", rejecting.reason);
                    if (ok) setRejecting(null);
                  }}
                  className={`${adminGhostBtnClass} text-error hover:bg-error/10`}
                >
                  {pending === `doc-${doc.doc_type}-reject` && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Confirmar rechazo
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(null)}
                  className={adminGhostBtnClass}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
      {documents.length === 0 && (
        <li className="py-8 text-center text-sm text-base-content/60">
          No hay documentos visibles para tu rol.
        </li>
      )}
    </ul>
  );
}

export default DocumentosTab;

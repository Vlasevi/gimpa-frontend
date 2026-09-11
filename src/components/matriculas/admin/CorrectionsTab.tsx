/** Pestaña "Correcciones": cada devolución con su comentario, los documentos que se
 * pidieron corregir y si el estudiante ya reenvió. La más reciente primero. */

import type { EnrollmentDetail } from "@/components/matriculas/enrollmentApi";
import {
  cardClass,
  dataLabelClass,
  itemTitleClass,
  metaTextClass,
  quoteClass,
} from "@/components/ui/textStyles";
import { formatDateTime } from "./shared";

export function CorrectionsTab({ detail }: { detail: EnrollmentDetail }) {
  if (!detail.corrections.length) {
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        Esta matrícula no se ha devuelto para corrección.
      </p>
    );
  }

  const corrections = [...detail.corrections].sort(
    (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
  );

  return (
    <ol className="space-y-4">
      {corrections.map((correction) => (
        <li key={correction.id} className={`${cardClass} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={itemTitleClass}>
                Devuelta el <time dateTime={correction.requested_at}>{formatDateTime(correction.requested_at)}</time>
              </p>
              {correction.requested_by && <p className={metaTextClass}>por {correction.requested_by}</p>}
            </div>
            {correction.resolved_at ? (
              <span className="badge badge-sm badge-success badge-soft whitespace-nowrap">
                Reenviada el {formatDateTime(correction.resolved_at)}
              </span>
            ) : (
              <span className="badge badge-sm badge-warning badge-soft whitespace-nowrap">Esperando al estudiante</span>
            )}
          </div>

          <p className={`mt-3 ${quoteClass}`}>{correction.comment}</p>

          {correction.rejected_documents.length > 0 && (
            <div className="mt-3">
              <p className={dataLabelClass}>Documentos a corregir</p>
              <ul className="mt-1.5 space-y-1">
                {correction.rejected_documents.map((doc) => (
                  <li key={doc.key} className="text-base-content/80">
                    <span className="font-medium">{doc.label}</span>
                    {doc.reason && <span className="text-base-content/60"> — {doc.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

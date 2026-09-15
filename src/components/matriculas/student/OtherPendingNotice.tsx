/**
 * Aviso de otra matrícula aprobada con documentos pendientes (p. ej. la del año en curso
 * mientras el estudiante diligencia la renovación). Abre esa matrícula en un modal con
 * su pestaña de documentos, para subir lo que falta sin salir del asistente.
 */

import { useId, useState } from "react";
import { FileWarning, X } from "lucide-react";

import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import {
  ApiError,
  enrollmentApi,
  type EnrollmentDocument,
  type MyEnrollmentResponse,
  type OtherPendingEnrollment,
} from "@/components/matriculas/enrollmentApi";
import { replaceDocument } from "./DocumentChecklist";
import { EnrollmentStatusView } from "./EnrollmentStatusView";
import type { FlashFn } from "./types";
import { titleClass } from "@/components/ui/textStyles";

export function OtherPendingNotice({ items, flash }: { items: OtherPendingEnrollment[]; flash: FlashFn }) {
  const titleId = useId();
  const [open, setOpen] = useState<OtherPendingEnrollment | null>(null);
  const [detail, setDetail] = useState<MyEnrollmentResponse | null>(null);

  if (items.length === 0) return null;

  const show = async (item: OtherPendingEnrollment) => {
    setOpen(item);
    setDetail(null);
    try {
      setDetail(await enrollmentApi.studentDetail(item.id));
    } catch (e) {
      flash("error", e instanceof ApiError ? e.message : "No se pudo abrir la matrícula.");
      setOpen(null);
    }
  };

  const onDocumentChange = (doc: EnrollmentDocument) =>
    setDetail((prev) =>
      prev?.enrollment
        ? { ...prev, enrollment: { ...prev.enrollment, documents: replaceDocument(prev.enrollment.documents, doc) } }
        : prev,
    );

  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center"
        >
          <FileWarning className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <p className="flex-1 text-sm text-base-content/80">
            Tu matrícula {item.academic_year} ({item.grade}) tiene {item.pending_count}{" "}
            {item.pending_count === 1 ? "documento pendiente" : "documentos pendientes"}.
          </p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => show(item)}>
            Ver documentos {item.academic_year}
          </button>
        </div>
      ))}

      <Modal
        isOpen={open !== null}
        onClose={() => setOpen(null)}
        labelledBy={titleId}
        className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-hidden bg-base-100 p-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-6 py-4">
          <h2 id={titleId} className={titleClass}>
            Matrícula {open?.academic_year}
          </h2>
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-sm"
            onClick={() => setOpen(null)}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!detail ? (
            <LoadingState compact label="Cargando la matrícula…" />
          ) : (
            <EnrollmentStatusView
              enrollment={detail.enrollment}
              message={detail.message}
              onDocumentChange={onDocumentChange}
              flash={flash}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

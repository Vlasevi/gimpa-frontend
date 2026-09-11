/**
 * Paso 5 — Documentos de la familia. Cada documento se sube al elegirlo (plan 15.2) y la
 * lista de requeridos la calcula el backend (plan §12: una sola regla, hallazgos #31–#33).
 * No bloquea el envío (decisión 13): lo pendiente se puede subir después.
 */

import { ghostBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import type { EnrollmentDocument, StudentEnrollment } from "@/components/matriculas/enrollmentApi";
import { DocumentChecklist } from "./DocumentChecklist";
import type { FlashFn } from "./types";
import { titleClass } from "@/components/ui/textStyles";

export function StepDocuments({
  enrollment,
  onDocumentChange,
  onBack,
  onNext,
  flash,
}: {
  enrollment: StudentEnrollment;
  onDocumentChange: (doc: EnrollmentDocument) => void;
  onBack: () => void;
  onNext: () => void;
  flash: FlashFn;
}) {
  const rejected = (enrollment.documents ?? []).filter((d) => d.kind === "family" && d.status === "REJECTED");
  return (
    <section aria-labelledby="step-title" className="space-y-5">
      <div>
        <h2 id="step-title" className={titleClass}>
          Documentos
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Sube cada documento en PDF, JPG o PNG (máximo 10 MB). Se guarda apenas lo eliges. Si
          todavía no tienes alguno, puedes enviar la matrícula igual y subirlo cuando la
          institución la apruebe.
        </p>
      </div>

      {rejected.length > 0 && (
        <div role="alert" className="alert alert-warning alert-soft text-sm">
          La institución pidió corregir {rejected.length === 1 ? "un documento" : `${rejected.length} documentos`}.
          Están marcados abajo con el motivo.
        </div>
      )}

      <DocumentChecklist
        enrollmentId={enrollment.id}
        documents={enrollment.documents ?? []}
        onDocumentChange={onDocumentChange}
        flash={flash}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-base-300 pt-5 sm:flex-row sm:justify-between">
        <button type="button" className={ghostBtnClass} onClick={onBack}>
          Atrás
        </button>
        <button type="button" className={primaryBtnClass} onClick={onNext}>
          Continuar
        </button>
      </div>
    </section>
  );
}

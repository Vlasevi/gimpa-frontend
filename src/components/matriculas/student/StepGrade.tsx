/**
 * Paso 2 — Confirmar grado y año. Los define la institución al crear la matrícula (plan
 * §14): aquí solo se muestran para que la familia confirme que son los correctos.
 */

import { GraduationCap } from "lucide-react";

import { outlineBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import type { StudentEnrollment } from "@/components/matriculas/enrollmentApi";
import { ORIGIN_LABELS } from "@/utils/statusHelpers";
import { titleClass } from "@/components/ui/textStyles";

export function StepGrade({
  enrollment,
  studentName,
  onBack,
  onNext,
}: {
  enrollment: StudentEnrollment;
  studentName: string;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <section aria-labelledby="step-title" className="space-y-6">
      <div>
        <h2 id="step-title" className={titleClass}>
          Confirma el grado
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Estos datos los registró la institución. Si algo no corresponde, comunícate con
          secretaría antes de continuar.
        </p>
      </div>

      <dl className="grid gap-4 rounded-2xl border border-base-300 bg-base-200/50 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-base-content/50">Estudiante</dt>
          <dd className="mt-1 font-medium text-base-content">{studentName || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-base-content/50">Grado</dt>
          <dd className="mt-1 flex items-center gap-2 font-display text-2xl text-secondary">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            {enrollment.grade.label}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-base-content/50">Año lectivo</dt>
          <dd className="mt-1 font-display text-2xl text-secondary">{enrollment.academic_year}</dd>
          <dd className="text-xs text-base-content/60">{ORIGIN_LABELS[enrollment.origin]}</dd>
        </div>
      </dl>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onBack ? (
          <button type="button" className={outlineBtnClass} onClick={onBack}>
            Atrás
          </button>
        ) : (
          <span />
        )}
        <button type="button" className={primaryBtnClass} onClick={onNext}>
          Sí, continuar
        </button>
      </div>
    </section>
  );
}

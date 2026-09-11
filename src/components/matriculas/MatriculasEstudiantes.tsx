/**
 * Matrículas — vista del estudiante (Matrícula v2).
 *
 * Una sola llamada al entrar (`GET /api/enrollments/me/`, plan 15.3): la matrícula
 * vigente con sus documentos; la ficha solo viene si la matrícula es editable.
 *
 * - Editable (CREATED / DRAFT / RETURNED) → asistente de 6 pasos. Tras el OTP retoma
 *   donde quedó según lo guardado en el servidor (plan 15.2, hallazgo #7): sin ficha →
 *   paso 2; con ficha sin firmas → paso 4; con firmas → paso 5.
 * - Resto de estados → `EnrollmentStatusView`.
 *
 * El `<h1>` depende del estado (hallazgo #6): "Creación de matrícula 2027", "Edición de
 * matrícula 2027" o "Matrícula 2027".
 */

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";

import { useAuth } from "@/components/Login/loginLogic";
import { LoadingState } from "@/components/ui/LoadingState";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import {
  ApiError,
  enrollmentApi,
  type EnrollmentDocument,
  type MyEnrollmentResponse,
  type StudentEnrollment,
} from "./enrollmentApi";
import { replaceDocument } from "./student/DocumentChecklist";
import { EnrollmentStatusView } from "./student/EnrollmentStatusView";
import { OtherPendingNotice } from "./student/OtherPendingNotice";
import { StepVerification } from "./student/StepVerification";
import { StepGrade } from "./student/StepGrade";
import { StepProfile } from "./student/StepProfile";
import { StepDocuments } from "./student/StepDocuments";
import { StepSubmit } from "./student/StepSubmit";

// El paso de firmas carga pdf.js y pdf-lib (~1 MB): se descarga solo al llegar a él.
const StepSign = lazy(() => import("./student/StepSign").then((m) => ({ default: m.StepSign })));

const STEPS = ["Verificación", "Grado", "Datos", "Firmas", "Documentos", "Envío"];

function resumeStep(enrollment: StudentEnrollment): number {
  if (!enrollment.progress?.data_saved) return 2;
  if (!enrollment.progress?.signed) return 4;
  return 5;
}

function pageTitle(enrollment: StudentEnrollment | null): string {
  if (!enrollment) return "Matrícula";
  const year = enrollment.academic_year;
  if (enrollment.status === "CREATED") return `Creación de matrícula ${year}`;
  if (enrollment.status === "DRAFT" || enrollment.status === "RETURNED") return `Edición de matrícula ${year}`;
  return `Matrícula ${year}`;
}

function Stepper({ current, furthest, onGo }: { current: number; furthest: number; onGo: (step: number) => void }) {
  return (
    <nav aria-label="Pasos de la matrícula" className="overflow-x-auto pb-1">
      <ol className="steps w-full min-w-[36rem]">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const reachable = step > 1 && step <= furthest && step !== current;
          const done = step < current;
          return (
            <li
              key={label}
              className={`step text-xs sm:text-sm ${step <= current ? "step-primary" : ""}`}
              data-content={done ? "✓" : String(step)}
              aria-current={step === current ? "step" : undefined}
            >
              {reachable ? (
                <button type="button" className="link link-hover" onClick={() => onGo(step)}>
                  {label}
                  <span className="sr-only">{done ? " (completado)" : ""}</span>
                </button>
              ) : (
                <span className={step === current ? "font-semibold text-base-content" : "text-base-content/60"}>
                  {label}
                  {done && <span className="sr-only"> (completado)</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CorrectionNotice({ enrollment }: { enrollment: StudentEnrollment }) {
  const correction = enrollment.correction;
  if (enrollment.status !== "RETURNED" || !correction) return null;
  return (
    <div role="alert" className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
      <h2 className="font-display text-lg font-semibold text-secondary">La institución pidió correcciones</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-base-content/80">{correction.comment}</p>
      {correction.rejected_documents.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-base-content/80">
          {correction.rejected_documents.map((d) => (
            <li key={d.key}>
              <span className="font-medium">{d.label}:</span> {d.reason}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-base-content/60">
        Si cambias los datos, tendrás que volver a firmar los documentos antes de reenviar.
      </p>
    </div>
  );
}

export const MatriculasEstudiantes = () => {
  const { user } = useAuth();
  const { toast, flash } = useToast();
  const [response, setResponse] = useState<MyEnrollmentResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const headingRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setResponse(await enrollmentApi.me());
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "No se pudo cargar la matrícula.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enrollment = response?.enrollment ?? null;

  const setEnrollment = (next: StudentEnrollment) =>
    setResponse((prev) => ({ ...prev, message: prev?.message ?? "", enrollment: next }));

  const goTo = (next: number) => {
    setStep(next);
    setFurthest((f) => Math.max(f, next));
    // Al cambiar de paso, el foco y la vista vuelven al inicio del asistente.
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  // Actualización funcional: dos subidas seguidas no deben pisarse.
  const onDocumentChange = (doc: EnrollmentDocument) =>
    setResponse((prev) =>
      prev?.enrollment
        ? { ...prev, enrollment: { ...prev.enrollment, documents: replaceDocument(prev.enrollment.documents, doc) } }
        : prev,
    );

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div role="alert" className="alert alert-error alert-soft flex flex-wrap justify-between gap-3">
          <span>{loadError}</span>
          <button type="button" className="btn btn-sm gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!response) return <LoadingState label="Cargando tu matrícula…" />;

  const editable = !!enrollment?.is_editable;
  const studentName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.displayname || "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Toast toast={toast} />
      <header ref={headingRef} tabIndex={-1} className="space-y-1 focus:outline-none">
        <h1 className="font-display text-3xl font-bold text-secondary">{pageTitle(enrollment)}</h1>
        {enrollment && (
          <p className="flex flex-wrap items-center gap-x-2 text-base text-base-content/60">
            <span>{enrollment.grade.label}</span>
            <span aria-hidden="true">·</span>
            <span>{studentName}</span>
            {enrollment.status === "RETURNED" && (
              <span className="badge badge-warning badge-sm">Devuelta para corrección</span>
            )}
          </p>
        )}
      </header>

      <OtherPendingNotice items={response.other_pending ?? []} flash={flash} />

      {!editable || !enrollment ? (
        <EnrollmentStatusView
          enrollment={enrollment}
          message={response.message}
          onDocumentChange={onDocumentChange}
          flash={flash}
        />
      ) : (
        <>
          {step > 1 && <Stepper current={step} furthest={furthest} onGo={goTo} />}
          <CorrectionNotice enrollment={enrollment} />
          <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm sm:p-7" key={step}>
            <div className="animate-view-in">
              {step === 1 && (
                <StepVerification
                  onVerified={() => {
                    const resume = resumeStep(enrollment);
                    setFurthest(Math.max(resume, enrollment.progress?.signed ? 6 : resume));
                    goTo(resume);
                  }}
                />
              )}
              {step === 2 && <StepGrade enrollment={enrollment} studentName={studentName} onNext={() => goTo(3)} />}
              {step === 3 && (
                <StepProfile
                  enrollment={enrollment}
                  onBack={() => goTo(2)}
                  onSaved={(next) => {
                    setEnrollment(next);
                    goTo(4);
                  }}
                  flash={flash}
                />
              )}
              {step === 4 && (
                <Suspense fallback={<LoadingState compact label="Preparando los documentos…" />}>
                  <StepSign
                    enrollment={enrollment}
                    onBack={() => goTo(3)}
                    onSigned={setEnrollment}
                    onNext={() => goTo(5)}
                    flash={flash}
                  />
                </Suspense>
              )}
              {step === 5 && (
                <StepDocuments
                  enrollment={enrollment}
                  onDocumentChange={onDocumentChange}
                  onBack={() => goTo(4)}
                  onNext={() => goTo(6)}
                  flash={flash}
                />
              )}
              {step === 6 && (
                <StepSubmit
                  enrollment={enrollment}
                  onBack={() => goTo(5)}
                  onGoToStep={goTo}
                  onSubmitted={(next) => {
                    setEnrollment(next);
                    load();
                  }}
                  flash={flash}
                />
              )}
            </div>
          </div>
          {step === 1 && enrollment.progress?.data_saved && (
            <p className="flex items-center gap-2 text-sm text-base-content/60">
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              Tu avance está guardado. Después de verificar, seguirás donde quedaste.
            </p>
          )}
        </>
      )}
    </div>
  );
};

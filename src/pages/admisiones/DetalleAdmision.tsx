import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Circle,
  MessageSquareWarning,
} from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { StatusBadge } from "@/components/admisiones/StatusBadge";
import {
  isEditable,
  showsPayment,
  showsDocuments,
  showsInterviews,
  type AdmissionApplication,
} from "@/components/admisiones/admissionTypes";
import { GuardianPaymentCard } from "@/components/admisiones/GuardianPaymentCard";
import { GuardianDocumentsCard } from "@/components/admisiones/GuardianDocumentsCard";
import { GuardianInterviewsCard } from "@/components/admisiones/GuardianInterviewsCard";
import { primaryBtnClass } from "@/components/ui/formStyles";

/** Secciones del formulario (espejo de `DATA_SECTIONS` del backend). */
const SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: "residence", label: "Residencia", hint: "Dirección y datos de vivienda" },
  { key: "academic_history", label: "Historial académico", hint: "Colegio anterior y grado cursado" },
  { key: "guardians", label: "Acudientes", hint: "Padre, madre y acudiente financiero" },
  { key: "health", label: "Salud", hint: "EPS, condiciones y apoyos" },
  { key: "declarations", label: "Declaraciones", hint: "Autorizaciones y firma" },
];

const isFilled = (data: AdmissionApplication["data"], key: string) =>
  Boolean(data?.[key] && Object.keys(data[key]).length > 0);

export default function DetalleAdmision() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code));
      if (res.ok) {
        setApplication(await res.json());
      } else if (res.status === 403) {
        setError("No tienes acceso a esta solicitud.");
      } else {
        setError("No encontramos esta solicitud.");
      }
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-lg border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando solicitud…
      </div>
    );
  }

  if (error || !application) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-6 shadow-sm"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div>
          <p className="font-medium text-base-content">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/admisiones")}
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            Volver a mis solicitudes
          </button>
        </div>
      </div>
    );
  }

  const editable = isEditable(application.status);
  const completed = SECTIONS.filter((s) => isFilled(application.data, s.key)).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <button
        type="button"
        onClick={() => navigate("/admisiones")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis solicitudes
      </button>

      {/* Resumen del expediente */}
      <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-secondary">
              {application.applicant.full_name}
            </h1>
            <p className="mt-1 text-base-content/60">
              {application.grade_name} · {application.academic_year}
            </p>
            <p className="mt-1 text-sm text-base-content/50">
              Solicitud {application.code}
            </p>
          </div>
          <StatusBadge
            status={application.status}
            label={application.status_label}
          />
        </div>
      </div>

      {/* Resultado de la decisión */}
      {application.result && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-5 shadow-sm ${
            application.result.decision.startsWith("ADMITIDO")
              ? "border-accent/30 bg-accent/5"
              : application.result.decision === "NO_ADMITIDO"
                ? "border-error/25 bg-error/5"
                : "border-primary/25 bg-primary/5"
          }`}
        >
          {application.result.decision.startsWith("ADMITIDO") ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          )}
          <div>
            <h2 className="font-display font-semibold text-secondary">
              Resultado: {application.result.decision_label}
            </h2>
            {application.result.message_public && (
              <p className="mt-1 whitespace-pre-line text-sm text-base-content/80">
                {application.result.message_public}
              </p>
            )}
            {application.result.conditions && (
              <p className="mt-2 whitespace-pre-line text-sm text-base-content/80">
                <span className="font-medium">Condiciones: </span>
                {application.result.conditions}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Devolución del colegio */}
      {application.correction_comment && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-5 shadow-sm">
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <h2 className="font-display font-semibold text-secondary">
              El colegio pidió correcciones
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm text-base-content/80">
              {application.correction_comment}
            </p>
          </div>
        </div>
      )}

      {/* Pago de inscripción (P8) */}
      {showsPayment(application.status) && (
        <GuardianPaymentCard code={application.code} onChanged={load} />
      )}

      {/* Documentos (P9) */}
      {showsDocuments(application.status) && (
        <GuardianDocumentsCard code={application.code} onChanged={load} />
      )}

      {/* Citas de evaluación (P10–P13) */}
      {showsInterviews(application.status) && (
        <GuardianInterviewsCard code={application.code} />
      )}

      {/* Avance del formulario */}
      <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold text-secondary">
            Formulario de admisión
          </h2>
          <span className="text-sm text-base-content/60">
            {completed} de {SECTIONS.length} secciones
          </span>
        </div>

        <ul className="divide-y divide-base-300">
          {SECTIONS.map((section) => {
            const done = isFilled(application.data, section.key);
            return (
              <li
                key={section.key}
                className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-base-content/25" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-base-content">{section.label}</p>
                  <p className="text-sm text-base-content/60">{section.hint}</p>
                </div>
                <span
                  className={`text-sm font-medium ${
                    done ? "text-accent" : "text-base-content/50"
                  }`}
                >
                  {done ? "Guardada" : "Pendiente"}
                </span>
              </li>
            );
          })}
        </ul>

        {editable ? (
          <div className="mt-5 border-t border-base-300 pt-5">
            <button
              type="button"
              onClick={() =>
                navigate(`/admisiones/${application.code}/solicitud`)
              }
              className={primaryBtnClass}
            >
              {completed === 0
                ? "Diligenciar formulario"
                : "Continuar formulario"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="mt-5 border-t border-base-300 pt-5 text-sm text-base-content/60">
            Tu solicitud está en revisión del colegio, por eso el formulario ya no
            se puede editar. Te avisaremos por correo cuando haya novedades.
          </p>
        )}
      </div>
    </div>
  );
}

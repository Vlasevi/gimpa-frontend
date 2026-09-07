import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  Send,
} from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import {
  isEditable,
  type AdmissionApplication,
} from "@/components/admisiones/admissionTypes";
import type { SectionValues } from "@/components/admisiones/formFields";
import {
  ResidenceStep,
  AcademicHistoryStep,
  GuardiansStep,
  HealthStep,
  DeclarationsStep,
  type StepProps,
} from "@/components/admisiones/steps";

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const ghostBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 px-5 text-base font-medium text-base-content transition-all duration-200 ease-out hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none";

export default function SolicitudWizard() {
  const { code = "" } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un `useForm()` por sección (no uno global): el PATCH sigue siendo por sección, y
  // así el usuario puede saltar de pestaña sin perder lo que escribió en otra — los 5
  // formularios viven aquí, en el padre, y no se recrean al cambiar de paso (solo el
  // `StepComponent` que los consume se monta/desmonta).
  const residenceForm = useForm<SectionValues>({ defaultValues: {} });
  const academicForm = useForm<SectionValues>({ defaultValues: {} });
  const guardiansForm = useForm<SectionValues>({ defaultValues: {} });
  const healthForm = useForm<SectionValues>({ defaultValues: {} });
  const declarationsForm = useForm<SectionValues>({ defaultValues: {} });

  /** Los 5 pasos, en orden. `key` = sección de `data` en el backend. */
  const STEPS: {
    key: string;
    title: string;
    subtitle: string;
    Component: (props: StepProps) => JSX.Element;
    form: UseFormReturn<SectionValues>;
  }[] = [
    {
      key: "residence",
      title: "Residencia",
      subtitle: "¿Dónde vive el aspirante?",
      Component: ResidenceStep,
      form: residenceForm,
    },
    {
      key: "academic_history",
      title: "Historial académico",
      subtitle: "Su trayectoria escolar hasta hoy.",
      Component: AcademicHistoryStep,
      form: academicForm,
    },
    {
      key: "guardians",
      title: "Acudientes",
      subtitle: "Quién responde por el aspirante.",
      Component: GuardiansStep,
      form: guardiansForm,
    },
    {
      key: "health",
      title: "Salud",
      subtitle: "Para cuidarlo mejor durante el año escolar.",
      Component: HealthStep,
      form: healthForm,
    },
    {
      key: "declarations",
      title: "Declaraciones",
      subtitle: "Revisa y envía tu solicitud.",
      Component: DeclarationsStep,
      form: declarationsForm,
    },
  ];

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    let active = true;
    apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code))
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setError("No encontramos esta solicitud.");
          return;
        }
        const data: AdmissionApplication = await res.json();
        setApplication(data);
        // Hidrata cada sección con lo que trajo el servidor. `reset(...)`, no
        // `defaultValues` síncronos: el dato llega async.
        residenceForm.reset((data.data?.residence as SectionValues) ?? {});
        academicForm.reset((data.data?.academic_history as SectionValues) ?? {});
        guardiansForm.reset((data.data?.guardians as SectionValues) ?? {});
        healthForm.reset((data.data?.health as SectionValues) ?? {});
        declarationsForm.reset((data.data?.declarations as SectionValues) ?? {});
        // Retoma en la primera sección sin diligenciar.
        const firstPending = STEPS.findIndex(
          (s) => !data.data?.[s.key] || Object.keys(data.data[s.key]).length === 0,
        );
        setStepIndex(firstPending === -1 ? 0 : firstPending);
      })
      .catch(() => {
        if (active) setError("No pudimos conectar con el servidor.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // Solo al montar / cuando cambia `code`. Los 5 `useForm()` mantienen identidad
    // estable entre renders (react-hook-form), listarlos no cambiaría nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /** Guarda la sección actual. Devuelve true si salió bien. */
  const saveCurrentSection = async () => {
    setSaving(true);
    setError(null);
    try {
      const values = step.form.getValues();
      const res = await apiFetch(
        API_ENDPOINTS.admissionsApplicationByCode(code),
        {
          method: "PATCH",
          body: JSON.stringify({ sections: { [step.key]: values } }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : "No pudimos guardar esta sección.",
        );
        return false;
      }
      const updated: AdmissionApplication = await res.json();
      setApplication(updated);
      // Re-hidrata con lo confirmado por el servidor (limpia el estado "dirty").
      step.form.reset((updated.data?.[step.key] as SectionValues) ?? values);
      return true;
    } catch {
      setError("No pudimos conectar con el servidor.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const ok = await saveCurrentSection();
    if (ok) setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const handleSubmit = async () => {
    const ok = await saveCurrentSection();
    if (!ok) return;

    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationSubmit(code), {
        method: "POST",
      });
      if (res.ok) {
        navigate(`/admisiones/${code}`, { replace: true });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : "No pudimos enviar la solicitud.",
        );
      }
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando solicitud…
      </div>
    );
  }

  if (error && !application) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-error/25 bg-error/5 p-6 shadow-sm"
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

  // Una solicitud ya enviada no se edita: la vista de detalle explica el estado.
  if (application && !isEditable(application.status)) {
    return <Navigate to={`/admisiones/${code}`} replace />;
  }

  const StepComponent = step.Component;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(`/admisiones/${code}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Salir del formulario
      </button>

      {/* Progreso */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium text-base-content/60">
            Paso {stepIndex + 1} de {STEPS.length}
          </span>
          <span className="text-sm text-base-content/50">
            {application?.applicant.full_name}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-base-300"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label="Avance del formulario"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Navegación entre secciones ya visitadas */}
        <div className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((s, i) => {
            const filled =
              application?.data?.[s.key] &&
              Object.keys(application.data[s.key]).length > 0;
            const active = i === stepIndex;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStepIndex(i)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : filled
                      ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
                      : "border-base-300 bg-base-100 text-base-content/60 hover:bg-base-200"
                }`}
              >
                {filled && !active && <Check className="h-3 w-3" />}
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Paso actual */}
      <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-secondary">
            {step.title}
          </h1>
          <p className="mt-1 text-base-content/60">{step.subtitle}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <span>{error}</span>
          </div>
        )}

        <div key={step.key} className="animate-view-in">
          <StepComponent
            control={step.form.control}
            register={step.form.register}
            setValue={step.form.setValue}
            getValues={step.form.getValues}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-6">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0 || saving}
            className={ghostBtnClass}
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={primaryBtnClass}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar solicitud
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className={primaryBtnClass}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  Guardar y continuar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

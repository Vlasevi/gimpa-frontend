import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  Loader2,
  ArrowLeft,
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
import { SubSection, type SubSectionStatus } from "@/components/ui/SubSection";

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

type Step = {
  key: string;
  title: string;
  subtitle: string;
  Component: (props: StepProps) => JSX.Element;
  form: UseFormReturn<SectionValues>;
};

export default function SolicitudWizard() {
  const { code = "" } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Acordeón: varias secciones pueden estar abiertas a la vez (misma sensación que el
  // llenado de Matrículas), a diferencia del acordeón interno de `GuardiansStep`, que
  // sigue siendo exclusivo (una sola abierta). Set de `key`s abiertas.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  // Qué sección está guardándose ahora mismo (una a la vez: cada "Guardar sección" es
  // un PATCH independiente, nunca un guardado global).
  const [savingKey, setSavingKey] = useState<string | null>(null);
  // Último error de guardado por sección — alimenta tanto el mensaje inline como el
  // status "error" del acordeón.
  const [sectionErrors, setSectionErrors] = useState<Record<string, string | null>>({});

  // Un `useForm()` por sección (no uno global): el PATCH sigue siendo por sección, y
  // así el usuario puede editar una sección sin perder lo que escribió en otra — los 5
  // formularios viven aquí, en el padre, y no se recrean al abrir/cerrar una tarjeta.
  const residenceForm = useForm<SectionValues>({ defaultValues: {} });
  const academicForm = useForm<SectionValues>({ defaultValues: {} });
  const guardiansForm = useForm<SectionValues>({ defaultValues: {} });
  const healthForm = useForm<SectionValues>({ defaultValues: {} });
  const declarationsForm = useForm<SectionValues>({ defaultValues: {} });

  /** Las 5 secciones, en orden. `key` = sección de `data` en el backend. */
  const STEPS: Step[] = [
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

  useEffect(() => {
    let active = true;
    apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code))
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setGlobalError("No encontramos esta solicitud.");
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
        // Reanudación automática: deja abierta la primera sección sin diligenciar (o
        // la primera de todas si ya están completas).
        const firstPending = STEPS.findIndex(
          (s) => !data.data?.[s.key] || Object.keys(data.data[s.key]).length === 0,
        );
        const initialKey = STEPS[firstPending === -1 ? 0 : firstPending].key;
        setOpenSections(new Set([initialKey]));
      })
      .catch(() => {
        if (active) setGlobalError("No pudimos conectar con el servidor.");
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

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Guarda una sección puntual. Devuelve true si salió bien. */
  const saveSection = async (s: Step): Promise<boolean> => {
    setSavingKey(s.key);
    setSectionErrors((prev) => ({ ...prev, [s.key]: null }));
    try {
      const values = s.form.getValues();
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code), {
        method: "PATCH",
        body: JSON.stringify({ sections: { [s.key]: values } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data?.detail === "string"
            ? data.detail
            : "No pudimos guardar esta sección.";
        setSectionErrors((prev) => ({ ...prev, [s.key]: message }));
        return false;
      }
      const updated: AdmissionApplication = await res.json();
      setApplication(updated);
      // Re-hidrata con lo confirmado por el servidor (limpia el estado "dirty").
      s.form.reset((updated.data?.[s.key] as SectionValues) ?? values);
      return true;
    } catch {
      setSectionErrors((prev) => ({
        ...prev,
        [s.key]: "No pudimos conectar con el servidor.",
      }));
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const handleSubmit = async () => {
    setGlobalError(null);
    // Guarda primero cualquier sección con cambios sin guardar (cada una con su propio
    // PATCH, no un guardado global) antes de enviar la solicitud completa.
    for (const s of STEPS) {
      if (s.form.formState.isDirty) {
        const ok = await saveSection(s);
        if (!ok) {
          setGlobalError(
            `No pudimos guardar "${s.title}". Revisa esa sección antes de enviar.`,
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationSubmit(code), {
        method: "POST",
      });
      if (res.ok) {
        navigate(`/admisiones/${code}`, { replace: true });
      } else {
        const data = await res.json().catch(() => ({}));
        setGlobalError(
          typeof data?.detail === "string"
            ? data.detail
            : "No pudimos enviar la solicitud.",
        );
      }
    } catch {
      setGlobalError("No pudimos conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Estado de cada tarjeta del acordeón, derivado de `formState` y del guardado — sin
   * un cálculo paralelo hecho a mano:
   * - "error": el último intento de guardar esta sección falló (`sectionErrors`), o el
   *   propio `formState.errors` de su `useForm()` trae errores (hoy siempre vacío, no
   *   hay validación todavía, pero así el indicador queda listo para cuando la haya).
   * - "complete": el servidor ya tiene datos guardados para esta sección
   *   (`application.data[key]` no vacío) y el formulario no tiene cambios sin guardar
   *   (`formState.isDirty === false`).
   * - "incomplete": todo lo demás — nunca se guardó, o hay ediciones locales
   *   pendientes de guardar.
   */
  const sectionStatus = (s: Step): SubSectionStatus | undefined => {
    if (sectionErrors[s.key] || Object.keys(s.form.formState.errors).length > 0) {
      return "error";
    }
    const saved =
      !!application?.data?.[s.key] && Object.keys(application.data[s.key]).length > 0;
    if (saved && !s.form.formState.isDirty) return "complete";
    return "incomplete";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando solicitud…
      </div>
    );
  }

  if (globalError && !application) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-error/25 bg-error/5 p-6 shadow-sm"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div>
          <p className="font-medium text-base-content">{globalError}</p>
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

  const completeCount = STEPS.filter((s) => sectionStatus(s) === "complete").length;
  const progress = (completeCount / STEPS.length) * 100;

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

      <div>
        <h1 className="font-display text-3xl font-bold text-secondary">
          Solicitud de admisión
        </h1>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-base-content/60">{application?.applicant.full_name}</p>
          <span className="text-sm font-medium text-base-content/60">
            {completeCount} de {STEPS.length} secciones completas
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base-300"
          role="progressbar"
          aria-valuenow={completeCount}
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-label="Avance del formulario"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Las 5 secciones, siempre presentes como tarjetas plegables — nada se oculta
          por completo como en el wizard anterior. */}
      <div className="space-y-4">
        {STEPS.map((s) => {
          const StepComponent = s.Component;
          const sectionError = sectionErrors[s.key];
          const isSaving = savingKey === s.key;
          return (
            <SubSection
              key={s.key}
              title={s.title}
              subtitle={s.subtitle}
              open={openSections.has(s.key)}
              onToggle={() => toggleSection(s.key)}
              status={sectionStatus(s)}
            >
              <StepComponent
                control={s.form.control}
                register={s.form.register}
                setValue={s.form.setValue}
                getValues={s.form.getValues}
              />

              {sectionError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                  <span>{sectionError}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end border-t border-base-300 pt-5">
                <button
                  type="button"
                  onClick={() => saveSection(s)}
                  disabled={isSaving}
                  className={primaryBtnClass}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Guardar sección
                    </>
                  )}
                </button>
              </div>
            </SubSection>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || savingKey !== null}
          className={primaryBtnClass}
        >
          {submitting ? (
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
      </div>
    </div>
  );
}

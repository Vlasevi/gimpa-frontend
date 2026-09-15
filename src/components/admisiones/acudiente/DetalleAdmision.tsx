import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Circle,
  Lock,
  Send,
} from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { StatusBadge } from "@/components/admisiones/StatusBadge";
import {
  currentStage,
  isEditable,
  type AdmissionApplication,
  type GuardianStage,
} from "@/components/admisiones/admissionTypes";
import { GuardianPaymentCard } from "@/components/admisiones/GuardianPaymentCard";
import { GuardianDocumentsCard } from "@/components/admisiones/GuardianDocumentsCard";
import { GuardianInterviewsCard } from "@/components/admisiones/GuardianInterviewsCard";
import { useGuardianNav } from "@/components/admisiones/acudiente/guardianNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { primaryBtnClass, tabTriggerClass } from "@/components/ui/formStyles";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import { cardClass, titleClass } from "@/components/ui/textStyles";

/** Secciones del formulario (espejo de `DATA_SECTIONS` del backend). */
const SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: "residence", label: "Residencia", hint: "Dirección y datos de vivienda" },
  { key: "academic_history", label: "Historial académico", hint: "Colegio anterior y grado cursado" },
  { key: "guardians", label: "Acudientes", hint: "Padre, madre y tutor responsable / acudiente" },
  { key: "health", label: "Salud", hint: "EPS, condiciones y apoyos" },
];

type Tab = "formulario" | GuardianStage;

/** Pestañas que habilita el colegio, con el aviso que se muestra mientras siguen cerradas. */
const STAGE_TABS: { key: GuardianStage; label: string; lockedHint: string }[] = [
  { key: "pago", label: "Pago", lockedHint: "Se habilita cuando el colegio valide tu solicitud." },
  { key: "documentos", label: "Documentos", lockedHint: "Se habilita cuando el colegio te pida los documentos." },
  { key: "entrevistas", label: "Entrevistas", lockedHint: "Se habilita cuando el colegio agende las entrevistas." },
];

const isFilled = (data: AdmissionApplication["data"], key: string) =>
  Boolean(data?.[key] && Object.keys(data[key]).length > 0);

export default function DetalleAdmision({ id }: { id: number }) {
  const { go, back } = useGuardianNav();
  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [sending, setSending] = useState(false);
  const { toast, flash } = useToast();

  /** Reenvía la solicitud con las correcciones (el backend verifica los documentos). */
  const sendCorrections = async () => {
    setSending(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationSubmit(id), { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("success", "Correcciones enviadas. El colegio las va a revisar.");
        load();
      } else {
        flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos enviar las correcciones.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSending(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplication(id));
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
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Al abrir, la pestaña de la etapa en curso (la que pide acción); si no hay ninguna,
  // el formulario. Después la elige el acudiente: una recarga no lo mueve de pestaña.
  useEffect(() => {
    if (application && tab === null) setTab(currentStage(application.status) ?? "formulario");
  }, [application, tab]);

  if (loading) {
    return (
      <div className={`${cardClass} flex items-center justify-center gap-3 p-12 text-base-content/60`}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando solicitud…
      </div>
    );
  }

  if (error || !application) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-6">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div>
          <p className="font-medium text-base-content">{error}</p>
          <button
            type="button"
            onClick={() => go({ view: "list" })}
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            Volver a mis solicitudes
          </button>
        </div>
      </div>
    );
  }

  const editable = isEditable(application.status);
  const correcting = application.status === "DEVUELTA_PARA_CORRECCION" && !!application.open_correction;
  const flaggedSections = new Set(application.open_correction?.sections ?? []);
  const completed = SECTIONS.filter((s) => isFilled(application.data, s.key)).length;
  const reached = new Set(application.reached_stages);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Toast toast={toast} />
      <button
        type="button"
        onClick={() => back({ view: "list" })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis solicitudes
      </button>

      <Tabs value={tab ?? "formulario"} onValueChange={(v) => setTab(v as Tab)} className="space-y-6">
        {/* Resumen del expediente + pestañas */}
        <div className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
            <div className="min-w-0">
              <h1 className={`${titleClass} text-2xl`}>{application.applicant.full_name}</h1>
              <p className="mt-1 text-base-content/60">
                {application.grade_name} · {application.academic_year}
              </p>
            </div>
            <StatusBadge status={application.status} label={application.status_label} />
          </div>

          <TabsList
            aria-label="Secciones de la solicitud"
            className="mt-4 flex gap-1 overflow-x-auto border-t border-base-300 px-3 py-2"
          >
            <TabsTrigger value="formulario" className={tabTriggerClass}>
              Formulario
            </TabsTrigger>
            {STAGE_TABS.map((t) => {
              const locked = !reached.has(t.key);
              return (
                // El `title` va en el envoltorio: el botón deshabilitado no recibe el
                // puntero (`pointer-events-none`), así que no mostraría el aviso.
                <span key={t.key} title={locked ? t.lockedHint : undefined} className="shrink-0">
                  <TabsTrigger value={t.key} disabled={locked} className={tabTriggerClass}>
                    {locked && <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
                    {t.label}
                    {locked && <span className="sr-only"> ({t.lockedHint})</span>}
                  </TabsTrigger>
                </span>
              );
            })}
          </TabsList>
        </div>

        {/* Resultado de la decisión */}
        {application.result && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-5 ${
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
              <h2 className="font-display font-medium text-secondary">
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

        {/* Corrección pedida por el colegio: sin el comentario (llega por correo). Lo que
            hay que corregir queda marcado en el formulario y en los documentos. */}
        {correcting && (
          <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-5`}>
            <p className="text-base-content/80">
              Revisa lo marcado en el formulario y en los documentos, y envía las correcciones.
            </p>
            <button type="button" onClick={sendCorrections} disabled={sending} className={primaryBtnClass}>
              <BusyLabel busy={sending} busyText="Enviando…">
                <Send className="h-4 w-4" />
                Enviar correcciones
              </BusyLabel>
            </button>
          </div>
        )}

        <TabsContent value="formulario">
          <div className={`${cardClass} p-6`}>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className={titleClass}>Formulario de admisión</h2>
              <span className="text-sm text-base-content/60">
                {completed} de {SECTIONS.length} secciones
              </span>
            </div>

            <ul className="divide-y divide-base-300">
              {SECTIONS.map((section) => {
                const done = isFilled(application.data, section.key);
                const flagged = flaggedSections.has(section.key);
                return (
                  <li key={section.key} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
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
                        flagged ? "text-warning" : done ? "text-accent" : "text-base-content/60"
                      }`}
                    >
                      {flagged ? "Por corregir" : done ? "Guardada" : "Pendiente"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {editable ? (
              <div className="mt-5 border-t border-base-300 pt-5">
                <button
                  type="button"
                  onClick={() => go({ view: "form", id: application.id })}
                  className={primaryBtnClass}
                >
                  {completed === 0 ? "Diligenciar formulario" : "Continuar formulario"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="mt-5 border-t border-base-300 pt-5 text-sm text-base-content/60">
                Tu solicitud está en revisión del colegio, por eso el formulario ya no se puede
                editar. Te avisaremos por correo cuando haya novedades.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pago">
          <GuardianPaymentCard id={application.id} onChanged={load} />
        </TabsContent>

        <TabsContent value="documentos">
          <GuardianDocumentsCard id={application.id} onChanged={load} correcting={correcting} />
        </TabsContent>

        <TabsContent value="entrevistas">
          <GuardianInterviewsCard id={application.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

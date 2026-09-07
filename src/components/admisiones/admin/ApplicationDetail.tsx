/**
 * Modal de expediente del panel de staff de Admisiones.
 *
 * Paso 7 del refactor de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md): este
 * contenedor quedó delgado — arma el modal (3 franjas: header/cuerpo-con-scroll/footer),
 * resuelve permisos para decidir qué pestañas mostrar, y pasa props/callbacks a cada
 * pestaña extraída en `components/admisiones/admin/tabs/` (Solicitud, Validación, Pago,
 * Documentos) o ya existente como archivo propio (`InterviewsPanel` = Evaluación,
 * `DecisionPanel` = Decisión). El gateo por capability de cada pestaña
 * (`canValidate`/`canManagePayments`/`canReviewDocuments`/`canManageCommittee`/
 * `canDecide`) es EXACTAMENTE el mismo que antes de este paso, solo con
 * `@/components/ui/tabs` en vez de botones hechos a mano.
 *
 * Migra a `components/ui/Modal.tsx` (generalización de `AnimatedModal` de
 * `MatriculasAdmin.tsx`, ver ese archivo) para ganar la animación de entrada/salida y el
 * cierre-por-backdrop que no tenía antes. `useBodyScrollLock` sigue activo (ahora dentro
 * de `Modal`, no duplicado aquí).
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, AlertCircle, Trash2, RotateCcw } from "lucide-react";

import { apiFetch, apiUrl, API_ENDPOINTS } from "@/utils/api";
import { usePermissions } from "@/components/Login/loginLogic";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/Alert";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import { adminGhostBtnClass } from "@/components/ui/formStyles";
import { StatusBadge } from "@/components/admisiones/StatusBadge";
import { SolicitudTab } from "@/components/admisiones/admin/tabs/SolicitudTab";
import { ValidacionTab } from "@/components/admisiones/admin/tabs/ValidacionTab";
import { PagoTab } from "@/components/admisiones/admin/tabs/PagoTab";
import { DocumentosTab } from "@/components/admisiones/admin/tabs/DocumentosTab";
import { InterviewsPanel } from "@/components/admisiones/admin/InterviewsPanel";
import { DecisionPanel } from "@/components/admisiones/admin/DecisionPanel";
import type { PaymentInfo, DocumentRow } from "@/components/admisiones/admin/adminTypes";
import type { AdmissionApplication } from "@/components/admisiones/admissionTypes";

type Tab = "solicitud" | "validacion" | "pago" | "documentos" | "evaluacion" | "decision";

export function ApplicationDetail({
  code,
  isOpen,
  onClose,
  onChanged,
}: {
  code: string;
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const perms = usePermissions("admissions");

  const [tab, setTab] = useState<Tab>("solicitud");
  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmación de borrado (soft/hard)
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    acceptText: string;
    onAccept: () => void;
  } | null>(null);

  // Toast de feedback (hook compartido, Paso 1) + qué acción concreta está en curso
  // (para su spinner).
  const { toast, flash } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [appRes, payRes, docRes] = await Promise.all([
        apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code)),
        apiFetch(API_ENDPOINTS.admissionsPayment(code)),
        apiFetch(API_ENDPOINTS.admissionsDocuments(code)),
      ]);
      if (appRes.ok) setApplication(await appRes.json());
      if (payRes.ok) setPayment(await payRes.json());
      if (docRes.ok) setDocuments((await docRes.json()).documents ?? []);
    } catch {
      setError("No pudimos cargar el expediente.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  // El expediente se mantiene montado a través de aperturas/cierres (ver
  // pages/AdmisionesAdmin.tsx, así la animación de salida del Modal tiene tiempo de
  // reproducirse) — así que recarga desde cero cada vez que vuelve a abrirse (no solo al
  // montar), y reinicia a la pestaña "Solicitud" para que no quede en la última pestaña
  // vista del expediente anterior.
  useEffect(() => {
    if (!isOpen) return;
    setTab("solicitud");
    setConfirm(null);
    setLoading(true);
    load();
  }, [isOpen, load]);

  /** POST + recarga. `pendingKey` = qué botón muestra spinner; `successMsg` = toast al terminar. */
  const post = async (
    path: string,
    body: unknown,
    opts: { pendingKey?: string; successMsg?: string } = {},
  ) => {
    setBusy(true);
    setPending(opts.pendingKey ?? "busy");
    try {
      const res = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(
          "error",
          typeof data?.detail === "string" ? data.detail : "No se pudo completar la acción.",
        );
        return false;
      }
      await load();
      onChanged();
      if (opts.successMsg) flash("success", opts.successMsg);
      return true;
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
      return false;
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  /** Elimina el expediente (soft o hard). Al terminar cierra el modal. */
  const doDelete = async (hard: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const url = apiUrl(
        `${API_ENDPOINTS.admissionsApplicationByCode(code)}${hard ? "?hard=true" : ""}`,
      );
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        onChanged();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "No se pudo eliminar.");
      }
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  const doRestore = () =>
    post(API_ENDPOINTS.admissionsApplicationRestore(code), {}, {
      pendingKey: "restore",
      successMsg: "Expediente restaurado.",
    });

  // Las pestañas se muestran por permiso: un usuario asignado a una entrevista (sin
  // permisos de validación/pago) solo ve Solicitud, Documentos y Evaluación. Idéntico al
  // gateo anterior a este paso, solo que ahora alimenta @/components/ui/tabs.
  const TABS: { key: Tab; label: string }[] = [
    { key: "solicitud", label: "Solicitud" },
    ...(perms.canValidate ? [{ key: "validacion" as Tab, label: "Validación" }] : []),
    ...(perms.canManagePayments ? [{ key: "pago" as Tab, label: "Pago" }] : []),
    { key: "documentos", label: `Documentos (${documents.length})` },
    { key: "evaluacion", label: "Evaluación" },
    // La decisión solo la ve/gestiona el comité (rector/admin).
    ...(perms.canManageCommittee || perms.canDecide
      ? [{ key: "decision" as Tab, label: "Decisión" }]
      : []),
  ];

  return (
    <>
      {/* Toast de feedback (arriba a la derecha, por encima del modal). Va FUERA de
          <Modal>: el panel del modal se posiciona con `translate-x/y`, y ese `transform`
          crea un containing block nuevo para los descendientes `position: fixed` — si el
          toast (o el Alert de confirmación, más abajo) vivieran dentro, su `fixed inset-0`
          quedaría acotado al tamaño del panel en vez de a toda la ventana. Mismo patrón
          que MatriculasAdmin.tsx: Toast/Alert siempre como hermanos de AnimatedModal, nunca
          hijos. */}
      <Toast toast={toast} />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border-base-300 bg-base-100 p-0 gap-0 shadow-xl"
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          {/* Header */}
          <div className="shrink-0 border-b border-base-300 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-secondary">
                  {application?.applicant.full_name ?? "Expediente"}
                </h2>
                <p className="mt-0.5 text-sm text-base-content/60">
                  {application
                    ? `${application.grade_name} · ${application.academic_year} · ${application.code}`
                    : code}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {application && (
                  <StatusBadge status={application.status} label={application.status_label} />
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="rounded-full p-2 text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Pestañas */}
            <TabsList className="mt-4 flex gap-1">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:text-base-content/60 data-[state=inactive]:hover:bg-base-200"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Cuerpo — único con scroll (ver DESIGN_SYSTEM §12) */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-base-content/60">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Cargando expediente…
              </div>
            ) : (
              <>
                {error && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                    <span>{error}</span>
                  </div>
                )}

                <TabsContent value="solicitud">
                  {application && <SolicitudTab data={application.data} />}
                </TabsContent>

                <TabsContent value="validacion">
                  <ValidacionTab
                    code={code}
                    canValidate={Boolean(perms.canValidate)}
                    correctionComment={application?.correction_comment ?? null}
                    busy={busy}
                    pending={pending}
                    post={post}
                  />
                </TabsContent>

                <TabsContent value="pago">
                  <PagoTab
                    code={code}
                    payment={payment}
                    canManagePayments={Boolean(perms.canManagePayments)}
                    busy={busy}
                    pending={pending}
                    post={post}
                  />
                </TabsContent>

                <TabsContent value="documentos">
                  <DocumentosTab
                    code={code}
                    documents={documents}
                    canReviewDocuments={Boolean(perms.canReviewDocuments)}
                    busy={busy}
                    pending={pending}
                    post={post}
                  />
                </TabsContent>

                <TabsContent value="evaluacion">
                  <InterviewsPanel code={code} perms={perms} flash={flash} onChanged={onChanged} />
                </TabsContent>

                <TabsContent value="decision">
                  <DecisionPanel code={code} perms={perms} flash={flash} onChanged={onChanged} />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Pie: eliminar / restaurar (solo con permiso) */}
        {perms.canDelete && !loading && application && (
          <div className="shrink-0 border-t border-base-300 px-6 py-4">
            {application.is_deleted ? (
              <button
                type="button"
                onClick={doRestore}
                disabled={busy}
                className={`${adminGhostBtnClass} text-accent hover:bg-accent/10`}
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: "Eliminar solicitud",
                      message: `La solicitud de ${application.applicant.full_name} (${application.code}) se ocultará de los listados.`,
                      acceptText: "Eliminar",
                      onAccept: () => doDelete(false),
                    })
                  }
                  className={`${adminGhostBtnClass} text-error hover:bg-error/10`}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: "Eliminar permanentemente",
                      message: `Esto borra la solicitud de ${application.applicant.full_name} (${application.code}), con sus pagos, documentos y archivos. No se puede deshacer.`,
                      acceptText: "Eliminar para siempre",
                      onAccept: () => doDelete(true),
                    })
                  }
                  className={`${adminGhostBtnClass} text-error hover:bg-error/10`}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar permanentemente
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmación de borrado (soft/hard) — fuera de <Modal> por la misma razón que
          el toast de arriba (containing block del `transform` del panel). */}
      {confirm && (
        <Alert
          isOpen={true}
          onClose={() => setConfirm(null)}
          onAccept={() => {
            const cb = confirm.onAccept;
            setConfirm(null);
            cb();
          }}
          title={confirm.title}
          variant="error"
          acceptText={confirm.acceptText}
          cancelText="Cancelar"
          acceptButtonVariant="destructive"
        >
          <p className="text-base-content/80">{confirm.message}</p>
        </Alert>
      )}
    </>
  );
}

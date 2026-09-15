/**
 * Modal de expediente del panel de staff de Admisiones.
 *
 * Paso 7 del refactor de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md): este
 * contenedor quedó delgado — arma el modal (3 franjas: header/cuerpo-con-scroll/footer),
 * resuelve permisos para decidir qué pestañas mostrar, y pasa props/callbacks a cada
 * pestaña extraída en `components/admisiones/admin/tabs/` (Solicitud, Validación, Pago,
 * Documentos) o con archivo propio (`ValoracionTab` = asignación, actividades de la
 * valoración GIMPA AVANZA y decisión de la rectora). Las pestañas se muestran por
 * capability (`canValidate`/`canManagePayments`/`canReviewDocuments`).
 *
 * Migra a `components/ui/Modal.tsx` (generalización de `AnimatedModal` de
 * `MatriculasAdmin.tsx`, ver ese archivo) para ganar la animación de entrada/salida y el
 * cierre-por-backdrop que no tenía antes. `useBodyScrollLock` sigue activo (ahora dentro
 * de `Modal`, no duplicado aquí).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, AlertCircle, Trash2, RotateCcw, Undo2 } from "lucide-react";

import { apiFetch, apiUrl, API_ENDPOINTS } from "@/utils/api";
import { usePermissions } from "@/components/Login/loginLogic";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import { iconBtnClass, iconClass, iconHover, tabTriggerClass } from "@/components/ui/formStyles";
import { StatusBadge } from "@/components/admisiones/StatusBadge";
import { titleClass } from "@/components/ui/textStyles";
import { ResumenTab } from "@/components/admisiones/admin/tabs/ResumenTab";
import { SolicitudTab } from "@/components/admisiones/admin/tabs/SolicitudTab";
import { AvanzarTab } from "@/components/admisiones/admin/tabs/AvanzarTab";
import { AdvanceDialog } from "@/components/admisiones/admin/AdvanceDialog";
import {
  CorrectionDialog,
  type CorrectionKind,
  type CorrectionOptions,
} from "@/components/admisiones/admin/CorrectionDialog";
import { PagoTab } from "@/components/admisiones/admin/tabs/PagoTab";
import { DocumentosTab } from "@/components/admisiones/admin/tabs/DocumentosTab";
import { ValoracionTab } from "@/components/admisiones/admin/ValoracionTab";
import type { PaymentInfo, DocumentRow } from "@/components/admisiones/admin/adminTypes";
import type { AdmissionApplication } from "@/components/admisiones/admissionTypes";

type Tab = "resumen" | "solicitud" | "pago" | "documentos" | "valoracion" | "avanzar";

/** Estados a los que se llega al validar el pago o el último documento: ahí se pregunta a
 * qué paso enviar al aspirante (nada avanza solo, ver `advance_service`). */
const ASK_NEXT_STEP = new Set(["PAGO_VALIDADO", "EXENTO_PAGO", "DOCUMENTOS_COMPLETOS"]);

/** La pestaña "Avanzar" se distingue del resto: es donde la rectora mueve el proceso. */
const advanceTabClass =
  "ml-auto shrink-0 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-accent data-[state=active]:text-accent-content data-[state=inactive]:bg-accent/10 data-[state=inactive]:text-accent data-[state=inactive]:hover:bg-accent/20";

export function ApplicationDetail({
  id,
  isOpen,
  onClose,
  onChanged,
}: {
  id: number;
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const perms = usePermissions("admissions");

  const [tab, setTab] = useState<Tab>("resumen");
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
    confirmText: string;
    /** `false`: se puede restaurar (no se muestra "Este cambio es irreversible."). */
    irreversible: boolean;
    onConfirm: () => Promise<boolean>;
  } | null>(null);

  // Toast de feedback (hook compartido, Paso 1) + qué acción concreta está en curso
  // (para su spinner).
  const { toast, flash } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  // Diálogo "¿A qué paso lo envías?": se abre cuando una acción dentro del expediente
  // (validar el pago o el último documento) deja la solicitud en un estado de `ASK_NEXT_STEP`.
  // `prevStatus` es `null` al abrir el expediente, así que abrirlo no dispara el diálogo.
  const [askNextStep, setAskNextStep] = useState(false);
  const prevStatus = useRef<string | null>(null);

  // Pie del expediente: una pestaña puede poner ahí sus acciones (p. ej. "Guardar
  // asignación" de Valoración) con un portal a `footerSlot`, en vez de un recuadro propio
  // dentro del modal. `footerInUse` muestra el pie aunque no haya botones de eliminar.
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
  const [footerInUse, setFooterInUse] = useState(false);

  // "Solicitar corrección" vive en la pestaña que se revisa (Solicitud → datos,
  // Documentos → documentos), con su botón en el pie. `correction` = qué se puede pedir.
  const [correction, setCorrection] = useState<CorrectionOptions | null>(null);
  const [correcting, setCorrecting] = useState<CorrectionKind | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [appRes, payRes, docRes, corrRes] = await Promise.all([
        apiFetch(API_ENDPOINTS.admissionsApplication(id)),
        apiFetch(API_ENDPOINTS.admissionsPayment(id)),
        apiFetch(API_ENDPOINTS.admissionsDocuments(id)),
        perms.canValidate ? apiFetch(API_ENDPOINTS.admissionsCorrection(id)) : Promise.resolve(null),
      ]);
      if (appRes.ok) {
        const app: AdmissionApplication = await appRes.json();
        if (prevStatus.current && prevStatus.current !== app.status && ASK_NEXT_STEP.has(app.status)
            && perms.canValidate) {
          setAskNextStep(true);
        }
        prevStatus.current = app.status;
        setApplication(app);
      }
      if (payRes.ok) setPayment(await payRes.json());
      if (docRes.ok) setDocuments((await docRes.json()).documents ?? []);
      setCorrection(corrRes?.ok ? await corrRes.json() : null);
    } catch {
      setError("No pudimos cargar el expediente.");
    } finally {
      setLoading(false);
    }
  }, [id, perms.canValidate]);

  // El expediente se mantiene montado a través de aperturas/cierres (ver
  // components/admisiones/AdmisionesAdmin.tsx, así la animación de salida del Modal tiene tiempo de
  // reproducirse) — así que recarga desde cero cada vez que vuelve a abrirse (no solo al
  // montar), y reinicia a la pestaña "Resumen" para que no quede en la última pestaña
  // vista del expediente anterior.
  useEffect(() => {
    if (!isOpen) return;
    setTab("resumen");
    setConfirm(null);
    setAskNextStep(false);
    setCorrecting(null);
    prevStatus.current = null;
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

  /** Elimina el expediente (soft o hard). Al terminar cierra el modal. `false` = falló
   * (la confirmación queda abierta para reintentar). */
  const doDelete = async (hard: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const url = apiUrl(
        `${API_ENDPOINTS.admissionsApplication(id)}${hard ? "?hard=true" : ""}`,
      );
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        flash("success", hard ? "Solicitud eliminada permanentemente" : "Solicitud eliminada");
        onChanged();
        onClose();
        return true;
      }
      const data = await res.json().catch(() => ({}));
      flash("error", typeof data?.detail === "string" ? data.detail : "No se pudo eliminar.");
      return false;
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const doRestore = () =>
    post(API_ENDPOINTS.admissionsApplicationRestore(id), {}, {
      pendingKey: "restore",
      successMsg: "Expediente restaurado.",
    });

  // Las pestañas se muestran por permiso: la psicóloga o el docente asignados (sin
  // permisos de validación/pago) solo ven Solicitud, Documentos y Valoración.
  const TABS: { key: Tab; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "solicitud", label: "Solicitud" },
    ...(perms.canManagePayments ? [{ key: "pago" as Tab, label: "Pago" }] : []),
    { key: "documentos", label: `Documentos (${documents.length})` },
    { key: "valoracion", label: "Valoración" },
    // Al final, a la derecha y en otro color (ver `advanceTabClass`).
    ...(perms.canValidate ? [{ key: "avanzar" as Tab, label: "Avanzar" }] : []),
  ];

  const correctionKind: CorrectionKind | null =
    tab === "solicitud" ? "sections" : tab === "documentos" ? "documents" : null;
  const correctionItems =
    correctionKind && correction?.available && application && !application.is_deleted
      ? correction[correctionKind]
      : [];
  const showCorrection = !loading && correctionItems.length > 0;

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
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border-base-300 bg-base-100 p-0 gap-0 shadow-xl"
      >
        {/* `flex min-h-0 flex-1 flex-col`: sin esto el contenedor de pestañas crece con
            su contenido, el cuerpo nunca activa su scroll y el modal corta lo que sobra
            (mismo patrón que EnrollmentDetail de Matrículas). */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-base-300 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className={`leading-tight ${titleClass}`}>
                  {application?.applicant.full_name ?? "Expediente"}
                </h2>
                <p className="mt-1 text-sm text-base-content/70">
                  {application
                    ? `${application.grade_name} · ${application.academic_year}`
                    : "Cargando…"}
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
                  title="Cerrar"
                  className={`${iconBtnClass} ${iconHover.neutral}`}
                >
                  <X className={iconClass} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Pestañas */}
            <TabsList className="mt-4 flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className={t.key === "avanzar" ? advanceTabClass : tabTriggerClass}
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

                <TabsContent value="resumen">
                  {application && <ResumenTab application={application} />}
                </TabsContent>

                <TabsContent value="solicitud">
                  {application && <SolicitudTab data={application.data} />}
                </TabsContent>

                <TabsContent value="pago">
                  <PagoTab
                    id={id}
                    payment={payment}
                    canManagePayments={Boolean(perms.canManagePayments)}
                    busy={busy}
                    pending={pending}
                    post={post}
                  />
                </TabsContent>

                <TabsContent value="documentos">
                  <DocumentosTab
                    id={id}
                    documents={documents}
                    canReviewDocuments={Boolean(perms.canReviewDocuments)}
                    busy={busy}
                    pending={pending}
                    post={post}
                  />
                </TabsContent>

                <TabsContent value="avanzar">
                  {application && (
                    <AvanzarTab
                      id={id}
                      status={application.status}
                      canDecide={Boolean(perms.canDecide)}
                      flash={flash}
                      onChanged={() => {
                        load();
                        onChanged();
                      }}
                    />
                  )}
                </TabsContent>

                <TabsContent value="valoracion">
                  <ValoracionTab
                    id={id}
                    perms={perms}
                    flash={flash}
                    footerSlot={footerSlot}
                    onFooterInUse={setFooterInUse}
                    onChanged={() => {
                      load();
                      onChanged();
                    }}
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Pie: eliminar / restaurar (con permiso) y, a la derecha, las acciones que ponga
            la pestaña abierta (ver `footerSlot`). */}
        <div
          className={
            (perms.canDelete && !loading && application) || footerInUse || showCorrection
              ? "flex shrink-0 flex-wrap items-center gap-3 border-t border-base-300 px-6 py-4"
              : "hidden"
          }
        >
          {perms.canDelete && !loading && application && (
            <div>
              {application.is_deleted ? (
                <button
                  type="button"
                  onClick={doRestore}
                  disabled={busy}
                  className="btn btn-outline btn-accent gap-2"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
                        message: `La solicitud de ${application.applicant.full_name} se ocultará de los listados. Se puede restaurar más adelante.`,
                        confirmText: "Eliminar solicitud",
                        irreversible: false,
                        onConfirm: () => doDelete(false),
                      })
                    }
                    className="btn btn-outline btn-error gap-2"
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
                        message: `Se borrará la solicitud de ${application.applicant.full_name}, con sus pagos, documentos y archivos.`,
                        confirmText: "Eliminar permanentemente",
                        irreversible: true,
                        onConfirm: () => doDelete(true),
                      })
                    }
                    className="btn btn-outline btn-error gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar permanentemente
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {showCorrection && (
              <button
                type="button"
                onClick={() => setCorrecting(correctionKind)}
                disabled={busy}
                className="btn btn-outline btn-warning gap-2"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Solicitar corrección
              </button>
            )}
            <div ref={setFooterSlot} className="flex flex-wrap items-center gap-3" />
          </div>
        </div>
      </Modal>

      {/* ¿A qué paso se envía al aspirante? (tras validar el pago o el último documento).
          Fuera de <Modal> por la misma razón que el toast. */}
      <AdvanceDialog
        id={id}
        isOpen={askNextStep}
        onClose={() => setAskNextStep(false)}
        onDone={() => {
          setAskNextStep(false);
          load();
          onChanged();
        }}
        flash={flash}
      />

      {/* Solicitar corrección (fuera de <Modal>, igual que el toast). */}
      {correcting && correction && (
        <CorrectionDialog
          id={id}
          kind={correcting}
          options={correction[correcting]}
          isOpen
          onClose={() => setCorrecting(null)}
          onDone={() => {
            setCorrecting(null);
            load();
            onChanged();
          }}
          flash={flash}
        />
      )}

      {/* Confirmación de borrado (soft/hard) — fuera de <Modal> por la misma razón que
          el toast de arriba (containing block del `transform` del panel). */}
      {confirm && (
        <ConfirmDeleteDialog
          isOpen
          onClose={() => setConfirm(null)}
          onConfirm={confirm.onConfirm}
          title={confirm.title}
          confirmText={confirm.confirmText}
          irreversible={confirm.irreversible}
        >
          <p>{confirm.message}</p>
        </ConfirmDeleteDialog>
      )}
    </>
  );
}

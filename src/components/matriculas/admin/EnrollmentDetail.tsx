/**
 * Detalle de una matrícula para el staff (Matrícula v2): cabecera con el estudiante,
 * pestañas (Resumen, Datos, Documentos, Correcciones) y, al pie, las acciones que
 * permite el backend (`allowed_actions`). Nada se decide aquí sobre qué transición
 * procede: si el backend no la lista, el botón no aparece.
 *
 * Modal de 3 franjas (DESIGN_SYSTEM §12). Los diálogos de acción, las confirmaciones
 * (`Alert`) van FUERA del panel: el `transform` del panel acotaría su `position: fixed`.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Archive,
  Ban,
  Check,
  Loader2,
  RotateCcw,
  Undo2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  ApiError,
  enrollmentApi,
  openDocument,
  type DocumentStatus,
  type EnrollmentDetail as EnrollmentDetailData,
  type EnrollmentDocument,
  type GradeInfo,
  type StaffAction,
} from "@/components/matriculas/enrollmentApi";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ghostBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { titleClass } from "@/components/ui/textStyles";
import { getStatusBadgeClass, getStatusLabel, INACTIVE_REASON_LABELS } from "@/utils/statusHelpers";
import { ChangeGradeDialog, InactivateDialog, ReasonDialog, ReturnDialog } from "./ActionDialogs";
import { CorrectionsTab } from "./CorrectionsTab";
import { DocumentsTab } from "./DocumentsTab";
import { ProfileTab } from "./ProfileTab";
import { StudentAvatar } from "./StudentAvatar";
import { SummaryTab } from "./SummaryTab";
import { errorMessage, type FlashFn } from "./shared";

type Tab = "resumen" | "datos" | "documentos" | "correcciones";
type DialogKind = "return" | "reject" | "cancel" | "inactivate" | "grade";
type Confirm = { kind: "approve" } | { kind: "reactivate" } | { kind: "delete"; doc: EnrollmentDocument };

/** En estos estados el staff ya no toca archivos. */
const FROZEN_STATUSES = new Set(["REJECTED", "CANCELLED", "INACTIVE"]);

const REVIEW_MESSAGES: Partial<Record<DocumentStatus, string>> = {
  APPROVED: "Documento aprobado",
  REJECTED: "Documento rechazado",
  NOT_APPLICABLE: "Documento marcado como «no aplica»",
  UPLOADED: "Revisión deshecha",
};

const TAB_CLASS =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:text-base-content/60 data-[state=inactive]:hover:bg-base-200";

/** Rechazar / Cancelar / Inactivar: con contorno, como "Solicitar corrección". */
const dangerBtnClass = "btn btn-outline btn-error gap-2";

interface EnrollmentDetailProps {
  enrollmentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  /** Algo cambió en la matrícula: el listado se recarga. */
  onChanged: () => void;
  flash: FlashFn;
  grades: GradeInfo[];
  canApprove: boolean;
  canEditMedical: boolean;
}

export function EnrollmentDetail({
  enrollmentId,
  isOpen,
  onClose,
  onChanged,
  flash,
  grades,
  canApprove,
  canEditMedical,
}: EnrollmentDetailProps) {
  const titleId = useId();
  const [detail, setDetail] = useState<EnrollmentDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("resumen");
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [pending, setPending] = useState<StaffAction | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  // Descarta respuestas de una matrícula que ya no es la abierta.
  const activeId = useRef<number | null>(null);

  const load = useCallback(async (id: number) => {
    activeId.current = id;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await enrollmentApi.detail(id);
      if (activeId.current === id) setDetail(data);
    } catch (error) {
      if (activeId.current === id) setLoadError(errorMessage(error, "No se pudo cargar la matrícula."));
    } finally {
      if (activeId.current === id) setLoading(false);
    }
  }, []);

  // El componente sigue montado entre aperturas (para la animación de salida): cada
  // apertura empieza de cero.
  useEffect(() => {
    if (!isOpen || enrollmentId === null) return;
    setTab("resumen");
    setDialog(null);
    setConfirm(null);
    setDetail(null);
    load(enrollmentId);
  }, [isOpen, enrollmentId, load]);

  /** Recarga silenciosa tras un cambio (sin tapar el detalle con el spinner). */
  const refresh = async (id: number) => {
    try {
      const data = await enrollmentApi.detail(id);
      if (activeId.current === id) setDetail(data);
    } catch {
      /* se queda lo que había; el toast ya explicó el error */
    }
  };

  // Con un diálogo o una confirmación encima, Escape y el fondo cierran solo ese.
  const handleClose = () => {
    if (dialog || confirm) return;
    onClose();
  };

  const actions = detail?.allowed_actions ?? [];
  const can = (action: StaffAction) => actions.includes(action);
  const busy = pending !== null || busyDoc !== null;
  const pendingDocs = detail ? detail.documents.filter((doc) => detail.pending_documents.includes(doc.key)) : [];
  const hiddenPending = detail ? detail.pending_documents.length - pendingDocs.length : 0;
  const filesEditable = detail ? !FROZEN_STATUSES.has(detail.status) : false;

  const runAction = async (action: StaffAction, call: () => Promise<EnrollmentDetailData>, success: string) => {
    if (!detail) return;
    setPending(action);
    try {
      const updated = await call();
      setDetail(updated);
      setDialog(null);
      onChanged();
      flash("success", success);
    } catch (error) {
      flash("error", errorMessage(error));
      // 409: la matrícula cambió de estado en otro lado; se muestra como está ahora.
      if (error instanceof ApiError && error.status === 409) {
        setDialog(null);
        refresh(detail.id);
      }
    } finally {
      setPending(null);
    }
  };

  const runDocument = async (doc: EnrollmentDocument, call: () => Promise<unknown>, success: string) => {
    if (!detail) return false;
    setBusyDoc(doc.key);
    try {
      await call();
      flash("success", success);
      onChanged();
      await refresh(detail.id);
      return true;
    } catch (error) {
      flash("error", errorMessage(error));
      return false;
    } finally {
      setBusyDoc(null);
    }
  };

  const footerButton = (
    action: StaffAction,
    label: string,
    pendingLabel: string,
    icon: LucideIcon,
    className: string,
    onClick: () => void,
  ) => {
    const Icon = icon;
    return (
      <button type="button" className={className} disabled={busy} onClick={onClick}>
        {pending === action ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          <>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </>
        )}
      </button>
    );
  };

  const closingActions = can("reject") || can("cancel") || can("inactivate");
  const forwardActions = can("change_grade") || can("return") || can("approve") || can("reactivate");

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        labelledBy={titleId}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border-base-300 bg-base-100 p-0 gap-0 shadow-xl"
      >
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="flex min-h-0 flex-1 flex-col">
          {/* Cabecera */}
          <div className="shrink-0 border-b border-base-300 px-6 pt-5 pb-3">
            <div className="flex items-start gap-4">
              <StudentAvatar name={detail?.student_name ?? ""} photoUrl={detail?.student.photo_url} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className={`leading-tight ${titleClass}`}>
                  {detail?.student_name ?? "Matrícula"}
                </h2>
                {detail && (
                  <>
                    <p className="truncate text-sm text-base-content/60">{detail.student.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-base-content/70">
                      <span className={`badge whitespace-nowrap ${getStatusBadgeClass(detail.status)}`}>
                        {getStatusLabel(detail.status)}
                        {detail.status === "INACTIVE" &&
                          detail.inactive_reason &&
                          ` · ${INACTIVE_REASON_LABELS[detail.inactive_reason]}`}
                      </span>
                      {detail.status === "ACTIVE" && detail.has_pending_documents && (
                        <span className="badge badge-warning badge-soft whitespace-nowrap">Documentos pendientes</span>
                      )}
                      <span>
                        {detail.grade.label} · {detail.academic_year} · {detail.origin_label}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar"
                title="Cerrar"
                className="shrink-0 rounded-full p-2 text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {detail && (
              <TabsList aria-label="Secciones de la matrícula" className="mt-4 flex gap-1 overflow-x-auto">
                <TabsTrigger value="resumen" className={TAB_CLASS}>
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="datos" className={TAB_CLASS}>
                  Datos
                </TabsTrigger>
                <TabsTrigger value="documentos" className={TAB_CLASS}>
                  Documentos
                  {detail.pending_documents.length > 0 && (
                    <span className="badge badge-xs badge-warning badge-soft ml-1.5">
                      {detail.pending_documents.length}
                      <span className="sr-only"> pendientes</span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="correcciones" className={TAB_CLASS}>
                  Correcciones
                  {detail.corrections.length > 0 && (
                    <span className="badge badge-xs badge-ghost ml-1.5">{detail.corrections.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            )}
          </div>

          {/* Cuerpo: único con scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading && !detail ? (
              <LoadingState compact className="py-16" label="Cargando matrícula…" />
            ) : loadError && !detail ? (
              <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="h-6 w-6 text-error" aria-hidden="true" />
                <p className="text-sm text-base-content/80">{loadError}</p>
                {enrollmentId !== null && (
                  <button type="button" className={ghostBtnClass} onClick={() => load(enrollmentId)}>
                    Reintentar
                  </button>
                )}
              </div>
            ) : detail ? (
              <>
                <TabsContent value="resumen">
                  <SummaryTab detail={detail} />
                </TabsContent>
                <TabsContent value="datos">
                  <ProfileTab detail={detail} />
                </TabsContent>
                <TabsContent value="documentos">
                  <DocumentsTab
                    detail={detail}
                    canReview={can("review_documents")}
                    canUpload={(doc) =>
                      filesEditable && (canApprove || (doc.sensitivity === "medical" && canEditMedical))
                    }
                    canDelete={canApprove && filesEditable}
                    busyKey={busyDoc}
                    flash={flash}
                    onOpen={(doc) =>
                      openDocument(detail.id, doc.key).catch((error) =>
                        flash("error", errorMessage(error, "No se pudo abrir el documento.")),
                      )
                    }
                    onReview={(doc, status, reason) =>
                      runDocument(
                        doc,
                        () => enrollmentApi.reviewDocument(detail.id, doc.key, status, reason),
                        REVIEW_MESSAGES[status] ?? "Documento actualizado",
                      )
                    }
                    onUpload={(doc, file) =>
                      runDocument(
                        doc,
                        () => enrollmentApi.uploadDocument(detail.id, doc.key, file),
                        doc.has_file ? "Archivo reemplazado" : "Archivo subido",
                      )
                    }
                    onDelete={(doc) => setConfirm({ kind: "delete", doc })}
                  />
                </TabsContent>
                <TabsContent value="correcciones">
                  <CorrectionsTab detail={detail} />
                </TabsContent>
              </>
            ) : null}
          </div>
        </Tabs>

        {/* Pie: solo las acciones que permite el backend */}
        {detail && (closingActions || forwardActions) && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {can("reject") &&
                footerButton("reject", "Rechazar", "Rechazando…", XCircle, dangerBtnClass, () => setDialog("reject"))}
              {can("cancel") &&
                footerButton("cancel", "Cancelar", "Cancelando…", Ban, dangerBtnClass, () => setDialog("cancel"))}
              {can("inactivate") &&
                footerButton("inactivate", "Inactivar", "Inactivando…", Archive, dangerBtnClass, () =>
                  setDialog("inactivate"),
                )}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {can("change_grade") &&
                footerButton("change_grade", "Cambiar grado", "Cambiando…", ArrowRightLeft, ghostBtnClass, () =>
                  setDialog("grade"),
                )}
              {can("return") &&
                footerButton(
                  "return",
                  "Solicitar corrección",
                  "Solicitando…",
                  Undo2,
                  "btn btn-outline btn-warning gap-2",
                  () => setDialog("return"),
                )}
              {can("reactivate") &&
                footerButton("reactivate", "Reintegrar", "Reintegrando…", RotateCcw, primaryBtnClass, () =>
                  setConfirm({ kind: "reactivate" }),
                )}
              {can("approve") &&
                footerButton("approve", "Aprobar", "Aprobando…", Check, primaryBtnClass, () =>
                  setConfirm({ kind: "approve" }),
                )}
            </div>
          </div>
        )}
      </Modal>

      {detail && (
        <>
          <ReturnDialog
            isOpen={dialog === "return"}
            pending={pending === "return"}
            documents={detail.documents}
            onClose={() => setDialog(null)}
            onSubmit={(comment, rejected) =>
              runAction(
                "return",
                () => enrollmentApi.returnForCorrection(detail.id, comment, rejected),
                "Corrección solicitada",
              )
            }
          />
          <ReasonDialog
            kind="reject"
            isOpen={dialog === "reject"}
            pending={pending === "reject"}
            onClose={() => setDialog(null)}
            onSubmit={(reason) => runAction("reject", () => enrollmentApi.reject(detail.id, reason), "Matrícula rechazada")}
          />
          <ReasonDialog
            kind="cancel"
            isOpen={dialog === "cancel"}
            pending={pending === "cancel"}
            onClose={() => setDialog(null)}
            onSubmit={(reason) => runAction("cancel", () => enrollmentApi.cancel(detail.id, reason), "Matrícula cancelada")}
          />
          <InactivateDialog
            isOpen={dialog === "inactivate"}
            pending={pending === "inactivate"}
            onClose={() => setDialog(null)}
            onSubmit={(inactiveReason, reason) =>
              runAction(
                "inactivate",
                () => enrollmentApi.inactivate(detail.id, inactiveReason, reason),
                "Matrícula inactivada",
              )
            }
          />
          <ChangeGradeDialog
            isOpen={dialog === "grade"}
            enrollment={detail}
            grades={grades}
            onClose={() => setDialog(null)}
            onChanged={(updated) => {
              setDetail(updated);
              setDialog(null);
              onChanged();
              flash("success", `Grado cambiado a ${updated.grade.label}`);
            }}
          />
        </>
      )}

      {/* Confirmaciones (fuera del panel, ver cabecera) */}
      {detail && confirm?.kind === "approve" && (
        <Alert
          isOpen
          onClose={() => setConfirm(null)}
          onAccept={() => {
            setConfirm(null);
            const count = detail.pending_documents.length;
            runAction(
              "approve",
              () => enrollmentApi.approve(detail.id),
              count
                ? `Matrícula aprobada con ${count} ${count === 1 ? "documento pendiente" : "documentos pendientes"}`
                : "Matrícula aprobada",
            );
          }}
          title="Aprobar matrícula"
          variant={detail.pending_documents.length ? "warning" : "success"}
          acceptText="Aprobar matrícula"
          cancelText="Cancelar"
        >
          <p>
            La matrícula de <strong>{detail.student_name}</strong> para {detail.grade.label} {detail.academic_year}{" "}
            quedará aprobada. La ficha, el acudiente y la foto pasan a la cuenta del estudiante y se envía un correo
            de confirmación. Si tenía otra matrícula aprobada, esa queda inactiva.
          </p>
          {detail.pending_documents.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="font-medium text-base-content">
                Se aprobará con {detail.pending_documents.length}{" "}
                {detail.pending_documents.length === 1 ? "documento pendiente" : "documentos pendientes"}:
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm">
                {pendingDocs.map((doc) => (
                  <li key={doc.key}>{doc.label}</li>
                ))}
                {hiddenPending > 0 && <li>{hiddenPending} más que tu rol no puede ver</li>}
              </ul>
              <p className="mt-2 text-sm text-base-content/70">
                El correo de aprobación los lista y el estudiante los puede subir desde su matrícula.
              </p>
            </div>
          )}
        </Alert>
      )}

      {detail && confirm?.kind === "reactivate" && (
        <Alert
          isOpen
          onClose={() => setConfirm(null)}
          onAccept={() => {
            setConfirm(null);
            runAction("reactivate", () => enrollmentApi.reactivate(detail.id), "Matrícula reintegrada");
          }}
          title="Reintegrar estudiante"
          variant="info"
          acceptText="Reintegrar"
          cancelText="Cancelar"
        >
          <p>
            La matrícula {detail.academic_year} de <strong>{detail.student_name}</strong> vuelve a quedar aprobada.
          </p>
        </Alert>
      )}

      {detail && confirm?.kind === "delete" && (
        <Alert
          isOpen
          onClose={() => setConfirm(null)}
          onAccept={() => {
            const { doc } = confirm;
            setConfirm(null);
            runDocument(doc, () => enrollmentApi.deleteDocument(detail.id, doc.key), "Archivo eliminado");
          }}
          title="Eliminar archivo"
          variant="error"
          acceptText="Eliminar archivo"
          cancelText="Cancelar"
          acceptButtonVariant="destructive"
        >
          <p>
            Se borrará el archivo de <strong>{confirm.doc.label}</strong>
            {confirm.doc.original_name ? ` (${confirm.doc.original_name})` : ""}.{" "}
            {confirm.doc.required ? "Como es obligatorio, quedará pendiente de subir. " : ""}No se puede deshacer.
          </p>
        </Alert>
      )}
    </>
  );
}

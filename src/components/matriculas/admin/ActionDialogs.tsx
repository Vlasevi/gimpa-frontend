/**
 * Diálogos de las acciones del staff sobre una matrícula (devolver, rechazar, anular,
 * inactivar, cambiar grado). Todos comparten `ActionDialog`: modal de 3 franjas, título
 * que nombra al diálogo, campos obligatorios con etiqueta visible y botón de envío con
 * `Loader2` + gerundio, deshabilitado mientras el formulario no es válido.
 *
 * Se montan sobre el detalle de la matrícula, que también es un `Modal`: por eso van
 * dentro de un contenedor `z-[55]` (encima del panel del detalle, `z-50`) y no se
 * cierran con el fondo, para no perder lo escrito.
 */

import { useEffect, useId, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { ghostBtnClass, labelClass, primaryBtnClass, textareaClass, inputClass } from "@/components/ui/formStyles";
import UserEnroll from "@/components/auxiliar/userEnroll";
import type { EnrollmentDetail, EnrollmentDocument, GradeInfo } from "@/components/matriculas/enrollmentApi";
import { getDocumentStatusBadgeClass, getDocumentStatusLabel } from "@/utils/statusHelpers";

const PANEL_CLASS =
  "max-h-[90vh] max-w-lg overflow-hidden rounded-lg border-base-300 bg-base-100 p-0 gap-0 shadow-xl";

const noop = () => {};

// --------------------------------------------------------------------- Marco común

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  submitClassName?: string;
  pending: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  children: ReactNode;
}

export function ActionDialog({
  isOpen,
  onClose,
  title,
  description,
  submitLabel,
  pendingLabel,
  submitClassName = primaryBtnClass,
  pending,
  canSubmit,
  onSubmit,
  children,
}: ActionDialogProps) {
  const titleId = useId();

  return (
    <div className="relative z-[55]">
      <Modal
        isOpen={isOpen}
        onClose={pending ? noop : onClose}
        closeOnBackdrop={false}
        labelledBy={titleId}
        className={PANEL_CLASS}
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit && !pending) onSubmit();
          }}
        >
          <div className="shrink-0 border-b border-base-300 px-6 py-4">
            <h2 id={titleId} className="font-display text-lg font-bold text-secondary">
              {title}
            </h2>
            {description && (
              <div className="mt-1 text-sm text-base-content/60">
                {description}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-base-300 px-6 py-4 sm:flex-row sm:justify-end">
            <button type="button" className={ghostBtnClass} onClick={onClose} disabled={pending}>
              Cancelar
            </button>
            <button type="submit" className={submitClassName} disabled={!canSubmit || pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {pendingLabel}
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --------------------------------------------------------------------- Campo de texto

/** Texto obligatorio con etiqueta, ayuda y error (`aria-describedby`) tras tocarlo. */
function RequiredText({
  label,
  value,
  onChange,
  hint,
  errorText,
  multiline = true,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  errorText: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const showError = touched && !value.trim();
  const describedBy = [hint && `${id}-hint`, showError && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    value,
    required: true,
    autoFocus,
    "aria-invalid": showError || undefined,
    "aria-describedby": describedBy,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    onBlur: () => setTouched(true),
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} <span className="text-error" aria-hidden="true">*</span>
      </label>
      {multiline ? (
        <textarea {...common} rows={4} className={`${textareaClass} ${showError ? "textarea-error" : ""}`} />
      ) : (
        <input {...common} type="text" className={`${inputClass} ${showError ? "input-error" : ""}`} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-base-content/50">
          {hint}
        </p>
      )}
      {showError && (
        <p id={`${id}-error`} className="mt-1 text-xs text-error">
          {errorText}
        </p>
      )}
    </div>
  );
}

// --------------------------------------------------------------------- Rechazar / Anular

const REASON_DIALOGS = {
  reject: {
    title: "Rechazar matrícula",
    description:
      "El rechazo es definitivo: la matrícula queda cerrada y el acudiente recibe un correo con el motivo. Si el estudiante quiere volver a intentarlo, hay que crearle una matrícula nueva.",
    label: "Motivo del rechazo",
    hint: "El acudiente lo verá en el correo.",
    submitLabel: "Rechazar matrícula",
    pendingLabel: "Rechazando…",
  },
  cancel: {
    title: "Anular matrícula",
    description:
      "Cierra la matrícula sin decidir sobre ella, por ejemplo si la familia no continúa. Es definitivo y no se envía correo. Si más adelante sigue el proceso, hay que crearle una matrícula nueva.",
    label: "Motivo de la anulación",
    hint: "Queda registrado en la matrícula.",
    submitLabel: "Anular matrícula",
    pendingLabel: "Anulando…",
  },
} as const;

export function ReasonDialog({
  kind,
  isOpen,
  pending,
  onClose,
  onSubmit,
}: {
  kind: keyof typeof REASON_DIALOGS;
  isOpen: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const config = REASON_DIALOGS[kind];
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <ActionDialog
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      description={config.description}
      submitLabel={config.submitLabel}
      pendingLabel={config.pendingLabel}
      submitClassName="btn btn-error gap-2"
      pending={pending}
      canSubmit={Boolean(reason.trim())}
      onSubmit={() => onSubmit(reason.trim())}
    >
      <RequiredText
        label={config.label}
        value={reason}
        onChange={setReason}
        hint={config.hint}
        errorText="Escribe el motivo."
        autoFocus
      />
    </ActionDialog>
  );
}

// --------------------------------------------------------------------- Devolver

export function ReturnDialog({
  isOpen,
  pending,
  documents,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  pending: boolean;
  documents: EnrollmentDocument[];
  onClose: () => void;
  onSubmit: (comment: string, rejected: { key: string; reason: string }[]) => void;
}) {
  const [comment, setComment] = useState("");
  // key → motivo; presente = marcado
  const [marked, setMarked] = useState<Record<string, string>>({});
  const legendId = useId();

  // Los que ya se rechazaron uno por uno van en la corrección de todas formas (el backend
  // incluye todo lo que esté rechazado): se muestran como información, no se pueden quitar.
  const alreadyRejected = documents.filter((doc) => doc.status === "REJECTED");
  const withFile = documents.filter((doc) => doc.has_file && doc.status !== "REJECTED");

  useEffect(() => {
    if (!isOpen) return;
    setComment("");
    setMarked({});
  }, [isOpen]);

  const markedKeys = Object.keys(marked);
  const missingReason = markedKeys.some((key) => !marked[key].trim());
  const canSubmit = Boolean(comment.trim()) && !missingReason;

  const toggle = (key: string, checked: boolean) =>
    setMarked((current) => {
      const next = { ...current };
      if (checked) next[key] = next[key] ?? "";
      else delete next[key];
      return next;
    });

  return (
    <ActionDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Devolver para corrección"
      description="El estudiante vuelve a tener la matrícula para corregirla y la reenvía. El acudiente recibe un correo con tu comentario y los documentos marcados."
      submitLabel="Devolver matrícula"
      pendingLabel="Devolviendo…"
      submitClassName="btn btn-warning gap-2"
      pending={pending}
      canSubmit={canSubmit}
      onSubmit={() =>
        onSubmit(
          comment.trim(),
          markedKeys.map((key) => ({ key, reason: marked[key].trim() })),
        )
      }
    >
      <RequiredText
        label="Comentario para el estudiante"
        value={comment}
        onChange={setComment}
        hint="Explica qué debe corregir en los datos o en los documentos."
        errorText="Escribe un comentario."
        autoFocus
      />

      {alreadyRejected.length > 0 && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2.5 text-sm">
          <p className="font-medium text-base-content">Ya rechazados (se incluyen en la corrección)</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-base-content/70">
            {alreadyRejected.map((doc) => (
              <li key={doc.key}>
                {doc.label}
                {doc.reject_reason ? `: ${doc.reject_reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {withFile.length > 0 && (
        <fieldset className="space-y-2" aria-describedby={`${legendId}-hint`}>
          <legend className="text-sm font-medium text-base-content/70">Documentos a corregir (opcional)</legend>
          <p id={`${legendId}-hint`} className="text-xs text-base-content/50">
            Marca los que debe volver a subir o firmar. Cada uno necesita un motivo.
          </p>
          <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
            {withFile.map((doc) => {
              const checked = doc.key in marked;
              const checkboxId = `${legendId}-${doc.key}`;
              const reasonId = `${checkboxId}-reason`;
              const reasonMissing = checked && !marked[doc.key].trim();
              return (
                <li key={doc.key} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-warning"
                      checked={checked}
                      onChange={(e) => toggle(doc.key, e.target.checked)}
                    />
                    <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-2 text-sm">
                      <span className="text-base-content">{doc.label}</span>
                      <span className={`badge badge-xs ${getDocumentStatusBadgeClass(doc.status)}`}>
                        {getDocumentStatusLabel(doc.status)}
                      </span>
                    </label>
                  </div>
                  {checked && (
                    <div className="mt-2 pl-8">
                      <label htmlFor={reasonId} className="sr-only">
                        Motivo para {doc.label}
                      </label>
                      <input
                        id={reasonId}
                        type="text"
                        required
                        placeholder="Motivo (p. ej. está vencido)"
                        value={marked[doc.key]}
                        aria-invalid={reasonMissing || undefined}
                        aria-describedby={reasonMissing ? `${reasonId}-error` : undefined}
                        onChange={(e) => setMarked((current) => ({ ...current, [doc.key]: e.target.value }))}
                        className={`input input-bordered input-sm w-full focus:input-primary ${reasonMissing ? "input-error" : ""}`}
                      />
                      {reasonMissing && (
                        <p id={`${reasonId}-error`} className="mt-1 text-xs text-error">
                          Escribe el motivo de este documento.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </ActionDialog>
  );
}

// --------------------------------------------------------------------- Inactivar

const INACTIVE_OPTIONS = [
  { value: "WITHDRAWN", label: "Retiro", hint: "El estudiante deja el colegio. Se puede reintegrar después." },
  { value: "GRADUATED", label: "Egresó", hint: "Terminó sus estudios en el colegio." },
] as const;

type InactiveChoice = (typeof INACTIVE_OPTIONS)[number]["value"];

export function InactivateDialog({
  isOpen,
  pending,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (inactiveReason: InactiveChoice, reason: string) => void;
}) {
  const [choice, setChoice] = useState<InactiveChoice | "">("");
  const [reason, setReason] = useState("");
  const groupId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setChoice("");
    setReason("");
  }, [isOpen]);

  return (
    <ActionDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Inactivar matrícula"
      description="La matrícula deja de estar aprobada y el estudiante ya no puede subir documentos."
      submitLabel="Inactivar matrícula"
      pendingLabel="Inactivando…"
      submitClassName="btn btn-error gap-2"
      pending={pending}
      canSubmit={Boolean(choice && reason.trim())}
      onSubmit={() => choice && onSubmit(choice, reason.trim())}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium text-base-content/70">
          Tipo de inactivación <span className="text-error" aria-hidden="true">*</span>
        </legend>
        {INACTIVE_OPTIONS.map((option, index) => {
          const id = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                choice === option.value ? "border-primary bg-primary/5" : "border-base-300 hover:bg-base-200"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={groupId}
                value={option.value}
                required
                autoFocus={index === 0}
                checked={choice === option.value}
                onChange={() => setChoice(option.value)}
                aria-describedby={`${id}-hint`}
                className="radio radio-sm radio-primary mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-base-content">{option.label}</span>
                <span id={`${id}-hint`} className="block text-xs text-base-content/60">
                  {option.hint}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <RequiredText
        label="Motivo"
        value={reason}
        onChange={setReason}
        hint="Queda registrado en la matrícula."
        errorText="Escribe el motivo."
      />
    </ActionDialog>
  );
}

// --------------------------------------------------------------------- Cambiar grado

export function ChangeGradeDialog({
  isOpen,
  enrollment,
  grades,
  onClose,
  onChanged,
}: {
  isOpen: boolean;
  enrollment: EnrollmentDetail;
  grades: GradeInfo[];
  onClose: () => void;
  onChanged: (updated: EnrollmentDetail) => void;
}) {
  const titleId = useId();
  return (
    <div className="relative z-[55]">
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeOnBackdrop={false}
        labelledBy={titleId}
        className={`${PANEL_CLASS} p-6 gap-4`}
      >
        <div>
          <h2 id={titleId} className="font-display text-lg font-bold text-secondary">
            Cambiar grado
          </h2>
          <p className="mt-1 text-sm text-base-content/60">
            Grado actual: {enrollment.grade.label} · {enrollment.academic_year}
          </p>
        </div>
        <UserEnroll enrollment={enrollment} grades={grades} onCancel={onClose} onSuccess={onChanged} />
      </Modal>
    </div>
  );
}

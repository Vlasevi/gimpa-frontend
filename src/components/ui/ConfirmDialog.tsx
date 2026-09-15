/**
 * Confirmación minimalista: la de toda la plataforma (eliminar, aprobar, enviar…).
 *
 * Panel angosto, título, una frase (o una lista corta) y dos botones: "Cancelar" con
 * contorno suave y la acción en el color de su intención (`tone`): `danger` rojo
 * (eliminar), `success` verde (aprobar), `primary` azul (enviar, reintegrar). Sin ícono
 * grande, sin separadores ni recuadros. El fondo es el de `Modal` (suave, no negro).
 *
 * - El foco arranca en "Cancelar": Enter sin mirar nunca confirma.
 * - Mientras `onConfirm` trabaja: spinner y gerundio en el botón (`BusyLabel`), los dos
 *   botones bloqueados y el diálogo no se cierra (ni con Escape ni con el fondo).
 * - Termina bien → se cierra solo. Falla (`onConfirm` lanza o devuelve `false`) → queda
 *   abierto para reintentar; el error lo muestra quien llama (su toast, arriba a la derecha).
 *
 * Va sobre `Modal` (foco atrapado, Escape, centrado nítido). El envoltorio `z-[55]` lo pone
 * por encima de otro modal abierto. `ConfirmDeleteDialog` es este mismo con `tone="danger"`.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { BusyLabel } from "@/components/ui/BusyLabel";
import { Modal } from "@/components/ui/Modal";

export type ConfirmTone = "danger" | "success" | "primary";

const CONFIRM_BUTTON: Record<ConfirmTone, string> = {
  danger: "btn btn-error",
  success: "btn btn-success",
  primary: "btn btn-primary",
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Hace la acción. `false` o una excepción = falló (el diálogo queda abierto). */
  onConfirm: () => Promise<boolean | void> | boolean | void;
  title: string;
  /** Texto del botón de la acción ("Aprobar matrícula"). */
  confirmText: string;
  /** Mientras trabaja ("Aprobando…"). */
  pendingText: string;
  tone?: ConfirmTone;
  /** Qué va a pasar, en una frase (el nombre en `<strong>`). */
  children: ReactNode;
  /** Línea final en el color de la intención ("Este cambio es irreversible."). */
  note?: ReactNode;
}

const noop = () => {};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmText,
  pendingText,
  tone = "primary",
  children,
  note,
}: ConfirmDialogProps) {
  const ids = useId();
  const titleId = `${ids}-title`;
  const bodyId = `${ids}-body`;
  const [pending, setPending] = useState(false);
  // Quien llama puede desmontar el diálogo al terminar (p. ej. cerrando su modal).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) setPending(false);
  }, [isOpen]);

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    let ok = false;
    try {
      ok = (await onConfirm()) !== false;
    } catch {
      ok = false;
    }
    if (!mounted.current) return;
    setPending(false);
    if (ok) onClose();
  };

  return (
    <div className="relative z-[55]">
      <Modal
        isOpen={isOpen}
        onClose={pending ? noop : onClose}
        closeOnBackdrop={!pending}
        labelledBy={titleId}
        describedBy={bodyId}
        className="w-[calc(100%-2rem)] max-w-md gap-0 rounded-xl border-base-300 bg-base-100 p-6 shadow-xl sm:w-full"
      >
        <h2 id={titleId} className="text-lg font-semibold text-base-content">
          {title}
        </h2>
        <div
          id={bodyId}
          className="mt-2 space-y-2 text-sm leading-relaxed text-base-content/70 [&_strong]:font-semibold [&_strong]:text-base-content"
        >
          {children}
          {note && (
            <p className={`font-medium ${tone === "danger" ? "text-error" : tone === "success" ? "text-success" : "text-base-content"}`}>
              {note}
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            className="btn btn-outline border-base-300 font-medium text-base-content hover:border-base-300 hover:bg-base-200 hover:text-base-content"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${CONFIRM_BUTTON[tone]} gap-2`}
            onClick={confirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            <BusyLabel busy={pending} busyText={pendingText}>
              {confirmText}
            </BusyLabel>
          </button>
        </div>
        {pending && (
          <p className="sr-only" role="status">
            {pendingText}
          </p>
        )}
      </Modal>
    </div>
  );
}

export default ConfirmDialog;

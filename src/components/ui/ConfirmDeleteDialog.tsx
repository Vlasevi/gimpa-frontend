/**
 * Confirmación de eliminar: la misma en toda la plataforma (usuarios, roles, matrículas,
 * archivos, solicitudes, contrataciones, plantillas, foto de perfil). Es `ConfirmDialog`
 * con `tone="danger"`, "Eliminando…" y, al final, "Este cambio es irreversible."
 * (`irreversible={false}` lo quita: una eliminación que se puede restaurar).
 *
 * El toast de éxito (arriba a la derecha) lo lanza quien llama, con el nombre de lo
 * eliminado; si `onConfirm` falla (lanza o devuelve `false`) el diálogo queda abierto.
 */

import type { ReactNode } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Hace el borrado. `false` o una excepción = falló (el diálogo queda abierto). */
  onConfirm: () => Promise<boolean | void>;
  /** "Eliminar usuario" */
  title: string;
  /** Texto del botón rojo. Por defecto "Eliminar". */
  confirmText?: string;
  /** Mientras borra. Por defecto "Eliminando…". */
  pendingText?: string;
  /** Qué se va a eliminar (con el nombre en negrita). */
  children: ReactNode;
  /** Muestra "Este cambio es irreversible." Por defecto `true`. */
  irreversible?: boolean;
}

export function ConfirmDeleteDialog({
  confirmText = "Eliminar",
  pendingText = "Eliminando…",
  irreversible = true,
  ...props
}: ConfirmDeleteDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="danger"
      confirmText={confirmText}
      pendingText={pendingText}
      note={irreversible ? "Este cambio es irreversible." : undefined}
    />
  );
}

export default ConfirmDeleteDialog;

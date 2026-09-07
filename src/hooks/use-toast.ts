/**
 * Hook de toast compartido — Paso 1 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md).
 *
 * Reemplaza por completo el `hooks/use-toast.ts` anterior: era un reducer estilo
 * shadcn/ui que importaba `@/components/ui/toast` (archivo inexistente); confirmado
 * en el Paso 0 que ningún archivo del repo lo importaba, así que era código muerto e
 * inutilizable — no rompía el build solo porque nadie lo usaba.
 *
 * Extrae y unifica en un solo lugar el patrón que hoy existe repetido tres veces con
 * la misma forma conceptual (`{type, msg}` + auto-dismiss a los 3500ms):
 * - `flash()` en components/admisiones/admin/ApplicationDetail.tsx (solo success/error)
 * - `showToast()` en components/matriculas/MatriculasAdmin.tsx
 * - `showToast()` en components/matriculas/StudentDataTabs.tsx (casi idéntico al anterior)
 * Ver docs/paso0-informe-admisiones.md §5.2.
 *
 * Uso (un toast a la vez, igual que los tres orígenes — no es una cola):
 *   const { toast, flash, dismiss } = useToast();
 *   flash("success", "Guardado correctamente");
 *   return <Toast toast={toast} />;   // components/ui/Toast.tsx
 *
 * NO se ha migrado ningún consumidor existente todavía (ApplicationDetail,
 * MatriculasAdmin y StudentDataTabs siguen con su implementación local) — eso es un
 * paso posterior del plan.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastState {
  id: number;
  type: ToastVariant;
  msg: string;
}

const AUTO_DISMISS_MS = 3500;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const flash = useCallback(
    (type: ToastVariant, msg: string) => {
      clearTimer();
      idRef.current += 1;
      setToast({ id: idRef.current, type, msg });
      timerRef.current = window.setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    },
    [clearTimer],
  );

  // Cancela el timer pendiente si el componente que usa el hook se desmonta antes de
  // que el toast se autocierre.
  useEffect(() => clearTimer, [clearTimer]);

  return { toast, flash, dismiss };
}

export default useToast;

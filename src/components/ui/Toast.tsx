/**
 * Toast efímero compartido — Paso 1 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md). Ver hooks/use-toast.ts para el porqué y
 * las tres implementaciones locales que unifica.
 *
 * Componente de presentación puro: recibe el estado de `useToast()` y no gestiona su
 * propio timer. Posición y estructura visual tomadas de
 * components/matriculas/MatriculasAdmin.tsx (Matrículas es la fuente de verdad del
 * lenguaje visual: `fixed right-6 top-6`, icono + texto en una píldora
 * `rounded-xl border bg-base-100 shadow-lg`). La animación de entrada
 * (`animate-in fade-in slide-in-from-top-2 slide-in-from-right-4`) se toma de
 * ApplicationDetail.tsx, que ya la tenía y Matrículas no — no introduce ninguna clase
 * nueva: `tailwindcss-animate` ya está instalado y en uso en el resto de la app.
 */

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import type { ToastState, ToastVariant } from "@/hooks/use-toast";

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

// "info" usa text-primary, no text-info: así lo hace MatriculasAdmin.tsx hoy (el
// amarillo de --color-info del theme "gimpa" no se lee bien como tono informativo aquí).
const TONE: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-primary",
};

export interface ToastProps {
  toast: ToastState | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  const Icon = ICONS[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-6 top-6 z-[60] animate-in fade-in slide-in-from-top-2 slide-in-from-right-4 duration-300 motion-reduce:animate-none"
    >
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content shadow-lg">
        <Icon className={`h-5 w-5 shrink-0 ${TONE[toast.type]}`} aria-hidden="true" />
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}

export default Toast;

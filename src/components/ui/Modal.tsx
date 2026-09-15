/**
 * Modal genérico compartido — Paso 7 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md).
 *
 * Generaliza `AnimatedModal`, hasta ahora local a
 * `components/matriculas/MatriculasAdmin.tsx` (Matrículas es la fuente de verdad de esta
 * técnica: animación de entrada/salida con `animate-in`/`animate-out` +
 * `tailwindcss-animate`, mount/unmount diferido con `setTimeout` para que la animación de
 * salida no se corte, cierre por click en el backdrop). Ver docs/paso0-informe-admisiones.md
 * §4 y §7 ("Modal genérico").
 *
 * `ApplicationDetail.tsx` migra a este componente para ganar la animación y el
 * cierre-por-backdrop que no tenía (antes solo cerraba con el botón X o Escape).
 * `MatriculasAdmin.tsx` NO se toca en este paso — sigue con su `AnimatedModal` local,
 * pero ambos ya comparten la misma técnica.
 *
 * `useBodyScrollLock` va integrado: ningún consumidor necesita llamarlo aparte.
 *
 * Accesibilidad: nombra el diálogo con `labelledBy` (id del título dentro del modal) o
 * `ariaLabel`; al abrir, el foco entra al diálogo y al cerrar vuelve al control que lo
 * abrió; Tab / Shift+Tab no salen del diálogo.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Clases del panel del modal (ancho, alto, fondo, padding). Se fusionan con las
   * clases base vía `cn` (twMerge), así que sobreescriben lo que necesiten
   * (p. ej. `rounded-lg`, `p-0`) sin pelear con los valores por defecto. */
  className?: string;
  /** Cierra al hacer click en el backdrop. Por defecto `true`, como `AnimatedModal`. */
  closeOnBackdrop?: boolean;
  /** Id del título visible del modal (`aria-labelledby`). */
  labelledBy?: string;
  /** Nombre accesible si el modal no tiene un título visible. */
  ariaLabel?: string;
  /** Id del texto que describe el modal (`aria-describedby`). */
  describedBy?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = "max-w-2xl bg-base-100 p-6",
  closeOnBackdrop = true,
  labelledBy,
  ariaLabel,
  describedBy,
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);

  // Foco al abrir y de vuelta al control que lo abrió al cerrar.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    // Si un campo del modal ya tomó el foco (`autoFocus`), se respeta.
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.();
    };
  }, [isOpen]);

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      return;
    }
    // Con "reducir movimiento" no hay animación de salida (`motion-reduce:animate-none`):
    // esperar los 300 ms dejaba el modal ya cerrado quieto y opaco en pantalla (con su
    // contenido de vuelta al estado inicial), como si se volviera a abrir antes de irse.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(false);
      return;
    }
    const timer = setTimeout(() => setIsVisible(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Cerrar con Escape (además del cierre por backdrop) — mismo patrón que
  // components/ui/Alert.tsx.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  // `fill-mode-forwards` en la salida: sin él, al terminar la animación el elemento
  // revierte por un frame a su estado base (centrado, opacidad 1) antes de
  // desmontarse, lo que se ve como un parpadeo al cerrar.
  const modalAnimation = isOpen
    ? "animate-in fade-in slide-in-from-bottom-16 duration-500 motion-reduce:animate-none"
    : "animate-out fade-out slide-out-to-bottom-16 duration-300 fill-mode-forwards motion-reduce:animate-none";

  const backdropAnimation = isOpen
    ? "animate-in fade-in duration-300 motion-reduce:animate-none"
    : "animate-out fade-out duration-300 fill-mode-forwards motion-reduce:animate-none";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm ${backdropAnimation}`}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      {/* Centrado con flex, no con `top-1/2` + `-translate-1/2`: con un alto impar (del
          panel o de la ventana) el translate deja el panel en medio píxel y Chrome dibuja
          todo el texto borroso. La posición por layout se ajusta al píxel. El contenedor
          no recibe clics (`pointer-events-none`) para que el backdrop siga cerrando. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center sm:p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : ariaLabel}
          aria-describedby={describedBy}
          tabIndex={-1}
          onKeyDown={trapFocus}
          className={`${cn(
            "pointer-events-auto relative flex w-full flex-col gap-4 border border-base-300 shadow-lg focus:outline-none sm:rounded-lg",
            className,
          )} ${modalAnimation}`}
        >
          {children}
        </div>
      </div>
    </>
  );
}

export default Modal;

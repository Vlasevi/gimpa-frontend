// components/ui/Alert.tsx
//
// Accesibilidad: diálogo modal con título y descripción asociados (ids únicos por
// instancia), foco inicial dentro del diálogo, foco de vuelta al control que lo abrió al
// cerrar, y el contenido desplazable con teclado cuando se exige leerlo hasta el final.
import {
  ReactNode,
  useId,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  acceptText?: string;
  cancelText?: string;
  variant?: "warning" | "info" | "error" | "success";
  // Personalización de botones
  acceptButtonClassName?: string;
  cancelButtonClassName?: string;
  acceptButtonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  cancelButtonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  // Requiere scroll hasta el final para habilitar el botón de aceptar
  requireScrollToBottom?: boolean;
}

// Color del ícono según la intención del aviso (tokens del theme daisyui)
const variantStyles = {
  warning: "text-warning",
  info: "text-info",
  error: "text-error",
  success: "text-success",
};

// Mapea las variantes (nombres heredados) a clases de botón daisyui
const buttonVariantClasses = {
  default: "btn btn-primary",
  destructive: "btn btn-error",
  outline: "btn btn-outline",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  link: "btn btn-link",
};

const variantIcons = {
  warning: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  error: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  success: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export const Alert = ({
  isOpen,
  onClose,
  onAccept,
  title = "Aviso Importante",
  description,
  children,
  acceptText = "Aceptar",
  cancelText = "Cancelar",
  variant = "warning",
  acceptButtonClassName,
  cancelButtonClassName,
  acceptButtonVariant = "default",
  cancelButtonVariant = "outline",
  requireScrollToBottom = false,
}: AlertProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const titleId = useId();
  const contentId = useId();

  // Foco al abrir (en el contenido si hay que leerlo; si no, en el diálogo) y de vuelta
  // al control que lo abrió al cerrar.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const target = requireScrollToBottom ? contentRef.current : dialogRef.current;
    target?.focus();
    return () => previous?.focus?.();
  }, [isOpen, requireScrollToBottom]);

  // Resetear el estado cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  // Verificar si el contenido necesita scroll
  useEffect(() => {
    if (isOpen && contentRef.current && requireScrollToBottom) {
      const element = contentRef.current;
      // Si el contenido no necesita scroll, habilitar el botón directamente
      if (element.scrollHeight <= element.clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [isOpen, requireScrollToBottom, children]);

  // Bloquear el scroll del fondo mientras el modal está abierto (patrón compartido).
  useBodyScrollLock(isOpen);

  // Cerrar con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // Considerar que llegó al final con un margen de 10px
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (isAtBottom) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  if (!isOpen) return null;

  const isAcceptDisabled = requireScrollToBottom && !hasScrolledToBottom;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contentId}
        tabIndex={-1}
        className="animate-modal-pop relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-xl focus:outline-none"
      >
        {/* Header fijo */}
        <div className="flex-shrink-0 px-6 pt-6">
          <h2
            id={titleId}
            className="flex items-center gap-3 text-xl font-semibold text-base-content"
          >
            <span className={variantStyles[variant]}>{variantIcons[variant]}</span>
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 text-sm text-base-content/60">{description}</p>
          )}
        </div>

        {/* Contenido scrollable */}
        <div
          ref={contentRef}
          id={contentId}
          onScroll={handleScroll}
          tabIndex={requireScrollToBottom ? 0 : undefined}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-4 leading-relaxed text-base-content/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
        >
          {children}
        </div>

        {/* Footer fijo */}
        <div className="flex flex-shrink-0 flex-col-reverse gap-2 border-t border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          {isAcceptDisabled && (
            <p className="text-xs text-base-content/60 sm:mr-auto" role="status">
              Lee el texto hasta el final para continuar.
            </p>
          )}
          <button
            type="button"
            className={cn(buttonVariantClasses[cancelButtonVariant], cancelButtonClassName)}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn(
              buttonVariantClasses[acceptButtonVariant],
              acceptButtonClassName,
              isAcceptDisabled && "cursor-not-allowed opacity-50",
            )}
            onClick={onAccept}
            disabled={isAcceptDisabled}
          >
            {acceptText}
          </button>
        </div>
      </div>
    </div>
  );
};

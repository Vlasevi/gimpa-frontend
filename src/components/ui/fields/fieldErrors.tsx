/**
 * Errores por campo para los formularios declarativos.
 *
 * El padre provee un mapa `{ruta: mensaje}` (p. ej. los `errors` que devuelve el backend
 * al guardar: `{"student.id_number": "Campo obligatorio."}`) y cada primitivo lo lee por
 * su `name`, sin tener que pasar el error campo por campo. Accesibilidad: el control
 * queda con `aria-invalid` y `aria-describedby` apuntando al mensaje.
 */

import { createContext, useContext, type ReactNode } from "react";

const FieldErrorsContext = createContext<Readonly<Record<string, string>>>({});

export function FieldErrorsProvider({
  errors,
  children,
}: {
  errors: Readonly<Record<string, string>>;
  children: ReactNode;
}) {
  return <FieldErrorsContext.Provider value={errors}>{children}</FieldErrorsContext.Provider>;
}

export function useFieldError(name: string | undefined): string | undefined {
  const errors = useContext(FieldErrorsContext);
  return name ? errors[name] : undefined;
}

/** Id del mensaje de error de un control (para `aria-describedby`). */
export const errorIdFor = (htmlId: string) => `${htmlId}-error`;

/** Props ARIA de un control con (o sin) error. */
export function errorAria(htmlId: string, error: string | undefined) {
  return error ? { "aria-invalid": true as const, "aria-describedby": errorIdFor(htmlId) } : {};
}

export function FieldErrorText({ htmlId, error }: { htmlId: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorIdFor(htmlId)} className="mt-1 text-xs font-medium text-error">
      {error}
    </p>
  );
}

/** Asterisco de obligatorio: visual (el `required` del control ya lo anuncia). */
export function RequiredMark({ required }: { required?: boolean }) {
  if (!required) return null;
  return (
    <span className="ml-1 text-error" aria-hidden="true">
      *
    </span>
  );
}

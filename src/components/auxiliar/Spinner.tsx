import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Carga de pantalla completa (mientras se verifica la sesión al abrir la app o una ruta
 * protegida). Es el spinner del design system (`LoadingState`, DESIGN_SYSTEM §6), centrado
 * en la pantalla; antes era el escudo del colegio parpadeando, un estilo aparte.
 */
export default function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 px-4" role="status" aria-live="polite">
      <LoadingState compact label="Cargando…" />
    </div>
  );
}

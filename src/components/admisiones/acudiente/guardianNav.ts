/**
 * Navegación del acudiente dentro de `/admisiones`.
 *
 * La URL es siempre `/admisiones` (como `/matriculas`): la pantalla (lista, nueva, detalle,
 * formulario) viaja en el `state` del historial del navegador, no en la ruta. Así "atrás"
 * vuelve a la pantalla anterior y recargar deja al acudiente donde estaba (el navegador
 * conserva `history.state` al recargar), sin ids en la barra de direcciones.
 */

import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const ADMISSIONS_PATH = "/admisiones";

export type GuardianView =
  | { view: "list" }
  | { view: "new" }
  | { view: "detail"; id: number }
  | { view: "form"; id: number };

const LIST: GuardianView = { view: "list" };

/** El `state` puede venir de cualquier parte (o ser `null`): solo se acepta si tiene forma. */
function parseView(state: unknown): GuardianView {
  if (!state || typeof state !== "object") return LIST;
  const s = state as { view?: unknown; id?: unknown };
  if (s.view === "new") return { view: "new" };
  if ((s.view === "detail" || s.view === "form") && typeof s.id === "number") {
    return { view: s.view, id: s.id };
  }
  return LIST;
}

export function useGuardianNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = parseView(location.state);

  /** Avanza a otra pantalla (nueva entrada en el historial). */
  const go = useCallback(
    (next: GuardianView, opts: { replace?: boolean } = {}) =>
      navigate(ADMISSIONS_PATH, { state: next, replace: opts.replace }),
    [navigate],
  );

  /**
   * Vuelve a la pantalla anterior como el botón "atrás" del navegador. Si no hay una
   * anterior en esta sesión (se abrió en una pestaña nueva), reemplaza por `fallback`
   * para no sacar al acudiente de la plataforma.
   */
  const back = useCallback(
    (fallback: GuardianView) => {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-1);
      else navigate(ADMISSIONS_PATH, { state: fallback, replace: true });
    },
    [navigate],
  );

  return { current, go, back };
}

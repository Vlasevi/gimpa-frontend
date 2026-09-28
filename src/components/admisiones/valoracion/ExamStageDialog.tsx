/**
 * "Cambiar examen": el docente asignado (o quien asigna la valoración) le pone al
 * aspirante el examen de otra edad cuando ve que el suyo no le corresponde.
 *
 * Borra lo calificado del examen anterior, la hoja de respuestas incluida, así que el
 * diálogo lo dice antes de confirmar. Lo usan la pestaña "Valoración" del expediente y la
 * página del examen. Ver `docs/plan-examen-independiente.md` (backend).
 */

import { useEffect, useState } from "react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { labelClass } from "@/components/ui/formStyles";
import type { StageOption } from "@/components/admisiones/valoracion/types";

export function ExamStageDialog({
  id,
  isOpen,
  current,
  currentRoute,
  options,
  onClose,
  onDone,
  flash,
}: {
  id: number;
  isOpen: boolean;
  /** Etapa del examen actual. */
  current: string;
  currentRoute?: string | null;
  options: StageOption[];
  onClose: () => void;
  onDone: () => void;
  flash: (type: "success" | "error", msg: string) => void;
}) {
  // Se listan todos los exámenes cargados, el actual incluido (así se ve cuál tiene hoy).
  const available = options.filter((o) => o.available);
  const [stage, setStage] = useState(current);
  const [route, setRoute] = useState(currentRoute ?? "");
  const selected = available.find((o) => o.value === stage);
  const chooseStage = (value: string) => {
    setStage(value);
    const option = available.find((o) => o.value === value);
    setRoute(value === current ? currentRoute ?? option?.suggested_route ?? "" : option?.suggested_route ?? "");
  };

  useEffect(() => {
    if (isOpen) {
      setStage(current);
      setRoute(currentRoute ?? "");
    }
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submit = async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsExamStage(id), {
        method: "POST",
        body: JSON.stringify({ stage, route: selected?.routes ? route : undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("success", "Examen cambiado. Hay que volver a calificarlo.");
        onDone();
        return true;
      }
      flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos cambiar el examen.");
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    }
    return false;
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={submit}
      tone="danger"
      title="Cambiar el examen"
      confirmText="Cambiar examen"
      pendingText="Cambiando…"
      confirmDisabled={!stage || (stage === current && (route || null) === (currentRoute ?? null)) || (!!selected?.routes && !route)}
    >
      <div>
        <label htmlFor="exam-stage" className={labelClass}>
          Examen del estudiante
        </label>
        <Select
          id="exam-stage"
          value={stage}
          onChange={chooseStage}
          options={available.map((o) => ({
            value: o.value,
            label: o.value === current ? `${o.label} · actual` : o.label,
          }))}
          placeholder="Elige el examen"
          emptyText="No hay exámenes cargados."
        />
      </div>
      {selected?.routes && (
        <div className="mt-3">
          <label htmlFor="exam-route" className={labelClass}>Ruta del componente docente</label>
          <Select id="exam-route" value={route} onChange={setRoute} options={selected.routes} placeholder="Elige la ruta" />
          <p className="mt-1 text-sm">La ruta sugerida sigue la edad del aspirante. Cambiar la ruta también borra lo registrado.</p>
        </div>
      )}
      <p className="mt-3">
        Si cambias el examen del estudiante, perderás el progreso del examen anterior.
        ¿Deseas continuar?
      </p>
    </ConfirmDialog>
  );
}

export default ExamStageDialog;

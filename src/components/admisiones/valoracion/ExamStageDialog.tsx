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
  options,
  onClose,
  onDone,
  flash,
}: {
  id: number;
  isOpen: boolean;
  /** Etapa del examen actual. */
  current: string;
  options: StageOption[];
  onClose: () => void;
  onDone: () => void;
  flash: (type: "success" | "error", msg: string) => void;
}) {
  // Se listan todos los exámenes cargados, el actual incluido (así se ve cuál tiene hoy).
  const available = options.filter((o) => o.available);
  const [stage, setStage] = useState(current);

  useEffect(() => {
    if (isOpen) setStage(current);
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submit = async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsExamStage(id), {
        method: "POST",
        body: JSON.stringify({ stage }),
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
      confirmDisabled={!stage || stage === current}
    >
      <div>
        <label htmlFor="exam-stage" className={labelClass}>
          Examen del estudiante
        </label>
        <Select
          id="exam-stage"
          value={stage}
          onChange={setStage}
          options={available.map((o) => ({
            value: o.value,
            label: o.value === current ? `${o.label} · actual` : o.label,
          }))}
          placeholder="Elige el examen"
          emptyText="No hay exámenes cargados."
        />
      </div>
      <p className="mt-3">
        Si cambias el examen del estudiante, perderás el progreso del examen anterior.
        ¿Deseas continuar?
      </p>
    </ConfirmDialog>
  );
}

export default ExamStageDialog;

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
  const available = options.filter((o) => o.available && o.value !== current);
  const [stage, setStage] = useState(available[0]?.value ?? "");

  useEffect(() => {
    if (isOpen) setStage(available[0]?.value ?? "");
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
      note="Se borra lo que ya esté calificado de este examen, incluida la hoja de respuestas."
    >
      <p>
        El aspirante presenta otro examen. Las entrevistas y el consolidado no se tocan.
      </p>
      <div className="mt-4">
        <label htmlFor="exam-stage" className={labelClass}>
          Examen
        </label>
        {available.length > 0 ? (
          <Select
            id="exam-stage"
            value={stage}
            onChange={setStage}
            options={available.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Elige el examen"
          />
        ) : (
          <p className="text-sm text-base-content/70">
            Todavía no hay otro examen cargado en la plataforma.
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

export default ExamStageDialog;

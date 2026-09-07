/**
 * Pestaña "Validación" del expediente: decisión de validación inicial
 * (Continuar / Solicitar corrección / Lista de espera / Comité / Rechazar por cupo).
 * Extraída de `ApplicationDetail.tsx` — Paso 7 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md).
 *
 * NO migra a react-hook-form: el plan del Paso 7 solo pide RHF para
 * `DecisionPanel.tsx` y la parte de registro de `InterviewsPanel.tsx`. Son 3 campos
 * simples, useState local es suficiente y de menor riesgo.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { API_ENDPOINTS } from "@/utils/api";
import {
  labelClass,
  selectClass,
  textareaClass,
  adminPrimaryBtnClass,
} from "@/components/ui/formStyles";
import type { PostFn } from "@/components/admisiones/admin/adminTypes";

const DECISIONS = [
  { value: "CONTINUAR", label: "Continuar el proceso" },
  { value: "SOLICITAR_CORRECCION", label: "Solicitar corrección" },
  { value: "LISTA_ESPERA", label: "Dejar en lista de espera" },
  { value: "CASO_ESPECIAL", label: "Enviar a comité (caso especial)" },
  { value: "RECHAZAR_SIN_CUPO", label: "Rechazar por falta de cupo" },
];

export function ValidacionTab({
  code,
  canValidate,
  correctionComment,
  busy,
  pending,
  post,
}: {
  code: string;
  canValidate: boolean;
  correctionComment: string | null;
  busy: boolean;
  pending: string | null;
  post: PostFn;
}) {
  const [decision, setDecision] = useState("CONTINUAR");
  const [comment, setComment] = useState("");
  const [nextStep, setNextStep] = useState("pago");

  const submitDecision = async () => {
    const ok = await post(
      API_ENDPOINTS.admissionsValidation(code),
      {
        decision,
        comment: comment || undefined,
        next_step: decision === "CONTINUAR" ? nextStep : undefined,
      },
      { pendingKey: "decision", successMsg: "Decisión aplicada." },
    );
    if (ok) setComment("");
  };

  return (
    <div className="space-y-5">
      {correctionComment && (
        <div className="rounded-xl border border-base-300 bg-base-200 p-4 text-sm">
          <p className="font-medium text-base-content">Última devolución</p>
          <p className="mt-1 whitespace-pre-line text-base-content/70">
            {correctionComment}
          </p>
        </div>
      )}

      {canValidate ? (
        <div className="space-y-4 rounded-xl border border-base-300 p-4">
          <h3 className="font-display font-semibold text-secondary">
            Decisión de validación
          </h3>

          <div>
            <label htmlFor="decision" className={labelClass}>
              Decisión
            </label>
            <select
              id="decision"
              className={selectClass}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              {DECISIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {decision === "CONTINUAR" && (
            <div>
              <label htmlFor="next-step" className={labelClass}>
                Siguiente paso
              </label>
              <select
                id="next-step"
                className={selectClass}
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              >
                <option value="pago">Pago de inscripción</option>
                <option value="documentos">Documentos</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="comment" className={labelClass}>
              Comentario
              {decision === "SOLICITAR_CORRECCION" && <span className="text-error"> *</span>}
            </label>
            <textarea
              id="comment"
              rows={3}
              className={textareaClass}
              placeholder={
                decision === "SOLICITAR_CORRECCION"
                  ? "Qué debe corregir el acudiente (lo recibirá por correo)"
                  : "Opcional"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={submitDecision}
            disabled={busy}
            className={adminPrimaryBtnClass}
          >
            {pending === "decision" && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar decisión
          </button>
        </div>
      ) : (
        <p className="text-sm text-base-content/60">
          No tienes permiso para validar solicitudes.
        </p>
      )}
    </div>
  );
}

export default ValidacionTab;

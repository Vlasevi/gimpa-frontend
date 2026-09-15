/**
 * Decisión de la rectora (P15), en la pestaña "Avanzar": concepto del Comité a la vista,
 * la decisión y los próximos pasos para la familia. Si la decisión no corresponde al
 * concepto, el motivo es obligatorio; "Nueva valoración" pide qué se repite.
 */

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { FormSelect } from "@/components/ui/FormDialog";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { labelClass, primaryBtnClass, textareaClass } from "@/components/ui/formStyles";
import { cardTitleClass, metaTextClass, quoteClass } from "@/components/ui/textStyles";
import type { FlashFn } from "@/components/admisiones/admin/adminTypes";
import { formatWhen, type DecisionPanelData } from "@/components/admisiones/valoracion/types";

export function DecisionSection({
  id,
  data,
  onDecided,
  flash,
}: {
  id: number;
  data: DecisionPanelData;
  onDecided: () => void;
  flash: FlashFn;
}) {
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [conditions, setConditions] = useState("");
  const [message, setMessage] = useState("");
  const [reopen, setReopen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canDecideNow = ["PENDIENTE_DECISION", "LISTA_ESPERA"].includes(data.status);
  // "Desistido" vive en el desplegable de Avanzar; aquí solo la decisión de admisión.
  const options = data.options.filter((o) => o.value !== "DESISTIDO");
  const differs = !!data.concept && !!decision && decision !== "DESISTIDO" && !data.expected.includes(decision);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsDecision(id), {
        method: "POST",
        body: JSON.stringify({ decision, reason, conditions, message_public: message, reopen }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("success", "Decisión registrada. Avisamos a la familia.");
        onDecided();
      } else {
        flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos registrar la decisión.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-base-300 p-5">
      <h3 className={cardTitleClass}>Decisión de la rectora</h3>

      {data.concept ? (
        <div className="rounded-lg bg-base-200 p-4 text-sm">
          <p className="font-medium text-base-content">Concepto del Comité: {data.concept.label}</p>
          <p className={`mt-1 ${metaTextClass}`}>
            Registrado por {data.concept.registered_by_name} el {formatWhen(data.concept.registered_at)} ·
            Participantes: {data.concept.participantes || "—"}
          </p>
          {data.concept.criterios && <p className={`mt-2 ${quoteClass}`}>{data.concept.criterios}</p>}
          {data.concept.evidencia && <p className={`mt-2 ${quoteClass}`}>{data.concept.evidencia}</p>}
          {data.concept.plan_o_evidencia && <p className={`mt-2 ${quoteClass}`}>{data.concept.plan_o_evidencia}</p>}
        </div>
      ) : (
        canDecideNow && <p className={metaTextClass}>Sin concepto del Comité (caso especial).</p>
      )}

      {data.decided && (
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>
            Última decisión: <strong>{data.decision_label}</strong> · {data.decided_by_name} ·{" "}
            {formatWhen(data.decided_at)}
            {data.differs_from_concept_reason && (
              <span className="block text-base-content/70">Motivo: {data.differs_from_concept_reason}</span>
            )}
          </span>
        </p>
      )}

      {canDecideNow && options.length > 0 && (
        <form onSubmit={submit} className="space-y-4">
          <FormSelect
            label="Decisión"
            value={decision}
            onChange={setDecision}
            options={options}
            placeholder="Elige la decisión"
            required
          />
          {differs && (
            <div>
              <label htmlFor="decision-reason" className={labelClass}>
                Motivo (no corresponde al concepto del Comité) <span className="text-error">*</span>
              </label>
              <textarea id="decision-reason" rows={2} required className={textareaClass} value={reason}
                onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          {decision === "ADMITIDO_CON_CONDICIONES" && (
            <div>
              <label htmlFor="decision-conditions" className={labelClass}>
                Condiciones <span className="text-error">*</span>
              </label>
              <textarea id="decision-conditions" rows={2} required className={textareaClass} value={conditions}
                onChange={(e) => setConditions(e.target.value)} />
            </div>
          )}
          {decision === "REQUIERE_NUEVA_VALORACION" && (
            <fieldset>
              <legend className={labelClass}>
                ¿Qué se repite? <span className="text-error">*</span>
              </legend>
              <div className="flex flex-wrap gap-4">
                {data.reopenable.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={reopen.includes(o.value)}
                      onChange={(e) =>
                        setReopen((prev) => (e.target.checked ? [...prev, o.value] : prev.filter((v) => v !== o.value)))
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
              <p className={`mt-1 ${metaTextClass}`}>El consolidado y el concepto se vuelven a hacer.</p>
            </fieldset>
          )}
          <div>
            <label htmlFor="decision-message" className={labelClass}>
              Próximos pasos para la familia
            </label>
            <textarea id="decision-message" rows={2} className={textareaClass} value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Es lo único que la familia lee de la decisión. Sin datos sensibles." />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !decision} className={primaryBtnClass}>
              <BusyLabel busy={saving} busyText="Registrando…">
                Registrar decisión
              </BusyLabel>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * Pestaña "Avanzar" del expediente: el único lugar donde la rectora (o administrativo)
 * mueve el proceso de paso. "Enviar de" es el paso actual (bloqueado); "a" son los pasos
 * posibles desde ahí (los define el backend, `advance_service`). Aquí vive también la
 * decisión final de la rectora.
 *
 * Al validar el pago o el último documento, el expediente pregunta lo mismo en un diálogo
 * (`AdvanceDialog`); esta pestaña queda para quien lo omitió o para cambiar de paso. Pedir
 * correcciones no va aquí: va en la pestaña que se revisa (`CorrectionDialog`).
 */

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Info } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { FormGrid, FormInput, FormSelect } from "@/components/ui/FormDialog";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { LoadingState } from "@/components/ui/LoadingState";
import { labelClass, primaryBtnClass, textareaClass } from "@/components/ui/formStyles";
import { cardTitleClass, quoteClass } from "@/components/ui/textStyles";
import { DecisionSection } from "@/components/admisiones/admin/DecisionSection";
import type { AdvanceOptions, FlashFn } from "@/components/admisiones/admin/adminTypes";
import type { DecisionPanelData } from "@/components/admisiones/valoracion/types";

export function AvanzarTab({
  id,
  status,
  canDecide,
  flash,
  onChanged,
}: {
  id: number;
  /** Estado actual del expediente: cuando cambia (desde otra pestaña) se recargan las opciones. */
  status: string;
  canDecide: boolean;
  flash: FlashFn;
  onChanged: () => void;
}) {
  const [data, setData] = useState<AdvanceOptions | null>(null);
  const [decision, setDecision] = useState<DecisionPanelData | null>(null);
  const [to, setTo] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsAdvance(id));
      if (res.ok) {
        const d = (await res.json()) as AdvanceOptions;
        setData(d);
        setTo(d.recommended ?? "");
        setComment("");
      }
      if (canDecide) {
        const r = await apiFetch(API_ENDPOINTS.admissionsDecision(id));
        if (r.ok) setDecision(await r.json());
      }
    } catch {
      flash("error", "No pudimos cargar los pasos del proceso.");
    }
  }, [id, canDecide, flash]);

  useEffect(() => {
    load();
  }, [load, status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsAdvance(id), {
        method: "POST",
        body: JSON.stringify({ to_status: to, comment }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        const label = data?.options.find((o) => o.value === to)?.label ?? "el paso elegido";
        flash("success", `Solicitud enviada a: ${label}.`);
        onChanged();
      } else {
        flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos avanzar la solicitud.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <LoadingState compact label="Cargando pasos…" />;

  const selected = data.options.find((o) => o.value === to);
  const showDecision =
    canDecide && decision && (decision.concept || decision.decided ||
      ["PENDIENTE_DECISION", "LISTA_ESPERA"].includes(decision.status));

  return (
    <div className="space-y-5">
      {showDecision && (
        <DecisionSection id={id} data={decision} flash={flash} onDecided={onChanged} />
      )}

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-base-300 p-5">
        <h3 className={cardTitleClass}>Avanzar el proceso</h3>

        {data.hint && (
          <p className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-base-content/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {data.hint}
          </p>
        )}

        <FormGrid>
          <FormInput label="Enviar de" value={data.status_label} readOnly aria-readonly="true" />
          <FormSelect
            label="a"
            value={to}
            onChange={setTo}
            options={data.options.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Elige el paso"
            required
          />
        </FormGrid>

        <div>
          <label htmlFor="advance-comment" className={labelClass}>
            Comentario
            {selected?.requires_comment && <span className="text-error"> *</span>}
          </label>
          <textarea
            id="advance-comment"
            rows={2}
            className={textareaClass}
            required={selected?.requires_comment}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              selected?.requires_comment
                ? "Qué debe corregir el acudiente (lo recibirá por correo)"
                : "Opcional: queda en el historial"
            }
          />
        </div>

        {to === "DESISTIDO" && (
          <p className={quoteClass}>
            La familia se retira del proceso. La solicitud se cierra y no se le envía correo.
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || !to} className={primaryBtnClass}>
            <BusyLabel busy={saving} busyText="Avanzando…">
              Avanzar
              <ArrowRight className="h-4 w-4" />
            </BusyLabel>
          </button>
        </div>
      </form>

    </div>
  );
}

export default AvanzarTab;

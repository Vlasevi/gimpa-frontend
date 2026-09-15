/**
 * Pestaña "Avanzar" del expediente: el único lugar donde la rectora (o administrativo)
 * mueve el proceso de paso. "Enviar de" es el paso actual (bloqueado); "a" son los pasos
 * posibles desde ahí (los define el backend, `advance_service`). Aquí vive también la
 * decisión final de la rectora.
 *
 * Al validar el pago o el último documento, el expediente pregunta lo mismo en un diálogo
 * (`AdvanceDialog`); esta pestaña queda para quien lo omitió o para cambiar de paso.
 */

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Info, Undo2 } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { FormGrid, FormInput, FormSelect } from "@/components/ui/FormDialog";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { LoadingState } from "@/components/ui/LoadingState";
import { labelClass, outlineBtnClass, primaryBtnClass, textareaClass } from "@/components/ui/formStyles";
import { cardTitleClass, quoteClass } from "@/components/ui/textStyles";
import { DecisionSection } from "@/components/admisiones/admin/DecisionSection";
import type { AdvanceOptions, FlashFn } from "@/components/admisiones/admin/adminTypes";
import type { DecisionPanelData } from "@/components/admisiones/valoracion/types";

interface CorrectionOptions {
  available: boolean;
  sections: { value: string; label: string }[];
  documents: { value: string; label: string }[];
}

/** "Solicitar corrección": secciones y/o documentos + comentario, que llega SOLO por correo
 * (en la pantalla del acudiente se marca qué corregir, sin texto). Como en Matrículas. */
function CorrectionForm({
  id,
  options,
  flash,
  onDone,
}: {
  id: number;
  options: CorrectionOptions;
  flash: FlashFn;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, value: string, on: boolean) =>
    set(on ? [...list, value] : list.filter((v) => v !== value));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsCorrection(id), {
        method: "POST",
        body: JSON.stringify({ sections, documents, comment }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("success", "Corrección solicitada. Le enviamos el comentario al acudiente por correo.");
        setOpen(false);
        setSections([]);
        setDocuments([]);
        setComment("");
        onDone();
      } else {
        flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos solicitar la corrección.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen(true)} className={outlineBtnClass}>
          <Undo2 className="h-4 w-4" />
          Solicitar corrección
        </button>
      </div>
    );
  }

  const group = (
    legend: string,
    items: { value: string; label: string }[],
    list: string[],
    set: (v: string[]) => void,
  ) =>
    items.length > 0 && (
      <fieldset>
        <legend className={labelClass}>{legend}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={list.includes(o.value)}
                onChange={(e) => toggle(list, set, o.value, e.target.checked)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-warning/40 p-5">
      <h3 className={cardTitleClass}>Solicitar corrección</h3>
      {group("Datos a corregir", options.sections, sections, setSections)}
      {group("Documentos a volver a subir", options.documents, documents, setDocuments)}
      <div>
        <label htmlFor="correction-comment" className={labelClass}>
          Comentario para el acudiente <span className="text-error">*</span>
        </label>
        <textarea
          id="correction-comment"
          rows={3}
          required
          className={textareaClass}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Le llega por correo. En su pantalla solo verá marcado qué corregir."
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} disabled={saving} className={outlineBtnClass}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || (!sections.length && !documents.length) || !comment.trim()}
          className="btn btn-warning gap-2"
        >
          <BusyLabel busy={saving} busyText="Enviando…">
            Solicitar corrección
          </BusyLabel>
        </button>
      </div>
    </form>
  );
}

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
  const [correction, setCorrection] = useState<CorrectionOptions | null>(null);
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
      const c = await apiFetch(API_ENDPOINTS.admissionsCorrection(id));
      if (c.ok) setCorrection(await c.json());
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

      {correction?.available && (
        <CorrectionForm id={id} options={correction} flash={flash} onDone={onChanged} />
      )}
    </div>
  );
}

export default AvanzarTab;

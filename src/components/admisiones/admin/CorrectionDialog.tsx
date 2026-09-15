/**
 * "Solicitar corrección" del expediente, desde la pestaña que se revisa: en Solicitud se
 * marcan secciones del formulario; en Documentos, documentos a volver a subir. El
 * comentario le llega al acudiente solo por correo; en su pantalla ve marcado qué corregir.
 * Mismo diálogo que "Solicitar corrección" de Matrículas (`ActionDialog`).
 */

import { useEffect, useId, useState } from "react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { ActionDialog } from "@/components/matriculas/admin/ActionDialogs";
import { labelClass, textareaClass } from "@/components/ui/formStyles";
import type { FlashFn } from "@/components/admisiones/admin/adminTypes";

export interface CorrectionOption {
  value: string;
  label: string;
}

/** `GET correction/`: si se puede pedir corrección y de qué. */
export interface CorrectionOptions {
  available: boolean;
  sections: CorrectionOption[];
  documents: CorrectionOption[];
}

export type CorrectionKind = "sections" | "documents";

const COPY: Record<CorrectionKind, { title: string; legend: string; hint: string }> = {
  sections: {
    title: "Solicitar corrección de datos",
    legend: "Secciones a corregir",
    hint: "El acudiente las verá marcadas en el formulario.",
  },
  documents: {
    title: "Solicitar corrección de documentos",
    legend: "Documentos a volver a subir",
    hint: "El acudiente los verá marcados como «Por corregir».",
  },
};

export function CorrectionDialog({
  id,
  kind,
  options,
  isOpen,
  onClose,
  onDone,
  flash,
}: {
  id: number;
  kind: CorrectionKind;
  options: CorrectionOption[];
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  flash: FlashFn;
}) {
  const [marked, setMarked] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const baseId = useId();
  const copy = COPY[kind];

  useEffect(() => {
    if (!isOpen) return;
    setMarked([]);
    setComment("");
  }, [isOpen]);

  const submit = async () => {
    setPending(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsCorrection(id), {
        method: "POST",
        body: JSON.stringify({ [kind]: marked, comment: comment.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("success", "Corrección solicitada. El acudiente recibe tu comentario por correo.");
        onDone();
      } else {
        flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos solicitar la corrección.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ActionDialog
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      description="La solicitud vuelve al acudiente para corregirla. Tu comentario le llega solo por correo; en su pantalla verá marcado qué corregir."
      submitLabel="Solicitar corrección"
      pendingLabel="Solicitando…"
      submitClassName="btn btn-warning gap-2"
      pending={pending}
      canSubmit={marked.length > 0 && Boolean(comment.trim())}
      onSubmit={submit}
    >
      <fieldset className="space-y-2" aria-describedby={`${baseId}-hint`}>
        <legend className={labelClass}>
          {copy.legend} <span className="text-error">*</span>
        </legend>
        <p id={`${baseId}-hint`} className="text-sm text-base-content/60">
          {copy.hint}
        </p>
        <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
          {options.map((o) => {
            const checkboxId = `${baseId}-${o.value}`;
            return (
              <li key={o.value} className="flex items-center gap-3 px-3 py-2.5">
                <input
                  id={checkboxId}
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-warning"
                  checked={marked.includes(o.value)}
                  onChange={(e) =>
                    setMarked((current) =>
                      e.target.checked ? [...current, o.value] : current.filter((v) => v !== o.value),
                    )
                  }
                />
                <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer text-sm text-base-content">
                  {o.label}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <label htmlFor={`${baseId}-comment`} className={labelClass}>
          Comentario para el acudiente <span className="text-error">*</span>
        </label>
        <textarea
          id={`${baseId}-comment`}
          rows={4}
          className={textareaClass}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Qué debe corregir y cómo. Le llega por correo."
        />
      </div>
    </ActionDialog>
  );
}

export default CorrectionDialog;

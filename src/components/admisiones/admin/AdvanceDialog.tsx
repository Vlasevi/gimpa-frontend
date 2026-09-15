/**
 * Diálogo "¿A qué paso envías al aspirante?", que abre el expediente justo después de
 * validar el pago o el último documento. Mismo diálogo de confirmación que eliminar
 * (`ConfirmDialog`), con el paso recomendado ya elegido. Si se cierra, el paso se puede
 * elegir después en la pestaña "Avanzar".
 */

import { useEffect, useState } from "react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSelect } from "@/components/ui/FormDialog";
import type { AdvanceOptions, FlashFn } from "@/components/admisiones/admin/adminTypes";

export function AdvanceDialog({
  id,
  isOpen,
  onClose,
  onDone,
  flash,
}: {
  id: number;
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  flash: FlashFn;
}) {
  const [data, setData] = useState<AdvanceOptions | null>(null);
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setData(null);
    apiFetch(API_ENDPOINTS.admissionsAdvance(id))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AdvanceOptions | null) => {
        setData(d);
        setTo(d?.recommended ?? "");
      })
      .catch(() => setData(null));
  }, [id, isOpen]);

  // En el diálogo solo los pasos del proceso; desistir se hace en "Avanzar".
  const options = (data?.options ?? []).filter((o) => o.value !== "DESISTIDO" && !o.requires_comment);

  const confirm = async (): Promise<boolean> => {
    if (!to) {
      flash("error", "Elige a qué paso enviar la solicitud.");
      return false;
    }
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsAdvance(id), {
        method: "POST",
        body: JSON.stringify({ to_status: to }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash("error", typeof body?.detail === "string" ? body.detail : "No pudimos avanzar la solicitud.");
        return false;
      }
      flash("success", `Solicitud enviada a: ${options.find((o) => o.value === to)?.label ?? to}.`);
      onDone();
      return true;
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
      return false;
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen && options.length > 0}
      onClose={onClose}
      onConfirm={confirm}
      tone="primary"
      title="¿A qué paso envías al aspirante?"
      confirmText="Enviar"
      pendingText="Enviando…"
      note="Si prefieres decidirlo después, lo haces en la pestaña Avanzar."
    >
      <p className="mb-3">
        La solicitud quedó en <strong>{data?.status_label}</strong>.
      </p>
      <FormSelect
        label="Siguiente paso"
        value={to}
        onChange={setTo}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        placeholder="Elige el paso"
      />
    </ConfirmDialog>
  );
}

export default AdvanceDialog;

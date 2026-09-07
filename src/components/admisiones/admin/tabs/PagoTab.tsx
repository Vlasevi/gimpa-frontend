/**
 * Pestaña "Pago" del expediente: estado del pago de inscripción + revisión
 * (validar/rechazar/eximir). Extraída de `ApplicationDetail.tsx` — Paso 7 del refactor
 * de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md).
 */

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, MinusCircle, XCircle } from "lucide-react";

import { API_ENDPOINTS } from "@/utils/api";
import { textareaClass, adminGhostBtnClass } from "@/components/ui/formStyles";
import type { PaymentInfo, PostFn } from "@/components/admisiones/admin/adminTypes";

const PAYMENT_MSG: Record<string, string> = {
  validate: "Pago validado.",
  reject: "Comprobante rechazado.",
  exempt: "Marcado como exento.",
};

export function PagoTab({
  code,
  payment,
  canManagePayments,
  busy,
  pending,
  post,
}: {
  code: string;
  payment: PaymentInfo | null;
  canManagePayments: boolean;
  busy: boolean;
  pending: string | null;
  post: PostFn;
}) {
  const [paymentNote, setPaymentNote] = useState("");

  const reviewPayment = async (action: "validate" | "reject" | "exempt") => {
    const ok = await post(
      API_ENDPOINTS.admissionsPaymentReview(code),
      { action, note: paymentNote || undefined },
      { pendingKey: `pay-${action}`, successMsg: PAYMENT_MSG[action] },
    );
    if (ok) setPaymentNote("");
  };

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-base-300 p-4 text-sm">
        <div>
          <dt className="text-base-content/60">Estado</dt>
          <dd className="font-medium text-base-content">
            {payment?.status_label ?? payment?.status ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-base-content/60">Valor</dt>
          <dd className="font-medium text-base-content">
            {payment?.amount ? `$${payment.amount}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-base-content/60">Fecha de pago</dt>
          <dd className="text-base-content">{payment?.paid_at ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-base-content/60">Referencia</dt>
          <dd className="text-base-content">{payment?.reference ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-base-content/60">Comprobante</dt>
          <dd className="text-base-content">
            {payment?.receipt_url ? (
              <a
                href={payment.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Ver comprobante
              </a>
            ) : payment?.has_receipt ? (
              "Cargado (no se pudo abrir)"
            ) : (
              "Sin cargar"
            )}
          </dd>
        </div>
      </dl>

      {payment?.admin_note && (
        <p className="rounded-xl border border-base-300 bg-base-200 p-4 text-sm text-base-content/70">
          {payment.admin_note}
        </p>
      )}

      {canManagePayments && (
        <div className="space-y-3 rounded-xl border border-base-300 p-4">
          <h3 className="font-display font-semibold text-secondary">Revisar pago</h3>
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="Nota (obligatoria al rechazar: el acudiente la leerá)"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reviewPayment("validate")}
              disabled={busy}
              className={`${adminGhostBtnClass} text-accent hover:bg-accent/10`}
            >
              {pending === "pay-validate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Validar
            </button>
            <button
              type="button"
              onClick={() => reviewPayment("reject")}
              disabled={busy}
              className={`${adminGhostBtnClass} text-error hover:bg-error/10`}
            >
              {pending === "pay-reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => reviewPayment("exempt")}
              disabled={busy}
              className={adminGhostBtnClass}
            >
              {pending === "pay-exempt" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MinusCircle className="h-4 w-4" />
              )}
              Eximir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PagoTab;

/**
 * Pestaña "Pago" del expediente: estado del pago de inscripción + revisión
 * (validar/rechazar/eximir). Extraída de `ApplicationDetail.tsx` — Paso 7 del refactor
 * de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md).
 */

import { useState } from "react";
import { CheckCircle2, Eye, Loader2, MinusCircle, XCircle } from "lucide-react";

import { API_ENDPOINTS } from "@/utils/api";
import {
  textareaClass,
  adminGhostBtnClass,
  iconBtnClass,
  iconClass,
  iconHover,
} from "@/components/ui/formStyles";
import { formatCop } from "@/components/admisiones/admissionTypes";
import {
  cardClass,
  cardTitleClass,
  dataLabelClass,
  dataValueClass,
  quoteClass,
} from "@/components/ui/textStyles";
import type { PaymentInfo, PostFn } from "@/components/admisiones/admin/adminTypes";

const PAYMENT_MSG: Record<string, string> = {
  validate: "Pago validado.",
  reject: "Comprobante rechazado.",
  exempt: "Marcado como exento.",
};

export function PagoTab({
  id,
  payment,
  canManagePayments,
  busy,
  pending,
  post,
}: {
  id: number;
  payment: PaymentInfo | null;
  canManagePayments: boolean;
  busy: boolean;
  pending: string | null;
  post: PostFn;
}) {
  const [paymentNote, setPaymentNote] = useState("");

  const reviewPayment = async (action: "validate" | "reject" | "exempt") => {
    const ok = await post(
      API_ENDPOINTS.admissionsPaymentReview(id),
      { action, note: paymentNote || undefined },
      { pendingKey: `pay-${action}`, successMsg: PAYMENT_MSG[action] },
    );
    if (ok) setPaymentNote("");
  };

  return (
    <div className="space-y-5">
      <dl className={`${cardClass} grid grid-cols-2 gap-x-6 gap-y-4 p-5`}>
        <div>
          <dt className={dataLabelClass}>Estado</dt>
          <dd className={dataValueClass}>{payment?.status_label ?? payment?.status ?? "—"}</dd>
        </div>
        <div>
          <dt className={dataLabelClass}>Valor</dt>
          <dd className={`${dataValueClass} tabular-nums`}>
            {payment?.amount ? formatCop(payment.amount) : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className={dataLabelClass}>Comprobante</dt>
          <dd className={`flex items-center gap-1 ${dataValueClass}`}>
            {payment?.receipt_url ? (
              <>
                Cargado
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver"
                  aria-label="Ver el comprobante de pago"
                  className={`${iconBtnClass} ${iconHover.primary}`}
                >
                  <Eye className={iconClass} aria-hidden="true" />
                </a>
              </>
            ) : payment?.has_receipt ? (
              "Cargado (no se pudo abrir)"
            ) : (
              "Sin cargar"
            )}
          </dd>
        </div>
      </dl>

      {payment?.admin_note && (
        <p className={quoteClass}>{payment.admin_note}</p>
      )}

      {canManagePayments && (
        <div className="space-y-3 rounded-xl border border-base-300 p-4">
          <h3 className={cardTitleClass}>Revisar pago</h3>
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

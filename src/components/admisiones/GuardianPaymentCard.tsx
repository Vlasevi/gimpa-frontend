import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Clock, Eye, FileText, Upload } from "lucide-react";

import { apiUrl, apiFetch, API_ENDPOINTS } from "@/utils/api";
import {
  labelClass,
  primaryBtnClass,
  iconBtnClass,
  iconClass,
  iconHover,
} from "@/components/ui/formStyles";
import {
  cardClass,
  cardTitleClass,
  dataLabelClass,
  dataValueClass,
  itemTitleClass,
  metaTextClass,
  quoteClass,
} from "@/components/ui/textStyles";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import { fileRuleError, formatCop, type PaymentInfo } from "@/components/admisiones/admissionTypes";

/** Estados en los que el acudiente todavía debe (o puede volver a) reportar el pago. */
const CAN_REPORT = ["PENDIENTE", "RECHAZADO"];

/** Pestaña "Pago" del acudiente: valor, cuenta para consignar y comprobante. */
export function GuardianPaymentCard({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast, flash } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsPayment(id));
      if (res.ok) setPayment(await res.json());
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);

    const body = new FormData();
    body.append("receipt", file);

    try {
      // FormData: sin Content-Type manual (el navegador pone el boundary).
      // El Bearer lo inyecta el interceptor global.
      const res = await fetch(apiUrl(API_ENDPOINTS.admissionsPaymentReport(id)), {
        method: "POST",
        body,
      });
      if (res.ok) {
        setFile(null);
        flash("success", "Comprobante enviado. El colegio lo va a revisar.");
        await load();
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        flash(
          "error",
          typeof data?.detail === "string" ? data.detail : "No pudimos enviar el comprobante.",
        );
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`${cardClass} flex items-center gap-3 p-6 text-base-content/60`}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando pago…
      </div>
    );
  }

  if (loadError || !payment) {
    return (
      <div role="alert" className={`${cardClass} flex items-start gap-3 p-6`}>
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <p className="text-base-content/80">No pudimos cargar el estado del pago.</p>
      </div>
    );
  }

  const canReport = CAN_REPORT.includes(payment.status);
  const account = payment.bank_account;

  return (
    <>
      <Toast toast={toast} />

      <div className={cardClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-base-300 px-5 py-4">
          <h2 className={cardTitleClass}>Pago de inscripción</h2>
          <span className="font-display text-lg font-medium text-primary">
            {formatCop(payment.amount)}
          </span>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Estado actual */}
          {payment.status === "VALIDADO" && (
            <p className="flex items-center gap-2 text-sm text-accent">
              <CheckCircle2 className="h-5 w-5" />
              Pago confirmado. ¡Gracias!
            </p>
          )}
          {payment.status === "EXENTO" && (
            <p className="flex items-center gap-2 text-sm text-accent">
              <CheckCircle2 className="h-5 w-5" />
              Estás exento del pago de inscripción.
            </p>
          )}
          {payment.status === "REPORTADO" && (
            <p className="flex items-center gap-2 text-sm text-base-content/70">
              <Clock className="h-5 w-5 text-primary" />
              Recibimos tu comprobante. El colegio lo está revisando.
            </p>
          )}

          {/* Motivo del rechazo */}
          {payment.status === "RECHAZADO" && payment.admin_note && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className={itemTitleClass}>El comprobante fue rechazado</p>
                <p className={`mt-1 ${quoteClass}`}>{payment.admin_note}</p>
              </div>
            </div>
          )}

          {/* Cuenta para consignar: solo mientras falta pagar */}
          {canReport && (
            <div>
              <p className={metaTextClass}>
                Consigna {formatCop(payment.amount)} en esta cuenta y adjunta el comprobante.
              </p>
              <dl className="mt-3 grid gap-4 rounded-lg bg-base-200 p-4 sm:grid-cols-2">
                <div>
                  <dt className={dataLabelClass}>Banco</dt>
                  <dd className={dataValueClass}>{account.bank}</dd>
                </div>
                <div>
                  <dt className={dataLabelClass}>Cuenta de {account.account_type.toLowerCase()}</dt>
                  <dd className={`${dataValueClass} font-medium tabular-nums`}>
                    {account.account_number}
                  </dd>
                </div>
                <div>
                  <dt className={dataLabelClass}>Titular</dt>
                  <dd className={dataValueClass}>{account.holder}</dd>
                </div>
                <div>
                  <dt className={dataLabelClass}>Documento del titular</dt>
                  <dd className={dataValueClass}>{account.holder_id}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Comprobante ya enviado */}
          {payment.receipt_url && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <p className={itemTitleClass}>Comprobante de pago</p>
              </div>
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
            </div>
          )}

          {canReport && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="receipt" className={labelClass}>
                  Comprobante <span className="text-error">*</span>
                </label>
                <input
                  id="receipt"
                  type="file"
                  accept={payment.rule?.accept ?? "image/*,application/pdf"}
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    const problem = picked ? fileRuleError(picked, payment.rule) : null;
                    if (problem) {
                      flash("error", problem);
                      e.target.value = "";
                      setFile(null);
                      return;
                    }
                    setFile(picked);
                  }}
                  aria-describedby="receipt-hint"
                  className="file-input file-input-bordered w-full"
                />
                {payment.rule && (
                  <p id="receipt-hint" className="mt-1 text-xs text-base-content/60">
                    {payment.rule.hint}
                  </p>
                )}
              </div>

              <button type="submit" disabled={saving || !file} className={primaryBtnClass}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {payment.status === "RECHAZADO" ? "Enviar nuevo comprobante" : "Enviar comprobante"}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Receipt,
  ExternalLink,
} from "lucide-react";

import { apiUrl, apiFetch, API_ENDPOINTS } from "@/utils/api";
import { labelClass, inputClass, primaryBtnClass } from "@/components/ui/formStyles";

interface PaymentInfo {
  status: string;
  status_label?: string;
  amount: string | null;
  paid_at?: string | null;
  reference?: string | null;
  has_receipt?: boolean;
  receipt_url?: string | null;
  admin_note?: string | null;
}

/** Estados en los que el acudiente todavía debe (o puede volver a) reportar el pago. */
const CAN_REPORT = ["PENDIENTE", "RECHAZADO"];

export function GuardianPaymentCard({
  code,
  onChanged,
}: {
  code: string;
  onChanged: () => void;
}) {
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsPayment(code));
      if (res.ok) setPayment(await res.json());
    } catch {
      setError("No pudimos cargar el estado del pago.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Adjunta el comprobante de pago.");
      return;
    }
    setSaving(true);
    setError(null);

    const body = new FormData();
    body.append("receipt", file);
    if (paidAt) body.append("paid_at", paidAt);
    if (reference) body.append("reference", reference);

    try {
      // FormData: sin Content-Type manual (el navegador pone el boundary).
      // El Bearer lo inyecta el interceptor global.
      const res = await fetch(apiUrl(API_ENDPOINTS.admissionsPaymentReport(code)), {
        method: "POST",
        body,
      });
      if (res.ok) {
        setFile(null);
        setPaidAt("");
        setReference("");
        await load();
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : "No pudimos registrar el pago.",
        );
      }
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-6 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando pago…
      </div>
    );
  }

  const status = payment?.status ?? "PENDIENTE";
  const canReport = CAN_REPORT.includes(status);

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-secondary">
          Pago de inscripción
        </h2>
        {payment?.amount && (
          <span className="font-display text-lg font-semibold text-primary">
            ${payment.amount}
          </span>
        )}
      </div>

      {/* Estado actual */}
      {status === "VALIDADO" && (
        <p className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle2 className="h-5 w-5" />
          Pago confirmado. ¡Gracias!
        </p>
      )}
      {status === "EXENTO" && (
        <p className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle2 className="h-5 w-5" />
          Estás exento del pago de inscripción.
        </p>
      )}
      {status === "REPORTADO" && (
        <p className="flex items-center gap-2 text-sm text-base-content/70">
          <Clock className="h-5 w-5 text-primary" />
          Recibimos tu comprobante. El colegio lo está revisando.
        </p>
      )}

      {/* Ver el comprobante enviado */}
      {payment?.receipt_url && (
        <a
          href={payment.receipt_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Ver comprobante enviado
        </a>
      )}

      {/* Motivo del rechazo */}
      {status === "RECHAZADO" && payment?.admin_note && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-base-content">
              El comprobante fue rechazado
            </p>
            <p className="mt-1 text-base-content/80">{payment.admin_note}</p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{error}</span>
        </div>
      )}

      {canReport && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-base-content/60">
            Realiza la consignación y adjunta aquí el comprobante para que el colegio
            lo verifique.
          </p>

          <div>
            <label htmlFor="receipt" className={labelClass}>
              Comprobante *
            </label>
            <input
              id="receipt"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="file-input file-input-bordered w-full"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="paid-at" className={labelClass}>
                Fecha del pago
              </label>
              <input
                id="paid-at"
                type="date"
                className={inputClass}
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reference" className={labelClass}>
                Referencia o número de transacción
              </label>
              <input
                id="reference"
                className={inputClass}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={saving || !file} className={primaryBtnClass}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                {status === "RECHAZADO" ? "Enviar nuevo comprobante" : "Reportar pago"}
              </>
            )}
          </button>
        </form>
      )}

      {!canReport && status === "REPORTADO" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-base-content/50">
          <Upload className="h-3.5 w-3.5" />
          Comprobante enviado{payment?.paid_at ? ` · pago del ${payment.paid_at}` : ""}
        </p>
      )}
    </div>
  );
}

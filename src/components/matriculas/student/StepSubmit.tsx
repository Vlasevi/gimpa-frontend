/**
 * Paso 6 — Resumen y envío. Enviar es una sola llamada (la transición a "En revisión",
 * plan 15.2, hallazgo #27): los datos, las firmas y los documentos ya están guardados.
 * El resumen muestra la lista real de pendientes (hallazgo #20).
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { ghostBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { ApiError, enrollmentApi, type StudentEnrollment } from "@/components/matriculas/enrollmentApi";
import { getDocumentStatusLabel } from "@/utils/statusHelpers";
import type { FlashFn } from "./types";
import { titleClass } from "@/components/ui/textStyles";

function CheckRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      )}
      <span className="sr-only">{ok ? "Listo:" : "Pendiente:"}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export function StepSubmit({
  enrollment,
  onBack,
  onGoToStep,
  onSubmitted,
  flash,
}: {
  enrollment: StudentEnrollment;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  onSubmitted: (next: StudentEnrollment) => void;
  flash: FlashFn;
}) {
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const dataSaved = !!enrollment.progress?.data_saved;
  const signed = !!enrollment.progress?.signed;
  const pending = (enrollment.documents ?? []).filter(
    (d) => d.kind === "family" && d.required && (d.status === "MISSING" || d.status === "REJECTED"),
  );
  const canSubmit = dataSaved && signed;

  const submit = async () => {
    setConfirming(false);
    setSending(true);
    try {
      const res = await enrollmentApi.submit(enrollment.id);
      if (res.enrollment) onSubmitted(res.enrollment);
      flash("success", "Matrícula enviada a revisión");
    } catch (e) {
      flash("error", e instanceof ApiError ? e.message : "No se pudo enviar la matrícula.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby="step-title" className="space-y-6">
      <div>
        <h2 id="step-title" className={titleClass}>
          Revisa y envía
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Al enviar, la institución revisa la matrícula. Mientras tanto no podrás cambiar los datos.
        </p>
      </div>

      <ul className="space-y-4 rounded-2xl border border-base-300 bg-base-100 p-5">
        <CheckRow ok={dataSaved}>
          <p className="font-medium">Datos del estudiante y la familia</p>
          {!dataSaved && (
            <button type="button" className="link link-primary text-sm" onClick={() => onGoToStep(3)}>
              Completar los datos
            </button>
          )}
        </CheckRow>
        <CheckRow ok={signed}>
          <p className="font-medium">Contrato, pagaré y hoja de matrícula firmados</p>
          {!signed && (
            <button type="button" className="link link-primary text-sm" onClick={() => onGoToStep(4)}>
              Firmar los documentos
            </button>
          )}
        </CheckRow>
        <CheckRow ok={pending.length === 0}>
          <p className="font-medium">
            {pending.length === 0
              ? "Documentos obligatorios entregados"
              : `${pending.length} ${pending.length === 1 ? "documento obligatorio pendiente" : "documentos obligatorios pendientes"}`}
          </p>
          {pending.length > 0 && (
            <>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-base-content/70">
                {pending.map((d) => (
                  <li key={d.key}>
                    {d.label} · {getDocumentStatusLabel(d.status).toLowerCase()}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-base-content/60">
                Puedes enviar la matrícula sin ellos: podrás subirlos cuando la institución la apruebe o
                si te pide correcciones.{" "}
                <button type="button" className="link link-primary" onClick={() => onGoToStep(5)}>
                  Subirlos ahora
                </button>
              </p>
            </>
          )}
        </CheckRow>
      </ul>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className={ghostBtnClass} onClick={onBack} disabled={sending}>
          Atrás
        </button>
        <button type="button" className={primaryBtnClass} onClick={() => setConfirming(true)} disabled={!canSubmit || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {sending ? "Enviando…" : "Enviar matrícula"}
        </button>
      </div>

      <Alert
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onAccept={submit}
        title="¿Enviar la matrícula a revisión?"
        variant="info"
        acceptText="Enviar matrícula"
        cancelText="Seguir revisando"
      >
        <p>
          La institución revisará los datos, las firmas y los documentos. Te avisaremos por correo al
          acudiente cuando la aprueben o si piden alguna corrección.
        </p>
        {pending.length > 0 && (
          <p>
            Quedan <strong>{pending.length}</strong> documentos obligatorios por subir. Podrás subirlos
            cuando la institución apruebe la matrícula.
          </p>
        )}
      </Alert>
    </section>
  );
}

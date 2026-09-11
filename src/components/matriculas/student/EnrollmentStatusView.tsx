/**
 * Matrícula que ya no se edita: en revisión, aprobada (con o sin documentos pendientes),
 * rechazada, anulada o inactiva. Reemplaza el "Matrícula No Disponible" (hallazgo #21):
 * cada estado dice qué pasa y qué sigue.
 *
 * Aprobada con pendientes (plan §12): pestaña "Documentos" para subir o reemplazar lo que
 * falta, sin OTP (decisión 14).
 */

import { useState } from "react";
import { CheckCircle2, Clock3, FileWarning, Info, XCircle } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EnrollmentDocument, StudentEnrollment } from "@/components/matriculas/enrollmentApi";
import { DocumentChecklist } from "./DocumentChecklist";
import type { FlashFn } from "./types";

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "long" }).format(new Date(value));
}

const TONES = {
  info: { box: "border-info/30 bg-info/5", icon: "bg-info/10 text-info" },
  success: { box: "border-success/30 bg-success/5", icon: "bg-success/10 text-success" },
  warning: { box: "border-warning/40 bg-warning/5", icon: "bg-warning/10 text-warning" },
  error: { box: "border-error/30 bg-error/5", icon: "bg-error/10 text-error" },
  neutral: { box: "border-base-300 bg-base-100", icon: "bg-base-200 text-base-content/60" },
} as const;

function StatusCard({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  icon: typeof Info;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex gap-4 rounded-2xl border p-5 ${TONES[tone].box}`} role="status">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone].icon}`} aria-hidden="true">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 space-y-1">
        <h2 className="font-display text-xl font-semibold text-secondary">{title}</h2>
        <div className="space-y-1 text-sm text-base-content/80">{children}</div>
      </div>
    </div>
  );
}

export function EnrollmentStatusView({
  enrollment,
  message,
  onDocumentChange,
  flash,
}: {
  enrollment: StudentEnrollment | null;
  message: string;
  onDocumentChange: (doc: EnrollmentDocument) => void;
  flash: FlashFn;
}) {
  const [tab, setTab] = useState("resumen");

  if (!enrollment) {
    return (
      <StatusCard tone="neutral" icon={Info} title="Sin matrícula abierta">
        <p>{message}</p>
      </StatusCard>
    );
  }

  const { status } = enrollment;
  const documents = enrollment.documents ?? [];

  if (status === "SUBMITTED") {
    const pending = documents.filter((d) => d.kind === "family" && d.required && d.status === "MISSING");
    return (
      <div className="space-y-6">
        <StatusCard tone="info" icon={Clock3} title="En revisión">
          <p>{message}</p>
          {enrollment.submitted_at && <p className="text-base-content/60">Enviada el {formatDate(enrollment.submitted_at)}.</p>}
          {pending.length > 0 && (
            <p>
              Quedan {pending.length} documentos por entregar. Podrás subirlos cuando la institución
              apruebe la matrícula.
            </p>
          )}
        </StatusCard>
        <section aria-labelledby="docs-title" className="space-y-3">
          <h2 id="docs-title" className="font-display text-lg font-semibold text-secondary">
            Documentos entregados
          </h2>
          <DocumentChecklist
            enrollmentId={enrollment.id}
            documents={documents}
            onDocumentChange={onDocumentChange}
            flash={flash}
          />
        </section>
      </div>
    );
  }

  if (status === "ACTIVE") {
    // Se cuenta desde los documentos (no desde `pending_documents`), para que baje en
    // cuanto el estudiante sube uno.
    const family = documents.filter((d) => d.kind === "family" && d.required);
    const pendingCount = family.filter((d) => d.status === "MISSING" || d.status === "REJECTED").length;
    const inReviewCount = family.filter((d) => d.status === "UPLOADED").length;
    const card = (
      <StatusCard
        tone={pendingCount > 0 ? "warning" : "success"}
        icon={pendingCount > 0 ? FileWarning : CheckCircle2}
        title={
          pendingCount > 0
            ? "Aprobada · documentos pendientes"
            : inReviewCount > 0
              ? "Aprobada · documentos en revisión"
              : "Aprobada"
        }
      >
        <p>
          {pendingCount > 0
            ? message
            : inReviewCount > 0
              ? "Tu matrícula está aprobada. La institución está revisando los documentos que subiste."
              : "Tu matrícula está aprobada."}
        </p>
        <p className="text-base-content/60">
          {enrollment.grade.label} · año {enrollment.academic_year}
          {enrollment.approved_at && ` · aprobada el ${formatDate(enrollment.approved_at)}`}
        </p>
      </StatusCard>
    );
    if (pendingCount === 0 && inReviewCount === 0) return card;
    return (
      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="tabs tabs-border" aria-label="Matrícula">
          <TabsTrigger value="resumen" className={`tab ${tab === "resumen" ? "tab-active" : ""}`}>
            Resumen
          </TabsTrigger>
          <TabsTrigger value="documentos" className={`tab gap-2 ${tab === "documentos" ? "tab-active" : ""}`}>
            Documentos
            {pendingCount > 0 && <span className="badge badge-warning badge-sm">{pendingCount}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="space-y-4">
          {card}
          <button type="button" className="btn btn-primary" onClick={() => setTab("documentos")}>
            {pendingCount > 0 ? "Subir documentos pendientes" : "Ver documentos"}
          </button>
        </TabsContent>
        <TabsContent value="documentos" className="space-y-4">
          <p className="text-sm text-base-content/70">
            Sube los documentos que faltan o los que la institución rechazó. Los que ya fueron
            aprobados no se pueden cambiar.
          </p>
          <DocumentChecklist
            enrollmentId={enrollment.id}
            documents={documents}
            onDocumentChange={onDocumentChange}
            flash={flash}
          />
        </TabsContent>
      </Tabs>
    );
  }

  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <StatusCard tone="error" icon={XCircle} title={status === "REJECTED" ? "No aprobada" : "Anulada"}>
        <p>{message}</p>
        {enrollment.closed_reason && (
          <p>
            <span className="font-semibold">Motivo:</span> {enrollment.closed_reason}
          </p>
        )}
        <p className="text-base-content/60">Si tienes preguntas, comunícate con la secretaría del colegio.</p>
      </StatusCard>
    );
  }

  return (
    <StatusCard tone="neutral" icon={Info} title="Inactiva">
      <p>{message}</p>
      {enrollment.inactive_reason_label && <p className="text-base-content/60">Motivo: {enrollment.inactive_reason_label}.</p>}
    </StatusCard>
  );
}

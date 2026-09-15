import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Circle,
  MinusCircle,
  Eye,
  FileText,
  X,
} from "lucide-react";

import { apiUrl, apiFetch, API_ENDPOINTS } from "@/utils/api";
import { fileRuleError, type FileRule } from "@/components/admisiones/admissionTypes";
import { primaryBtnClass, iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";
import { titleClass } from "@/components/ui/textStyles";

interface DocumentRow {
  doc_type: string;
  label: string;
  status: string;
  status_label: string;
  url: string | null;
  note_public: string | null;
  /** Formato y tamaño máximo que acepta (`admissions/documents.py`). */
  rule: FileRule;
}

/** Estados en los que el acudiente puede (o debe) cargar el archivo. */
const CAN_UPLOAD = ["NO_CARGADO", "RECHAZADO"];

const STATUS_ICON: Record<string, { Icon: typeof CheckCircle2; className: string }> = {
  APROBADO: { Icon: CheckCircle2, className: "text-accent" },
  CARGADO: { Icon: Clock, className: "text-primary" },
  RECHAZADO: { Icon: AlertCircle, className: "text-warning" },
  NO_APLICA: { Icon: MinusCircle, className: "text-base-content/30" },
  PENDIENTE_POSTERIOR: { Icon: Clock, className: "text-base-content/40" },
};

// `primaryBtn` local se reemplazó por el `primaryBtnClass` compartido (Paso 6). No hay
// aún un `ui/Button.tsx` con variantes de tamaño (documentado como pendiente en
// docs/paso0-informe-admisiones.md §7), así que `secondaryBtn` — un botón chico de fila,
// sin equivalente compartido hoy — se conserva local a propósito.
const secondaryBtn =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-base-300 bg-base-100 px-3 text-sm font-medium text-base-content transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function GuardianDocumentsCard({
  id,
  onChanged,
  correcting = false,
}: {
  id: number;
  onChanged: () => void;
  /** Hay una corrección abierta: solo se vuelve a subir lo marcado ("Por corregir"). */
  correcting?: boolean;
}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Archivos seleccionados pero AÚN NO subidos: se pueden cambiar o quitar
  // antes de confirmar. Solo al confirmar se envían al servidor.
  const [staged, setStaged] = useState<Record<string, File>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsDocuments(id));
      if (res.ok) setDocuments((await res.json()).documents ?? []);
      else setError("No pudimos cargar los documentos.");
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /** Selecciona (o quita) un archivo localmente, sin subirlo todavía. */
  const pick = (docType: string, file: File | null) => {
    setError(null);
    const rule = documents.find((d) => d.doc_type === docType)?.rule;
    const problem = file ? fileRuleError(file, rule) : null;
    if (problem) {
      setError(problem);
      return;
    }
    setStaged((prev) => {
      const next = { ...prev };
      if (file) next[docType] = file;
      else delete next[docType];
      return next;
    });
  };

  /** Sube todos los archivos seleccionados. Conserva los que fallen para reintentar. */
  const confirmUpload = async () => {
    const entries = Object.entries(staged);
    if (entries.length === 0) return;
    setSubmitting(true);
    setError(null);

    const failed: string[] = [];
    for (const [docType, file] of entries) {
      const body = new FormData();
      body.append("doc_type", docType);
      body.append("file", file);
      try {
        // FormData: sin Content-Type manual; el Bearer lo pone el interceptor global.
        const res = await fetch(apiUrl(API_ENDPOINTS.admissionsDocuments(id)), {
          method: "POST",
          body,
        });
        if (!res.ok) failed.push(docType);
      } catch {
        failed.push(docType);
      }
    }

    await load();
    onChanged();
    // Deja seleccionados solo los que no lograron subir.
    setStaged((prev) => {
      const next: Record<string, File> = {};
      for (const dt of failed) if (prev[dt]) next[dt] = prev[dt];
      return next;
    });
    if (failed.length > 0) {
      setError(
        `No pudimos subir ${failed.length} documento(s). Revisa e inténtalo de nuevo.`,
      );
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-6 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando documentos…
      </div>
    );
  }

  const uploadable = correcting ? ["RECHAZADO"] : CAN_UPLOAD;
  const pendingCount = documents.filter((d) => uploadable.includes(d.status)).length;
  const stagedCount = Object.keys(staged).length;

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={titleClass}>Documentos</h2>
        <span className="text-sm text-base-content/60">
          {pendingCount === 0 ? "No falta ninguno" : `${pendingCount} por cargar`}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{error}</span>
        </div>
      )}

      <ul className="divide-y divide-base-300">
        {documents.map((doc) => {
          const { Icon, className } = STATUS_ICON[doc.status] ?? {
            Icon: Circle,
            className: "text-base-content/25",
          };
          const canUpload = uploadable.includes(doc.status);
          const file = staged[doc.doc_type];

          return (
            <li key={doc.doc_type} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-base-content">{doc.label}</p>
                    <p className={`text-sm ${doc.status === "RECHAZADO" ? "font-medium text-warning" : "text-base-content/60"}`}>
                      {/* El motivo llega por correo; aquí solo se marca qué corregir. */}
                      {doc.status === "RECHAZADO" ? "Por corregir" : doc.status_label}
                    </p>
                    {canUpload && (
                      <p className="mt-0.5 text-xs text-base-content/60">{doc.rule.hint}</p>
                    )}
                    {doc.note_public && (
                      <p className="mt-1 text-sm text-base-content/60">
                        {doc.note_public}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Ver"
                      aria-label={`Ver ${doc.label}`}
                      className={`${iconBtnClass} ${iconHover.primary}`}
                    >
                      <Eye className={iconClass} aria-hidden="true" />
                    </a>
                  )}

                  {canUpload && (
                    <>
                      <input
                        ref={(el) => {
                          inputs.current[doc.doc_type] = el;
                        }}
                        type="file"
                        accept={doc.rule.accept}
                        className="hidden"
                        onChange={(e) => {
                          pick(doc.doc_type, e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => inputs.current[doc.doc_type]?.click()}
                        className={secondaryBtn}
                      >
                        <Upload className="h-4 w-4" />
                        {file
                          ? "Cambiar"
                          : doc.status === "RECHAZADO"
                            ? "Reemplazar"
                            : "Seleccionar"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Archivo seleccionado (aún NO subido): se puede cambiar o quitar. */}
              {canUpload && file && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm sm:ml-8">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-base-content">{file.name}</span>
                  <span className="shrink-0 text-xs text-base-content/50">· sin subir</span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => pick(doc.doc_type, null)}
                    aria-label="Quitar archivo"
                    className="ml-auto shrink-0 rounded-md p-1 text-base-content/50 transition-colors hover:bg-base-200 hover:text-error disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Barra de confirmación: nada se sube hasta pulsar aquí. */}
      {stagedCount > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-4">
          <p className="text-sm text-base-content/60">
            {stagedCount === 1
              ? "1 documento seleccionado, sin subir."
              : `${stagedCount} documentos seleccionados, sin subir.`}
          </p>
          <button
            type="button"
            onClick={confirmUpload}
            disabled={submitting}
            className={primaryBtnClass}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Confirmar y subir
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

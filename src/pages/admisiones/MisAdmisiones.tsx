import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  Plus,
  AlertCircle,
  FileText,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { StatusBadge } from "@/components/admisiones/StatusBadge";
import {
  isEditable,
  type AdmissionApplicationRow,
} from "@/components/admisiones/admissionTypes";
import { primaryBtnClass } from "@/components/ui/formStyles";

export default function MisAdmisiones() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdmissionApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await apiFetch(API_ENDPOINTS.admissionsApplications);
        if (!active) return;
        if (res.ok) {
          setRows(await res.json());
        } else {
          setError("No pudimos cargar tus solicitudes.");
        }
      } catch {
        if (active) setError("No pudimos conectar con el servidor.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-secondary">
            Mis solicitudes
          </h1>
          <p className="mt-1 text-base-content/60">
            Aquí ves el proceso de admisión de cada uno de tus hijos.
          </p>
        </div>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => navigate("/admisiones/nueva")}
            className={primaryBtnClass}
          >
            <Plus className="h-5 w-5" />
            Nueva admisión
          </button>
        )}
      </div>

      {/* Cargando */}
      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cargando tus solicitudes…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-6 text-base-content/80 shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div>
            <p className="font-medium text-base-content">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Vacío — invita a actuar */}
      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-base-300 bg-base-100 px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-secondary">
            Empieza el proceso de admisión
          </h2>
          <p className="mt-2 max-w-md text-base-content/60">
            Crea una solicitud por cada hijo que quieras inscribir. Puedes
            guardarla e ir completándola por partes.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admisiones/nueva")}
            className={`${primaryBtnClass} mt-6`}
          >
            <Plus className="h-5 w-5" />
            Nueva admisión
          </button>
        </div>
      )}

      {/* Listado */}
      {!loading && !error && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => {
            const editable = isEditable(row.status);
            return (
              <li key={row.code}>
                <Link
                  to={`/admisiones/${row.code}`}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm transition-colors hover:bg-base-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-secondary">
                        {row.applicant_name}
                      </h2>
                      <StatusBadge
                        status={row.status}
                        label={row.status_label}
                      />
                    </div>
                    <p className="mt-1 text-sm text-base-content/60">
                      {row.grade_name} · {row.academic_year}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-base-content/50">
                      <FileText className="h-3.5 w-3.5" />
                      {row.code}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    {editable ? "Continuar solicitud" : "Ver detalle"}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

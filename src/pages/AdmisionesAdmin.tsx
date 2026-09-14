import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, Search, Inbox, Eye } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { usePermissions } from "@/components/Login/loginLogic";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/admisiones/StatusBadge";
import { ApplicationDetail } from "@/components/admisiones/admin/ApplicationDetail";
import type { AdmissionApplicationRow } from "@/components/admisiones/admissionTypes";
import { iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";

/**
 * Estados por los que el personal filtra a diario. No es el catálogo completo (29):
 * es una selección de los momentos accionables del proceso.
 */
const STATUS_FILTERS = [
  { value: "", label: "Todos los estados" },
  { value: "SOLICITUD_ENVIADA", label: "Enviadas (por revisar)" },
  { value: "VALIDACION_INICIAL", label: "En validación" },
  { value: "DEVUELTA_PARA_CORRECCION", label: "Devueltas al acudiente" },
  { value: "PENDIENTE_PAGO", label: "Pendiente de pago" },
  { value: "PAGO_REPORTADO", label: "Pago reportado (por validar)" },
  { value: "PENDIENTE_DOCUMENTOS", label: "Pendiente de documentos" },
  { value: "DOCUMENTOS_EN_REVISION", label: "Documentos por revisar" },
  { value: "DOCUMENTOS_COMPLETOS", label: "Documentos completos" },
  { value: "LISTA_ESPERA", label: "Lista de espera" },
  { value: "ADMITIDO", label: "Admitidos" },
  { value: "NO_ADMITIDO", label: "No admitidos" },
];

const currentYear = new Date().getFullYear();
const YEAR_FILTERS = [
  { value: "", label: "Todos los años" },
  { value: String(currentYear + 1), label: String(currentYear + 1) },
  { value: String(currentYear), label: String(currentYear) },
];

export default function AdmisionesAdmin() {
  const perms = usePermissions("admissions");
  // Quien puede borrar puede además ver las eliminadas (atenuadas) en el listado.
  const includeDeleted = Boolean(perms.canDelete);

  const [rows, setRows] = useState<AdmissionApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [search, setSearch] = useState("");
  // El expediente seleccionado se mantiene montado una vez abierto por primera vez
  // (solo `detailOpen` se apaga al cerrar) para que la animación de salida del modal
  // (components/ui/Modal.tsx) tenga tiempo de reproducirse — si se desmontara de
  // inmediato con la fila del expediente, el cierre se vería sin transición.
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (includeDeleted) params.set("include_deleted", "true");
    if (statusFilter) params.set("status", statusFilter);
    if (yearFilter) params.set("academic_year", yearFilter);
    const qs = params.toString();

    try {
      const res = await apiFetch(
        `${API_ENDPOINTS.admissionsApplications}${qs ? `?${qs}` : ""}`,
      );
      if (res.ok) {
        setRows(await res.json());
      } else {
        setError("No pudimos cargar los expedientes.");
      }
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, [includeDeleted, statusFilter, yearFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.applicant_name.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term),
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-secondary">Admisiones</h1>
        <p className="mt-1 text-base-content/60">
          Expedientes de aspirantes nuevos: validación, pago y documentos.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          className="w-64"
          ariaLabel="Filtrar por estado"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS}
        />
        <FilterSelect
          className="w-40"
          ariaLabel="Filtrar por año"
          value={yearFilter}
          onChange={setYearFilter}
          options={YEAR_FILTERS}
        />
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[color:color-mix(in_oklab,var(--color-base-content)_55%,var(--color-base-100))]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código"
            aria-label="Buscar expedientes"
            className="h-11 w-full rounded-lg border border-base-300 bg-base-100 pl-9 pr-4 text-sm text-base-content placeholder:text-base-content/40 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Contenido */}
      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cargando expedientes…
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-6 shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div>
            <p className="font-medium text-base-content">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-base-300 bg-base-100 px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-secondary">
            No hay expedientes con estos filtros
          </h2>
          <p className="mt-2 max-w-md text-base-content/60">
            Ajusta el estado o el año para ver otros aspirantes.
          </p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-300 bg-base-200 text-left">
                  <th className="px-5 py-3 font-medium text-base-content/70">Aspirante</th>
                  <th className="px-5 py-3 font-medium text-base-content/70">Grado</th>
                  <th className="px-5 py-3 font-medium text-base-content/70">Año</th>
                  <th className="px-5 py-3 font-medium text-base-content/70">Código</th>
                  <th className="px-5 py-3 font-medium text-base-content/70">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {visible.map((row) => (
                  <tr
                    key={row.code}
                    className={`transition-colors hover:bg-base-200/60 ${
                      row.is_deleted ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-base-content">
                      <span className="flex items-center gap-2">
                        {row.applicant_name}
                        {row.is_deleted && (
                          <span className="rounded-full border border-error/25 bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                            Eliminada
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-base-content/70">{row.grade_name}</td>
                    <td className="px-5 py-3 text-base-content/70">
                      {row.academic_year}
                    </td>
                    <td className="px-5 py-3 text-base-content/50">{row.code}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} label={row.status_label} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCode(row.code);
                          setDetailOpen(true);
                        }}
                        title="Ver expediente"
                        aria-label={`Ver expediente ${row.code}`}
                        className={`${iconBtnClass} ${iconHover.primary}`}
                      >
                        <Eye className={iconClass} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedCode && (
        <ApplicationDetail
          code={selectedCode}
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

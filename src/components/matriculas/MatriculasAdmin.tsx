/**
 * Panel de staff de Matrículas (Matrícula v2).
 *
 * Listado por año lectivo con filtros en el servidor (estado, grado, origen, búsqueda y
 * "activas con documentos pendientes"), resumen del año que también filtra, y el detalle
 * de cada matrícula (`admin/EnrollmentDetail`), donde viven todas las acciones.
 *
 * El resumen se calcula con TODAS las matrículas del año (sin filtros); la tabla, con la
 * consulta filtrada. Sin filtros activos las dos son la misma y se pide una sola vez.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus,
  FileSpreadsheet,
  Loader2,
  Repeat,
  Search,
  Sheet,
  UserPlus,
  X,
} from "lucide-react";

import UserRegister from "@/components/auxiliar/userRegister";
import UserEnroll from "@/components/auxiliar/userEnroll";
import { useAuth } from "@/components/Login/loginLogic";
import { enrollmentApi, type EnrollmentListItem, type GradeInfo } from "@/components/matriculas/enrollmentApi";
import { BulkRenewalDialog } from "@/components/matriculas/admin/BulkRenewalDialog";
import { EnrollmentDetail } from "@/components/matriculas/admin/EnrollmentDetail";
import { currentYear, errorMessage } from "@/components/matriculas/admin/shared";
import { EnrollmentCard, EnrollmentRow } from "@/components/matriculas/matriculasUI/EnrollmentRow";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FormDialog } from "@/components/ui/FormDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { Toast } from "@/components/ui/Toast";
import { ghostBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, API_ENDPOINTS, buildHeaders } from "@/utils/api";
import { ENROLLMENT_STATUS_ORDER, getStatusLabel, ORIGIN_LABELS } from "@/utils/statusHelpers";

// Alturas aproximadas (px) para estimar cuántas filas caben sin scroll
const ROW_HEIGHT = 69;
const HEADER_HEIGHT = 45;
const FOOTER_HEIGHT = 57;
const BOTTOM_GAP = 24;
const MIN_PAGE_SIZE = 5;

const SEARCH_DEBOUNCE_MS = 350;

// Números de página a mostrar (con elipsis cuando hay muchas)
function getPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  ...ENROLLMENT_STATUS_ORDER.map((status) => ({ value: status, label: getStatusLabel(status) })),
];

const ORIGIN_OPTIONS = [
  { value: "", label: "Todos los orígenes" },
  ...Object.entries(ORIGIN_LABELS).map(([value, label]) => ({ value, label })),
];

type StatKey = "all" | "SUBMITTED" | "RETURNED" | "ACTIVE" | "pending";

const STATS: { key: StatKey; label: string; hint: string; dot: string }[] = [
  { key: "all", label: "Todas", hint: "Del año lectivo", dot: "status-neutral" },
  { key: "SUBMITTED", label: "En revisión", hint: "Esperan decisión", dot: "status-info" },
  { key: "RETURNED", label: "Devueltas", hint: "En corrección", dot: "status-warning" },
  { key: "ACTIVE", label: "Aprobadas", hint: "Activas", dot: "status-success" },
  { key: "pending", label: "Aprobadas con pendientes", hint: "Faltan documentos", dot: "status-warning" },
];

type PanelModal = "enroll" | "register" | "renewal";
type Download = "list" | "data";

export const MatriculasAdmin = () => {
  const { user } = useAuth();
  const permissions = user?.permissions?.enrollments;
  const canCreate = Boolean(permissions?.canCreate);
  const canApprove = Boolean(permissions?.canApprove);
  const canDelete = Boolean(permissions?.canDelete);
  const canExport = Boolean(user?.permissions?.global?.canExport);
  const canEditMedical = Boolean(user?.permissions?.documents?.canEditMedical);
  // Registrar la cuenta pide además permiso sobre usuarios (backend: CanCreateUsers).
  const canRegister = canCreate && Boolean(user?.permissions?.users?.canCreate);

  const ids = useId();
  const { toast, flash } = useToast();

  // Catálogos
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [knownYears, setKnownYears] = useState<number[]>([]);
  const [yearsKey, setYearsKey] = useState(0);

  // Filtros
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Datos
  const [refreshKey, setRefreshKey] = useState(0);
  const [yearItems, setYearItems] = useState<EnrollmentListItem[]>([]);
  const [yearLoading, setYearLoading] = useState(true);
  const [filteredItems, setFilteredItems] = useState<EnrollmentListItem[]>([]);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tabla
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const tableRef = useRef<HTMLDivElement>(null);

  // Modales
  const [modal, setModal] = useState<PanelModal | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [downloading, setDownloading] = useState<Download | null>(null);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const hasFilters = Boolean(statusFilter || gradeFilter || originFilter || search || pendingOnly);

  // Grados (una vez) y años con matrículas (al montar y cuando se crean matrículas)
  useEffect(() => {
    let alive = true;
    enrollmentApi
      .grades()
      .then((list) => alive && setGrades([...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))))
      .catch(() => alive && flash("error", "No se pudieron cargar los grados."));
    return () => {
      alive = false;
    };
  }, [flash]);

  useEffect(() => {
    let alive = true;
    enrollmentApi
      .list({})
      .then((all) => alive && setKnownYears(Array.from(new Set(all.map((e) => e.academic_year)))))
      .catch(() => {
        /* sin la lista completa quedan el año actual y el siguiente */
      });
    return () => {
      alive = false;
    };
  }, [yearsKey]);

  // Búsqueda con retardo
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Todas las matrículas del año (resumen, y tabla sin filtros)
  useEffect(() => {
    let alive = true;
    setYearLoading(true);
    enrollmentApi
      .list({ academic_year: year })
      .then((items) => {
        if (!alive) return;
        setYearItems(items);
        setLoadError(null);
      })
      .catch((error) => alive && setLoadError(errorMessage(error, "No se pudieron cargar las matrículas.")))
      .finally(() => alive && setYearLoading(false));
    return () => {
      alive = false;
    };
  }, [year, refreshKey]);

  // Consulta filtrada (solo si hay filtros)
  useEffect(() => {
    if (!hasFilters) return;
    let alive = true;
    setFilteredLoading(true);
    enrollmentApi
      .list({
        academic_year: year,
        status: statusFilter,
        grade_id: gradeFilter,
        origin: originFilter,
        search,
        pending_documents: pendingOnly ? 1 : undefined,
      })
      .then((items) => {
        if (!alive) return;
        setFilteredItems(items);
        setLoadError(null);
      })
      .catch((error) => alive && setLoadError(errorMessage(error, "No se pudieron cargar las matrículas.")))
      .finally(() => alive && setFilteredLoading(false));
    return () => {
      alive = false;
    };
  }, [hasFilters, year, statusFilter, gradeFilter, originFilter, search, pendingOnly, refreshKey]);

  // Volver a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [year, statusFilter, gradeFilter, originFilter, search, pendingOnly]);

  const loading = hasFilters ? filteredLoading : yearLoading;

  // Cuántas filas caben sin scroll según el alto de la ventana
  useEffect(() => {
    const computePageSize = () => {
      const el = tableRef.current;
      if (!el) return;
      const available = window.innerHeight - el.getBoundingClientRect().top - HEADER_HEIGHT - FOOTER_HEIGHT - BOTTOM_GAP;
      setPageSize(Math.max(MIN_PAGE_SIZE, Math.floor(available / ROW_HEIGHT)));
    };
    computePageSize();
    window.addEventListener("resize", computePageSize);
    return () => window.removeEventListener("resize", computePageSize);
  }, [yearLoading]);

  // Filas: por grado; dentro del grado, el orden del backend (apellido)
  const rows = useMemo(() => {
    const source = hasFilters ? filteredItems : yearItems;
    return [...source].sort((a, b) => (a.grade.order ?? 0) - (b.grade.order ?? 0));
  }, [hasFilters, filteredItems, yearItems]);

  const stats = useMemo(() => {
    const count = (status: string) => yearItems.filter((e) => e.status === status).length;
    return {
      all: yearItems.length,
      SUBMITTED: count("SUBMITTED"),
      RETURNED: count("RETURNED"),
      ACTIVE: count("ACTIVE"),
      pending: yearItems.filter((e) => e.status === "ACTIVE" && e.has_pending_documents).length,
    } satisfies Record<StatKey, number>;
  }, [yearItems]);

  const activeStat: StatKey | null = pendingOnly
    ? "pending"
    : !statusFilter
      ? "all"
      : statusFilter === "SUBMITTED" || statusFilter === "RETURNED" || statusFilter === "ACTIVE"
        ? statusFilter
        : null;

  const selectStat = (key: StatKey) => {
    setPendingOnly(key === "pending");
    setStatusFilter(key === "all" ? "" : key === "pending" ? "ACTIVE" : key);
  };

  const changeStatus = (value: string) => {
    setStatusFilter(value);
    if (value !== "ACTIVE") setPendingOnly(false);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setGradeFilter("");
    setOriginFilter("");
    setPendingOnly(false);
    setSearchInput("");
    setSearch("");
  };

  const yearOptions = useMemo(() => {
    const thisYear = currentYear();
    return Array.from(new Set([...knownYears, thisYear, thisYear + 1, year]))
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
  }, [knownYears, year]);

  const gradeOptions = useMemo(
    () => [{ value: "", label: "Todos los grados" }, ...grades.map((g) => ({ value: String(g.id), label: g.label }))],
    [grades],
  );

  // Paginación
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * pageSize;
  const pageItems = rows.slice(pageStart, pageStart + pageSize);

  const openDetail = (enrollment: EnrollmentListItem) => {
    setDetailId(enrollment.id);
    setDetailOpen(true);
  };
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  // Eliminar (cualquier estado): borra la matrícula y sus archivos en R2.
  const [toDelete, setToDelete] = useState<EnrollmentListItem | null>(null);
  /** `false` = falló: el diálogo queda abierto para reintentar. */
  const deleteEnrollment = async (enrollment: EnrollmentListItem) => {
    try {
      await enrollmentApi.remove(enrollment.id);
    } catch (error) {
      flash("error", errorMessage(error, "No se pudo eliminar la matrícula."));
      return false;
    }
    flash("success", `Matrícula ${enrollment.academic_year} de ${enrollment.student_name} eliminada`);
    if (detailId === enrollment.id) setDetailOpen(false);
    refresh();
    setYearsKey((key) => key + 1);
    return true;
  };

  // Descargas Excel (solo quien puede exportar)
  const download = async (kind: Download) => {
    const params = new URLSearchParams({ academic_year: String(year) });
    if (kind === "data") params.set("status", "ACTIVE");
    const path = kind === "list" ? API_ENDPOINTS.enrollmentListExcel : API_ENDPOINTS.studentsDataExcel;
    const filename = `${kind === "list" ? "listado_estudiantes" : "datos_estudiantes"}_${year}.xlsx`;
    setDownloading(kind);
    try {
      const response = await fetch(apiUrl(`${path}?${params}`), {
        credentials: "include",
        headers: buildHeaders({}, false),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "No se pudo generar el archivo.");
      }
      const url = window.URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      flash("error", error instanceof Error ? error.message : "No se pudo descargar el archivo.");
    } finally {
      setDownloading(null);
    }
  };

  const downloadButton = (kind: Download, label: string, Icon: typeof Sheet) => (
    <button
      type="button"
      onClick={() => download(kind)}
      disabled={downloading !== null}
      title={label}
      aria-label={label}
      className="cursor-pointer rounded-full p-2 text-base-content/50 transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
    >
      {downloading === kind ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );

  const searchId = `${ids}-search`;

  return (
    // Responsive (hasta ~375 px): bajo `sm` el contenedor suelta su padding lateral (el
    // `main` del Layout ya pone 24 px), los botones del encabezado se apilan a lo ancho, los
    // filtros van en una grilla de 2 y la tabla pasa a tarjetas. Desde `sm`, igual que antes.
    <div className="container mx-auto px-0 pt-2 pb-6 sm:px-6">
      <Toast toast={toast} />

      {/* Encabezado */}
      {/* Título arriba y botones debajo hasta `xl`: en tablet (y en laptop con la barra
          lateral abierta) no caben al lado del título sin apilarse. */}
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-secondary">Matrículas</h1>
          <p className="mt-1 text-base-content/60">
            {canApprove
              ? "Revisa, aprueba y da seguimiento a las matrículas de cada año lectivo."
              : "Consulta las matrículas de cada año lectivo."}
          </p>
        </div>
        {canCreate && (
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {canRegister && (
              <button type="button" className="btn btn-outline gap-2" onClick={() => setModal("register")}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Registrar usuario
              </button>
            )}
            <button type="button" className="btn btn-outline gap-2" onClick={() => setModal("renewal")}>
              <Repeat className="h-4 w-4" aria-hidden="true" />
              Renovar matrículas
            </button>
            <button type="button" className={primaryBtnClass} onClick={() => setModal("enroll")}>
              <FilePlus className="h-4 w-4" aria-hidden="true" />
              Nueva matrícula
            </button>
          </div>
        )}
      </header>

      {/* Filtros */}
      <div className="card mb-4 border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-start">
          {/* Bajo `sm`: [búsqueda], [año | estado], [grado | origen]. Desde `sm`, en línea. */}
          <div className="flex flex-1 flex-row flex-wrap gap-3">
            <FilterSelect
              className="w-[calc(50%-0.375rem)] shrink-0 sm:w-28"
              ariaLabel="Año lectivo"
              value={String(year)}
              onChange={(value) => setYear(Number(value))}
              options={yearOptions}
            />
            <div className="relative order-first w-full sm:order-none sm:w-auto sm:min-w-[10rem] sm:flex-1">
              <label htmlFor={searchId} className="sr-only">
                Buscar por nombre o correo
              </label>
              {/* `z-10`: el input (posicionado por daisyUI) se pintaba encima del ícono. */}
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[color:color-mix(in_oklab,var(--color-base-content)_55%,var(--color-base-100))]"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                placeholder="Nombre o correo"
                className="input input-bordered h-10 w-full pl-9 focus:input-primary"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <FilterSelect
              className="w-[calc(50%-0.375rem)] sm:w-48"
              ariaLabel="Filtrar por estado"
              value={statusFilter}
              onChange={changeStatus}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              className="w-[calc(50%-0.375rem)] sm:w-40"
              ariaLabel="Filtrar por grado"
              value={gradeFilter}
              onChange={setGradeFilter}
              options={gradeOptions}
            />
            <FilterSelect
              className="w-[calc(50%-0.375rem)] sm:w-44"
              ariaLabel="Filtrar por origen"
              value={originFilter}
              onChange={setOriginFilter}
              options={ORIGIN_OPTIONS}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 md:min-h-10 md:justify-end">
            {hasFilters ? (
              <button type="button" className={`${ghostBtnClass} btn-sm`} onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            ) : (
              <span />
            )}
            {canExport && (
              <div className="flex items-center gap-1 border-base-300 md:border-l md:pl-2">
                {downloadButton("list", `Descargar listas por grado ${year}`, Sheet)}
                {downloadButton("data", `Descargar datos de estudiantes ${year}`, FileSpreadsheet)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen del año: cada tarjeta filtra la tabla */}
      <section aria-label={`Resumen de matrículas ${year}`} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map((stat) => {
          const active = activeStat === stat.key;
          return (
            <button
              key={stat.key}
              type="button"
              aria-pressed={active}
              onClick={() => selectStat(stat.key)}
              className={`cursor-pointer rounded-lg border p-3 text-left shadow-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary max-sm:last:col-span-2 sm:p-4 ${
                active ? "border-primary bg-primary/5" : "border-base-300 bg-base-100 hover:border-base-content/30"
              }`}
            >
              <span
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
                  active ? "text-primary" : "text-base-content/60"
                }`}
              >
                <span className={`status ${stat.dot}`} aria-hidden="true" />
                {stat.label}
              </span>
              <span className="mt-2 block font-display text-2xl font-bold leading-none text-base-content sm:text-3xl">
                {yearLoading ? <span className="skeleton inline-block h-7 w-10 align-middle" /> : stats[stat.key]}
              </span>
              <span className="mt-1 block text-xs text-base-content/50">{stat.hint}</span>
            </button>
          );
        })}
      </section>

      {/* Tabla */}
      <div ref={tableRef} className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <p className="sr-only" aria-live="polite">
          {loading ? "Cargando matrículas…" : `${rows.length} ${rows.length === 1 ? "matrícula" : "matrículas"}`}
        </p>
        {loadError ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-base-content/70">{loadError}</p>
            <button type="button" className={ghostBtnClass} onClick={refresh}>
              Reintentar
            </button>
          </div>
        ) : loading && rows.length === 0 ? (
          <LoadingState compact className="py-16" label="Cargando matrículas…" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            {hasFilters ? (
              <>
                <p className="text-base-content/70">Ninguna matrícula de {year} coincide con los filtros.</p>
                <button type="button" className={ghostBtnClass} onClick={clearFilters}>
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-base-content/70">No hay matrículas para {year}.</p>
                {canCreate && (
                  <p className="text-sm text-base-content/50">
                    Crea una con «Nueva matrícula» o renueva las aprobadas del año anterior.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className={`transition-opacity duration-200 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
              {/* Bajo `sm`: tarjetas (estudiante, estado y grado, acciones) en vez de la tabla. */}
              <ul className="divide-y divide-base-300 sm:hidden" aria-label={`Matrículas ${year}`}>
                {pageItems.map((enrollment) => (
                  <EnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onView={openDetail}
                    onDelete={canDelete ? setToDelete : undefined}
                  />
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="table">
                  <caption className="sr-only">Matrículas {year}</caption>
                  <thead className="bg-base-200 text-base-content">
                    <tr>
                      <th scope="col">Estudiante</th>
                      <th scope="col">Grado</th>
                      <th scope="col">Estado</th>
                      <th scope="col" className="hidden xl:table-cell">
                        Origen
                      </th>
                      <th scope="col" className="hidden xl:table-cell">
                        Actualizada
                      </th>
                      <th scope="col" className="text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((enrollment) => (
                      <EnrollmentRow
                        key={enrollment.id}
                        enrollment={enrollment}
                        onView={openDetail}
                        onDelete={canDelete ? setToDelete : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Paginación"
                className="flex flex-col items-center justify-between gap-3 border-t border-base-300 px-4 py-3 sm:flex-row sm:px-6"
              >
                <p className="text-sm text-base-content/60">
                  Mostrando {pageStart + 1}–{Math.min(pageStart + pageSize, rows.length)} de {rows.length}
                </p>
                <div className="join">
                  <button
                    type="button"
                    className="join-item btn btn-sm"
                    disabled={page === 1}
                    onClick={() => setCurrentPage(page - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {getPageList(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="join-item btn btn-sm btn-disabled" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={p}
                        className={`join-item btn btn-sm ${p === page ? "btn-primary" : ""}`}
                        aria-label={`Página ${p}`}
                        aria-current={p === page ? "page" : undefined}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className="join-item btn btn-sm"
                    disabled={page === totalPages}
                    onClick={() => setCurrentPage(page + 1)}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Detalle */}
      <EnrollmentDetail
        enrollmentId={detailId}
        isOpen={detailOpen}
        onClose={closeDetail}
        onChanged={refresh}
        flash={flash}
        grades={grades}
        canApprove={canApprove}
        canEditMedical={canEditMedical}
      />

      {/* Nueva matrícula (formato de diálogo de formulario, DESIGN_SYSTEM §12b) */}
      <FormDialog
        isOpen={modal === "enroll"}
        onClose={() => setModal(null)}
        title="Nueva matrícula"
        icon={FilePlus}
        description="La matrícula queda «Creada» y el estudiante la diligencia desde su cuenta."
      >
        <UserEnroll
          grades={grades}
          flash={flash}
          onCancel={() => setModal(null)}
          onSuccess={(created) => {
            setModal(null);
            flash("success", `Matrícula creada para ${created.student_name} (${created.academic_year})`);
            setYearsKey((key) => key + 1);
            if (created.academic_year === year) refresh();
            else setYear(created.academic_year);
          }}
        />
      </FormDialog>

      {/* Registrar usuario */}
      <FormDialog
        isOpen={modal === "register"}
        onClose={() => setModal(null)}
        title="Registrar usuario"
        icon={UserPlus}
        description="Crea la cuenta del estudiante y los datos de su acudiente."
      >
        <UserRegister
          onCancel={() => setModal(null)}
          flash={flash}
          onSuccess={() => {
            setModal(null);
            flash("success", "Usuario registrado");
          }}
        />
      </FormDialog>

      {toDelete && (
        <ConfirmDeleteDialog
          isOpen
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteEnrollment(toDelete)}
          title="Eliminar matrícula"
          confirmText="Eliminar matrícula"
        >
          <p>
            ¿Desea eliminar por completo la matrícula del estudiante <strong>{toDelete.student_name}</strong> del año
            académico {toDelete.academic_year}, incluidos sus datos actualizados, documentos y fotos?
          </p>
        </ConfirmDeleteDialog>
      )}

      {/* Renovación anual */}
      <BulkRenewalDialog
        isOpen={modal === "renewal"}
        onClose={() => setModal(null)}
        flash={flash}
        years={knownYears}
        onDone={(toYear) => {
          setModal(null);
          setYearsKey((key) => key + 1);
          if (toYear === year) refresh();
          else setYear(toYear);
        }}
      />
    </div>
  );
};

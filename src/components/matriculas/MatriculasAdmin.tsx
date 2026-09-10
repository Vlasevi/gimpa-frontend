// components/Matriculas/MatriculasAdmin.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  FilePlus,
  UserCog,
  X,
  User,
  Sheet,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import UserRegister from "@/components/auxiliar/userRegister";
import EnrollmentUpdate from "@/components/auxiliar/enrollmentUpdate";
import UserEnroll from "@/components/auxiliar/userEnroll";
import { getStatusLabel, getStatusBadgeClass } from "@/utils/statusHelpers";
import { apiUrl, API_ENDPOINTS, buildHeaders } from "@/utils/api";
import { EnrollmentRow } from "./matriculasUI/EnrollmentRow";
import { StudentDataTabs } from "./StudentDataTabs";
import { Alert } from "@/components/ui/Alert";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useAuth } from "@/components/Login/loginLogic";

interface Grade {
  id: number;
  name: string;
  description: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  photo_url?: string;
}

interface Enrollment {
  id: number;
  student: Student;
  grade: Grade;
  academic_year: number;
  enrollment_date: string;
  status: "PENDING" | "IN_REVIEW" | "ACTIVE" | "CANCELLED";
  is_editable: boolean;
  correction_comment?: string;
  submitted_at?: string;
  approved_at?: string;
  documents_folder_url?: string | null;
}

// Componente wrapper para modales con animación de entrada y salida
const AnimatedModal = ({
  isOpen,
  onClose,
  children,
  className = "max-w-2xl bg-base-100 p-6",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  // `fill-mode-forwards` en la salida: sin él, al terminar la animación el
  // elemento revierte por un frame a su estado base (centrado, opacidad 1)
  // antes de desmontarse, lo que se ve como un parpadeo al cerrar.
  const modalAnimation = isOpen
    ? "animate-in fade-in slide-in-from-bottom-16 duration-500"
    : "animate-out fade-out slide-out-to-bottom-16 duration-300 fill-mode-forwards";

  const backdropAnimation = isOpen
    ? "animate-in fade-in duration-300"
    : "animate-out fade-out duration-300 fill-mode-forwards";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm ${backdropAnimation}`}
        onClick={onClose}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed left-1/2 top-1/2 z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-base-300 shadow-lg sm:rounded-lg ${className} ${modalAnimation}`}
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  );
};

// Mini-estadística de la barra superior
const Stat = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) => {
  const labelColor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-base-content/50";
  const valueColor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-base-content";
  return (
    <div className="flex flex-col items-end">
      <span
        className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${labelColor}`}
      >
        {label}
      </span>
      <span className={`text-xl font-bold leading-none ${valueColor}`}>
        {value}
      </span>
    </div>
  );
};

// Alturas aproximadas (px) para estimar cuántas filas caben sin scroll
const ROW_HEIGHT = 69; // alto de una fila de estudiante
const HEADER_HEIGHT = 53; // encabezado de la tabla
const FOOTER_HEIGHT = 57; // barra de paginación
const BOTTOM_GAP = 24; // margen inferior deseado
const MIN_pageSize = 5; // nunca menos de 5 filas

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

export const MatriculasAdmin = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [folderLoading, setFolderLoading] = useState<number | null>(null);
  const [showStudentDataModal, setShowStudentDataModal] = useState(false);
  const [selectedEnrollmentData, setSelectedEnrollmentData] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [studentsDataLoading, setStudentsDataLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const tableRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info";
    msg: string;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    acceptText: string;
    variant: "warning" | "error" | "info" | "success";
    onAccept: () => void;
  } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (
    msg: string,
    type: "success" | "error" | "warning" | "info" = "success",
  ) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  };

  const enrollmentPermissions = user?.permissions?.enrollments;
  const canCreateEnrollments = Boolean(enrollmentPermissions?.canCreate);
  const canEditEnrollments = Boolean(enrollmentPermissions?.canEdit);
  const canDeleteEnrollments = Boolean(enrollmentPermissions?.canDelete);
  const canApproveEnrollments = Boolean(enrollmentPermissions?.canApprove);
  const canManageDocuments = canApproveEnrollments;
  const canExport = Boolean(user?.permissions?.global?.canExport);
  const isAdminRector = user?.role === "admin" || user?.role === "rector";

  // Fetch de matrículas y grados (solo una vez al montar)
  useEffect(() => {
    fetchData();
  }, []);

  // Volver a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, gradeFilter, statusFilter, selectedYear]);

  // Calcular cuántas filas caben sin scroll según el alto de la ventana
  useEffect(() => {
    const computePageSize = () => {
      const el = tableRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const available =
        window.innerHeight - top - HEADER_HEIGHT - FOOTER_HEIGHT - BOTTOM_GAP;
      const rows = Math.floor(available / ROW_HEIGHT);
      setPageSize(Math.max(MIN_pageSize, rows));
    };
    computePageSize();
    window.addEventListener("resize", computePageSize);
    return () => window.removeEventListener("resize", computePageSize);
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch matrículas y grados en paralelo
      const [enrollmentsRes, gradesRes] = await Promise.all([
        fetch(apiUrl(API_ENDPOINTS.enrollments), {
          credentials: "include",
        }),
        fetch(apiUrl(API_ENDPOINTS.grades), {
          credentials: "include",
        }),
      ]);

      const [enrollmentsData, gradesData] = await Promise.all([
        enrollmentsRes.json(),
        gradesRes.json(),
      ]);

      setEnrollments(enrollmentsData);
      setGrades(gradesData);

      // Establecer año actual por defecto
      if (selectedYear === null) {
        const currentYear = new Date().getFullYear();
        setSelectedYear(currentYear);
      }

      setError(null);
    } catch (err) {
      setError("Error al cargar las matrículas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // API functions for enrollment management
  const approveEnrollment = async (enrollmentId: number) => {
    setActionLoading(enrollmentId);
    try {
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentById(enrollmentId)),
        {
          method: "PATCH",
          credentials: "include",
          headers: buildHeaders(),
          body: JSON.stringify({ status: "ACTIVE" }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al aprobar matrícula");
      }

      await fetchData(); // Refresh data
      showToast("Matrícula aprobada exitosamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al aprobar matrícula", "error");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const requestCorrection = async () => {
    if (!selectedEnrollment || !correctionMessage.trim()) {
      showToast("Debes proporcionar un mensaje de corrección", "warning");
      return;
    }

    setActionLoading(selectedEnrollment.id);
    try {
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentById(selectedEnrollment.id)),
        {
          method: "PATCH",
          credentials: "include",
          headers: buildHeaders(),
          body: JSON.stringify({
            status: "PENDING",
            correction_comment: correctionMessage,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al solicitar corrección");
      }

      await fetchData(); // Refresh data
      setShowCorrectionModal(false);
      setCorrectionMessage("");
      setSelectedEnrollment(null);
      showToast("Corrección solicitada exitosamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al solicitar corrección", "error");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const cancelEnrollment = async (enrollmentId: number) => {
    setActionLoading(enrollmentId);
    try {
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentById(enrollmentId)),
        {
          method: "PATCH",
          credentials: "include",
          headers: buildHeaders(),
          body: JSON.stringify({ status: "CANCELLED" }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al cancelar matrícula");
      }

      await fetchData(); // Refresh data
      showToast("Matrícula cancelada exitosamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al cancelar matrícula", "error");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteEnrollment = async (enrollmentId: number) => {
    setActionLoading(enrollmentId);
    try {
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentById(enrollmentId)),
        {
          method: "DELETE",
          credentials: "include",
          headers: buildHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar matrícula");
      }

      await fetchData(); // Refresh data
      showToast("Matrícula eliminada exitosamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al eliminar matrícula", "error");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const updateEnrollmentGradeYear = async (
    enrollmentId: number,
    gradeId: number,
    academicYear: number,
  ) => {
    setActionLoading(enrollmentId);
    try {
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentById(enrollmentId)),
        {
          method: "PATCH",
          credentials: "include",
          headers: buildHeaders(),
          body: JSON.stringify({
            grade: gradeId,
            academic_year: academicYear,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar matrícula");
      }

      await fetchData(); // Refresh data
      setShowEditModal(false);
      setSelectedEnrollment(null);
      showToast("Matrícula actualizada exitosamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al actualizar matrícula", "error");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const generatePDFs = async (enrollmentId: number) => {
    setActionLoading(enrollmentId);
    try {
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentGeneratePdfs(enrollmentId)),
        {
          method: "POST",
          credentials: "include",
          headers: buildHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al generar PDFs");
      }

      await response.json();
      showToast(
        "Contrato y pagaré generados. Revisa la carpeta del estudiante en OneDrive.",
        "success",
      );
    } catch (err: any) {
      showToast(err.message || "Error al generar PDFs", "error");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const openDocumentsFolder = () => {
    // Usar documents_folder_url directamente del estado (ya viene de GET /api/enrollments/{id})
    if (selectedEnrollmentData?.documents_folder_url) {
      window.open(selectedEnrollmentData.documents_folder_url, "_blank");
    } else {
      showToast("No se encontró la carpeta del estudiante en OneDrive", "warning");
    }
  };

  const fetchEnrollmentDetails = async (enrollment: Enrollment) => {
    // Abrir modal inmediatamente con spinner
    setSelectedEnrollmentData(null);
    setDetailsLoading(true);
    setShowStudentDataModal(true);

    try {
      const studentEmail = enrollment.student.email;

      if (!studentEmail) {
        throw new Error("No se encontró el email del estudiante");
      }

      // Fetch both enrollment details and student data in parallel
      const [enrollmentResponse, studentResponse] = await Promise.all([
        fetch(apiUrl(`${API_ENDPOINTS.enrollments}${enrollment.id}/`), {
          credentials: "include",
          headers: buildHeaders(),
        }),
        fetch(
          apiUrl(`${API_ENDPOINTS.users}${encodeURIComponent(studentEmail)}/`),
          {
            credentials: "include",
            headers: buildHeaders(),
          },
        ),
      ]);

      if (!enrollmentResponse.ok) {
        throw new Error("Error al obtener detalles de la matrícula");
      }

      if (!studentResponse.ok) {
        const errorData = await studentResponse.json();
        throw new Error(
          errorData.error || "Error al obtener datos del estudiante",
        );
      }

      const [enrollmentData, studentData] = await Promise.all([
        enrollmentResponse.json(),
        studentResponse.json(),
      ]);

      // Combine enrollment info with student data for the modal
      const combinedData = {
        ...enrollmentData,
        student: {
          ...studentData,
          photo_url: enrollment.student.photo_url,
        },
      };

      setSelectedEnrollmentData(combinedData);
    } catch (err: any) {
      showToast(err.message || "Error al obtener datos del estudiante", "error");
      console.error(err);
      setShowStudentDataModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Grados ordenados por el campo 'order' (copia, sin mutar el estado)
  const sortedGrades = [...grades].sort(
    (a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0),
  );
  const gradeOrder = new Map(
    grades.map((g) => [g.description, (g as any).order ?? 0]),
  );

  // Matrículas del año seleccionado (para las estadísticas)
  const yearEnrollments = enrollments.filter(
    (e) => e.academic_year === selectedYear,
  );
  const yearTotal = yearEnrollments.length;
  const yearActive = yearEnrollments.filter((e) => e.status === "ACTIVE").length;
  const yearPending = yearEnrollments.filter(
    (e) => e.status === "PENDING" || e.status === "IN_REVIEW",
  ).length;

  // Lista maestra: año + grado + estado + búsqueda, ordenada por grado y apellido
  const filteredEnrollments = enrollments
    .filter((e) => selectedYear !== null && e.academic_year === selectedYear)
    .filter((e) => gradeFilter === "all" || e.grade.description === gradeFilter)
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) =>
      (
        e.student.first_name.toLowerCase() +
        " " +
        e.student.last_name.toLowerCase() +
        " " +
        e.student.email.toLowerCase()
      ).includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const go =
        (gradeOrder.get(a.grade.description) ?? 0) -
        (gradeOrder.get(b.grade.description) ?? 0);
      if (go !== 0) return go;
      return (a.student.last_name + a.student.first_name).localeCompare(
        b.student.last_name + b.student.first_name,
      );
    });

  // Paginación de la lista maestra
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEnrollments.length / pageSize),
  );
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * pageSize;
  const pageItems = filteredEnrollments.slice(pageStart, pageStart + pageSize);

  // Función para obtener el color del badge según el estado (deprecated - usar getStatusBadgeClass)
  const getStatusBadge = (status: string) => {
    return getStatusBadgeClass(status);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const enrollmentYears = Array.from(
    new Set(enrollments.map((e) => e.academic_year)),
  ).sort((a, b) => a - b);

  // Si no hay años, agregar el año seleccionado por defecto
  if (enrollmentYears.length === 0 && selectedYear) {
    enrollmentYears.push(selectedYear);
  }

  const downloadExcel = async () => {
    setExcelLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set('academic_year', String(selectedYear));

      const response = await fetch(
        apiUrl(`${API_ENDPOINTS.enrollmentListExcel}?${params.toString()}`),
        {
          credentials: 'include',
          headers: buildHeaders({}, false),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el listado');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listado_estudiantes_${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      showToast(err.message || 'Error al descargar el listado', "error");
      console.error(err);
    } finally {
      setExcelLoading(false);
    }
  };

  const downloadStudentsData = async () => {
    setStudentsDataLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set('academic_year', String(selectedYear));
      params.set('status', 'ACTIVE');

      const response = await fetch(
        apiUrl(`${API_ENDPOINTS.studentsDataExcel}?${params.toString()}`),
        {
          credentials: 'include',
          headers: buildHeaders({}, false),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar datos de estudiantes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos_estudiantes_${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      showToast(err.message || 'Error al descargar datos de estudiantes', "error");
      console.error(err);
    } finally {
      setStudentsDataLoading(false);
    }
  };

  // Calcular lista única de estudiantes para el modal de actualización
  const uniqueStudents = useMemo(() => {
    const studentMap = new Map();
    enrollments.forEach((enrollment) => {
      const student = enrollment.student;
      // Usar email como clave única
      if (student && student.email && !studentMap.has(student.email)) {
        studentMap.set(student.email, student);
      }
    });
    return Array.from(studentMap.values());
  }, [enrollments]);

  return (
    <div className="container mx-auto px-6 pt-2 pb-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-secondary">
            {isAdminRector ? "Gestión de Matrículas" : "Estudiantes"}
          </h1>
          <p className="mt-1 text-base-content/60">
            {isAdminRector
              ? "Administra los estudiantes y sus matrículas por año académico"
              : "Consulta de estudiantes por año académico"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEditEnrollments && (
            <button
              className="btn btn-outline btn-success gap-2"
              onClick={() => setShowUpdateModal(true)}
            >
              <UserCog size={18} />
              Actualizar
            </button>
          )}
          {canCreateEnrollments && (
            <button
              className="btn btn-primary gap-2 shadow-sm"
              onClick={() => setShowEnrollModal(true)}
            >
              <FilePlus size={18} />
              Nueva Matrícula
            </button>
          )}
        </div>
      </div>

      {/* Barra de filtros y estadísticas */}
      <div className="card bg-base-100 shadow-sm border border-base-300 mb-6">
        <div className="card-body p-3 sm:p-4 flex-col lg:flex-row gap-4 items-stretch lg:items-center">

          {/* Filtros: búsqueda + grado + estado + año */}
          <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Buscar estudiante..."
                className="input input-bordered w-full pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 h-5 w-5" />
            </div>

            <FilterSelect
              className="min-w-[160px]"
              ariaLabel="Filtrar por grado"
              value={gradeFilter}
              onChange={setGradeFilter}
              options={[
                { value: "all", label: "Todos los grados" },
                ...sortedGrades.map((g) => ({
                  value: g.description,
                  label: g.description,
                })),
              ]}
            />

            <FilterSelect
              className="min-w-[150px]"
              ariaLabel="Filtrar por estado"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Todos los estados" },
                { value: "PENDING", label: getStatusLabel("PENDING") },
                { value: "IN_REVIEW", label: getStatusLabel("IN_REVIEW") },
                { value: "ACTIVE", label: getStatusLabel("ACTIVE") },
                { value: "CANCELLED", label: getStatusLabel("CANCELLED") },
              ]}
            />

            <FilterSelect
              className="w-24 sm:w-28"
              ariaLabel="Filtrar por año"
              value={selectedYear ? String(selectedYear) : ""}
              onChange={(v) => setSelectedYear(Number(v))}
              options={enrollmentYears.map((year) => ({
                value: String(year),
                label: String(year),
              }))}
            />
          </div>

          {/* Divisor (desktop) */}
          <div className="hidden lg:block w-px h-8 bg-base-300 mx-2"></div>

          {/* Estadísticas + acciones */}
          <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-5">
              <Stat label="Total" value={yearTotal} />
              <Stat label="Pendientes" value={yearPending} tone="warning" />
              <Stat label="Activos" value={yearActive} tone="success" />
            </div>

            {/* Descargas Excel (solo quien puede exportar) */}
            {canExport && (
              <>
                <div className="hidden lg:block w-px h-8 bg-base-300"></div>
                <button
                  onClick={downloadExcel}
                  disabled={excelLoading}
                  className="p-1.5 transition-colors duration-200 text-base-content/50 hover:text-primary disabled:opacity-50"
                  title={`Descargar Listas Grados ${selectedYear}`}
                >
                  {excelLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Sheet size={24} />
                  )}
                </button>
                <button
                  onClick={downloadStudentsData}
                  disabled={studentsDataLoading}
                  className="p-1.5 transition-colors duration-200 text-base-content/50 hover:text-primary disabled:opacity-50"
                  title={`Descargar Datos Estudiantes ${selectedYear}`}
                >
                  {studentsDataLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={24} />
                  )}
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Tabla maestra (sin overflow-hidden para que los dropdowns de acciones no se corten) */}
      <div
        ref={tableRef}
        className="rounded-lg border border-base-300 bg-base-100 shadow-sm"
      >
        {loading ? (
          <LoadingState compact className="py-16" label="Cargando matrículas…" />
        ) : filteredEnrollments.length === 0 ? (
          <div className="text-center py-16 text-base-content/50">
            {enrollments.length === 0
              ? "No hay matrículas registradas"
              : "No hay estudiantes que coincidan con los filtros"}
          </div>
        ) : (
          <>
            <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-base-200">
              <tr className="text-base-content font-bold text-sm">
                <th className="py-4 px-6 align-middle rounded-tl-lg">Estudiante</th>
                <th className="py-4 px-6 align-middle">Grado</th>
                <th className="py-4 px-6 align-middle">Fecha de Matrícula</th>
                <th className="py-4 px-6 text-center align-middle">Estado</th>
                <th className="py-4 px-6 text-right align-middle rounded-tr-lg">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300">
              {pageItems.map((enrollment, index) => (
                <EnrollmentRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  showGrade
                  isLastRows={index >= pageItems.length - 2}
                  onViewDetails={fetchEnrollmentDetails}
                  onApprove={approveEnrollment}
                  onRequestCorrection={(enrollment) => {
                    setSelectedEnrollment(enrollment);
                    setShowCorrectionModal(true);
                  }}
                  onCancel={(id) =>
                    setConfirmState({
                      title: "Cancelar matrícula",
                      message:
                        "¿Seguro que deseas cancelar esta matrícula? El estudiante quedará como cancelado.",
                      acceptText: "Cancelar matrícula",
                      variant: "warning",
                      onAccept: () => cancelEnrollment(id),
                    })
                  }
                  onDelete={(id) =>
                    setConfirmState({
                      title: "Eliminar matrícula",
                      message: "Esta acción es permanente y no se puede deshacer.",
                      acceptText: "Eliminar",
                      variant: "error",
                      onAccept: () => deleteEnrollment(id),
                    })
                  }
                  onEdit={(enrollment) => {
                    setSelectedEnrollment(enrollment);
                    setShowEditModal(true);
                  }}
                  onGeneratePDFs={(id) =>
                    setConfirmState({
                      title: "Generar documentos",
                      message: "¿Generar contrato y pagaré para esta matrícula?",
                      acceptText: "Generar",
                      variant: "info",
                      onAccept: () => generatePDFs(id),
                    })
                  }
                  canEdit={canEditEnrollments}
                  canDelete={canDeleteEnrollments}
                  canApprove={canApproveEnrollments}
                  actionLoading={actionLoading}
                  formatDate={formatDate}
                />
              ))}
            </tbody>
          </table>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-base-300 px-6 py-3">
                <p className="text-sm text-base-content/60">
                  Mostrando {pageStart + 1}–
                  {Math.min(pageStart + pageSize, filteredEnrollments.length)} de{" "}
                  {filteredEnrollments.length}
                </p>
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    disabled={page === 1}
                    onClick={() => setCurrentPage(page - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {getPageList(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <button
                        key={`ellipsis-${i}`}
                        className="join-item btn btn-sm btn-disabled pointer-events-none"
                      >
                        …
                      </button>
                    ) : (
                      <button
                        key={p}
                        className={`join-item btn btn-sm ${p === page ? "btn-primary" : ""}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    className="join-item btn btn-sm"
                    disabled={page === totalPages}
                    onClick={() => setCurrentPage(page + 1)}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatedModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-secondary">
            Registrar estudiante
          </h2>
          <p className="text-sm text-base-content/60">
            Completa la información para crear un nuevo estudiante
          </p>
        </div>
        <UserRegister
          onCancel={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            fetchData();
          }}
        />
        <button
          type="button"
          className="absolute right-4 top-4 p-1 rounded-full transition-colors text-base-content/40 hover:text-base-content focus:outline-none"
          onClick={() => setShowRegisterModal(false)}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
        </button>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-secondary">
            Actualizar Matrícula
          </h2>
          <p className="text-sm text-base-content/60">
            Modifica estado, grado o año de la última matrícula del estudiante
          </p>
        </div>
        <EnrollmentUpdate
          onCancel={() => setShowUpdateModal(false)}
          onSuccess={() => {
            setShowUpdateModal(false);
            fetchData();
          }}
          students={uniqueStudents}
          grades={grades}
          allEnrollments={enrollments}
        />
        <button
          type="button"
          className="absolute right-4 top-4 p-1 rounded-full transition-colors text-base-content/40 hover:text-base-content focus:outline-none"
          onClick={() => setShowUpdateModal(false)}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
        </button>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-secondary">
            Matricular estudiante
          </h2>
          <p className="text-sm text-base-content/60">
            Completa la información para matricular un nuevo estudiante
          </p>
        </div>
        <UserEnroll
          showEnrollModal={showEnrollModal}
          onCancel={() => setShowEnrollModal(false)}
          onSuccess={() => {
            setShowEnrollModal(false);
            fetchData();
          }}
        />
        <button
          type="button"
          className="absolute right-4 top-4 p-1 rounded-full transition-colors text-base-content/40 hover:text-base-content focus:outline-none"
          onClick={() => setShowEnrollModal(false)}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
        </button>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
      >
        {selectedEnrollment && (
          <>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-secondary">
                Solicitar Correcciones
              </h2>
              <p className="text-sm text-base-content/60">
                Estudiante: {selectedEnrollment.student.first_name}{" "}
                {selectedEnrollment.student.last_name} - Grado:{" "}
                {selectedEnrollment.grade.name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mensaje de corrección
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  placeholder="Describe qué debe corregir el estudiante..."
                  value={correctionMessage}
                  onChange={(e) => setCorrectionMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCorrectionModal(false);
                  }}
                  disabled={actionLoading === selectedEnrollment.id}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-warning"
                  onClick={requestCorrection}
                  disabled={
                    actionLoading === selectedEnrollment.id ||
                    !correctionMessage.trim()
                  }
                >
                  {actionLoading === selectedEnrollment.id ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    "Enviar Corrección"
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="absolute right-4 top-4 p-1 rounded-full transition-colors text-base-content/40 hover:text-base-content focus:outline-none"
              onClick={() => {
                setShowCorrectionModal(false);
              }}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </button>
          </>
        )}
      </AnimatedModal>

      {/* Modal de Editar Matrícula (PENDING) */}
      <AnimatedModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      >
        {selectedEnrollment && (
          <>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-secondary">
                Editar Matrícula
              </h2>
              <p className="text-sm text-base-content/60">
                Estudiante: {selectedEnrollment.student.first_name}{" "}
                {selectedEnrollment.student.last_name}
              </p>
            </div>

            <EnrollmentUpdate
              onCancel={() => {
                setShowEditModal(false);
              }}
              onSuccess={() => {
                setShowEditModal(false);
                fetchData();
              }}
              students={uniqueStudents}
              grades={grades}
              allEnrollments={enrollments}
              preselectedStudentEmail={selectedEnrollment.student.email}
            />

            <button
              type="button"
              className="absolute right-4 top-4 p-1 rounded-full transition-colors text-base-content/40 hover:text-base-content focus:outline-none"
              onClick={() => {
                setShowEditModal(false);
              }}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </button>
          </>
        )}
      </AnimatedModal>

      {/* Modal de Ver Matrícula (ACTIVE) */}
      <AnimatedModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
      >
        {selectedEnrollment && (
          <>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-secondary">
                Información de Matrícula
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-1">
                    Estudiante
                  </label>
                  <p className="text-sm">
                    {selectedEnrollment.student.first_name}{" "}
                    {selectedEnrollment.student.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-1">
                    Email
                  </label>
                  <p className="text-sm">{selectedEnrollment.student.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-1">
                    Grado
                  </label>
                  <p className="text-sm">{selectedEnrollment.grade.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-1">
                    Año Académico
                  </label>
                  <p className="text-sm">{selectedEnrollment.academic_year}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-1">
                    Estado
                  </label>
                  <span
                    className={`badge ${getStatusBadge(
                      selectedEnrollment.status,
                    )} whitespace-nowrap`}
                  >
                    {selectedEnrollment.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-1">
                    Fecha de Matrícula
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedEnrollment.enrollment_date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowViewModal(false);
                }}
              >
                Cerrar
              </button>
            </div>

            <button
              type="button"
              className="absolute right-4 top-4 p-1 rounded-full transition-colors text-base-content/40 hover:text-base-content focus:outline-none"
              onClick={() => {
                setShowViewModal(false);
              }}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </button>
          </>
        )}
      </AnimatedModal>

      {/* Modal de Ver Datos Completos del Estudiante */}
      <AnimatedModal
        isOpen={showStudentDataModal}
        onClose={() => setShowStudentDataModal(false)}
        className="w-full max-w-4xl max-h-[90vh] bg-base-200 border border-base-300 rounded-lg flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* CABECERA PRINCIPAL */}
        <header className="bg-base-100 border-b border-base-300 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            {/* Avatar con borde institucional */}
            <div className="w-16 h-16 rounded-full border-2 border-primary p-1 bg-base-100">
              {selectedEnrollmentData?.student?.photo_url ? (
                <img
                  src={selectedEnrollmentData.student.photo_url}
                  alt="Estudiante"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary/60" />
                </div>
              )}
            </div>

            <div>
              {!detailsLoading && selectedEnrollmentData && (
                <>
                  <h2
                    id="student-title"
                    className="font-display text-2xl font-bold text-secondary leading-tight"
                  >
                    {selectedEnrollmentData.student.first_name}{" "}
                    {selectedEnrollmentData.student.last_name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 align-middle">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                      {selectedEnrollmentData.grade.description ||
                        selectedEnrollmentData.grade.name}
                    </span>
                  </div>
                </>
              )}
              {detailsLoading && (
                <div className="animate-pulse">
                  <div className="h-6 w-48 bg-base-300 rounded mb-2"></div>
                  <div className="h-4 w-32 bg-base-300 rounded"></div>
                </div>
              )}
            </div>
          </div>

          {/* Botón de Cerrar (Solo X) */}
          <button
            type="button"
            className="p-2 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
            onClick={() => {
              setShowStudentDataModal(false);
            }}
          >
            <X className="h-6 w-6 text-base-content" />
          </button>
        </header>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {detailsLoading ? (
            <LoadingState compact className="h-full min-h-[300px]" label="Cargando detalle…" />
          ) : (
            selectedEnrollmentData && (
              <StudentDataTabs
                studentData={selectedEnrollmentData.student?.user_data || {}}
                student={selectedEnrollmentData.student || {}}
                documentsMetadata={selectedEnrollmentData.documents_metadata}
                enrollmentId={selectedEnrollmentData.id}
                canManageDocuments={canManageDocuments}
                documentPermissions={user?.permissions?.documents}
                onDocumentsChange={(documentsMetadata) => {
                  setSelectedEnrollmentData((current: any | null) =>
                    current ? { ...current, documents_metadata: documentsMetadata } : current,
                  );
                }}
              />
            )
          )}
        </div>
      </AnimatedModal>

      {/* Confirmación con estilo (reemplaza el confirm() nativo) */}
      {confirmState && (
        <Alert
          isOpen={true}
          onClose={() => setConfirmState(null)}
          onAccept={() => {
            const cb = confirmState.onAccept;
            setConfirmState(null);
            cb();
          }}
          title={confirmState.title}
          variant={confirmState.variant}
          acceptText={confirmState.acceptText}
          cancelText="Cancelar"
          acceptButtonVariant={
            confirmState.variant === "error" ? "destructive" : "default"
          }
        >
          <p className="text-base-content/80">{confirmState.message}</p>
        </Alert>
      )}

      {/* Toast de feedback */}
      {toast && (
        <div className="fixed right-6 top-6 z-[60] animate-view-in">
          <div className="flex items-center gap-2.5 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content shadow-lg">
            {toast.type === "success" && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            )}
            {toast.type === "error" && (
              <XCircle className="h-5 w-5 shrink-0 text-error" />
            )}
            {toast.type === "warning" && (
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            )}
            {toast.type === "info" && (
              <Info className="h-5 w-5 shrink-0 text-primary" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
};

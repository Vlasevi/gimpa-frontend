import { Eye } from "lucide-react";

import type { EnrollmentListItem } from "@/components/matriculas/enrollmentApi";
import { StudentAvatar } from "@/components/matriculas/admin/StudentAvatar";
import { formatDate } from "@/components/matriculas/admin/shared";
import { getStatusBadgeClass, getStatusLabel, INACTIVE_REASON_LABELS } from "@/utils/statusHelpers";

/** Fila del listado de matrículas del staff. La única acción es abrir el detalle
 * (ícono solo, DESIGN_SYSTEM §5b); las acciones de estado viven en el detalle. */
export function EnrollmentRow({
  enrollment,
  onView,
}: {
  enrollment: EnrollmentListItem;
  onView: (enrollment: EnrollmentListItem) => void;
}) {
  const { student } = enrollment;
  const pendingDocuments = enrollment.status === "ACTIVE" && enrollment.has_pending_documents;

  return (
    <tr className="transition-colors hover:bg-base-200/50">
      <td>
        <div className="flex items-center gap-3">
          <StudentAvatar name={enrollment.student_name} photoUrl={student.photo_url} />
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-base-content">{enrollment.student_name}</p>
            <p className="truncate text-xs text-base-content/50">{student.email}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap text-sm text-base-content/80">{enrollment.grade.label}</td>
      <td>
        <span className={`badge badge-sm whitespace-nowrap ${getStatusBadgeClass(enrollment.status)}`}>
          {getStatusLabel(enrollment.status)}
        </span>
        {pendingDocuments && (
          <span className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-base-content/60">
            <span className="status status-warning" aria-hidden="true" />
            documentos pendientes
          </span>
        )}
        {enrollment.status === "INACTIVE" && enrollment.inactive_reason && (
          <span className="mt-1 block whitespace-nowrap text-xs text-base-content/60">
            {INACTIVE_REASON_LABELS[enrollment.inactive_reason]}
          </span>
        )}
      </td>
      <td className="hidden text-sm text-base-content/70 md:table-cell">{enrollment.origin_label}</td>
      <td className="hidden whitespace-nowrap text-sm text-base-content/80 md:table-cell">
        <time dateTime={enrollment.updated_at}>{formatDate(enrollment.updated_at)}</time>
        {enrollment.submitted_at && (
          <span className="block text-xs text-base-content/50">Enviada {formatDate(enrollment.submitted_at)}</span>
        )}
      </td>
      <td className="text-right">
        <button
          type="button"
          onClick={() => onView(enrollment)}
          title="Ver matrícula"
          aria-label={`Ver matrícula de ${enrollment.student_name}`}
          className="cursor-pointer rounded-full p-2 text-base-content/40 transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Eye className="h-5 w-5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export default EnrollmentRow;

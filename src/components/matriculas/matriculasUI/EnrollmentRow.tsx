import { Eye, Trash2 } from "lucide-react";

import type { EnrollmentListItem } from "@/components/matriculas/enrollmentApi";
import { StudentAvatar } from "@/components/matriculas/admin/StudentAvatar";
import { formatDate } from "@/components/matriculas/admin/shared";
import { getStatusBadgeClass, getStatusLabel, INACTIVE_REASON_LABELS } from "@/utils/statusHelpers";
import { iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";

interface EnrollmentItemProps {
  enrollment: EnrollmentListItem;
  onView: (enrollment: EnrollmentListItem) => void;
  /** Solo si el usuario puede eliminar matrículas. */
  onDelete?: (enrollment: EnrollmentListItem) => void;
}

/** Estado de la matrícula. */
function StatusBadge({ enrollment }: { enrollment: EnrollmentListItem }) {
  return (
    <span className={`badge badge-sm whitespace-nowrap ${getStatusBadgeClass(enrollment.status)}`}>
      {getStatusLabel(enrollment.status)}
    </span>
  );
}

/** Debajo del estado: documentos pendientes o motivo de inactivación. */
function StatusNote({ enrollment }: { enrollment: EnrollmentListItem }) {
  const pendingDocuments = enrollment.status === "ACTIVE" && enrollment.has_pending_documents;
  return (
    <>
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
    </>
  );
}

/** Acciones con ícono solo (DESIGN_SYSTEM §5b): ver el detalle y, con permiso, eliminar. */
function ItemActions({ enrollment, onView, onDelete }: EnrollmentItemProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => onView(enrollment)}
        title="Ver matrícula"
        aria-label={`Ver matrícula de ${enrollment.student_name}`}
        className={`${iconBtnClass} ${iconHover.primary}`}
      >
        <Eye className={iconClass} aria-hidden="true" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(enrollment)}
          title="Eliminar matrícula"
          aria-label={`Eliminar la matrícula de ${enrollment.student_name}`}
          className={`${iconBtnClass} ${iconHover.error}`}
        >
          <Trash2 className={iconClass} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

/** Fila del listado de matrículas del staff (desde `sm`). Las acciones de estado viven en
 * el detalle. */
export function EnrollmentRow({ enrollment, onView, onDelete }: EnrollmentItemProps) {
  const { student } = enrollment;

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
        <StatusBadge enrollment={enrollment} />
        <StatusNote enrollment={enrollment} />
      </td>
      <td className="hidden text-sm text-base-content/70 xl:table-cell">{enrollment.origin_label}</td>
      <td className="hidden whitespace-nowrap text-sm text-base-content/80 xl:table-cell">
        <time dateTime={enrollment.updated_at}>{formatDate(enrollment.updated_at)}</time>
        {enrollment.submitted_at && (
          <span className="block text-xs text-base-content/50">Enviada {formatDate(enrollment.submitted_at)}</span>
        )}
      </td>
      <td className="whitespace-nowrap text-right">
        <ItemActions enrollment={enrollment} onView={onView} onDelete={onDelete} />
      </td>
    </tr>
  );
}

/** La misma matrícula como tarjeta, para el listado en pantallas angostas (bajo `sm`):
 * estudiante, estado y grado, y las acciones a la derecha. */
export function EnrollmentCard({ enrollment, onView, onDelete }: EnrollmentItemProps) {
  const { student } = enrollment;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <StudentAvatar name={enrollment.student_name} photoUrl={student.photo_url} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight text-base-content">{enrollment.student_name}</p>
        <p className="truncate text-xs text-base-content/50">{student.email}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge enrollment={enrollment} />
          <span className="text-xs text-base-content/60">{enrollment.grade.label}</span>
        </div>
        <StatusNote enrollment={enrollment} />
      </div>
      <div className="-mr-2 flex shrink-0 items-center">
        <ItemActions enrollment={enrollment} onView={onView} onDelete={onDelete} />
      </div>
    </li>
  );
}

export default EnrollmentRow;

/**
 * Formulario de matrícula del staff (Matrícula v2).
 *
 * - Crear: estudiante + grado + año lectivo (actual o siguiente) + origen opcional
 *   (`enrollmentApi.create`). Sin origen, el backend lo decide según el historial.
 * - Editar (`enrollment`): solo cambia el grado (`enrollmentApi.changeGrade`). El
 *   backend lo permite antes de aprobar.
 *
 * Formato de diálogo de formulario (DESIGN_SYSTEM §12b): secciones con `FormSection`,
 * obligatorios con asterisco, `FormActions`. Los errores (p. ej. 409, ya tiene matrícula ese
 * año) van en el toast de la página (`flash`); el éxito lo anuncia quien abre el formulario.
 */

import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import {
  enrollmentApi,
  type EnrollmentDetail,
  type EnrollmentListItem,
  type EnrollmentOrigin,
  type GradeInfo,
} from "@/components/matriculas/enrollmentApi";
import { currentYear, errorMessage } from "@/components/matriculas/admin/shared";
import { ORIGIN_LABELS } from "@/utils/statusHelpers";
import { Search } from "lucide-react";

import {
  FormActions,
  FormGrid,
  FormSection,
  FormSelect,
  formHintClass,
  formInputClass,
  formLabelClass,
} from "@/components/ui/FormDialog";
import type { ToastVariant } from "@/hooks/use-toast";

interface StudentOption {
  email: string;
  first_name: string;
  last_name: string;
  role?: string | null;
}

interface UserEnrollProps {
  onCancel: () => void;
  onSuccess: (enrollment: EnrollmentDetail) => void;
  /** Modo edición: la matrícula a la que se le cambia el grado. */
  enrollment?: Pick<EnrollmentListItem, "id" | "student" | "student_name" | "grade" | "academic_year">;
  /** Grados ya cargados por el padre; si no llegan, se piden. */
  grades?: GradeInfo[];
  /** Toast de la página (arriba a la derecha) para los errores. */
  flash: (type: ToastVariant, msg: string) => void;
}

const MAX_SUGGESTIONS = 6;
const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Ref de montaje: enfoca el `Select` del bloque (lo que antes hacía `autoFocus`). */
const focusSelectOnMount = (el: HTMLDivElement | null) => {
  el?.querySelector<HTMLElement>('[role="combobox"]')?.focus();
};

export default function UserEnroll({ onCancel, onSuccess, enrollment, grades: gradesProp, flash }: UserEnrollProps) {
  const isEdit = Boolean(enrollment);
  const ids = useId();
  const fieldId = (name: string) => `${ids}-${name}`;

  const [grades, setGrades] = useState<GradeInfo[]>(gradesProp ?? []);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(!isEdit);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentOption | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const [gradeId, setGradeId] = useState(enrollment ? String(enrollment.grade.id) : "");
  const [year, setYear] = useState("");
  const [origin, setOrigin] = useState<"" | EnrollmentOrigin>("");
  const [submitting, setSubmitting] = useState(false);

  const thisYear = currentYear();
  const years = [thisYear, thisYear + 1];

  useEffect(() => {
    if (gradesProp?.length) {
      setGrades(gradesProp);
      return;
    }
    let alive = true;
    enrollmentApi
      .grades()
      .then((list) => alive && setGrades([...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))))
      .catch(() => alive && flash("error", "No se pudieron cargar los grados."));
    return () => {
      alive = false;
    };
  }, [gradesProp, flash]);

  // Estudiantes para el buscador (solo al crear). Se ocultan las cuentas con otro rol.
  useEffect(() => {
    if (isEdit) return;
    let alive = true;
    apiFetch(API_ENDPOINTS.usersByRole("student"))
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((list: StudentOption[]) => {
        if (alive) setStudents(list.filter((u) => !u.role || u.role === "student"));
      })
      .catch(() => alive && flash("error", "No se pudo cargar la lista de estudiantes."))
      .finally(() => alive && setStudentsLoading(false));
    return () => {
      alive = false;
    };
  }, [isEdit, flash]);

  const suggestions = useMemo(() => {
    const term = normalize(query.trim());
    if (!term || selected) return [];
    return students
      .filter((s) => normalize(`${s.first_name} ${s.last_name} ${s.email}`).includes(term))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, selected, students]);

  const showList = listOpen && suggestions.length > 0;
  const listId = fieldId("student-list");
  const optionId = (index: number) => `${ids}-student-option-${index}`;

  const pickStudent = (student: StudentOption) => {
    setSelected(student);
    setQuery(`${student.first_name} ${student.last_name} (${student.email})`);
    setListOpen(false);
  };

  const onStudentKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pickStudent(suggestions[highlight]);
    } else if (event.key === "Escape") {
      // Cierra solo la lista, no el modal.
      event.stopPropagation();
      setListOpen(false);
    }
  };

  const gradeChanged = enrollment ? gradeId !== String(enrollment.grade.id) : true;
  const isValid = isEdit ? Boolean(gradeId) && gradeChanged : Boolean(selected && gradeId && year);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const result = enrollment
        ? await enrollmentApi.changeGrade(enrollment.id, Number(gradeId))
        : await enrollmentApi.create({
            student_email: selected!.email,
            grade_id: Number(gradeId),
            academic_year: Number(year),
            ...(origin ? { origin } : {}),
          });
      onSuccess(result);
    } catch (err) {
      flash("error", errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const studentField = enrollment ? (
    <div>
      <span className={formLabelClass}>Estudiante</span>
      <p className="rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/80">
        {enrollment.student_name}
        <span className="block text-xs text-base-content/60">{enrollment.student.email}</span>
      </p>
    </div>
  ) : (
    // Combobox con búsqueda por nombre o correo.
    <div>
      <label className={formLabelClass} htmlFor={fieldId("student")}>
        Estudiante
        <span className="ml-0.5 text-error" aria-hidden="true">
          *
        </span>
      </label>
      <div className="group relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/50 transition-colors group-focus-within:text-primary">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>
        <input
          id={fieldId("student")}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? optionId(highlight) : undefined}
          aria-describedby={fieldId("student-hint")}
          aria-required="true"
          autoComplete="off"
          autoFocus
          placeholder={studentsLoading ? "Cargando estudiantes…" : "Nombre o correo del estudiante"}
          disabled={studentsLoading}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setHighlight(0);
            setListOpen(true);
          }}
          onKeyDown={onStudentKeyDown}
          onBlur={() => setListOpen(false)}
          className={`${formInputClass} pl-9`}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Estudiantes"
          hidden={!showList}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg"
        >
          {suggestions.map((s, index) => (
            <li
              key={s.email}
              id={optionId(index)}
              role="option"
              aria-selected={index === highlight}
              // mousedown: elige antes de que el blur del input cierre la lista
              onMouseDown={(e) => {
                e.preventDefault();
                pickStudent(s);
              }}
              onMouseEnter={() => setHighlight(index)}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                index === highlight ? "bg-primary text-primary-content" : "text-base-content/80"
              }`}
            >
              {s.first_name} {s.last_name}
              <span className={`block text-xs ${index === highlight ? "text-primary-content/80" : "text-base-content/60"}`}>
                {s.email}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p id={fieldId("student-hint")} className={formHintClass}>
        {query.trim() && !selected && !suggestions.length && !studentsLoading
          ? "Ningún estudiante coincide. Si no tiene cuenta, regístralo primero."
          : "Escribe y elige de la lista."}
      </p>
    </div>
  );

  const gradeField = (
    <div ref={isEdit ? focusSelectOnMount : undefined}>
      <FormSelect
        id={fieldId("grade")}
        label={isEdit ? "Nuevo grado" : "Grado"}
        required
        value={gradeId}
        onChange={setGradeId}
        placeholder="Selecciona un grado"
        options={grades.map((g) => ({ value: String(g.id), label: g.label }))}
        hint={
          isEdit
            ? "Si la matrícula aún está en manos del estudiante, tendrá que volver a firmar el contrato, el pagaré y la hoja de matrícula con el grado nuevo."
            : undefined
        }
      />
    </div>
  );

  const actions = (
    <FormActions
      onCancel={onCancel}
      busy={submitting}
      submitDisabled={!isValid}
      submitText={isEdit ? "Cambiar grado" : "Crear matrícula"}
      busyText={isEdit ? "Cambiando…" : "Creando…"}
    />
  );

  // Cambiar grado: un solo campo, en una sola tarjeta.
  if (enrollment) {
    return (
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <FormSection title="Grado">
          {studentField}
          {gradeField}
        </FormSection>
        {actions}
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <FormSection title="Estudiante" required>
        {studentField}
      </FormSection>

      <FormSection title="Matrícula" required>
        <FormGrid>
          {gradeField}
          <FormSelect
            id={fieldId("year")}
            label="Año lectivo"
            required
            value={year}
            onChange={setYear}
            placeholder="Selecciona el año"
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
          <FormSelect
            id={fieldId("origin")}
            label="Origen"
            full
            value={origin}
            onChange={(v) => setOrigin(v as "" | EnrollmentOrigin)}
            options={[
              { value: "", label: "Automático" },
              { value: "NEW", label: ORIGIN_LABELS.NEW },
              { value: "RENEWAL", label: ORIGIN_LABELS.RENEWAL },
            ]}
            hint="Automático: renovación si el estudiante ya tuvo una matrícula aprobada; si no, estudiante nuevo. Define qué documentos se le piden."
          />
        </FormGrid>
      </FormSection>

      {actions}
    </form>
  );
}

/**
 * Formulario de matrícula del staff (Matrícula v2).
 *
 * - Crear: estudiante + grado + año lectivo (actual o siguiente) + origen opcional
 *   (`enrollmentApi.create`). Sin origen, el backend lo decide según el historial.
 * - Editar (`enrollment`): solo cambia el grado (`enrollmentApi.changeGrade`). El
 *   backend lo permite antes de aprobar.
 *
 * Los errores del backend (p. ej. 409, ya tiene matrícula ese año) se muestran aquí
 * mismo; el éxito lo anuncia quien abre el formulario.
 */

import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

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
import { ghostBtnClass, inputClass, labelClass, primaryBtnClass, selectClass } from "@/components/ui/formStyles";

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
}

const MAX_SUGGESTIONS = 6;
const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function UserEnroll({ onCancel, onSuccess, enrollment, grades: gradesProp }: UserEnrollProps) {
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
  const [error, setError] = useState<string | null>(null);

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
      .catch(() => alive && setError("No se pudieron cargar los grados."));
    return () => {
      alive = false;
    };
  }, [gradesProp]);

  // Estudiantes para el buscador (solo al crear). Se ocultan las cuentas con otro rol.
  useEffect(() => {
    if (isEdit) return;
    let alive = true;
    apiFetch(API_ENDPOINTS.usersByRole("student"))
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((list: StudentOption[]) => {
        if (alive) setStudents(list.filter((u) => !u.role || u.role === "student"));
      })
      .catch(() => alive && setError("No se pudo cargar la lista de estudiantes."))
      .finally(() => alive && setStudentsLoading(false));
    return () => {
      alive = false;
    };
  }, [isEdit]);

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
    setError(null);
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
    setError(null);
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
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const errorId = fieldId("error");

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error && (
        <div id={errorId} role="alert" className="rounded-lg border border-error/25 bg-error/5 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Estudiante: combobox con búsqueda por nombre o correo */}
      <div>
        {enrollment ? (
          <>
            <span className={labelClass}>Estudiante</span>
            <p className="rounded-lg bg-base-200 px-3 py-2.5 text-sm text-base-content/80">
              {enrollment.student_name}
              <span className="block text-xs text-base-content/50">{enrollment.student.email}</span>
            </p>
          </>
        ) : (
          <>
            <label className={labelClass} htmlFor={fieldId("student")}>
              Estudiante
            </label>
            <div className="relative">
              <input
                id={fieldId("student")}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showList}
                aria-controls={listId}
                aria-activedescendant={showList ? optionId(highlight) : undefined}
                aria-describedby={`${fieldId("student-hint")}${error ? ` ${errorId}` : ""}`}
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
                className={inputClass}
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
                    <span className={`block text-xs ${index === highlight ? "text-primary-content/80" : "text-base-content/50"}`}>
                      {s.email}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p id={fieldId("student-hint")} className="mt-1 text-xs text-base-content/50">
              {query.trim() && !selected && !suggestions.length && !studentsLoading
                ? "Ningún estudiante coincide. Si no tiene cuenta, regístralo primero."
                : "Escribe y elige de la lista."}
            </p>
          </>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor={fieldId("grade")}>
          {isEdit ? "Nuevo grado" : "Grado"}
        </label>
        <select
          id={fieldId("grade")}
          required
          className={selectClass}
          value={gradeId}
          onChange={(e) => setGradeId(e.target.value)}
          autoFocus={isEdit}
        >
          <option value="">Selecciona un grado</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        {isEdit && (
          <p className="mt-1 text-xs text-base-content/50">
            Si la matrícula aún está en manos del estudiante, tendrá que volver a firmar el contrato, el
            pagaré y la hoja de matrícula con el grado nuevo.
          </p>
        )}
      </div>

      {enrollment ? (
        <div>
          <span className={labelClass}>Año lectivo</span>
          <p className="rounded-lg bg-base-200 px-3 py-2.5 text-sm text-base-content/80">{enrollment.academic_year}</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={fieldId("year")}>
              Año lectivo
            </label>
            <select
              id={fieldId("year")}
              required
              className={selectClass}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Selecciona el año</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={fieldId("origin")}>
              Origen
            </label>
            <select
              id={fieldId("origin")}
              className={selectClass}
              value={origin}
              aria-describedby={fieldId("origin-hint")}
              onChange={(e) => setOrigin(e.target.value as "" | EnrollmentOrigin)}
            >
              <option value="">Automático</option>
              <option value="NEW">{ORIGIN_LABELS.NEW}</option>
              <option value="RENEWAL">{ORIGIN_LABELS.RENEWAL}</option>
            </select>
          </div>
          <p id={fieldId("origin-hint")} className="-mt-3 text-xs text-base-content/50 sm:col-span-2">
            Automático: renovación si el estudiante ya tuvo una matrícula aprobada; si no, estudiante nuevo.
            Define qué documentos se le piden.
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={submitting} className={ghostBtnClass}>
          Cancelar
        </button>
        <button type="submit" disabled={!isValid || submitting} className={primaryBtnClass}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isEdit ? "Cambiando…" : "Creando…"}
            </>
          ) : isEdit ? (
            "Cambiar grado"
          ) : (
            "Crear matrícula"
          )}
        </button>
      </div>
    </form>
  );
}

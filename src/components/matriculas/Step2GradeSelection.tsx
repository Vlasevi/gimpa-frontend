// components/matriculas/steps/Step2GradeSelection.tsx

import { useAuth } from "@/components/Login/loginLogic";
import type { EnrollmentResponse } from "@/components/matriculas/MatriculasEstudiantes";

interface Step2Props {
  next: () => void;
  back: () => void;
  enrollmentInfo: EnrollmentResponse;
}

export const Step2GradeSelection = ({
  next,
  back,
  enrollmentInfo,
}: Step2Props) => {
  const suggestedGrade = enrollmentInfo?.suggested_enrollment?.grade;
  const targetYear = enrollmentInfo?.suggested_enrollment?.academic_year;
  const actualEnrollment = enrollmentInfo?.actual_enrollment;

  const isFirstEnrollment = actualEnrollment?.is_first_enrollment === true;

  // La cuenta que inicia sesión en este wizard ES la del estudiante (el campo
  // guardián/acudiente vive aparte, en `guardian_*`) — `displayname` siempre existe
  // desde que se crea la cuenta, a diferencia de `eligibility.existing_data`
  // (`student_firstname1`/`student_lastname1`), que queda vacío hasta que el
  // estudiante guarda el Paso 3 al menos una vez. Mismo campo que ya usa Navbar.tsx
  // para mostrar el nombre de la sesión activa.
  const { user } = useAuth();
  const studentName = user?.displayname ?? "";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-secondary">
        Confirmación de Matrícula
      </h2>

      {/* Matrícula actual: solo si NO es primera matrícula */}
      {!isFirstEnrollment && actualEnrollment && (
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <h3 className="font-bold">Matrícula Actual</h3>
            <div className="text-sm">
              Grado: <strong>{actualEnrollment.grade?.description}</strong> -
              Año: <strong>{actualEnrollment.academic_year}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Nueva Matrícula */}
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">Nueva Matrícula</h3>

        <div className="space-y-4">
          {/* Estudiante — solo si ya hay dato (ver comentario de studentName arriba) */}
          {studentName && (
            <div className="form-control flex items-center gap-2">
              <label htmlFor="step2-student-name" className="label w-36 shrink-0">
                <span className="label-text font-semibold">Estudiante</span>
              </label>
              <input
                id="step2-student-name"
                name="student_name"
                type="text"
                value={studentName}
                className="input input-bordered w-64"
                disabled
              />
            </div>
          )}

          {/* Año Académico */}
          <div className="form-control flex items-center gap-2">
            <label htmlFor="step2-academic-year" className="label w-36 shrink-0">
              <span className="label-text font-semibold">Año Académico</span>
            </label>
            <input
              id="step2-academic-year"
              name="academic_year"
              type="text"
              value={targetYear ?? ""}
              className="input input-bordered w-40"
              disabled
            />
          </div>

          {/* Grado sugerido */}
          <div className="form-control flex items-center gap-2">
            <label htmlFor="step2-grade" className="label w-36 shrink-0">
              <span className="label-text font-semibold">Grado a Cursar</span>
            </label>
            <input
              id="step2-grade"
              name="grade"
              type="text"
              value={suggestedGrade?.description ?? ""}
              className="input input-bordered w-40"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Botones navegación */}
      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={back}>
          Atrás
        </button>
        <button className="btn btn-primary" onClick={next}>
          Continuar
        </button>
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { ID_DOC_TYPES, SEXES } from "@/components/admisiones/admissionTypes";
import {
  labelClass,
  inputClass,
  selectClass,
  primaryBtnClass,
} from "@/components/ui/formStyles";

/** Edad en años a partir de la fecha de nacimiento (ISO YYYY-MM-DD). "" si no es válida. */
function computeAge(iso: string): string {
  if (!iso) return "";
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
}

interface Grade {
  id: number;
  name: string;
  description: string | null;
}

/**
 * Etiqueta visible del grado. Convención del sistema (la que usa matrículas): el texto
 * que ve el usuario vive en `description`; `name` es el respaldo si viene vacío.
 */
const gradeLabel = (g: Grade) => g.description || g.name;

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear + 1];

/** Valores del formulario, un mapeo 1:1 con lo que ya se enviaba antes de RHF. */
interface FormValues {
  first_name1: string;
  first_name2: string;
  last_name1: string;
  last_name2: string;
  id_type: string;
  id_number: string;
  birth_date: string;
  sex: string;
  academic_year: string;
  grade_applied: string;
}

export default function NuevaAdmision() {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      first_name1: "",
      first_name2: "",
      last_name1: "",
      last_name2: "",
      id_type: "RC",
      id_number: "",
      birth_date: "",
      sex: "",
      academic_year: String(currentYear + 1),
      grade_applied: "",
    },
  });

  // Edad: valor puramente derivado (readOnly), igual que antes de la migración — no se
  // registra como campo de formulario propio ni se envía en el payload.
  const birthDate = watch("birth_date");

  // Chequeo manual existente para habilitar el botón — NO es validación nueva, es el
  // mismo `canSubmit` de antes de RHF, ahora leído con `watch` sobre los mismos 4 campos.
  const [firstName1, lastName1, idNumber, gradeApplied] = watch([
    "first_name1",
    "last_name1",
    "id_number",
    "grade_applied",
  ]);
  const canSubmit = Boolean(
    firstName1 && lastName1 && idNumber && gradeApplied && !submitting,
  );

  useEffect(() => {
    let active = true;
    apiFetch(API_ENDPOINTS.grades)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setGrades(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingGrades(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (form: FormValues) => {
    setSubmitting(true);
    setError(null);

    const payload = {
      applicant: {
        first_name1: form.first_name1,
        first_name2: form.first_name2,
        last_name1: form.last_name1,
        last_name2: form.last_name2,
        id_type: form.id_type,
        id_number: form.id_number,
        birth_date: form.birth_date || null,
        sex: form.sex,
      },
      academic_year: Number(form.academic_year),
      grade_applied: Number(form.grade_applied),
      aspirant_type: "NUEVO",
    };

    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplications, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        navigate(`/admisiones/${data.code}`, { replace: true });
      } else {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : "Revisa los datos: hay campos incompletos o inválidos.",
        );
        setSubmitting(false);
      }
    } catch {
      setError("No pudimos conectar con el servidor. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/admisiones")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis solicitudes
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold text-secondary">
          Nueva admisión
        </h1>
        <p className="mt-1 text-base-content/60">
          Empecemos con los datos básicos del aspirante. Podrás completar el
          resto del formulario después.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm"
      >
        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-semibold text-secondary">
            Datos del aspirante
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fn1" className={labelClass}>
                Primer nombre *
              </label>
              <input
                id="fn1"
                className={inputClass}
                required
                {...register("first_name1")}
              />
            </div>
            <div>
              <label htmlFor="fn2" className={labelClass}>
                Segundo nombre
              </label>
              <input id="fn2" className={inputClass} {...register("first_name2")} />
            </div>
            <div>
              <label htmlFor="ln1" className={labelClass}>
                Primer apellido *
              </label>
              <input
                id="ln1"
                className={inputClass}
                required
                {...register("last_name1")}
              />
            </div>
            <div>
              <label htmlFor="ln2" className={labelClass}>
                Segundo apellido
              </label>
              <input id="ln2" className={inputClass} {...register("last_name2")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="idtype" className={labelClass}>
                Tipo de documento *
              </label>
              <select id="idtype" className={selectClass} {...register("id_type")}>
                {ID_DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="idnum" className={labelClass}>
                Número de documento *
              </label>
              <input
                id="idnum"
                className={inputClass}
                required
                {...register("id_number")}
              />
            </div>
            <div>
              <label htmlFor="bdate" className={labelClass}>
                Fecha de nacimiento
              </label>
              <input
                id="bdate"
                type="date"
                className={inputClass}
                {...register("birth_date")}
              />
            </div>
            <div>
              <label htmlFor="edad" className={labelClass}>
                Edad
              </label>
              <input
                id="edad"
                className={`${inputClass} bg-base-200`}
                value={computeAge(birthDate)}
                readOnly
                placeholder="Se calcula sola"
              />
            </div>
            <div>
              <label htmlFor="sex" className={labelClass}>
                Sexo
              </label>
              <select id="sex" className={selectClass} {...register("sex")}>
                <option value="">Selecciona…</option>
                {SEXES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-base-300 pt-6">
          <legend className="font-display text-lg font-semibold text-secondary">
            Grado al que aspira
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="grade" className={labelClass}>
                Grado *
              </label>
              <select
                id="grade"
                className={selectClass}
                required
                disabled={loadingGrades}
                {...register("grade_applied")}
              >
                <option value="">
                  {loadingGrades ? "Cargando grados…" : "Selecciona un grado"}
                </option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {gradeLabel(g)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className={labelClass}>
                Año lectivo *
              </label>
              <select id="year" className={selectClass} {...register("academic_year")}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end border-t border-base-300 pt-6">
          <button type="submit" disabled={!canSubmit} className={primaryBtnClass}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creando solicitud…
              </>
            ) : (
              "Crear solicitud"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

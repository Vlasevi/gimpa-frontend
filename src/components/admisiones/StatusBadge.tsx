/**
 * Estado del expediente como pastilla de color.
 *
 * El texto viene del backend (`status_label`) para no duplicar los 29 estados en el
 * front; aquí solo se decide el **tono**.
 */

type Tone = "draft" | "progress" | "attention" | "success" | "closed";

const TONE_CLASSES: Record<Tone, string> = {
  draft: "border-base-300 bg-base-200 text-base-content/70",
  progress: "border-primary/25 bg-primary/10 text-primary",
  attention: "border-warning/30 bg-warning/10 text-warning",
  success: "border-accent/30 bg-accent/10 text-accent",
  closed: "border-error/25 bg-error/10 text-error",
};

/**
 * ⚠️ ESPEJO MANUAL de `ApplicationStatus` en `admissions/enums.py` (repo backend
 * `gimpa-backend`), sin generación automática (ver docs/plan-admisiones-ui-rhf-acordeon.md,
 * "Fuera de alcance" — tipos generados desde OpenAPI). Si el backend agrega, renombra o
 * elimina un estado de `ApplicationStatus`, este mapa hay que revisarlo a mano: lo que
 * no esté aquí cae en "progress" por defecto (ver el `?? "progress"` en `StatusBadge`).
 *
 * Criterio de tono usado para completar el catálogo (Paso 6 del plan, 2026-09-07):
 * - "draft": la solicitud todavía no se envió al colegio.
 * - "attention": el acudiente tiene algo pendiente de resolver de su lado (corregir,
 *   pagar o cargar un documento) o el resultado no fue el mejor posible sin ser un
 *   cierre definitivo (lista de espera, requiere nueva valoración, pago rechazado).
 * - "progress": el expediente avanza por el proceso interno del colegio sin que el
 *   acudiente deba hacer algo ahora mismo.
 * - "success": desenlace favorable.
 * - "closed": desenlace definitivo no favorable, o el propio acudiente desistió.
 */
const STATUS_TONES: Record<string, Tone> = {
  // — Tramo del acudiente (auto-servicio) —
  PRE_REGISTRO_INICIADO: "draft",
  SOLICITUD_EN_DILIGENCIAMIENTO: "draft",
  SOLICITUD_ENVIADA: "progress",

  // — Validación inicial (P7) —
  VALIDACION_INICIAL: "progress",
  DEVUELTA_PARA_CORRECCION: "attention",

  // — Pago de inscripción (P8) —
  PENDIENTE_PAGO: "attention",
  PAGO_REPORTADO: "progress",
  PAGO_VALIDADO: "progress",
  PAGO_RECHAZADO: "attention",
  EXENTO_PAGO: "progress",

  // — Documentos (P9) —
  PENDIENTE_DOCUMENTOS: "attention",
  DOCUMENTOS_EN_REVISION: "progress",
  DOCUMENTOS_COMPLETOS: "progress",

  // — Agenda (P10) —
  PENDIENTE_AGENDA: "progress",
  CITA_PROGRAMADA: "progress",
  CITA_REALIZADA: "progress",

  // — Workflow evaluativo (P11–P13) —
  ENTREVISTA_REGISTRADA: "progress",
  DIAGNOSTICO_REGISTRADO: "progress",
  REVISION_PSICOPEDAGOGICA: "progress",

  // — Comité y decisión (P14–P15) —
  COMITE_ADMISION: "progress",
  ADMITIDO: "success",
  ADMITIDO_CON_CONDICIONES: "success",
  LISTA_ESPERA: "attention",
  REQUIERE_NUEVA_VALORACION: "attention",
  NO_ADMITIDO: "closed",
  DESISTIDO: "closed",

  // — Matrícula (las escribe el módulo `enrollment` tras el handoff) —
  MATRICULA_FINANCIERA: "progress",
  MATRICULA_ACADEMICA: "progress",
  ESTUDIANTE_MATRICULADO: "success",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  // Cualquier estado intermedio del proceso cuenta como "en curso".
  const tone = STATUS_TONES[status] ?? "progress";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

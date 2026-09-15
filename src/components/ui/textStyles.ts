/**
 * Tipografía compartida de Matrículas (asistente del estudiante y panel de staff).
 *
 * Una sola fuente para las dos vistas: `SubSection` (tarjetas por sección),
 * `DocumentChecklist` (filas de documentos), los títulos de cada paso y las etiquetas de
 * los campos (`labelClass` en `formStyles.ts`).
 *
 * Aleo (`font-display`) solo trae los pesos 100–500. `font-semibold` y `font-bold` sobre
 * Aleo se ven IGUAL: el navegador toma el Medium (500) y le inventa la negrita (negrita
 * sintética, más gruesa y apretada, menos legible). Los títulos en Aleo van en
 * `font-medium`, el peso real más alto. Lo secundario va en `text-sm` con 60–70 % de
 * opacidad, no en 12 px al 50 %.
 */

/** Título de un paso o de un modal ("Datos del estudiante", nombre en el detalle). */
export const titleClass = "font-display text-xl font-medium text-secondary";

/** Título más chico: diálogos de confirmación, avisos. */
export const smallTitleClass = "font-display text-lg font-medium text-secondary";

/** Tarjeta de una sección (igual que `SubSection`). */
export const cardClass = "rounded-lg border border-base-300 bg-base-100";
export const cardHeaderClass =
  "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-base-300 px-5 py-4";
export const cardTitleClass = "font-display text-base font-medium text-secondary";
export const cardSubtitleClass = "text-sm text-base-content/60";

/** Nombre de un elemento de una lista (documento, evento del historial). */
export const itemTitleClass = "font-medium text-base-content";

/** Fechas, nombres de archivo, "por …": lo secundario de una fila. */
export const metaTextClass = "text-sm text-base-content/60";

/** Dato en solo lectura: la etiqueta como la del campo del formulario y el valor debajo. */
export const dataLabelClass = "text-sm font-medium text-base-content/70";
export const dataValueClass = "mt-1 break-words text-base text-base-content";

/** Texto de un comentario o motivo escrito por alguien (corrección, rechazo). */
export const quoteClass = "whitespace-pre-line rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/80";

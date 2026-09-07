/**
 * Tokens de formulario y botón compartidos — Paso 1 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md). Extraídos de la duplicación documentada en
 * docs/paso0-informe-admisiones.md §5.1 (grep de primaryBtnClass/ghostBtnClass/
 * inputClass/selectClass/textareaClass/labelClass sobre ~12 archivos de todo `src/`).
 *
 * `labelClass`/`inputClass`/`selectClass`/`textareaClass` ya eran, carácter por
 * carácter, la misma cadena en Matrículas (daisyUI "bordered" usado inline) y en la
 * fuente que tenía Admisiones (`components/admisiones/formFields.tsx`, con el
 * comentario "Estilo daisyui, igual que matrículas") — se mueven aquí sin cambiar
 * ningún valor.
 *
 * `primaryBtnClass`/`ghostBtnClass` NO tenían una fuente única en ningún lado:
 * Matrículas no declara estas constantes, usa las clases planas `btn btn-primary` /
 * `btn btn-ghost` de daisyUI directamente en el JSX. El valor elegido aquí como
 * canónico es el de mayor consenso dentro de Admisiones (coincide carácter por
 * carácter entre `pages/admisiones/SolicitudWizard.tsx` y
 * `pages/admisiones/NuevaAdmision.tsx`), e incluye los estados `disabled:*` que le
 * faltaban a las otras dos copias (`MisAdmisiones.tsx`, `DetalleAdmision.tsx`) —
 * divergencia documentada en el informe del Paso 0 como probablemente accidental
 * (§5.1, punto 1). Ya cumple los patrones obligatorios del plan: `shadow-sm` en
 * reposo, `shadow-lg shadow-primary/25` en hover, `transition-all duration-200
 * ease-out` con `motion-reduce:*`.
 *
 * Fuera de alcance de este módulo (documentado, no resuelto aquí — ver resumen del
 * Paso 1): existe una segunda familia de botones más pequeños (`h-10`/`h-11`) en el
 * panel admin (ApplicationDetail.tsx, DecisionPanel.tsx, InterviewsPanel.tsx,
 * GuardianDocumentsCard.tsx, GuardianPaymentCard.tsx) que este módulo no intenta
 * unificar — eso es trabajo del futuro `ui/Button.tsx` con variantes de tamaño que
 * describe el informe del Paso 0 (§7), pendiente de decidir cuál altura es la
 * canónica antes de consolidar.
 *
 * Este módulo no está conectado todavía a ningún consumidor existente (Admisiones y
 * Matrículas siguen con sus propias declaraciones locales) — eso es un paso
 * posterior del plan. Es solo la fundación compartida.
 */

export const labelClass = "mb-1.5 block text-sm font-medium text-base-content/70";

export const inputClass = "input input-bordered w-full focus:input-primary transition-all";
export const selectClass = "select select-bordered w-full focus:select-primary transition-all";
export const textareaClass =
  "textarea textarea-bordered w-full focus:textarea-primary transition-all";

/** Alias histórico de `selectClass`, usado por varios `<select>` crudos que no pasan por SelectField. */
export const controlClass = selectClass;

export const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export const ghostBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 px-5 text-base font-medium text-base-content transition-all duration-200 ease-out hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none";

/**
 * Botones "chicos" (h-10, `rounded-lg`) del panel de staff de Admisiones — Paso 7
 * (docs/plan-admisiones-ui-rhf-acordeon.md). Es una familia de tamaño DISTINTA a
 * `primaryBtnClass`/`ghostBtnClass` de arriba (h-12, pensados para el wizard del
 * acudiente): no se fusionan aquí a propósito, como ya advertía el comentario de este
 * módulo desde el Paso 1 ("existe una segunda familia de botones más pequeños...
 * pendiente de decidir cuál altura es la canónica antes de consolidar").
 *
 * Antes del Paso 7, `ApplicationDetail.tsx`, `DecisionPanel.tsx` e `InterviewsPanel.tsx`
 * declaraban cada uno su propia copia de esta familia, con pequeñas divergencias
 * accidentales (h-10 vs h-11, `rounded-xl` vs `rounded-lg`, `px-4` vs `px-5`) — ver
 * docs/paso0-informe-admisiones.md §5.1. Se unifican aquí en `rounded-lg`, el radio que
 * Matrículas usa de forma consistente en botones/inputs chicos (regla del Paso 7).
 */
export const adminPrimaryBtnClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-content transition-all duration-200 ease-out hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";

export const adminGhostBtnClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-base-300 bg-base-100 px-4 text-sm font-medium text-base-content transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

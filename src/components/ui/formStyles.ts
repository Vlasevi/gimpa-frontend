/**
 * Tokens de formulario y botón compartidos.
 *
 * REGLA: Matrículas es la fuente de verdad del lenguaje visual. Todo lo de aquí debe
 * ser IDÉNTICO a lo que Matrículas ya renderiza — no una interpretación "premium" de
 * eso. Verificado por grep directo sobre components/matriculas/**: Matrículas nunca usa
 * hover:-translate, nunca usa shadow-primary/*, nunca tiene una altura de botón custom
 * (h-10/h-11/h-12) — usa las clases `btn`/`input`/`select`/`textarea` planas de daisyUI
 * (con `bordered` en los campos), sin envolturas propias. Antes de este archivo,
 * Admisiones tenía su propia familia de botones "premium" (rounded-xl, hover-lift,
 * sombra de color) que NO existe en ningún lugar de Matrículas — corregido aquí.
 *
 * `labelClass`/`inputClass`/`selectClass`/`textareaClass` ya eran, carácter por
 * carácter, la misma cadena que usa Matrículas inline. Sin cambios.
 */

export const labelClass = "mb-1.5 block text-sm font-medium text-base-content/70";

export const inputClass = "input input-bordered w-full focus:input-primary transition-all";
export const selectClass = "select select-bordered w-full focus:select-primary transition-all";
export const textareaClass =
  "textarea textarea-bordered w-full focus:textarea-primary transition-all";

/** Alias histórico de `selectClass`, usado por varios `<select>` crudos que no pasan por SelectField. */
export const controlClass = selectClass;

/**
 * Botón primario. Antes: `h-12 rounded-xl ... hover:-translate-y-0.5 hover:shadow-lg
 * hover:shadow-primary/25` (estilo propio de Admisiones, sin equivalente en Matrículas).
 * Ahora: literalmente `btn btn-primary gap-2 shadow-sm`, la clase exacta que usa
 * Matrículas para su CTA principal (ver `MatriculasAdmin.tsx`, botón "Nueva Matrícula").
 */
export const primaryBtnClass = "btn btn-primary gap-2 shadow-sm";

/** Botón secundario/ghost. Antes: `h-12 rounded-xl border ...` custom. Ahora: `btn
 * btn-ghost`, igual a Matrículas (ver `MatriculasAdmin.tsx`). */
export const ghostBtnClass = "btn btn-ghost gap-2";

/** Botón secundario con contorno suave: "Atrás" del asistente de Matrículas. Es el mismo
 * contorno que "Cancelar" en `ConfirmDialog` (borde `base-300`, texto normal, hover gris). */
export const outlineBtnClass =
  "btn btn-outline gap-2 border-base-300 font-medium text-base-content hover:border-base-300 hover:bg-base-200 hover:text-base-content";

/**
 * Antes existían `adminPrimaryBtnClass`/`adminGhostBtnClass` como una SEGUNDA familia
 * de botones (h-10, para el panel de staff), distinta de la de arriba — precisamente
 * el tipo de divergencia interna que no debe existir si el objetivo es igualar
 * Matrículas, que usa la misma clase `btn btn-primary`/`btn btn-ghost` en TODAS partes
 * (listado, modales, paneles). Se eliminan como familia aparte: quedan como alias
 * directos de `primaryBtnClass`/`ghostBtnClass` para no romper imports existentes.
 */
export const adminPrimaryBtnClass = primaryBtnClass;
export const adminGhostBtnClass = ghostBtnClass;

/**
 * Botón de ícono (acciones de fila como ver, editar o eliminar, y cerrar un modal).
 *
 * Nitidez: el gris del ícono es OPACO (mezcla de `base-content` con el fondo), nunca
 * `text-base-content/40` o `/60`. Con un color con transparencia cada tramo del SVG se
 * pinta al 60 % y donde dos tramos se cruzan (uniones, puntas) el gris se suma: queda un
 * trazo a manchas, oscuro en las uniones y claro en el resto, que se lee borroso
 * (comprobado en Chrome, píxel a píxel). Opaco, el trazo es parejo. 70 % de
 * `base-content` también da el contraste 3:1 que pide un ícono.
 *
 *   <button className={`${iconBtnClass} ${iconHover.primary}`} aria-label="Ver …" title="Ver">
 *     <Eye className={iconClass} aria-hidden="true" />
 *   </button>
 */
export const iconBtnClass =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2 text-[color:color-mix(in_oklab,var(--color-base-content)_70%,var(--color-base-100))] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40";
export const iconClass = "h-5 w-5";
/** Color en hover según la intención de la acción. */
export const iconHover = {
  primary: "hover:bg-primary/10 hover:text-primary",
  success: "hover:bg-success/10 hover:text-success",
  accent: "hover:bg-accent/10 hover:text-accent",
  error: "hover:bg-error/10 hover:text-error",
  neutral: "hover:bg-base-200 hover:text-base-content",
} as const;

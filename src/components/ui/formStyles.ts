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

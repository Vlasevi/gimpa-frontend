/**
 * Horas para elegir de una lista (cada 15 minutos) en vez de escribirlas. El valor que se
 * guarda y se envía sigue siendo texto "HH:mm" (24 h); lo que se muestra es "2:30 p. m.".
 * Lo usan el campo `type: "time"` de los formularios por esquema y la asignación de
 * entrevistas/examen de Admisiones.
 */

import type { SelectOption } from "@/components/ui/Select";

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30" → "2:30 p. m." (si no es una hora, se devuelve igual). */
export function timeLabel(value: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "a. m." : "p. m."}`;
}

/** Jornada del colegio: de 6:00 a. m. a 8:00 p. m., cada 15 minutos. */
export const TIME_OPTIONS: readonly SelectOption[] = Array.from({ length: (20 - 6) * 4 + 1 }, (_, i) => {
  const minutes = 6 * 60 + i * 15;
  const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return { value, label: timeLabel(value) };
});

/** Las opciones, más el valor actual si no está en la lista (una hora guardada antes a mano),
 * para no perderlo al abrir el formulario. */
export function timeOptionsWith(value: string | null | undefined): readonly SelectOption[] {
  if (!value || TIME_OPTIONS.some((o) => o.value === value)) return TIME_OPTIONS;
  return [{ value, label: timeLabel(value) }, ...TIME_OPTIONS];
}

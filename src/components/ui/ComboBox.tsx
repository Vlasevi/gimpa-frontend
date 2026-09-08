import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { labelClass } from "@/components/ui/formStyles";

/**
 * Dropdown buscable (mismo comportamiento que el `ComboBox` que tenía matrículas como
 * función local): input `input-bordered`, filtra por prefijo ignorando tildes. Útil para
 * listas largas (ciudades, barrios, diagnósticos médicos).
 *
 * Movido de `components/admisiones/ComboBox.tsx` a `components/ui/` (mismo patrón que
 * `Alert.tsx`/`FilterSelect.tsx`/`tabs.tsx`/`Modal.tsx`/`Toast.tsx`): ya no es exclusivo
 * de Admisiones — también lo usa la migración de `matriculas/Step3StudentData.tsx` (33
 * usos: las 9 cascadas geográficas y el combo de diagnóstico médico), que antes tenía su
 * propia copia casi idéntica con la prop `setValue` en vez de `onChange` y colores
 * hardcodeados en vez de tokens daisyUI.
 *
 * Cambio aditivo intencional en esa migración: cuando `required` es `true` ahora se
 * muestra un asterisco (`text-error`) junto al label — antes NINGÚN combo de Admisiones
 * lo tenía. Es el mismo asterisco que ya mostraba el `ComboBox` local de Matrículas.
 *
 * REESCRITO sobre el `dropdown` de daisyUI (`dropdown`/`dropdown-content`) en vez de
 * reimplementar a mano lo que ese componente ya resuelve. Antes: lista en
 * `position: fixed` con `top/left/width` calculados vía `getBoundingClientRect()` en cada
 * render, y un `addEventListener("scroll", ...)` global para cerrar la lista al hacer
 * scroll (porque `position: fixed` no sigue al input solo). Ahora:
 * `.dropdown { position: relative }` + `.dropdown-content { position: absolute }` son CSS
 * puro de daisyUI — la lista queda anclada al contenedor sin ningún cálculo en JS ni
 * listener de scroll.
 *
 * `open` sigue siendo estado explícito de React (no solo `:focus-within`) a propósito:
 * un combobox de verdad necesita poder cerrar la lista con Escape/Enter SIN quitarle el
 * foco al input (para seguir escribiendo o repetir la búsqueda) — algo que
 * `:focus-within` no puede expresar por sí solo, porque para esa técnica "cerrado" y
 * "sin foco" son la misma cosa.
 *
 * Navegación por teclado + ARIA de combobox completos (antes no existían en NINGUNA de
 * las 33+4 instancias del repo, ni con mouse-only se perdía tanto): ↑/↓ mueve el resaltado
 * (con wrap), Enter selecciona el resaltado, Escape cierra sin perder el foco ni el texto
 * ya escrito. `role="listbox"`/`"option"` + `aria-activedescendant` en vez de mover el
 * foco real a los `<li>` — el foco de verdad se queda siempre en el `<input>`, como en
 * cualquier combobox accesible (patrón tomado de un ejemplo de referencia con el mismo
 * propósito, adaptado a React/daisyUI).
 */
export function ComboBox({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled,
  loading = false,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  /** True mientras se cargan las opciones desde la DB (departamentos/ciudades). */
  loading?: boolean;
  /**
   * Opcional, aditivo: sin pasarla el comportamiento no cambia para ningún consumidor
   * existente. Mismo patrón que el `ComboBox` local de
   * `matriculas/Step3StudentData.tsx:505-604` (línea 603, `required={required}` en su
   * `<input>`), necesario para que `GeoCascadeField` (rama `static`, que reproduce
   * Matrículas) pueda propagar `required` real.
   */
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  // Al abrir, `query` se precarga con el valor actual (para que se vea lo ya elegido) pero
  // el FILTRO no debe aplicarse todavía — si lo hiciera, la lista se reduciría de
  // inmediato a esa única opción y las flechas no tendrían a dónde moverse. El filtro solo
  // se activa cuando el usuario escribe de verdad (`onChange`), no al abrir por foco.
  const [userTyped, setUserTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Antes usaba `id={label}` — con 4+ cascadas geográficas compartiendo el mismo label por
  // defecto ("País de Residencia", etc.) el DOM terminaba con ids duplicados (hallazgo de
  // DevTools en la verificación del Paso 2 del plan de esquema declarativo). `useId()`
  // genera un id único por instancia sin depender del texto del label.
  const inputId = useId();
  const listId = `${inputId}-list`;
  const optionId = (i: number) => `${inputId}-option-${i}`;

  // Sincroniza el texto con el valor cuando está cerrado (evita pisar lo que el usuario
  // está escribiendo mientras filtra).
  useEffect(() => {
    if (!open) setQuery(value || "");
  }, [value, open]);

  const normalize = (t: string) =>
    t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const filterQuery = userTyped ? query : "";
  const filtered =
    filterQuery === ""
      ? options
      : options.filter((o) => {
          const opt = normalize(o);
          const q = normalize(filterQuery);
          return opt.startsWith(q) || opt.split(" ").some((w) => w.startsWith(q));
        });

  // Mantiene el resaltado dentro de rango cuando la lista filtrada cambia de tamaño
  // (p.ej. al escribir una letra más y reducirse las coincidencias).
  useEffect(() => {
    setHighlighted((i) => (filtered.length === 0 ? -1 : Math.min(Math.max(i, 0), filtered.length - 1)));
  }, [filtered.length]);

  // Desplaza la opción resaltada a la vista al navegar con el teclado.
  useEffect(() => {
    if (highlighted < 0) return;
    listRef.current?.querySelector(`#${CSS.escape(optionId(highlighted))}`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted]);

  const openList = () => {
    setOpen(true);
    setUserTyped(false);
    // Se calcula sobre `options` (la lista completa), no sobre `filtered`: en este mismo
    // render `filtered` todavía puede reflejar un filtro de una apertura anterior.
    const idx = options.findIndex((o) => o === value);
    setHighlighted(idx >= 0 ? idx : options.length > 0 ? 0 : -1);
  };

  const closeList = ({ keepQuery = false }: { keepQuery?: boolean } = {}) => {
    setOpen(false);
    setHighlighted(-1);
    setUserTyped(false);
    if (!keepQuery) setQuery(value || "");
  };

  const selectOption = (o: string) => {
    onChange(o);
    setQuery(o);
    closeList({ keepQuery: true });
    // El foco se queda en el input (patrón estándar de combobox) — no se hace blur.
    inputRef.current?.focus();
  };

  return (
    <div className="dropdown form-control relative w-full">
      <label htmlFor={inputId} className={labelClass}>
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={open && highlighted >= 0 ? optionId(highlighted) : undefined}
        autoComplete="off"
        className="input input-bordered w-full truncate transition-all focus:input-primary"
        placeholder={placeholder ?? label}
        value={query}
        disabled={disabled}
        required={required}
        title={value}
        onChange={(e) => {
          setQuery(e.target.value);
          setUserTyped(true);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onBlur={() => closeList()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) return openList();
            if (filtered.length > 0) setHighlighted((i) => (i + 1) % filtered.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) return openList();
            if (filtered.length > 0) setHighlighted((i) => (i - 1 + filtered.length) % filtered.length);
          } else if (e.key === "Enter") {
            if (open && highlighted >= 0 && filtered[highlighted]) {
              e.preventDefault();
              selectOption(filtered[highlighted]);
            }
          } else if (e.key === "Escape") {
            if (open) {
              e.preventDefault();
              closeList();
            }
          }
        }}
      />
      {open && (loading || filtered.length > 0) && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="dropdown-content menu z-50 mt-1 w-full max-h-52 flex-nowrap overflow-auto rounded-lg border border-base-300 bg-base-100 p-0 shadow-lg"
        >
          {loading && (
            <li className="flex items-center gap-2 px-4 py-2 text-sm text-base-content/60">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Cargando…
            </li>
          )}
          {!loading && filtered.map((o, i) => (
            <li
              key={o}
              id={optionId(i)}
              role="option"
              aria-selected={i === highlighted}
              title={o}
              className={`cursor-pointer truncate px-4 py-2 text-sm transition-colors hover:bg-primary hover:text-primary-content ${
                i === highlighted || o === value
                  ? "bg-primary text-primary-content"
                  : "text-base-content"
              }`}
              // onMouseDown + preventDefault: evita que el navegador intente robarle el
              // foco al input antes de que se procese la selección (sin esto, en algunos
              // navegadores el input pierde el foco brevemente y dispara onBlur primero).
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(o);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

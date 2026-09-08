import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { labelClass } from "@/components/ui/formStyles";

/**
 * Dropdown buscable (mismo comportamiento que el `ComboBox` que tenía matrículas como
 * función local): input `input-bordered`, filtra por prefijo ignorando tildes, lista
 * flotante que se cierra al hacer scroll o perder foco. Útil para listas largas
 * (ciudades, barrios, diagnósticos médicos).
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
 * lo tenía (tampoco lo tiene ningún otro campo de `formFields.tsx`/`primitives.tsx`), así
 * que sus combos requeridos ganan un asterisco visual que antes no tenían. Es el mismo
 * asterisco que ya mostraba el `ComboBox` local de Matrículas.
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
   * existente (ningún uso actual en Admisiones la pasa). Mismo patrón que el `ComboBox`
   * local de `matriculas/Step3StudentData.tsx:505-604` (línea 603,
   * `required={required}` en su `<input>`), necesario para que `GeoCascadeField`
   * (rama `static`, que reproduce Matrículas) pueda propagar `required` real.
   */
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Antes usaba `id={label}` — con 4+ cascadas geográficas compartiendo el mismo label por
  // defecto ("País de Residencia", etc.) el DOM terminaba con ids duplicados (hallazgo de
  // DevTools en la verificación del Paso 2 del plan de esquema declarativo). `useId()`
  // genera un id único por instancia sin depender del texto del label.
  const inputId = useId();

  // Sincroniza el texto con el valor cuando está cerrado.
  useEffect(() => {
    if (!open) setQuery(value || "");
  }, [value, open]);

  // Cierra al hacer scroll fuera de la lista.
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  const normalize = (t: string) =>
    t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const filtered =
    query === ""
      ? options
      : options.filter((o) => {
          const opt = normalize(o);
          const q = normalize(query);
          return opt.startsWith(q) || opt.split(" ").some((w) => w.startsWith(q));
        });

  return (
    <div className="form-control relative w-full">
      <label htmlFor={inputId} className={labelClass}>
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        autoComplete="off"
        className="input input-bordered w-full truncate transition-all focus:input-primary"
        placeholder={placeholder ?? label}
        value={query}
        disabled={disabled}
        required={required}
        title={value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(value || "");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (loading || filtered.length > 0) && (
        <ul
          ref={listRef}
          className="fixed z-50 max-h-52 overflow-auto rounded-lg border border-base-300 bg-base-100 shadow-lg"
          style={{
            top: inputRef.current
              ? inputRef.current.getBoundingClientRect().bottom + 4
              : 0,
            left: inputRef.current ? inputRef.current.getBoundingClientRect().left : 0,
            width: inputRef.current ? inputRef.current.getBoundingClientRect().width : "auto",
          }}
        >
          {loading && (
            <li className="flex items-center gap-2 px-4 py-2 text-sm text-base-content/60">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Cargando…
            </li>
          )}
          {!loading && filtered.map((o) => (
            <li
              key={o}
              title={o}
              className={`cursor-pointer truncate px-4 py-2 text-sm transition-colors hover:bg-primary hover:text-primary-content ${
                o === value ? "bg-primary text-primary-content" : "text-base-content"
              }`}
              onMouseDown={() => {
                onChange(o);
                setQuery(o);
                setOpen(false);
                inputRef.current?.blur();
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

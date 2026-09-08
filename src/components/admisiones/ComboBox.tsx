import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { labelClass } from "./formFields";

/**
 * Dropdown buscable (mismo comportamiento que el `ComboBox` de matrículas): input
 * `input-bordered`, filtra por prefijo ignorando tildes, lista flotante que se cierra
 * al hacer scroll o perder foco. Útil para listas largas (ciudades, barrios).
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
      <label htmlFor={label} className={labelClass}>{label}</label>
      <input
        ref={inputRef}
        id={label}
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

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  /** Utilidades de ancho para el contenedor, p. ej. "w-56" o "min-w-[160px]". */
  className?: string;
  ariaLabel?: string;
}

/**
 * Select de filtro con el aspecto del `dropdown` de daisyui (no `<select>` nativo), para
 * que la opción elegida se resalte con el color del tema en vez del ✓ del navegador.
 *
 * Accesibilidad (patrón "select-only combobox" de la WAI): un `<button role="combobox">`
 * con `aria-haspopup="listbox"` y `aria-expanded` (su texto es el valor elegido); la lista (`role="listbox"`) solo existe
 * abierta, con opciones `role="option"` y `aria-selected`. Teclado: Enter/Espacio/↓ abre,
 * ↑/↓/Inicio/Fin mueven, Enter elige, Escape o Tab cierran. El foco real se queda en el
 * botón (`aria-activedescendant`).
 */
export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  className = "",
  ariaLabel,
}: FilterSelectProps) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) {
      document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`dropdown ${open ? "dropdown-open" : ""} ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-3 text-sm font-medium text-base-content transition-colors hover:border-base-content/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className={`truncate ${selected ? "" : "text-base-content/50"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-base-content/40 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="dropdown-content z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                // mousedown + preventDefault: el foco se queda en el botón.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-primary font-semibold text-primary-content"
                    : i === active
                      ? "bg-base-200 text-base-content"
                      : "text-base-content/80"
                }`}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FilterSelect;

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  /** `field`: campo de formulario (el aspecto de `input`/`select` de daisyUI). `filter`: los
   * filtros de los listados. */
  variant?: "field" | "filter";
  /** Clases del contenedor (ancho: "w-56", "min-w-[160px]"…). */
  className?: string;
  /** Id del botón: lo usa el `<label htmlFor>` del campo. */
  id?: string;
  /** Nombre accesible cuando no hay `<label>` (filtros). */
  ariaLabel?: string;
  /** Ids de la ayuda y del error (`aria-describedby`). */
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Con `name` se incluye un `<input type="hidden">` para los formularios nativos. */
  name?: string;
  onBlur?: () => void;
  /** Lo que muestra la lista abierta cuando no hay opciones. */
  emptyText?: string;
}

/**
 * Select con el aspecto del `dropdown` de daisyUI (no `<select>` nativo): la lista es la
 * nuestra, no la del sistema operativo, y la opción elegida se resalta con el color del
 * tema. Es el select de toda la plataforma: formularios (`variant="field"`, con
 * `SelectField` o directo) y filtros (`FilterSelect`).
 *
 * Accesibilidad (patrón "select-only combobox" de la WAI): un `<button role="combobox">`
 * con `aria-haspopup="listbox"` y `aria-expanded` (su texto es el valor elegido); la lista
 * (`role="listbox"`) solo existe abierta, con opciones `role="option"` y `aria-selected`.
 * Teclado: Enter/Espacio/↓ abre, ↑/↓/Inicio/Fin mueven, Enter elige, Escape o Tab cierran;
 * con la lista cerrada, escribir una letra salta a la primera opción que empieza así. El
 * foco real se queda en el botón (`aria-activedescendant`).
 *
 * La lista se dibuja en un portal (`document.body`) con posición fija calculada desde el
 * botón: así no la recorta un contenedor con `overflow` (el cuerpo con scroll de un modal).
 * Se abre hacia arriba si abajo no hay espacio, su alto se ajusta al espacio disponible y
 * sigue al botón si la página o el modal hacen scroll.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  variant = "field",
  className = "",
  id,
  ariaLabel,
  describedBy,
  invalid,
  required,
  disabled,
  name,
  onBlur,
  emptyText = "No hay opciones para mostrar.",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Cierra al hacer clic fuera (del botón y de la lista, que está en un portal).
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Posición de la lista: debajo del botón, o encima si abajo no cabe.
  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const gap = 4;
    const preferred = 288; // lo mismo que max-h-72
    const below = window.innerHeight - rect.bottom - margin - gap;
    const above = rect.top - margin - gap;
    const openUp = below < Math.min(preferred, 176) && above > below;
    const width = Math.max(rect.width, 192);
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - width - margin),
    );
    setListStyle({
      position: "fixed",
      left,
      width,
      maxHeight: Math.max(120, Math.min(preferred, openUp ? above : below)),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true); // también el scroll de un modal
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (open && active >= 0) {
      document
        .getElementById(optionId(active))
        ?.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const openList = () => {
    if (disabled) return;
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
      } else if (event.key.length === 1 && /\S/.test(event.key)) {
        // Escribir una letra elige la primera opción que empieza así (como el nativo).
        const letter = event.key.toLocaleLowerCase("es");
        const index = options.findIndex((o) =>
          o.label.toLocaleLowerCase("es").startsWith(letter),
        );
        if (index >= 0) onChange(options[index].value);
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
      // Solo cierra la lista, no el modal que la contiene: los modales escuchan Escape en
      // `document`/`window`, que el `stopPropagation` de React no alcanza.
      event.nativeEvent.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const buttonClass =
    variant === "filter"
      ? "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-3 text-sm font-medium text-base-content transition-colors hover:border-base-content/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      : `flex h-10 w-full items-center justify-between gap-2 rounded-field border bg-base-100 px-3 text-left text-sm text-base-content transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/60 ${
          invalid
            ? "border-error"
            : open
              ? "border-primary"
              : "border-base-300 hover:border-base-content/30"
        }`;

  return (
    <div
      ref={rootRef}
      className={`relative ${variant === "field" ? "w-full" : ""} ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? optionId(active) : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={buttonClass}
      >
        <span className={`truncate ${selected ? "" : "text-base-content/50"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-base-content/50 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {name && <input type="hidden" name={name} value={value} />}

      {open &&
        listStyle &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : id}
            style={listStyle}
            // Los eventos de un portal suben por el árbol de React: que no lleguen al modal.
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="z-[70] overflow-y-auto overscroll-contain rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg"
          >
            {options.length === 0 && (
              <li role="presentation" className="px-3 py-2 text-left text-sm text-base-content/60">
                {emptyText}
              </li>
            )}
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
          </ul>,
          document.body,
        )}
    </div>
  );
}

export default Select;

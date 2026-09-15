import { Select, type SelectOption } from "@/components/ui/Select";

export type FilterOption = SelectOption;

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  /** Utilidades de ancho para el contenedor, p. ej. "w-56" o "min-w-[160px]". */
  className?: string;
  ariaLabel?: string;
}

/** Select de los filtros de los listados: el `Select` de la plataforma con el aspecto de
 * filtro (ver `ui/Select.tsx`, allí está la accesibilidad y el teclado). */
export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  className = "",
  ariaLabel,
}: FilterSelectProps) => (
  <Select
    variant="filter"
    value={value}
    onChange={onChange}
    options={options}
    placeholder={placeholder}
    className={className}
    ariaLabel={ariaLabel}
  />
);

export default FilterSelect;

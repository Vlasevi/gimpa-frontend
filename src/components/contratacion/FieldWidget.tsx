// components/contratacion/FieldWidget.tsx
// Renderiza un campo del formulario de contratación según su widget.
import { useState, useEffect, useRef } from "react";
import type { FieldConfig } from "./contractConfig";
import { Select } from "@/components/ui/Select";

// Select con búsqueda (muestra ~5 ítems con scroll)
const SearchSelect = ({
  value,
  onChange,
  options,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <input
        className="input input-bordered w-full"
        placeholder={placeholder}
        value={open ? query : value || ""}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(""); }}
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-base-content/40">Sin resultados</li>}
          {filtered.map((o) => (
            <li
              key={o}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 ${o === value ? "bg-primary/5 font-medium" : ""}`}
              onMouseDown={() => { onChange(o); setOpen(false); setQuery(""); }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const FieldWidget = ({
  field,
  value,
  onChange,
  readOnly = false,
}: {
  field: FieldConfig;
  value: any;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) => {
  if (readOnly || field.computed || field.auto) {
    return (
      <input
        type="text"
        className="input input-bordered w-full bg-base-200 text-base-content/50 cursor-not-allowed"
        value={value ?? ""}
        disabled
        readOnly
      />
    );
  }

  const w = field.widget || "text";

  if (w === "select") {
    return (
      <Select
        ariaLabel={field.label}
        value={value == null ? "" : String(value)}
        onChange={onChange}
        placeholder="Seleccione..."
        options={(field.options || []).map((o) => ({ value: o, label: o }))}
      />
    );
  }

  if (w === "search") {
    return (
      <SearchSelect
        value={value ?? ""}
        onChange={onChange}
        options={field.options || []}
        placeholder={`Buscar ${field.label.toLowerCase()}...`}
      />
    );
  }

  return (
    <input
      type={w === "number" ? "number" : w}
      className="input input-bordered w-full focus:input-primary transition-all"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default FieldWidget;

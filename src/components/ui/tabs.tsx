import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs sin dependencias externas (reemplazo de @radix-ui/react-tabs).
 * Mantiene la misma API pública y el contrato `data-state="active|inactive"`
 * para que el estilado con `data-[state=...]` siga funcionando igual.
 * Soporta uso controlado (`value` + `onValueChange`) y no controlado
 * (`defaultValue`).
 *
 * Accesibilidad (patrón de pestañas de la WAI): cada pestaña apunta a su panel
 * (`aria-controls`) y cada panel se nombra con su pestaña (`aria-labelledby`); solo la
 * pestaña activa entra al orden de Tab y las flechas ←/→ (e Inicio/Fin) cambian de
 * pestaña.
 */

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> debe usarse dentro de <Tabs>`);
  }
  return ctx;
}

const tabId = (base: string, value: string) => `${base}-tab-${value}`;
const panelId = (base: string, value: string) => `${base}-panel-${value}`;

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultValue ?? "");
    const isControlled = value !== undefined;
    const current = isControlled ? value : internal;
    const baseId = React.useId().replace(/:/g, "");

    const setValue = React.useCallback(
      (next: string) => {
        if (!isControlled) setInternal(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    return (
      <TabsContext.Provider value={{ value: current, setValue, baseId }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onKeyDown, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn("inline-flex items-center", className)}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (event.defaultPrevented || !keys.includes(event.key)) return;
      const tabs = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
      );
      const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (index < 0) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    }}
    {...props}
  />
));
TabsList.displayName = "TabsList";

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const { value: current, setValue, baseId } = useTabsContext("TabsTrigger");
    const isActive = current === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={tabId(baseId, value)}
        aria-controls={panelId(baseId, value)}
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        data-state={isActive ? "active" : "inactive"}
        onClick={(event) => {
          setValue(value);
          onClick?.(event);
        }}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: current, baseId } = useTabsContext("TabsContent");
    if (current !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={panelId(baseId, value)}
        aria-labelledby={tabId(baseId, value)}
        tabIndex={0}
        data-state="active"
        className={cn("focus-visible:outline-none", className)}
        {...props}
      />
    );
  },
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };

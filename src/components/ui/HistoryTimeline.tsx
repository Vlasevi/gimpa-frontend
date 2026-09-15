/**
 * Línea de tiempo del historial (pestaña "Resumen" de Matrículas y de Admisiones): cada
 * evento con su ícono de color, fecha, quién, nota y lo que se pidió corregir; al final,
 * el paso que sigue con borde punteado. Cada módulo arma sus eventos; esto solo los pinta.
 */

import { Clock, type LucideIcon } from "lucide-react";

import {
  cardClass,
  cardHeaderClass,
  cardTitleClass,
  itemTitleClass,
  metaTextClass,
  quoteClass,
} from "@/components/ui/textStyles";

export type HistoryTone = "neutral" | "info" | "success" | "warning" | "error";

const TONE_CLASS: Record<HistoryTone, string> = {
  neutral: "bg-base-200 text-base-content/70",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/10 text-error",
};

export interface HistoryEvent {
  at: string;
  title: string;
  by?: string | null;
  note?: string | null;
  /** Lo que se pidió corregir en una corrección (secciones y/o documentos). */
  items?: string[];
  tone: HistoryTone;
  icon: LucideIcon;
}

// Mismo formato de fecha y hora que el resto de Matrículas (hora de Colombia).
const DATE_TIME = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "14 sept 2026, 9:15 a. m." */
export function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_TIME.format(d);
}

export function HistoryTimeline({
  events,
  next,
  itemsLabel = "A corregir",
}: {
  events: HistoryEvent[];
  /** Lo que sigue; `null` si ya no espera nada. */
  next: string | null;
  /** Rótulo de `items` ("Documentos a corregir", "A corregir"). */
  itemsLabel?: string;
}) {
  return (
    <section aria-labelledby="resumen-historial" className={cardClass}>
      <header className={cardHeaderClass}>
        <h3 id="resumen-historial" className={cardTitleClass}>
          Historial
        </h3>
      </header>

      <ol className="p-5">
        {events.map((event, index) => {
          const Icon = event.icon;
          const isLastEvent = index === events.length - 1;
          return (
            <li key={`${event.title}-${event.at}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
              {(!isLastEvent || next) && (
                <span
                  aria-hidden="true"
                  className={`absolute top-10 bottom-1.5 left-4 -translate-x-1/2 border-l-2 border-base-300 ${
                    isLastEvent ? "border-dashed" : ""
                  }`}
                />
              )}
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[event.tone]}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className={itemTitleClass}>{event.title}</p>
                <p className={metaTextClass}>
                  <time dateTime={event.at}>{formatHistoryDate(event.at)}</time>
                  {event.by && <> · por {event.by}</>}
                </p>
                {event.note && <p className={`mt-2 ${quoteClass}`}>{event.note}</p>}
                {event.items && event.items.length > 0 && (
                  <p className={`mt-2 ${metaTextClass}`}>
                    <span className="font-medium text-base-content/70">{itemsLabel}:</span>{" "}
                    {event.items.join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {next && (
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-base-300 text-base-content/50">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 pt-1 font-semibold text-base-content/80">{next}</p>
          </li>
        )}
      </ol>
    </section>
  );
}

export default HistoryTimeline;

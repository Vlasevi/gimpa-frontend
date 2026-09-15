import { useCallback, useEffect, useState } from "react";
import { Loader2, CalendarClock, Video, MapPin, ExternalLink, CheckCircle2, Clock } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { titleClass } from "@/components/ui/textStyles";
import { formatWhen } from "@/components/admisiones/valoracion/types";

interface Appointment {
  kind: string;
  label: string;
  status: "PROGRAMADA" | "REALIZADA";
  scheduled_at: string;
  modality: "VIRTUAL" | "PRESENCIAL";
  modality_label: string;
  meeting_link: string;
}

/** Pestaña "Entrevistas" del acudiente: las citas de la valoración (fecha, modalidad y
 * enlace). Nunca expone respuestas, puntajes ni conceptos: la valoración es interna. */
export function GuardianInterviewsCard({ id }: { id: number }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsAppointments(id));
      if (res.ok) setAppointments((await res.json()).appointments ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-6 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando citas…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
      <h2 className={`mb-1 ${titleClass}`}>Citas de admisión</h2>
      <p className="mb-4 text-sm text-base-content/60">
        La valoración tiene una entrevista con la familia, una con el aspirante y un examen
        académico. Aquí verás la fecha, la modalidad y el enlace de cada una.
      </p>

      {appointments.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-base-200 px-4 py-3 text-sm text-base-content/60">
          <Clock className="h-4 w-4" />
          Aún no hay citas programadas. Te avisaremos por correo.
        </p>
      ) : (
        <ul className="space-y-3">
          {appointments.map((a) => {
            const done = a.status === "REALIZADA";
            return (
              <li key={a.kind} className="rounded-xl border border-base-300 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-base-content">{a.label}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-base-content/70">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      {formatWhen(a.scheduled_at)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-base-content/60">
                      {a.modality === "VIRTUAL" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {a.modality_label}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      done ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {done ? "Realizada" : "Programada"}
                  </span>
                </div>

                {a.meeting_link && !done &&
                  (a.meeting_link.startsWith("http") ? (
                    <a
                      href={a.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir enlace de la cita
                    </a>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-base-content/70">
                      <MapPin className="h-4 w-4" />
                      {a.meeting_link}
                    </p>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

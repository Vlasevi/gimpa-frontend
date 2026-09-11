/**
 * Pestaña "Datos": la ficha del año en solo lectura, por secciones del esquema v1
 * (`PROFILE_SECTIONS` + `profileRows`, los mismos descriptores del formulario del
 * estudiante). Lo derivado se explica con `derivedNotes`; lo vacío se ve como "—".
 */

import { AlertTriangle, Info } from "lucide-react";

import type { EnrollmentDetail } from "@/components/matriculas/enrollmentApi";
import { derivedNotes, PROFILE_SECTIONS, profileRows } from "@/components/matriculas/profileSchema";
import { profileIssues } from "./shared";

export function ProfileTab({ detail }: { detail: EnrollmentDetail }) {
  const issues = profileIssues(detail);

  return (
    <div className="space-y-4">
      {PROFILE_SECTIONS.map((section) => {
        const rows = profileRows(section, detail.data);
        const notes = derivedNotes(section.id, detail.data);
        const sectionIssues = issues.filter((issue) => issue.sectionId === section.id).length;
        const headingId = `ficha-${section.id}`;

        return (
          <section key={section.id} aria-labelledby={headingId} className="rounded-lg border border-base-300 bg-base-100">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
              <h3 id={headingId} className="font-display text-base font-bold text-secondary">
                {section.title}
              </h3>
              {sectionIssues > 0 && (
                <span className="badge badge-sm badge-warning badge-soft gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {sectionIssues === 1 ? "1 dato por completar" : `${sectionIssues} datos por completar`}
                </span>
              )}
            </header>

            {notes.map((note) => (
              <p
                key={note}
                className="mx-4 mt-3 flex items-start gap-2 rounded-md bg-info/5 px-3 py-2 text-xs text-base-content/70"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
                {note}
              </p>
            ))}

            {rows.length ? (
              <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="min-w-0">
                    <dt className="text-xs font-medium text-base-content/50">{row.label}</dt>
                    <dd
                      className={`mt-0.5 whitespace-pre-line break-words text-sm ${
                        row.value ? "text-base-content" : "text-base-content/40"
                      }`}
                    >
                      {row.value || (
                        <>
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Sin dato</span>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-4 py-4 text-sm text-base-content/50">Sin datos en esta sección.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

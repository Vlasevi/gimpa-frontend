/**
 * Pestaña "Datos": la ficha del año en solo lectura, por secciones del esquema v1
 * (`PROFILE_SECTIONS` + `profileRows`, los mismos descriptores del formulario del
 * estudiante). Lo derivado se explica con `derivedNotes`; lo vacío se ve como "—".
 */

import { AlertTriangle, Info } from "lucide-react";

import type { EnrollmentDetail } from "@/components/matriculas/enrollmentApi";
import { derivedNotes, PROFILE_SECTIONS, profileRows } from "@/components/matriculas/profileSchema";
import {
  cardClass,
  cardHeaderClass,
  cardTitleClass,
  dataLabelClass,
  dataValueClass,
} from "@/components/ui/textStyles";
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
          <section key={section.id} aria-labelledby={headingId} className={cardClass}>
            <header className={cardHeaderClass}>
              <h3 id={headingId} className={cardTitleClass}>
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
                className="mx-5 mt-4 flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-base-content/80"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                {note}
              </p>
            ))}

            {rows.length ? (
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="min-w-0">
                    <dt className={dataLabelClass}>{row.label}</dt>
                    <dd className={`whitespace-pre-line ${dataValueClass} ${row.value ? "" : "text-base-content/50"}`}>
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
              <p className="p-5 text-sm text-base-content/60">Sin datos en esta sección.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

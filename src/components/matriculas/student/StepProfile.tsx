/**
 * Paso 3 — Ficha del estudiante (esquema v1 por secciones).
 *
 * - Los campos salen de `profileSchema.ts` y se pintan con `<SchemaSection>` dentro de
 *   acordeones `SubSection` (con `inert` al plegar, hallazgo #13).
 * - Autoguardado SOLO local (`useAutosaveDraft`, método único de la plataforma): el
 *   servidor se toca únicamente con "Guardar y continuar".
 * - Al guardar se envían la ficha y las fotos juntas (`PUT …/data/`, plan 15.2). El
 *   backend valida y devuelve errores por campo, que se muestran junto a cada control y
 *   abren la sección correspondiente.
 * - Lo derivado (residencia del padre/madre que vive con el estudiante, acudiente = padre
 *   o madre) no se copia dentro del formulario (hallazgo #15): lo resuelve el backend.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { Info, RotateCcw } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { SubSection } from "@/components/ui/SubSection";
import { outlineBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { SchemaSection } from "@/components/ui/fields/registry";
import { PhotoField } from "@/components/ui/fields/PhotoField";
import { FieldErrorsProvider } from "@/components/ui/fields/fieldErrors";
import type { PhotoFieldValue, SectionValues } from "@/components/ui/fields/types";
import {
  fingerprint,
  resolveDraft,
  useAutosaveDraft,
  valuesMatchServer,
} from "@/hooks/useAutosaveDraft";
import {
  ApiError,
  enrollmentApi,
  type StudentEnrollment,
  type StudentProfile,
} from "@/components/matriculas/enrollmentApi";
import {
  ID_TYPES,
  PROFILE_SECTIONS,
  getPath,
  getText,
  labelOf,
  relocateGuardianErrors,
  sectionOfPath,
  type SectionId,
} from "@/components/matriculas/profileSchema";
import type { FlashFn } from "./types";
import { titleClass } from "@/components/ui/textStyles";

type PhotoKey = "student_photo" | "father_photo" | "mother_photo";
const PHOTO_KEYS: PhotoKey[] = ["student_photo", "father_photo", "mother_photo"];
const PHOTO_OF_SECTION: Partial<Record<SectionId, { key: PhotoKey; label: string; required?: boolean }>> = {
  student: { key: "student_photo", label: "Foto del estudiante", required: true },
  father: { key: "father_photo", label: "Foto del padre" },
  mother: { key: "mother_photo", label: "Foto de la madre" },
};
const EMPTY_PHOTO: PhotoFieldValue = { file: null, removed: false };

interface DraftMeta {
  baseHash: string;
}

/** Vacíos a `null` en todo el árbol: el formulario usa "" y el servidor `null`. Así el
 * borrador y lo guardado se comparan bien y no aparecen "cambios" fantasma. */
function cleanProfile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanProfile);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanProfile(v)]));
  }
  if (value === "" || value === undefined) return null;
  return value;
}

/** Nombre y documento de quien firma como acudiente, para el texto legal. */
function guardianSnapshot(values: StudentProfile) {
  const type = getText(values, "guardian.type");
  const source = type === "FATHER" ? "father" : type === "MOTHER" ? "mother" : "guardian";
  const full = (prefix: string) =>
    ["first_name1", "first_name2", "last_name1", "last_name2"]
      .map((k) => getText(values, `${prefix}.${k}`))
      .filter(Boolean)
      .join(" ");
  return {
    guardianName: type === "COMPANY" ? getText(values, "guardian.legal_name") : full(source),
    guardianIdType: type === "COMPANY" ? "NIT" : labelOf(ID_TYPES, getPath(values, `${source}.id_type`)),
    guardianId: getText(values, `${source}.id_number`),
    studentName: full("student"),
    studentIdType: labelOf(ID_TYPES, getPath(values, "student.id_type")),
    studentId: getText(values, "student.id_number"),
  };
}

function DerivedNote({ control, sectionId }: { control: Control<SectionValues>; sectionId: SectionId }) {
  const [livesFather, livesMother, guardianType] = useWatch({
    control,
    name: ["household.lives_with.father", "household.lives_with.mother", "guardian.type"],
  }) as [boolean, boolean, string];
  let text: string | null = null;
  if (sectionId === "father" && livesFather) text = "Vive con el estudiante: usaremos la misma dirección de residencia.";
  if (sectionId === "mother" && livesMother) text = "Vive con el estudiante: usaremos la misma dirección de residencia.";
  if (sectionId === "guardian" && guardianType === "FATHER") text = "Usaremos los datos que llenaste en la sección Padre.";
  if (sectionId === "guardian" && guardianType === "MOTHER") text = "Usaremos los datos que llenaste en la sección Madre.";
  if (!text) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-info sm:col-span-2">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

export function StepProfile({
  enrollment,
  onBack,
  onSaved,
  flash,
}: {
  enrollment: StudentEnrollment;
  onBack: () => void;
  onSaved: (next: StudentEnrollment) => void;
  flash: FlashFn;
}) {
  const serverData = useMemo(() => cleanProfile(enrollment.data ?? {}) as StudentProfile, [enrollment.data]);
  const serverHash = useMemo(() => fingerprint(serverData), [serverData]);
  const form = useForm<SectionValues>({ defaultValues: serverData });
  const { control, register, setValue, getValues, reset, watch } = form;

  const { push: pushDraft, discard: discardDraft, peekDraft } = useAutosaveDraft<StudentProfile, DraftMeta>({
    key: `matricula:${enrollment.id}:data`,
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const [conflict, setConflict] = useState<StudentProfile | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Set<SectionId>>(() => new Set(["student"]));
  const [photos, setPhotos] = useState<Record<PhotoKey, PhotoFieldValue>>({
    student_photo: EMPTY_PHOTO,
    father_photo: EMPTY_PHOTO,
    mother_photo: EMPTY_PHOTO,
  });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [legalOpen, setLegalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => guardianSnapshot(serverData));
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // --- Borrador local al entrar ---
  useEffect(() => {
    const stored = peekDraft();
    const resolution = resolveDraft(stored, serverData, (m) => m?.baseHash === serverHash);
    if (resolution === "stale") discardDraft();
    if ((resolution === "restore" || resolution === "conflict") && stored) {
      reset(stored.value, { keepDefaultValues: true });
      setHasLocalChanges(true);
      if (resolution === "restore") setDraftRestored(true);
      else setConflict(stored.value);
    }
    // Solo al montar: el borrador se resuelve una vez contra lo que llegó del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Cada cambio del usuario va al borrador local (nunca al servidor) ---
  useEffect(() => {
    const subscription = watch((values, { name }) => {
      // `reset()` notifica sin `name`: no es un cambio del usuario (hallazgo #15).
      if (name === undefined) return;
      const clean = cleanProfile(values) as StudentProfile;
      pushDraft(clean, { baseHash: serverHash });
      setHasLocalChanges(!valuesMatchServer(clean, serverData));
    });
    return () => subscription.unsubscribe();
  }, [watch, pushDraft, serverHash, serverData]);

  // --- URLs de las fotos ya guardadas (firmadas, a demanda) ---
  useEffect(() => {
    let active = true;
    const saved = (enrollment.documents ?? []).filter((d) => d.kind === "photo" && d.has_file);
    Promise.all(
      saved.map((d) =>
        enrollmentApi
          .documentUrl(enrollment.id, d.key)
          .then(({ url }) => [d.key, url] as const)
          .catch(() => null),
      ),
    ).then((pairs) => {
      if (!active) return;
      setPhotoUrls(Object.fromEntries(pairs.filter(Boolean) as (readonly [string, string])[]));
    });
    return () => {
      active = false;
    };
  }, [enrollment.id, enrollment.documents]);

  const sectionErrors = useMemo(() => {
    const counts: Partial<Record<SectionId, number>> = {};
    for (const path of Object.keys(errors)) {
      const section = sectionOfPath(path);
      if (section) counts[section] = (counts[section] ?? 0) + 1;
    }
    return counts;
  }, [errors]);

  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applySaved = () => {
    reset(serverData);
    discardDraft();
    setConflict(null);
    setDraftRestored(false);
    setHasLocalChanges(false);
  };

  const openLegal = () => {
    setSnapshot(guardianSnapshot(cleanProfile(getValues()) as StudentProfile));
    setLegalOpen(true);
  };

  const focusFirstError = (paths: string[]) => {
    // Espera a que las secciones con error terminen de abrirse (sin `inert`).
    window.setTimeout(() => {
      for (const path of paths) {
        const el =
          document.querySelector<HTMLElement>(`[name="${CSS.escape(path)}"]`) ??
          document.querySelector<HTMLElement>(`[data-field="${CSS.escape(path)}"]`);
        if (el) {
          el.focus();
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }
      summaryRef.current?.focus();
    }, 350);
  };

  const save = async () => {
    setLegalOpen(false);
    setSaving(true);
    setErrors({});
    const values = cleanProfile(getValues()) as StudentProfile;
    const files: Partial<Record<PhotoKey, File>> = {};
    const removed: string[] = [];
    for (const key of PHOTO_KEYS) {
      if (photos[key].file) files[key] = photos[key].file!;
      else if (photos[key].removed) removed.push(key);
    }
    try {
      const res = await enrollmentApi.saveData(enrollment.id, values, files, removed);
      discardDraft();
      setHasLocalChanges(false);
      if (res.enrollment) onSaved(res.enrollment);
      flash("success", "Datos guardados");
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.errors).length > 0) {
        const relocated = relocateGuardianErrors(e.errors, getText(values, "guardian.type"));
        setErrors(relocated);
        const sections = new Set(Object.keys(relocated).map(sectionOfPath).filter(Boolean) as SectionId[]);
        setOpenSections((prev) => new Set([...prev, ...sections]));
        focusFirstError(Object.keys(relocated));
      } else {
        flash("error", e instanceof ApiError ? e.message : "No se pudieron guardar los datos.");
      }
    } finally {
      setSaving(false);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <section aria-labelledby="step-title" className="space-y-5">
      <div>
        <h2 id="step-title" className={titleClass}>
          Datos del estudiante y la familia
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Los campos con <span className="text-error" aria-hidden="true">*</span>
          <span className="sr-only">asterisco</span> son obligatorios. Lo que escribes se guarda
          en este dispositivo mientras tanto; se envía a la institución al pulsar «Guardar y
          continuar».
        </p>
      </div>

      {draftRestored && (
        <div role="status" className="alert alert-info alert-soft flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>Recuperamos los cambios que no alcanzaste a guardar en este dispositivo.</span>
          <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={applySaved}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Descartar cambios
          </button>
        </div>
      )}

      {errorCount > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="alert alert-error alert-soft text-sm focus:outline-none">
          {errorCount === 1
            ? "Hay 1 dato por corregir. Está marcado en rojo."
            : `Hay ${errorCount} datos por corregir. Están marcados en rojo.`}
        </div>
      )}

      <FieldErrorsProvider errors={errors}>
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            openLegal();
          }}
        >
          {PROFILE_SECTIONS.map((section) => {
            const photo = PHOTO_OF_SECTION[section.id];
            const count = sectionErrors[section.id] ?? 0;
            return (
              <SubSection
                key={section.id}
                id={`seccion-${section.id}`}
                title={section.title}
                subtitle={count > 0 ? `${count} ${count === 1 ? "dato" : "datos"} por corregir` : section.hint}
                open={openSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                status={count > 0 ? "error" : undefined}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {photo && (
                    <div className="sm:col-span-2" data-field={`photos.${photo.key}`}>
                      <PhotoField
                        dataKey={photo.key}
                        label={photo.label}
                        required={photo.required}
                        value={photos[photo.key]}
                        preloadedUrl={photoUrls[photo.key]}
                        onChange={(next) => {
                          setPhotos((prev) => ({ ...prev, [photo.key]: next }));
                          setHasLocalChanges(true);
                        }}
                      />
                      {(() => {
                        const doc = enrollment.documents?.find((d) => d.key === photo.key);
                        if (doc?.status !== "REJECTED" || photos[photo.key].file) return null;
                        return (
                          <p className="mt-1 text-sm text-error" role="alert">
                            La institución rechazó esta foto{doc.reject_reason ? `: ${doc.reject_reason}` : ""}. Sube
                            una nueva.
                          </p>
                        );
                      })()}
                      {errors[`photos.${photo.key}`] && (
                        <p className="mt-1 text-xs font-medium text-error">{errors[`photos.${photo.key}`]}</p>
                      )}
                    </div>
                  )}
                  <DerivedNote control={control} sectionId={section.id} />
                  <SchemaSection
                    schema={section.fields}
                    control={control}
                    register={register}
                    setValue={setValue}
                  />
                </div>
              </SubSection>
            );
          })}

          <div className="flex flex-col-reverse gap-3 border-t border-base-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className={outlineBtnClass} onClick={onBack} disabled={saving}>
              Atrás
            </button>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {hasLocalChanges && !saving && (
                <span className="text-center text-xs text-base-content/60" role="status">
                  Cambios sin guardar · solo en este dispositivo
                </span>
              )}
              <button type="submit" className={primaryBtnClass} disabled={saving}>
                <BusyLabel busy={saving} busyText="Guardando…">
                  Guardar y continuar
                </BusyLabel>
              </button>
            </div>
          </div>
        </form>
      </FieldErrorsProvider>

      <Alert
        isOpen={legalOpen}
        onClose={() => setLegalOpen(false)}
        onAccept={save}
        title="Autorización y consentimiento"
        variant="warning"
        acceptText="Acepto"
        cancelText="Cancelar"
        requireScrollToBottom
      >
        <p className="text-justify">
          Al pulsar <strong>«Acepto»</strong>, yo <strong>{snapshot.guardianName || "[nombre del acudiente]"}</strong>,
          identificado(a) con <strong>{snapshot.guardianIdType || "[tipo de documento]"}</strong> No.{" "}
          <strong>{snapshot.guardianId || "[número]"}</strong>, quien realiza el proceso de matrícula del(la)
          estudiante <strong>{snapshot.studentName || "[nombre del estudiante]"}</strong> (
          <strong>{snapshot.studentIdType || "[tipo]"}</strong> No. <strong>{snapshot.studentId || "[número]"}</strong>),
          declaro que actúo como padre/madre/acudiente y/o responsable y que cuento con autorización suficiente
          para adelantar este trámite y cargar en la plataforma los documentos requeridos, incluidos los de otros
          responsables vinculados al proceso (padre, madre, acudiente, responsable financiero u otros), asumiendo
          la responsabilidad por la veracidad de la información y por contar con las autorizaciones que
          correspondan cuando aplique.
        </p>
        <p className="text-justify">
          Asimismo, <strong>autorizo y otorgo consentimiento previo, expreso e informado</strong> a Gimnasio El
          Paraíso para utilizar firma electrónica por aceptación (clic en «Acepto») y validación biométrica
          (huella), exclusivamente para la identificación, aceptación y oficialización de los documentos
          del proceso de matrícula (formulario/acta de matrícula, contrato de prestación del servicio educativo,
          anexos, autorizaciones institucionales y soportes administrativos asociados).
        </p>
        <p className="text-justify">
          Entiendo que este consentimiento se otorga conforme a la normativa colombiana aplicable, incluyendo la
          Ley 527 de 1999, el Decreto 2364 de 2012 y la Ley 1581 de 2012. He sido informado(a) de mis derechos como
          titular de datos personales (conocer, actualizar, rectificar, solicitar prueba de la autorización y
          revocar el consentimiento cuando proceda).
        </p>
        <p className="text-justify">
          Autorizo que la institución conserve y custodie evidencias de trazabilidad del proceso de aceptación (por
          ejemplo: fecha y hora, usuario/correo, registros de plataforma y demás soportes técnicos) para respaldo
          administrativo y legal. Cuando el(la) estudiante sea menor de edad, el tratamiento de datos se realizará
          respetando el interés superior y los derechos prevalentes de los niños, niñas y adolescentes.
        </p>
      </Alert>

      <Alert
        isOpen={conflict !== null}
        onClose={() => setConflict(null)}
        onAccept={() => setConflict(null)}
        title="Tus datos también se guardaron desde otro lugar"
        variant="warning"
        acceptText="Conservar lo mío"
        cancelText="Decidir después"
      >
        <p>
          En este dispositivo tienes cambios sin guardar, pero los datos de la matrícula se guardaron después desde
          otro lugar (quizá tú, en otro dispositivo o pestaña). Elige con qué versión quedarte:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Conservar lo mío:</strong> sigues con lo que ves; se enviará al pulsar «Guardar y continuar».
          </li>
          <li>
            <strong>Usar lo guardado:</strong> descarta los cambios de este dispositivo.
          </li>
        </ul>
        <button type="button" onClick={applySaved} className="btn btn-outline btn-sm">
          Usar lo guardado
        </button>
      </Alert>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Check,
  CloudOff,
  Info,
  Send,
  X,
} from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import {
  isEditable,
  type AdmissionApplication,
} from "@/components/admisiones/admissionTypes";
import type { SectionValues } from "@/components/admisiones/formFields";
import {
  ResidenceStep,
  AcademicHistoryStep,
  GuardiansStep,
  HealthStep,
  type StepProps,
} from "@/components/admisiones/steps";
import { SubSection, type SubSectionStatus } from "@/components/ui/SubSection";
import { Alert } from "@/components/ui/Alert";
import { primaryBtnClass } from "@/components/ui/formStyles";
import { ADMISSIONS_PATH, useGuardianNav } from "@/components/admisiones/acudiente/guardianNav";
import {
  resolveDraft,
  useAutosaveDraft,
  valuesMatchServer,
  type UseAutosaveDraftResult,
} from "@/hooks/useAutosaveDraft";

/** Cuerpo del 409 nuevo del Paso 4 del backend (concurrencia optimista por sección). Se
 * distingue del 409 "de siempre" (máquina de estados) por la presencia de `code`. */
interface SectionVersionConflict {
  detail: string;
  code: "section_version_conflict";
  conflicts: string[];
  data_versions: Record<string, number>;
  current: Record<string, SectionValues>;
}

/** Conflicto pendiente en el modal. `fromLocalDraft`: no vino de un 409, sino de un
 * borrador local encontrado al cargar que el servidor ya superó (solo cambia el texto). */
type PendingConflict = SectionVersionConflict & { fromLocalDraft?: boolean };

/** Lo que el wizard guarda junto a cada borrador local (`meta` del hook): la versión de
 * la sección (`data_versions[<sección>]`) sobre la que el usuario estaba escribiendo. */
interface DraftMeta {
  baseVersion: number;
}

/** Resultado uniforme de un PATCH de sección, para que `saveSection` (botón manual) y
 * el `save` del autoguardado compartan la misma lectura de la respuesta sin duplicar
 * el fetch ni el manejo de los dos tipos de 409. */
type PatchResult =
  | { kind: "ok"; application: AdmissionApplication }
  | { kind: "network" }
  | { kind: "state_conflict"; message: string }
  | { kind: "version_conflict"; payload: SectionVersionConflict }
  | { kind: "error"; message: string };

type Step = {
  key: string;
  title: string;
  subtitle: string;
  Component: (props: StepProps) => JSX.Element;
  form: UseFormReturn<SectionValues>;
  /** Borrador local de la sección (solo localStorage). */
  draft: UseAutosaveDraftResult<SectionValues, DraftMeta>;
};

/** Aviso junto al botón "Guardar sección": la sección tiene cambios que solo existen
 * en este navegador (borrador local) y todavía no llegaron al servidor. Se deriva de
 * `formState.isDirty`, el mismo dato que deja la tarjeta en "incompleta". */
function UnsavedIndicator({ dirty }: { dirty: boolean }) {
  if (!dirty) return <span />;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-base-content/60">
      <CloudOff className="h-4 w-4 text-warning" />
      Cambios sin guardar · solo en este dispositivo
    </span>
  );
}

export default function SolicitudWizard({ id }: { id: number }) {
  const { go, back } = useGuardianNav();

  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Acordeón: varias secciones pueden estar abiertas a la vez (misma sensación que el
  // llenado de Matrículas), a diferencia del acordeón interno de `GuardiansStep`, que
  // sigue siendo exclusivo (una sola abierta). Set de `key`s abiertas.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  // Qué sección está guardándose ahora mismo (una a la vez: cada "Guardar sección" es
  // un PATCH independiente, nunca un guardado global).
  const [savingKey, setSavingKey] = useState<string | null>(null);
  // Último error de guardado por sección — alimenta tanto el mensaje inline como el
  // status "error" del acordeón.
  const [sectionErrors, setSectionErrors] = useState<Record<string, string | null>>({});

  // --- Guardado -----------------------------------------------------------------
  // Dos niveles, a propósito separados:
  // - Borrador LOCAL (useAutosaveDraft): cada cambio del usuario se copia a
  //   localStorage (~0.5s). Nunca toca el servidor. Sirve para no perder lo escrito si
  //   recarga, cierra la pestaña o se queda sin red.
  // - Servidor: SOLO con "Guardar sección" (o "Enviar solicitud", que guarda antes lo
  //   pendiente). Ver la cabecera de hooks/useAutosaveDraft.ts para el porqué.
  //
  // `data_versions[<sección>]` que trajo el último GET/PATCH exitoso. Vive en un ref
  // (no en estado) porque se lee dentro de callbacks que no deben recrearse en cada
  // render; una sección ausente cuenta como versión 0.
  const sectionVersionsRef = useRef<Record<string, number>>({});
  // Conflictos de versión pendientes de resolver, por sección. Se muestran de a uno
  // (ver `activeConflict` más abajo); el borrador local de esa sección NO se toca
  // hasta que el usuario elige una salida.
  const [versionConflicts, setVersionConflicts] = useState<
    Record<string, PendingConflict | undefined>
  >({});
  // Secciones cuyo borrador local se restauró al cargar (alimenta el aviso "Tienes
  // cambios sin guardar"). Vacío = sin aviso.
  const [restoredSections, setRestoredSections] = useState<string[]>([]);
  // Desacoplado de `versionConflicts` a propósito: permite cerrar el modal ("Ahora
  // no") sin resolver el conflicto ni tocar nada. Un guardado posterior que vuelva a
  // chocar lo reabre.
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Un `useForm()` por sección (no uno global): el PATCH sigue siendo por sección, y
  // así el usuario puede editar una sección sin perder lo que escribió en otra — los 5
  // formularios viven aquí, en el padre, y no se recrean al abrir/cerrar una tarjeta.
  const residenceForm = useForm<SectionValues>({ defaultValues: {} });
  const academicForm = useForm<SectionValues>({ defaultValues: {} });
  const guardiansForm = useForm<SectionValues>({ defaultValues: {} });
  const healthForm = useForm<SectionValues>({ defaultValues: {} });

  /**
   * PATCH de una sección puntual (lo usa solo `saveSection`). Siempre manda `versions`
   * (el número que trajo el último GET/PATCH para esa sección): así ningún PATCH del
   * wizard sale sin `versions` (ver Paso 9).
   */
  const patchSection = async (key: string, values: SectionValues): Promise<PatchResult> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplication(id), {
        method: "PATCH",
        body: JSON.stringify({
          sections: { [key]: values },
          versions: { [key]: sectionVersionsRef.current[key] ?? 0 },
        }),
      });
      if (res.ok) {
        const updated: AdmissionApplication = await res.json();
        sectionVersionsRef.current = {
          ...sectionVersionsRef.current,
          ...(updated.data_versions ?? {}),
        };
        return { kind: "ok", application: updated };
      }
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.code === "section_version_conflict") {
        return { kind: "version_conflict", payload: data as SectionVersionConflict };
      }
      if (res.status === 409) {
        // Sin `code`: el 409 "de siempre" de la máquina de estados (el expediente
        // cambió de estado desde otro lugar). Mismo criterio de distinción que usa
        // el resto del módulo: la presencia de `code`.
        return {
          kind: "state_conflict",
          message:
            typeof data?.detail === "string"
              ? data.detail
              : "El expediente cambió de estado desde otro lugar.",
        };
      }
      return {
        kind: "error",
        message: typeof data?.detail === "string" ? data.detail : "No pudimos guardar esta sección.",
      };
    } catch {
      return { kind: "network" };
    }
  };

  const openVersionConflict = (key: string, payload: PendingConflict) => {
    setVersionConflicts((prev) => ({ ...prev, [key]: payload }));
    setConflictModalOpen(true);
  };

  // Un borrador local por expediente y sección (nunca por usuario: un acudiente tiene
  // varios hijos y varios expedientes abiertos a la vez).
  const draftsEnabled = !!application && isEditable(application.status);
  const residenceDraft = useAutosaveDraft<SectionValues, DraftMeta>({
    key: `admision:${id}:residence`,
    enabled: draftsEnabled,
  });
  const academicDraft = useAutosaveDraft<SectionValues, DraftMeta>({
    key: `admision:${id}:academic_history`,
    enabled: draftsEnabled,
  });
  const guardiansDraft = useAutosaveDraft<SectionValues, DraftMeta>({
    key: `admision:${id}:guardians`,
    enabled: draftsEnabled,
  });
  const healthDraft = useAutosaveDraft<SectionValues, DraftMeta>({
    key: `admision:${id}:health`,
    enabled: draftsEnabled,
  });

  /** Las 4 secciones, en orden. `key` = sección de `data` en el backend. Las
   * declaraciones ya no van aquí: se aceptan al crear la admisión (`ConsentCard`). */
  const STEPS: Step[] = [
    {
      key: "residence",
      title: "Residencia",
      subtitle: "¿Dónde vive el aspirante?",
      Component: ResidenceStep,
      form: residenceForm,
      draft: residenceDraft,
    },
    {
      key: "academic_history",
      title: "Historial académico",
      subtitle: "Su trayectoria escolar hasta hoy.",
      Component: AcademicHistoryStep,
      form: academicForm,
      draft: academicDraft,
    },
    {
      key: "guardians",
      title: "Acudientes",
      subtitle: "Quién responde por el aspirante.",
      Component: GuardiansStep,
      form: guardiansForm,
      draft: guardiansDraft,
    },
    {
      key: "health",
      title: "Salud",
      subtitle: "Para cuidarlo mejor durante el año escolar.",
      Component: HealthStep,
      form: healthForm,
      draft: healthDraft,
    },
  ];

  useEffect(() => {
    let active = true;
    apiFetch(API_ENDPOINTS.admissionsApplication(id))
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setGlobalError("No encontramos esta solicitud.");
          return;
        }
        const data: AdmissionApplication = await res.json();
        setApplication(data);
        sectionVersionsRef.current = { ...(data.data_versions ?? {}) };
        const editable = isEditable(data.status);

        // Hidrata cada sección: primero con lo del servidor (`reset(...)`, no
        // `defaultValues` síncronos: el dato llega async), y después, si hay un
        // borrador local que el servidor no tiene, decide con `resolveDraft`
        // (compara la versión sobre la que se escribió el borrador con
        // `data_versions`, no fechas — ver el JSDoc de `peekDraft` en el hook).
        const restored: string[] = [];
        const toOpen: string[] = [];
        STEPS.forEach((s) => {
          const server = (data.data?.[s.key] as SectionValues) ?? {};
          s.form.reset(server);
          if (!editable) return; // el efecto de más abajo descarta los borradores

          const draft = s.draft.peekDraft();
          // Misma base = nadie guardó la sección desde que se escribió el borrador.
          const serverVersion = data.data_versions?.[s.key] ?? 0;
          switch (resolveDraft(draft, server, (m) => m?.baseVersion === serverVersion)) {
            case "stale":
              s.draft.discard();
              break;
            case "restore":
              // `keepDefaultValues`: los defaults siguen siendo lo del servidor, así
              // que RHF marca la sección como con cambios sin guardar (isDirty) — la
              // tarjeta queda "incompleta" hasta que se guarde, igual que si el usuario
              // lo hubiera escrito ahora. El borrador sigue en localStorage hasta que
              // se guarde la sección.
              s.form.reset(draft!.value, { keepDefaultValues: true });
              restored.push(s.key);
              toOpen.push(s.key);
              break;
            case "conflict":
              // Se muestra lo del borrador (es "lo mío" del modal) con los defaults del
              // servidor; el modal ofrece conservarlo o cargar lo del servidor.
              s.form.reset(draft!.value, { keepDefaultValues: true });
              openVersionConflict(s.key, {
                detail: "La sección fue modificada desde otro lugar.",
                code: "section_version_conflict",
                conflicts: [s.key],
                data_versions: data.data_versions ?? {},
                current: { [s.key]: server },
                fromLocalDraft: true,
              });
              toOpen.push(s.key);
              break;
          }
        });
        setRestoredSections(restored);

        // Reanudación automática: deja abierta la primera sección sin diligenciar (o
        // la primera de todas si ya están completas), más las que traen un borrador
        // recuperado o en conflicto.
        const firstPending = STEPS.findIndex(
          (s) => !data.data?.[s.key] || Object.keys(data.data[s.key]).length === 0,
        );
        const initialKey = STEPS[firstPending === -1 ? 0 : firstPending].key;
        setOpenSections(new Set([initialKey, ...toOpen, ...(data.open_correction?.sections ?? [])]));
      })
      .catch(() => {
        if (active) setGlobalError("No pudimos conectar con el servidor.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // Solo al montar / cuando cambia `id`. Los 5 `useForm()` mantienen identidad
    // estable entre renders (react-hook-form), listarlos no cambiaría nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Puente RHF → borrador local. `form.watch(callback)` (imperativo, fuera del render)
  // en vez de `useWatch`: así ninguna tecla re-renderiza el wizard, que es justo el
  // motivo por el que Admisiones migró a RHF en el Paso 2.
  //
  // Qué cambios cuentan (verificado en el código de react-hook-form@7.81.0):
  // - `reset(values)` emite `name: undefined` ⇒ se ignora (la hidratación inicial no
  //   debe escribir un borrador).
  // - Un cambio de campo emite `name` definido, venga del tecleo o de un `setValue()`.
  //   No se puede filtrar por `type`: los ComboBox de la cascada geográfica aplican la
  //   elección del usuario con `setValue()`, igual que un cambio hecho por código.
  // - El chequeo de `formState.isDirty` es lo que excluye el pre-llenado del acudiente
  //   con los datos de la cuenta (`GuardiansStep`, steps.tsx): se hace sin
  //   `shouldDirty`, así que no deja la sección "con cambios" ni crea un borrador
  //   solo por abrir el formulario. La auto-copia padre/madre → acudiente sí marca
  //   cambios (la dispara una acción del usuario) y entra al borrador.
  useEffect(() => {
    const subscriptions = STEPS.map((s) => {
      const { unsubscribe } = s.form.watch((values, { name }) => {
        if (name === undefined) return;
        if (!s.form.formState.isDirty) return;
        // `baseVersion`: sobre qué versión de la sección se está escribiendo — es lo
        // que permite decidir, al recargar, si el borrador local sigue siendo lo más
        // nuevo (ver `resolveDraft`).
        s.draft.push(values as SectionValues, {
          baseVersion: sectionVersionsRef.current[s.key] ?? 0,
        });
      });
      return unsubscribe;
    });
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    // Los 5 `useForm()`/`useAutosaveDraft()` mantienen identidad estable entre
    // renders; re-suscribir en cada uno no cambiaría nada y complicaría la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Descarta los 5 borradores locales si el expediente deja de ser editable (p. ej.
  // una acción del staff lo transicionó mientras el acudiente tenía la pestaña
  // abierta). Los borradores ya dejan de escribirse vía `enabled`; esto además limpia
  // lo que ya hubiera en localStorage.
  useEffect(() => {
    if (application && !isEditable(application.status)) {
      STEPS.forEach((s) => s.draft.discard());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.status]);

  const toggleSection = (key: string) => {
    // Escribe ya el borrador pendiente de esa sección (sin esperar el debounce) al
    // plegarla/desplegarla.
    STEPS.find((s) => s.key === key)?.draft.flush();
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Guarda una sección puntual (botón manual). Devuelve true si salió bien. */
  const saveSection = async (s: Step): Promise<boolean> => {
    setSavingKey(s.key);
    setSectionErrors((prev) => ({ ...prev, [s.key]: null }));
    const values = s.form.getValues();
    const result = await patchSection(s.key, values);
    setSavingKey(null);
    switch (result.kind) {
      case "ok":
        setApplication(result.application);
        // Re-hidrata con lo confirmado por el servidor (limpia el estado "dirty").
        s.form.reset((result.application.data?.[s.key] as SectionValues) ?? values);
        // Ya está en el servidor: el borrador local sobra.
        s.draft.discard();
        // Guardar con éxito equivale a "conservar lo mío": cierra cualquier conflicto
        // pendiente de la sección (p. ej. uno detectado al cargar un borrador local,
        // que no pasa por un 409).
        setVersionConflicts((prev) => ({ ...prev, [s.key]: undefined }));
        return true;
      case "version_conflict":
        openVersionConflict(s.key, result.payload);
        setSectionErrors((prev) => ({
          ...prev,
          [s.key]: "Esta sección se guardó desde otro lugar. Resuelve el conflicto para continuar.",
        }));
        return false;
      case "state_conflict":
        setGlobalError(`${result.message} Recarga la página para continuar.`);
        setSectionErrors((prev) => ({ ...prev, [s.key]: result.message }));
        return false;
      case "network":
        setSectionErrors((prev) => ({
          ...prev,
          [s.key]: "No pudimos conectar con el servidor.",
        }));
        return false;
      case "error":
      default:
        setSectionErrors((prev) => ({ ...prev, [s.key]: result.message }));
        return false;
    }
  };

  // --- Resolución del conflicto de versión (409 `section_version_conflict`) ------
  // El modal muestra dos salidas explícitas (ninguna es el cierre por backdrop/Esc,
  // que solo oculta el modal sin decidir nada — ver `conflictModalOpen` arriba):
  const conflictKey = STEPS.find((s) => versionConflicts[s.key])?.key ?? null;
  const activeConflictStep = conflictKey ? STEPS.find((s) => s.key === conflictKey) : undefined;
  const activeConflictPayload = conflictKey ? versionConflicts[conflictKey] : undefined;

  /** "Conservar lo mío": re-envía el mismo PATCH con la versión nueva que vino en el
   * 409 (fuerza el guardado, sobrescribiendo lo que había en el servidor). Reusa
   * `saveSection` tal cual — ya lee `sectionVersionsRef` (que acabamos de refrescar)
   * y los valores actuales del formulario (el borrador del usuario, intacto). */
  const resolveConflictKeepMine = async () => {
    if (!activeConflictStep || !activeConflictPayload) return;
    sectionVersionsRef.current = {
      ...sectionVersionsRef.current,
      ...activeConflictPayload.data_versions,
    };
    setVersionConflicts((prev) => ({ ...prev, [activeConflictStep.key]: undefined }));
    await saveSection(activeConflictStep);
  };

  /** "Descartar y cargar lo del servidor": usa `current[<sección>]` que ya vino en el
   * 409 (sin pedir el expediente de nuevo) y descarta el borrador local. */
  const resolveConflictUseServer = () => {
    if (!activeConflictStep || !activeConflictPayload) return;
    const key = activeConflictStep.key;
    const serverValues = (activeConflictPayload.current?.[key] as SectionValues) ?? {};
    sectionVersionsRef.current = {
      ...sectionVersionsRef.current,
      ...activeConflictPayload.data_versions,
    };
    activeConflictStep.form.reset(serverValues);
    activeConflictStep.draft.discard();
    setApplication((prev) =>
      prev
        ? {
            ...prev,
            data: { ...prev.data, [key]: serverValues },
            data_versions: { ...prev.data_versions, ...activeConflictPayload.data_versions },
          }
        : prev,
    );
    setSectionErrors((prev) => ({ ...prev, [key]: null }));
    setVersionConflicts((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    setGlobalError(null);
    // Guarda primero cualquier sección con algo que el servidor no tiene (cada una con
    // su propio PATCH, no un guardado global) antes de enviar la solicitud completa.
    // No basta `isDirty`: el pre-llenado del acudiente no marca la sección como
    // modificada (ver el puente RHF → borrador), pero sí debe llegar al servidor.
    for (const s of STEPS) {
      const server = (application?.data?.[s.key] as SectionValues) ?? {};
      if (s.form.formState.isDirty || !valuesMatchServer(s.form.getValues(), server)) {
        const ok = await saveSection(s);
        if (!ok) {
          setGlobalError(
            `No pudimos guardar "${s.title}". Revisa esa sección antes de enviar.`,
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationSubmit(id), {
        method: "POST",
      });
      if (res.ok) {
        // Envío completo confirmado: ya no hace falta ningún borrador local.
        STEPS.forEach((s) => s.draft.discard());
        // Vuelve al detalle (la entrada anterior del historial), que recarga el estado.
        back({ view: "detail", id });
      } else {
        const data = await res.json().catch(() => ({}));
        setGlobalError(
          typeof data?.detail === "string"
            ? data.detail
            : "No pudimos enviar la solicitud.",
        );
      }
    } catch {
      setGlobalError("No pudimos conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Estado de cada tarjeta del acordeón, derivado de `formState` y del guardado — sin
   * un cálculo paralelo hecho a mano:
   * - "error": el último intento de guardar esta sección falló (`sectionErrors`), o el
   *   propio `formState.errors` de su `useForm()` trae errores (hoy siempre vacío, no
   *   hay validación todavía, pero así el indicador queda listo para cuando la haya).
   * - "complete": el servidor ya tiene datos guardados para esta sección
   *   (`application.data[key]` no vacío) y el formulario no tiene cambios sin guardar
   *   (`formState.isDirty === false`).
   * - "incomplete": todo lo demás — nunca se guardó, o hay ediciones locales
   *   pendientes de guardar (que viven solo en el borrador local).
   */
  const sectionStatus = (s: Step): SubSectionStatus | undefined => {
    if (sectionErrors[s.key] || Object.keys(s.form.formState.errors).length > 0) {
      return "error";
    }
    const saved =
      !!application?.data?.[s.key] && Object.keys(application.data[s.key]).length > 0;
    if (saved && !s.form.formState.isDirty) return "complete";
    return "incomplete";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-lg border border-base-300 bg-base-100 p-12 text-base-content/60 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando solicitud…
      </div>
    );
  }

  if (globalError && !application) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-6 shadow-sm"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div>
          <p className="font-medium text-base-content">{globalError}</p>
          <button
            type="button"
            onClick={() => go({ view: "list" })}
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            Volver a mis solicitudes
          </button>
        </div>
      </div>
    );
  }

  // Una solicitud ya enviada no se edita: la vista de detalle explica el estado.
  if (application && !isEditable(application.status)) {
    return <Navigate to={ADMISSIONS_PATH} state={{ view: "detail", id }} replace />;
  }

  const completeCount = STEPS.filter((s) => sectionStatus(s) === "complete").length;
  // Secciones que el colegio pidió corregir (el comentario llega por correo, no aquí).
  const flaggedSections = new Set(application?.open_correction?.sections ?? []);
  const progress = (completeCount / STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <button
        type="button"
        onClick={() => back({ view: "detail", id })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Salir del formulario
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold text-secondary">
          Solicitud de admisión
        </h1>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-base-content/60">{application?.applicant.full_name}</p>
          <span className="text-sm font-medium text-base-content/60">
            {completeCount} de {STEPS.length} secciones completas
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base-300"
          role="progressbar"
          aria-valuenow={completeCount}
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-label="Avance del formulario"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{globalError}</span>
        </div>
      )}

      {restoredSections.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-info/25 bg-info/5 p-4 text-sm text-base-content/80"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <span className="flex-1">
            Tienes cambios sin guardar en{" "}
            <strong>
              {STEPS.filter((s) => restoredSections.includes(s.key))
                .map((s) => s.title)
                .join(", ")}
            </strong>{" "}
            que quedaron en este dispositivo. Revísalos y pulsa «Guardar sección» para
            enviarlos.
          </span>
          <button
            type="button"
            onClick={() => setRestoredSections([])}
            className="rounded-full p-1 text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
            title="Cerrar aviso"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Las secciones, siempre presentes como tarjetas plegables — nada se oculta
          por completo como en el wizard anterior. */}
      <div className="space-y-4">
        {STEPS.map((s) => {
          const StepComponent = s.Component;
          const sectionError = sectionErrors[s.key];
          const isSaving = savingKey === s.key;
          const hasVersionConflict = !!versionConflicts[s.key];
          return (
            <SubSection
              key={s.key}
              title={s.title}
              subtitle={
                flaggedSections.has(s.key)
                  ? "Por corregir: el colegio te pidió revisar esta sección (detalle en tu correo)."
                  : s.subtitle
              }
              open={openSections.has(s.key)}
              onToggle={() => toggleSection(s.key)}
              status={sectionStatus(s)}
            >
              <StepComponent
                control={s.form.control}
                register={s.form.register}
                setValue={s.form.setValue}
                getValues={s.form.getValues}
                residence={residenceForm.getValues}
              />

              {sectionError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm text-base-content/80"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                  <span>{sectionError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-base-300 pt-5">
                {hasVersionConflict ? (
                  // Reabre el modal si el usuario lo cerró con "Ahora no".
                  <button
                    type="button"
                    onClick={() => setConflictModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-warning hover:underline"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Conflicto de versión — elige qué versión conservar
                  </button>
                ) : (
                  <UnsavedIndicator dirty={s.form.formState.isDirty} />
                )}
                <button
                  type="button"
                  onClick={() => saveSection(s)}
                  disabled={isSaving}
                  className={primaryBtnClass}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Guardar sección
                    </>
                  )}
                </button>
              </div>
            </SubSection>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || savingKey !== null}
          className={primaryBtnClass}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {application?.status === "DEVUELTA_PARA_CORRECCION" ? "Enviar correcciones" : "Enviar solicitud"}
            </>
          )}
        </button>
      </div>

      {/* Conflicto de versión: otra pestaña/dispositivo guardó esta sección primero.
          Dos salidas explícitas, ninguna ligada al cierre por backdrop/Escape (ese
          solo oculta el modal, ver `conflictModalOpen`). El borrador local NO se
          toca hasta que el usuario elige una. */}
      <Alert
        isOpen={conflictModalOpen && !!activeConflictStep && !!activeConflictPayload}
        onClose={() => setConflictModalOpen(false)}
        onAccept={() => void resolveConflictKeepMine()}
        title="Otra sesión guardó cambios en esta sección"
        description={activeConflictStep?.title}
        variant="warning"
        acceptText="Conservar lo mío"
        cancelText="Ahora no"
      >
        {activeConflictPayload?.fromLocalDraft ? (
          <p>
            Tienes cambios sin guardar de “{activeConflictStep?.title}” en este
            dispositivo, pero esa sección se guardó después desde otro lugar (quizás
            tú, desde otro dispositivo o pestaña). Elige con cuál versión quedarte:
          </p>
        ) : (
          <p>
            Alguien más (quizás tú, desde otro dispositivo o pestaña) guardó “
            {activeConflictStep?.title}” mientras editabas aquí. Elige qué hacer con lo
            que tienes escrito en esta pestaña:
          </p>
        )}
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Conservar lo mío:</strong> vuelve a guardar lo que ves aquí,
            reemplazando lo que se guardó en el otro lugar.
          </li>
          <li>
            <strong>Descartar y cargar lo del servidor:</strong> reemplaza lo que ves
            aquí por lo último guardado, descartando tus cambios sin confirmar.
          </li>
        </ul>
        <button
          type="button"
          onClick={resolveConflictUseServer}
          className="btn btn-outline btn-sm"
        >
          Descartar y cargar lo del servidor
        </button>
      </Alert>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Check,
  Send,
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
  DeclarationsStep,
  type StepProps,
} from "@/components/admisiones/steps";
import { SubSection, type SubSectionStatus } from "@/components/ui/SubSection";
import { Alert } from "@/components/ui/Alert";
import { primaryBtnClass } from "@/components/ui/formStyles";
import {
  useAutosaveDraft,
  type AutosaveStatus,
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
  autosave: UseAutosaveDraftResult<SectionValues>;
};

/** Indicador de autoguardado por sección — texto adicional junto al botón "Guardar
 * sección" (no sustituye al `status` de `SubSection`, que sigue derivado de
 * `formState`/`application.data` sin cambios, tal como quedó en el Paso 3). Decisión
 * documentada: mezclar ambos indicadores habría acoplado el guardado silencioso de
 * fondo con la marca de "sección completa", que el equipo quiere que dependa solo de
 * una acción explícita del usuario. */
function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-base-content/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Guardando…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-base-content/60">
        <Check className="h-4 w-4 text-success" />
        Guardado
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-warning">
        <AlertTriangle className="h-4 w-4" />
        No pudimos guardar, reintentando
      </span>
    );
  }
  return <span />;
}

export default function SolicitudWizard() {
  const { code = "" } = useParams();
  const navigate = useNavigate();

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

  // --- Paso 5: autoguardado ------------------------------------------------------
  // `data_versions[<sección>]` que trajo el último GET/PATCH exitoso. Vive en un ref
  // (no en estado) porque se lee dentro de callbacks de guardado que no deben
  // recrearse en cada render; una sección ausente cuenta como versión 0.
  const sectionVersionsRef = useRef<Record<string, number>>({});
  // Interruptor global: se apaga ante un 409 "de siempre" (el expediente cambió de
  // estado en otro lugar) — ese conflicto no es de una sección, es del expediente
  // completo, así que detiene el autoguardado de las 5 a la vez.
  const [autosaveGloballyEnabled, setAutosaveGloballyEnabled] = useState(true);
  // Interruptor por sección: se apaga SOLO para la sección en conflicto de versión
  // (otra pestaña/dispositivo la guardó primero), sin afectar a las demás.
  const [sectionAutosaveEnabled, setSectionAutosaveEnabled] = useState<Record<string, boolean>>(
    {},
  );
  // Conflictos de versión pendientes de resolver, por sección. Se muestran de a uno
  // (ver `activeConflict` más abajo); el borrador local de esa sección NO se toca
  // hasta que el usuario elige una salida.
  const [versionConflicts, setVersionConflicts] = useState<
    Record<string, SectionVersionConflict | undefined>
  >({});
  // Desacoplado de `versionConflicts` a propósito: permite cerrar el modal ("Ahora
  // no") sin resolver el conflicto ni tocar nada. Un guardado posterior (manual o
  // autoguardado) que vuelva a chocar lo reabre.
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Un `useForm()` por sección (no uno global): el PATCH sigue siendo por sección, y
  // así el usuario puede editar una sección sin perder lo que escribió en otra — los 5
  // formularios viven aquí, en el padre, y no se recrean al abrir/cerrar una tarjeta.
  const residenceForm = useForm<SectionValues>({ defaultValues: {} });
  const academicForm = useForm<SectionValues>({ defaultValues: {} });
  const guardiansForm = useForm<SectionValues>({ defaultValues: {} });
  const healthForm = useForm<SectionValues>({ defaultValues: {} });
  const declarationsForm = useForm<SectionValues>({ defaultValues: {} });

  /**
   * PATCH de una sección puntual, compartido por el botón manual y el autoguardado —
   * para que ninguno de los dos invente su propia lectura de los dos tipos de 409.
   * Siempre manda `versions` (el número que trajo el último GET/PATCH para esa
   * sección): así ningún PATCH del wizard sale sin `versions` (ver Paso 9).
   */
  const patchSection = async (key: string, values: SectionValues): Promise<PatchResult> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code), {
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

  const openVersionConflict = (key: string, payload: SectionVersionConflict) => {
    setSectionAutosaveEnabled((prev) => ({ ...prev, [key]: false }));
    setVersionConflicts((prev) => ({ ...prev, [key]: payload }));
    setConflictModalOpen(true);
  };

  /** `save` que recibe cada `useAutosaveDraft` — una función por sección, cerrada
   * sobre su `key`. No necesita ser estable entre renders: el hook la guarda en un
   * ref internamente (`saveRef.current = save`), así que recrearla en cada render no
   * reprograma ningún timer en curso. */
  const makeAutosave = (key: string) => async (values: SectionValues): Promise<void> => {
    const result = await patchSection(key, values);
    switch (result.kind) {
      case "ok":
        // No se llama `form.reset()` aquí: el usuario puede seguir escribiendo
        // después de que el debounce disparó el guardado, y resetear el formulario
        // en ese momento pisaría lo que siga tecleando. El botón "Guardar sección"
        // sigue siendo el único que limpia `isDirty`/marca la tarjeta "completa".
        setApplication(result.application);
        return;
      case "version_conflict":
        openVersionConflict(key, result.payload);
        // Rechaza para que el hook marque `status: "error"` (ver AutosaveIndicator,
        // que aquí se sustituye por el aviso de conflicto) y deje de reintentar por
        // su cuenta esta sección — ya la apagamos con sectionAutosaveEnabled.
        throw new Error("section_version_conflict");
      case "state_conflict":
        setGlobalError(`${result.message} Recarga la página para continuar.`);
        setAutosaveGloballyEnabled(false);
        throw new Error("state_conflict");
      case "network":
      case "error":
      default:
        // Fallo de red o error genérico: el hook ya deja `status: "error"` y
        // reintentará con el próximo `push()`/debounce del propio usuario — sin
        // retry-loop propio.
        throw new Error(result.kind === "error" ? result.message : "network_error");
    }
  };

  const residenceAutosave = useAutosaveDraft<SectionValues>({
    key: `gimpa_admision_draft_${code}_residence`,
    save: makeAutosave("residence"),
    enabled:
      !!application &&
      isEditable(application.status) &&
      autosaveGloballyEnabled &&
      sectionAutosaveEnabled.residence !== false,
  });
  const academicAutosave = useAutosaveDraft<SectionValues>({
    key: `gimpa_admision_draft_${code}_academic_history`,
    save: makeAutosave("academic_history"),
    enabled:
      !!application &&
      isEditable(application.status) &&
      autosaveGloballyEnabled &&
      sectionAutosaveEnabled.academic_history !== false,
  });
  const guardiansAutosave = useAutosaveDraft<SectionValues>({
    key: `gimpa_admision_draft_${code}_guardians`,
    save: makeAutosave("guardians"),
    enabled:
      !!application &&
      isEditable(application.status) &&
      autosaveGloballyEnabled &&
      sectionAutosaveEnabled.guardians !== false,
  });
  const healthAutosave = useAutosaveDraft<SectionValues>({
    key: `gimpa_admision_draft_${code}_health`,
    save: makeAutosave("health"),
    enabled:
      !!application &&
      isEditable(application.status) &&
      autosaveGloballyEnabled &&
      sectionAutosaveEnabled.health !== false,
  });
  const declarationsAutosave = useAutosaveDraft<SectionValues>({
    key: `gimpa_admision_draft_${code}_declarations`,
    save: makeAutosave("declarations"),
    enabled:
      !!application &&
      isEditable(application.status) &&
      autosaveGloballyEnabled &&
      sectionAutosaveEnabled.declarations !== false,
  });

  /** Las 5 secciones, en orden. `key` = sección de `data` en el backend. */
  const STEPS: Step[] = [
    {
      key: "residence",
      title: "Residencia",
      subtitle: "¿Dónde vive el aspirante?",
      Component: ResidenceStep,
      form: residenceForm,
      autosave: residenceAutosave,
    },
    {
      key: "academic_history",
      title: "Historial académico",
      subtitle: "Su trayectoria escolar hasta hoy.",
      Component: AcademicHistoryStep,
      form: academicForm,
      autosave: academicAutosave,
    },
    {
      key: "guardians",
      title: "Acudientes",
      subtitle: "Quién responde por el aspirante.",
      Component: GuardiansStep,
      form: guardiansForm,
      autosave: guardiansAutosave,
    },
    {
      key: "health",
      title: "Salud",
      subtitle: "Para cuidarlo mejor durante el año escolar.",
      Component: HealthStep,
      form: healthForm,
      autosave: healthAutosave,
    },
    {
      key: "declarations",
      title: "Declaraciones",
      subtitle: "Revisa y envía tu solicitud.",
      Component: DeclarationsStep,
      form: declarationsForm,
      autosave: declarationsAutosave,
    },
  ];

  useEffect(() => {
    let active = true;
    apiFetch(API_ENDPOINTS.admissionsApplicationByCode(code))
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setGlobalError("No encontramos esta solicitud.");
          return;
        }
        const data: AdmissionApplication = await res.json();
        setApplication(data);
        sectionVersionsRef.current = { ...(data.data_versions ?? {}) };
        // Hidrata cada sección con lo que trajo el servidor. `reset(...)`, no
        // `defaultValues` síncronos: el dato llega async.
        //
        // `hydrate(serverValue, serverUpdatedAt)` es el contrato del hook (Paso 1):
        // devuelve el borrador local solo si su timestamp es posterior al del
        // servidor. `AdmissionApplication` no expone un `updated_at` POR SECCIÓN hoy
        // (solo `data_versions`, un contador, no una fecha) — sin ese segundo
        // argumento, `hydrate` siempre resuelve al valor del servidor (ver su JSDoc
        // en useAutosaveDraft.ts). Es decir, tal como está hoy, el borrador local
        // NUNCA gana la hidratación automática. Se documenta como aceptado para este
        // paso (no hay timestamp real que comparar y no corresponde inventar uno
        // falso ni tocar el contrato del backend, cerrado en el Paso 4) — queda como
        // hallazgo pendiente si en el futuro se agrega un timestamp por sección.
        const residenceServer = (data.data?.residence as SectionValues) ?? {};
        const academicServer = (data.data?.academic_history as SectionValues) ?? {};
        const guardiansServer = (data.data?.guardians as SectionValues) ?? {};
        const healthServer = (data.data?.health as SectionValues) ?? {};
        const declarationsServer = (data.data?.declarations as SectionValues) ?? {};
        residenceForm.reset(residenceAutosave.hydrate(residenceServer));
        academicForm.reset(academicAutosave.hydrate(academicServer));
        guardiansForm.reset(guardiansAutosave.hydrate(guardiansServer));
        healthForm.reset(healthAutosave.hydrate(healthServer));
        declarationsForm.reset(declarationsAutosave.hydrate(declarationsServer));
        // Reanudación automática: deja abierta la primera sección sin diligenciar (o
        // la primera de todas si ya están completas).
        const firstPending = STEPS.findIndex(
          (s) => !data.data?.[s.key] || Object.keys(data.data[s.key]).length === 0,
        );
        const initialKey = STEPS[firstPending === -1 ? 0 : firstPending].key;
        setOpenSections(new Set([initialKey]));
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
    // Solo al montar / cuando cambia `code`. Los 5 `useForm()` mantienen identidad
    // estable entre renders (react-hook-form), listarlos no cambiaría nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Puente RHF → autoguardado. `form.watch(callback)` (imperativo, fuera del render)
  // en vez de `useWatch`: así ninguna tecla re-renderiza el wizard, que es justo el
  // motivo por el que Admisiones migró a RHF en el Paso 2.
  //
  // Cómo se filtran los disparos programáticos (investigado contra el código fuente
  // instalado, react-hook-form@7.81.0, porque la documentación pública describe un
  // `type: "change"` que ESTA versión no emite en runtime):
  // - `reset(values)` llama internamente a `_subjects.state.next({name: undefined,
  //   type: undefined, values})` — SIEMPRE con `name: undefined`.
  // - Un cambio de campo real (sea por `register`/tecleo del usuario, o por
  //   `setValue(name, value)` programático) llama a
  //   `_subjects.state.next({name: <campo>, values})` — SIEMPRE con `name` definido,
  //   y en ningún caso trae una clave `type` distinguible (la build instalada no la
  //   setea nunca para cambios de campo; solo `reset()` la setea, a `undefined`).
  //   Es decir: en esta versión, `type` NO sirve para distinguir nada — el único
  //   campo utilizable es `name`.
  // Filtro aplicado: `name === undefined` ⇒ viene de un `reset()` ⇒ se ignora.
  // Esto cubre el caso obligatorio del plan (la hidratación inicial no debe disparar
  // `push()`). Los `setValue()` de la auto-copia padre/madre→acudiente y del
  // pre-llenado desde `useAuth().user` (ambos en `GuardiansStep`, steps.tsx) SÍ traen
  // `name` definido, igual que el tecleo real, y esta build de RHF no expone ninguna
  // forma más fina de diferenciarlos. Decisión: dejar que SÍ disparen `push()` —
  // son datos reales y queridos por el usuario (aceptó "Padre"/"Madre" como
  // acudiente, o inició sesión con esa cuenta), y como `push()` solo reprograma un
  // debounce (nunca escribe de inmediato), encadenar varios `setValue()` seguidos no
  // produce ningún PATCH prematuro: el efecto observable es el mismo que si el
  // usuario hubiera escrito esos valores a mano. Se añade además, como red de
  // seguridad adicional sugerida por el plan, un chequeo de `formState.isDirty`
  // (que `reset()` también deja en `false`) — redundante con el filtro por `name`
  // pero sin costo.
  useEffect(() => {
    const subscriptions = STEPS.map((s) => {
      const { unsubscribe } = s.form.watch((values, { name }) => {
        if (name === undefined) return;
        if (!s.form.formState.isDirty) return;
        s.autosave.push(values as SectionValues);
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
  // abierta). El autoguardado ya deja de programarse solo vía `enabled`; esto además
  // limpia lo que ya hubiera en localStorage.
  useEffect(() => {
    if (application && !isEditable(application.status)) {
      STEPS.forEach((s) => s.autosave.discard());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.status]);

  const toggleSection = (key: string) => {
    // Vacía cualquier guardado pendiente en el debounce de esa sección antes de
    // plegarla/desplegarla — no dejar autoguardado "en el aire" al alejarse.
    STEPS.find((s) => s.key === key)?.autosave.flush();
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
        // El guardado manual no pasa por `push`/`save` del hook, así que el borrador
        // local no se limpia solo: se descarta explícitamente al confirmar éxito.
        s.autosave.discard();
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
        setAutosaveGloballyEnabled(false);
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
    setSectionAutosaveEnabled((prev) => ({ ...prev, [activeConflictStep.key]: true }));
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
    activeConflictStep.autosave.discard();
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
    setSectionAutosaveEnabled((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = async () => {
    setGlobalError(null);
    // Guarda primero cualquier sección con cambios sin guardar (cada una con su propio
    // PATCH, no un guardado global) antes de enviar la solicitud completa.
    for (const s of STEPS) {
      if (s.form.formState.isDirty) {
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
      const res = await apiFetch(API_ENDPOINTS.admissionsApplicationSubmit(code), {
        method: "POST",
      });
      if (res.ok) {
        // Envío completo confirmado: ya no hace falta ningún borrador local.
        STEPS.forEach((s) => s.autosave.discard());
        navigate(`/admisiones/${code}`, { replace: true });
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
   *   pendientes de guardar.
   *
   * Sin cambios respecto al Paso 3: el autoguardado (Paso 5) actualiza
   * `application.data`/`data_versions` en éxito pero deliberadamente NO llama
   * `form.reset()` (ver `makeAutosave`), así que `isDirty` sigue reflejando "hay
   * cambios que el usuario no confirmó explícitamente" incluso si ya viajaron al
   * servidor en segundo plano. El indicador de autoguardado (`AutosaveIndicator`) es
   * el que informa de eso; el de la tarjeta sigue siendo la marca de "acción
   * explícita completada".
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
            onClick={() => navigate("/admisiones")}
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
    return <Navigate to={`/admisiones/${code}`} replace />;
  }

  const completeCount = STEPS.filter((s) => sectionStatus(s) === "complete").length;
  const progress = (completeCount / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(`/admisiones/${code}`)}
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

      {/* Las 5 secciones, siempre presentes como tarjetas plegables — nada se oculta
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
              subtitle={s.subtitle}
              open={openSections.has(s.key)}
              onToggle={() => toggleSection(s.key)}
              status={sectionStatus(s)}
            >
              <StepComponent
                control={s.form.control}
                register={s.form.register}
                setValue={s.form.setValue}
                getValues={s.form.getValues}
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
                  <span className="inline-flex items-center gap-1.5 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Conflicto de versión — resuelve para seguir guardando
                  </span>
                ) : (
                  <AutosaveIndicator status={s.autosave.status} />
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
              Enviar solicitud
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
        <p>
          Alguien más (quizás tú, desde otro dispositivo o pestaña) guardó “
          {activeConflictStep?.title}” mientras editabas aquí. Elige qué hacer con lo
          que tienes escrito en esta pestaña:
        </p>
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

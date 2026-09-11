/**
 * Autoguardado LOCAL de borrador (solo localStorage, nunca el servidor).
 *
 * MÉTODO ÚNICO de autoguardado de la plataforma — lo usan Admisiones
 * (`SolicitudWizard`, un borrador por sección) y Matrículas (`student/StepProfile`, un
 * borrador para toda la ficha del paso 3). No crear otro mecanismo.
 *
 * Decisión (2026-09-10): los formularios guardan en el servidor ÚNICAMENTE cuando el
 * usuario lo confirma ("Guardar sección" / "Enviar solicitud" en Admisiones,
 * "Guardar y continuar" del paso 3 en Matrículas). Lo que escribe mientras tanto vive solo en
 * este navegador, para no perderlo si recarga, cierra la pestaña o se queda sin red.
 * Antes Admisiones hacía un PATCH con debounce de ~3s y Matrículas un POST a
 * `save-student-data` a los 700ms; se eliminaron porque:
 * - "Guardado en el servidor" y "sección completa" significaban cosas distintas (el
 *   autoguardado subía datos, pero la tarjeta seguía "incompleta" hasta el botón).
 * - Generaba bugs propios: reintentos que no reintentaban, conflictos de versión de la
 *   pestaña contra sí misma (autoguardado en vuelo + botón), y PATCH disparados por
 *   el pre-llenado sin que el usuario escribiera nada.
 * Costo aceptado: lo no confirmado no viaja a otro dispositivo, y se pierde si se
 * borran los datos del navegador.
 *
 * AGNÓSTICO AL MOTOR DE FORMULARIOS a propósito: no importa `react-hook-form` ni sabe
 * que existe Admisiones.
 *
 * API imperativa (no provoca re-renders en quien la usa):
 *
 *   const { push, flush, discard, peekDraft } = useAutosaveDraft({ key, enabled });
 *
 * - `push(value, meta?)`: registra un valor nuevo y programa su escritura en
 *   localStorage con debounce (~500ms; cada llamada reinicia el temporizador). `meta`
 *   es un dato OPACO para el hook (se guarda tal cual junto al borrador): el
 *   consumidor lo usa al volver para decidir qué hacer con el borrador (ver
 *   `peekDraft`).
 * - `flush()`: escribe de inmediato lo pendiente. El hook ya lo llama solo al
 *   desmontar y en `beforeunload` (es síncrono: alcanza a escribir antes de que la
 *   página se descargue).
 * - `discard()`: borra el borrador y cancela lo pendiente. Llamarlo cuando el dato ya
 *   se confirmó en el servidor, o cuando deja de tener sentido (expediente enviado).
 * - `peekDraft()`: lee el borrador (`{value, updatedAt, meta}`) o `null`. El hook NO
 *   decide si el borrador gana sobre el servidor: esa comparación depende del dominio
 *   (Admisiones guarda en `meta` la versión de la sección y la compara con
 *   `data_versions` del backend — no fechas, que dependen del reloj del navegador).
 * - `enabled = false` apaga `push`/`flush` (expediente no editable, sin permisos).
 *
 * Todas las claves se guardan con el prefijo `DRAFT_KEY_PREFIX`, para que
 * `clearAllDrafts()` pueda borrarlas todas al cerrar sesión: el formulario de
 * admisiones incluye datos de salud, y en un computador compartido no deben quedar en
 * el navegador del siguiente usuario.
 *
 * Resiliencia: todo acceso a localStorage va en try/catch. Si lanza (modo privado,
 * cuota llena) el hook degrada en silencio a "sin borrador" — nunca rompe el formulario.
 */

import { useCallback, useEffect, useRef } from "react";

export const DRAFT_KEY_PREFIX = "gimpa_draft:";
// Prefijos de mecanismos anteriores (el guardado remoto de Admisiones y la copia del
// paso 3 de Matrículas). Solo se usan para limpiar restos viejos en `clearAllDrafts`.
const LEGACY_DRAFT_KEY_PREFIXES = ["gimpa_admision_draft_", "enrollment_step3_"];

/** Borrador tal como queda en localStorage. `meta` es lo que el consumidor pasó a `push`. */
export interface StoredDraft<T, M = unknown> {
  value: T;
  updatedAt: number;
  meta?: M;
}

export interface UseAutosaveDraftOptions {
  /** Clave única del borrador (p. ej. expediente + sección). Se le antepone el prefijo. */
  key: string;
  /** Si es `false`, `push`/`flush` no hacen nada. */
  enabled?: boolean;
  /** Debounce antes de escribir en localStorage (ms). Default 500. */
  debounceMs?: number;
}

export interface UseAutosaveDraftResult<T, M = unknown> {
  push: (value: T, meta?: M) => void;
  flush: () => void;
  discard: () => void;
  peekDraft: () => StoredDraft<T, M> | null;
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Modo privado, cuota llena, etc. — degradamos a "sin borrador" en silencio.
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Idem: nunca debe romper el flujo del formulario.
  }
}

function readDraft<T, M>(storageKey: string): StoredDraft<T, M> | null {
  const raw = safeGetItem(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T, M>;
    if (!parsed || typeof parsed.updatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------------
// Qué hacer con un borrador al volver — lógica COMPARTIDA por todos los formularios que
// usan este hook (Admisiones y Matrículas), para que ambos resuelvan igual.
// ------------------------------------------------------------------------------------

/** Igualdad estructural de valores JSON (sin importar el orden de las claves). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((k) =>
    jsonEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

const isBlank = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** ¿Todo lo de `values` (borrador o formulario) ya está en `server`? Compara clave por
 * clave de primer nivel. Un campo vacío que el servidor no tiene cuenta como igual: es
 * un campo que se registró en el formulario pero nunca se llenó. */
export function valuesMatchServer(
  values: Record<string, unknown>,
  server: Record<string, unknown>,
): boolean {
  return Object.entries(values).every(([k, v]) =>
    k in server ? jsonEqual(v, server[k]) : isBlank(v),
  );
}

/** Huella corta y estable de un valor JSON (orden de claves normalizado, hash FNV-1a).
 * Para formularios cuyo backend no expone un contador de versión: se guarda en `meta`
 * la huella de lo que había en el servidor al escribir el borrador. */
export function fingerprint(value: unknown): string {
  const stable = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, stable((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  const text = JSON.stringify(stable(value)) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

export type DraftResolution = "none" | "stale" | "restore" | "conflict";

/**
 * Qué hacer al cargar con un borrador local. El borrador existe mientras haya cambios
 * que el usuario no guardó (quien usa el hook lo descarta al guardar con éxito).
 * - "none":     no hay borrador.
 * - "stale":    lo del borrador ya está en el servidor → descartar.
 * - "restore":  el servidor no cambió desde que se escribió el borrador
 *               (`isSameBase(meta)`) → el borrador es lo más nuevo, se restaura.
 * - "conflict": el servidor cambió (se guardó desde otra pestaña/dispositivo) y además
 *               difiere del borrador → que el usuario elija. También cae aquí un
 *               borrador sin `meta` (no hay forma de saber cuál es más nuevo).
 *
 * `isSameBase` depende del backend: Admisiones compara la versión de la sección
 * (`data_versions`); Matrículas, la `fingerprint` de la ficha (`enrollment.data`).
 */
export function resolveDraft<T extends Record<string, unknown>, M>(
  draft: StoredDraft<T, M> | null,
  server: Record<string, unknown>,
  isSameBase: (meta: M | undefined) => boolean,
): DraftResolution {
  if (!draft) return "none";
  if (valuesMatchServer(draft.value, server)) return "stale";
  if (draft.meta !== undefined && isSameBase(draft.meta)) return "restore";
  return "conflict";
}

/** Borra todos los borradores de este navegador (cerrar sesión). */
export function clearAllDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (k.startsWith(DRAFT_KEY_PREFIX) ||
          LEGACY_DRAFT_KEY_PREFIXES.some((p) => k.startsWith(p)))
      ) {
        keys.push(k);
      }
    }
    keys.forEach(safeRemoveItem);
  } catch {
    // localStorage inaccesible: no hay nada que limpiar.
  }
}

export function useAutosaveDraft<T, M = unknown>({
  key,
  enabled = true,
  debounceMs = 500,
}: UseAutosaveDraftOptions): UseAutosaveDraftResult<T, M> {
  // Refs "siempre al día": push/flush (estables vía useCallback) leen el valor más
  // reciente sin reconstruirse en cada render.
  const storageKeyRef = useRef(DRAFT_KEY_PREFIX + key);
  const enabledRef = useRef(enabled);
  storageKeyRef.current = DRAFT_KEY_PREFIX + key;
  enabledRef.current = enabled;

  const pendingRef = useRef<{ value: T; meta?: M } | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const writePending = useCallback(() => {
    clearTimer();
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const draft: StoredDraft<T, M> = {
      value: pending.value,
      updatedAt: Date.now(),
      meta: pending.meta,
    };
    safeSetItem(storageKeyRef.current, JSON.stringify(draft));
  }, [clearTimer]);

  const push = useCallback(
    (value: T, meta?: M) => {
      if (!enabledRef.current) return;
      pendingRef.current = { value, meta };
      clearTimer();
      timerRef.current = window.setTimeout(writePending, debounceMs);
    },
    [clearTimer, debounceMs, writePending],
  );

  const flush = useCallback(() => {
    if (!enabledRef.current) return;
    writePending();
  }, [writePending]);

  const discard = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    safeRemoveItem(storageKeyRef.current);
  }, [clearTimer]);

  const peekDraft = useCallback(() => readDraft<T, M>(storageKeyRef.current), []);

  // Si `enabled` pasa a false a mitad de camino, cancela lo pendiente (sin borrar el
  // borrador ya escrito).
  useEffect(() => {
    if (!enabled) {
      clearTimer();
      pendingRef.current = null;
    }
  }, [enabled, clearTimer]);

  // Escribe lo pendiente al desmontar y al cerrar/recargar la página.
  useEffect(() => {
    const onBeforeUnload = () => flush();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { push, flush, discard, peekDraft };
}

export default useAutosaveDraft;

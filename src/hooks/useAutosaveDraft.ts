/**
 * Autoguardado de borrador — Paso 1 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md).
 *
 * AGNÓSTICO AL MOTOR DE FORMULARIOS a propósito: no importa `react-hook-form` ni sabe
 * que existe Admisiones. Matrículas sigue con `useState` hoy y adoptará este mismo
 * hook más adelante (fuera de este plan) — si el hook conociera RHF, esa migración
 * quedaría bloqueada.
 *
 * Una sola fuente de verdad local (localStorage con timestamp) y un solo camino a
 * backend (`save`). Esto es deliberado: el autoguardado ACTUAL de Matrículas
 * (`Step3StudentData.tsx`) tiene un defecto de arquitectura documentado en el Paso 0
 * (docs/paso0-informe-admisiones.md §10.2) — usa un segundo mecanismo de localStorage
 * (`enrollment_step3_<id>`) no sincronizado con su autoguardado a backend, y el envío
 * final lee de ese segundo mecanismo, no del primero. Este hook nuevo NO replica ese
 * defecto.
 *
 * API imperativa (no fuerza re-renders en quien la usa, salvo por `status`):
 *
 *   const { status, push, flush, discard, hydrate } = useAutosaveDraft({ key, save, enabled });
 *
 * - `push(value)`: registra un valor nuevo. Programa una escritura a localStorage con
 *   debounce corto (~500ms, con timestamp) y programa `save(value)` con debounce largo
 *   (~3s de inactividad). Cada llamada reinicia ambos temporizadores (debounce
 *   estándar).
 * - `flush()`: dispara de inmediato cualquier escritura local y guardado remoto
 *   pendientes. El hook ya lo llama solo en su propio cleanup (desmontaje) y en
 *   `beforeunload` — no hace falta que el componente que lo usa recuerde cablear
 *   ninguno de esos dos casos. Sigue expuesto porque un consumidor con lógica propia
 *   (p. ej. "guardar ya" al cambiar de sección sin desmontar) puede necesitar
 *   dispararlo a mano.
 * - `discard()`: borra el borrador local explícitamente (no toca el servidor) y
 *   cancela cualquier guardado pendiente.
 * - `status`: "idle" | "saving" | "saved" | "error", para un indicador visible.
 * - `hydrate(serverValue, serverUpdatedAt)`: función síncrona (no dispara efectos ni
 *   re-renders) que decide qué valor usar al montar. Devuelve el borrador local SOLO
 *   si existe y su timestamp es estrictamente posterior a `serverUpdatedAt`; en
 *   cualquier otro caso (sin borrador, sin timestamp del servidor para comparar,
 *   timestamp inválido, o servidor igual o más reciente) devuelve `serverValue`. No
 *   estaba en la firma imperativa mínima del plan, pero el contrato de hidratación que
 *   el plan sí exige ("expone el borrador local SOLO si su timestamp es posterior al
 *   del dato del servidor") no puede cumplirse sin exponer algo que compare ambos
 *   timestamps — se documenta aquí como decisión explícita.
 * - `enabled = false` apaga todo: `push`/`flush` no hacen nada, no se agenda ningún
 *   timer. Pensado para expedientes no editables o sin permisos de escritura.
 *
 * Resiliencia de localStorage: todo acceso (get/set/remove) va en try/catch. Si
 * localStorage lanza (modo privado, cuota llena, etc.) el hook degrada en silencio a
 * "solo guardado remoto" — nunca rompe la escritura del formulario.
 *
 * Un `save` fallido nunca bloquea la escritura ni descarta el borrador local: solo
 * pasa `status` a "error". El borrador local se limpia únicamente cuando `save`
 * confirma éxito.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface StoredDraft<T> {
  value: T;
  updatedAt: number;
}

export interface UseAutosaveDraftOptions<T> {
  /** Clave única de localStorage para este borrador (p. ej. por expediente + sección). */
  key: string;
  /** Persiste `value` en el servidor. Debe resolver en éxito o rechazar/lanzar en error. */
  save: (value: T) => Promise<unknown>;
  /** Si es `false`, apaga todo autoguardado (local y remoto) sin romper la API. */
  enabled?: boolean;
  /** Debounce corto antes de escribir a localStorage (ms). Default 500. */
  localDebounceMs?: number;
  /** Debounce largo de inactividad antes de llamar a `save` (ms). Default 3000. */
  remoteDebounceMs?: number;
}

export interface UseAutosaveDraftResult<T> {
  status: AutosaveStatus;
  push: (value: T) => void;
  flush: () => void;
  discard: () => void;
  hydrate: (serverValue: T, serverUpdatedAt?: number | string | null) => T;
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
    // Modo privado, cuota llena, etc. — degradamos a solo-servidor en silencio.
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Idem: nunca debe romper el flujo del formulario.
  }
}

function readDraft<T>(key: string): StoredDraft<T> | null {
  const raw = safeGetItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed.updatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeTimestamp(value?: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const t = typeof value === "number" ? value : Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

export function useAutosaveDraft<T>({
  key,
  save,
  enabled = true,
  localDebounceMs = 500,
  remoteDebounceMs = 3000,
}: UseAutosaveDraftOptions<T>): UseAutosaveDraftResult<T> {
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  // Refs "siempre al día": permiten que push/flush/runSave (estables vía useCallback)
  // lean el valor más reciente sin tener que reconstruirse en cada render.
  const keyRef = useRef(key);
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  keyRef.current = key;
  saveRef.current = save;
  enabledRef.current = enabled;

  const latestValueRef = useRef<T | undefined>(undefined);
  const hasPendingLocalRef = useRef(false);
  const hasPendingRemoteRef = useRef(false);
  const localTimerRef = useRef<number | null>(null);
  const remoteTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  // Se incrementa en discard() para que un `save` en vuelo, resuelto después de
  // descartar el borrador, no reviva el estado ni el localStorage que ya se limpiaron.
  const epochRef = useRef(0);

  const clearLocalTimer = useCallback(() => {
    if (localTimerRef.current !== null) {
      window.clearTimeout(localTimerRef.current);
      localTimerRef.current = null;
    }
  }, []);

  const clearRemoteTimer = useCallback(() => {
    if (remoteTimerRef.current !== null) {
      window.clearTimeout(remoteTimerRef.current);
      remoteTimerRef.current = null;
    }
  }, []);

  const writeLocal = useCallback(() => {
    clearLocalTimer();
    if (!hasPendingLocalRef.current) return;
    hasPendingLocalRef.current = false;
    const value = latestValueRef.current;
    if (value === undefined) return;
    const draft: StoredDraft<T> = { value, updatedAt: Date.now() };
    safeSetItem(keyRef.current, JSON.stringify(draft));
  }, [clearLocalTimer]);

  const runSave = useCallback(() => {
    clearRemoteTimer();
    if (!hasPendingRemoteRef.current) return;
    const value = latestValueRef.current;
    if (value === undefined) return;
    hasPendingRemoteRef.current = false;
    const epoch = epochRef.current;

    setStatus("saving");
    Promise.resolve()
      .then(() => saveRef.current(value))
      .then(() => {
        if (!mountedRef.current || epoch !== epochRef.current) return;
        // El servidor confirmó: el borrador local ya no hace falta para este valor.
        clearLocalTimer();
        hasPendingLocalRef.current = false;
        safeRemoveItem(keyRef.current);
        setStatus("saved");
      })
      .catch(() => {
        if (!mountedRef.current || epoch !== epochRef.current) return;
        // Fallo de red/servidor: NUNCA bloquea la escritura ni descarta el borrador
        // local. Solo se refleja en `status` para el indicador visible.
        setStatus("error");
      });
  }, [clearLocalTimer, clearRemoteTimer]);

  const push = useCallback(
    (value: T) => {
      if (!enabledRef.current) return;
      latestValueRef.current = value;
      hasPendingLocalRef.current = true;
      hasPendingRemoteRef.current = true;

      clearLocalTimer();
      localTimerRef.current = window.setTimeout(writeLocal, localDebounceMs);

      clearRemoteTimer();
      remoteTimerRef.current = window.setTimeout(runSave, remoteDebounceMs);
    },
    [clearLocalTimer, clearRemoteTimer, localDebounceMs, remoteDebounceMs, runSave, writeLocal],
  );

  const flush = useCallback(() => {
    if (!enabledRef.current) return;
    writeLocal();
    runSave();
  }, [runSave, writeLocal]);

  const discard = useCallback(() => {
    epochRef.current += 1;
    clearLocalTimer();
    clearRemoteTimer();
    hasPendingLocalRef.current = false;
    hasPendingRemoteRef.current = false;
    latestValueRef.current = undefined;
    safeRemoveItem(keyRef.current);
    setStatus("idle");
  }, [clearLocalTimer, clearRemoteTimer]);

  const hydrate = useCallback(
    (serverValue: T, serverUpdatedAt?: number | string | null): T => {
      const draft = readDraft<T>(keyRef.current);
      if (!draft) return serverValue;
      const serverTime = normalizeTimestamp(serverUpdatedAt);
      const localIsNewer = serverTime !== null && draft.updatedAt > serverTime;
      return localIsNewer ? draft.value : serverValue;
    },
    [],
  );

  // Apagar todo si `enabled` pasa a false a mitad de camino (expediente que deja de
  // ser editable, permisos revocados, etc.) — sin descartar el borrador ya escrito.
  useEffect(() => {
    if (!enabled) {
      clearLocalTimer();
      clearRemoteTimer();
    }
  }, [enabled, clearLocalTimer, clearRemoteTimer]);

  // flush() obligatorio en dos momentos (contrato del plan): al desmontar el
  // componente que usa el hook, y en `beforeunload`. Se cablean los dos aquí adentro
  // para que ningún consumidor tenga que acordarse de hacerlo por su cuenta.
  useEffect(() => {
    mountedRef.current = true;
    const onBeforeUnload = () => flush();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("beforeunload", onBeforeUnload);
      flush();
      clearLocalTimer();
      clearRemoteTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, push, flush, discard, hydrate };
}

export default useAutosaveDraft;

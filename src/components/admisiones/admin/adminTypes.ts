/**
 * Tipos compartidos entre `ApplicationDetail.tsx` y las pestañas que extrae —
 * `components/admisiones/admin/tabs/*` y `ValoracionTab.tsx` —
 * Paso 7 del refactor de Admisiones (docs/plan-admisiones-ui-rhf-acordeon.md).
 *
 * Viven en un archivo aparte (no en `ApplicationDetail.tsx`) para que las pestañas no
 * necesiten importar tipos desde el propio contenedor que las importa a ellas —
 * evitaría un import circular en tiempo de compilación entre `ApplicationDetail.tsx` y
 * `tabs/*.tsx`.
 */

/** Toast efímero compartido (`useToast()` de `hooks/use-toast.ts`), pasado hacia abajo
 * con la misma firma que el `flash()` local que reemplaza. */
export type FlashFn = (type: "success" | "error", msg: string) => void;

/**
 * Firma del helper `post` de `ApplicationDetail.tsx`: hace `POST` + recarga el
 * expediente + dispara el toast + resuelve a `true`/`false` según el resultado. Las
 * pestañas que necesitan mutar el expediente (Validación, Pago, Documentos) lo reciben
 * como prop en vez de reimplementar la llamada, para no duplicar el manejo de
 * error/recarga/toast.
 */
export type PostFn = (
  path: string,
  body: unknown,
  opts?: { pendingKey?: string; successMsg?: string },
) => Promise<boolean>;

/** El pago lo comparten el acudiente y el staff: vive en `admissionTypes.ts`. */
export type { PaymentInfo } from "@/components/admisiones/admissionTypes";

export interface DocumentRow {
  doc_type: string;
  label: string;
  sensitivity: string;
  status: string;
  status_label: string;
  url: string | null;
  reject_reason: string | null;
  note_public: string | null;
  note_internal?: string | null;
}

/** `GET /api/admissions/<id>/advance/`: paso actual y a qué pasos se puede enviar. */
export interface AdvanceOptions {
  status: string;
  status_label: string;
  options: { value: string; label: string; requires_comment: boolean }[];
  /** El paso que sigue según lo resuelto (preseleccionado). */
  recommended: string | null;
  /** Qué está pasando cuando no hay nada que avanzar a mano. */
  hint: string;
}

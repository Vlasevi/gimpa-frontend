/**
 * Foto (informe §3.2, §5.2). Compuesto: el valor no es un string de formulario sino
 * `{file, removed}` (`PhotoFieldValue`, ver `./types.ts`) + una URL preexistente que
 * puede necesitar "olvidarse" explícitamente.
 *
 * Simplificación real respecto a `PhotoUploadField` (la versión anterior, local a
 * `components/matriculas/Step3StudentData.tsx`, ya migrada a este componente): la
 * bandera `_uploaded` de esa versión era redundante — `value.file !== null` ya la
 * reemplaza, no hace falta un segundo booleano gemelo. Confirmado antes de migrar que
 * ningún otro archivo lee `_uploaded`/`_manually_removed` (`Step6Confirmation.tsx` solo
 * mira `uploadedFiles.<key> instanceof File`, un objeto que este componente sigue sin
 * tocar directamente — ver la corrección de diseño sobre `Controller`/RHF documentada en
 * `PhotoFieldProps`, `./types.ts`).
 *
 * HISTORIA (por qué esto es un `<input className="file-input">` plano y no la foto misma
 * como disparador): las primeras 3 versiones probaban que la foto/avatar fuera el
 * disparador del selector — un `<label>` envolviendo un input oculto, luego un
 * `<button onClick>` con `inputRef.current.click()`, luego el input real transparente
 * superpuesto (`opacity-0` + `absolute inset-0`). Las tres fallaban en el navegador real
 * del usuario (confirmado sin ser problema de caché ni de bundle desactualizado), pese a
 * que las pruebas automatizadas vía Chrome DevTools/CDP sí las validaban. Se abandona
 * toda esa indirección: ahora es literalmente el ejemplo de la documentación de daisyUI
 * (`<input type="file" className="file-input ...">`, clase confirmada en
 * `node_modules/daisyui/components/fileinput.css`) — visible, sin trucos de posición ni
 * de opacidad, cero JS entre el click del usuario y el input nativo.
 *
 * Previsualización: `URL.createObjectURL(file)` para un archivo recién elegido en esta
 * sesión; `preloadedUrl` (string, típicamente base64, ver `preview_base64` del backend)
 * si no se ha elegido ni quitado nada nuevo. El botón "Quitar" pone `removed: true` en
 * el valor del campo — así, aunque `preloadedUrl` siga llegando por props en el
 * siguiente render, no vuelve a aparecer solo.
 *
 * Este componente NO decide cuándo se sube el archivo — solo expone `onFileStaged` para
 * que el padre lo recoja (el mismo patrón de "staged upload" que ya usa Matrículas hoy,
 * pero sin la subida en bloque de Step6; eso sigue siendo decisión del consumidor).
 *
 * Validación de formato/tamaño (JPG/JPEG/PNG, máx. 3MB) real en JS, no solo cosmética:
 * `accept` en el `<input>` es apenas un filtro del selector nativo del SO, no una
 * validación — no impide que un archivo inválido llegue a `onChange` (drag&drop,
 * selectores que ignoran `accept`, etc.). El chequeo real vive en `handleFileChange`,
 * antes de llamar `onChange`; un archivo rechazado nunca se propaga al padre.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { PhotoFieldProps } from "./types";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];

/**
 * Componente controlado desde afuera (`value`/`onChange`) — sin `Controller`, sin
 * `control`. Ni `file` ni `removed` tocan RHF (ver la corrección documentada en
 * `PhotoFieldProps`, `./types.ts`): quien lo consuma decide dónde vive ese estado, igual
 * que `uploadedFiles`/`updateUploadedFiles` ya funciona hoy en Matrículas.
 */
export function PhotoField({ label, value, onChange, preloadedUrl }: PhotoFieldProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Blob URL solo para un archivo recién elegido en esta sesión; se revoca al
  // reemplazarlo o al desmontar. `preloadedUrl` (base64) no pasa por aquí.
  useEffect(() => {
    if (!value.file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  const preview = value.file ? objectUrl : !value.removed && preloadedUrl ? preloadedUrl : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    // Permite volver a elegir el mismo archivo dos veces seguidas (ej. tras corregir un
    // rechazo, re-seleccionar el mismo nombre de archivo debe volver a disparar onChange).
    e.target.value = "";
    if (!selected) return;

    // Extensión como respaldo del MIME type: algunos selectores (drag&drop, ciertos
    // gestores de archivos) dejan `file.type` vacío pese a ser un JPG/PNG real.
    const extension = selected.name.split(".").pop()?.toLowerCase() ?? "";
    const validType =
      ALLOWED_MIME_TYPES.includes(selected.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!validType) {
      setError("Formato no permitido. Usa JPG, JPEG o PNG.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(1);
      setError(`El archivo pesa ${sizeMb}MB. El máximo permitido es 3MB.`);
      return;
    }

    setError(null);
    onChange({ file: selected, removed: false });
  };

  const handleRemove = () => {
    setError(null);
    onChange({ file: null, removed: true });
  };

  return (
    <div className="form-control w-full rounded-lg border border-base-300 bg-base-200/40 p-4 shadow-sm">
      <span className="label-text mb-2 block font-medium text-base-content/70">{label}</span>
      <div className="flex items-center gap-3">
        {preview && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-base-300 bg-base-200 shadow-sm">
            <img src={preview} alt="Foto" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-error-content shadow-sm transition-colors hover:bg-error/90"
              title="Eliminar foto"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="file-input file-input-sm w-full"
          />
          <p className="mt-1 text-xs text-base-content/50">JPG, JPEG, PNG · Máx. 3MB</p>
          {error && <p className="mt-1 text-xs font-medium text-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

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
 * Interacción rediseñada sobre el layout anterior (botón "Subir Foto"/"Cambiar" aparte,
 * al lado del avatar) tomando la idea del patrón "image input" de Metronic
 * (keenthemes.com/metronic): la foto MISMA es el disparador del selector de archivo, con
 * un overlay de cámara que aparece al pasar el mouse — una sola zona de interacción en
 * vez de dos. Se mantiene cuadrado (`rounded-lg`), no circular como en la referencia —
 * decisión explícita, no se copia el círculo. El botón "✕" de quitar en la esquina se
 * mantiene igual.
 *
 * El disparador es el propio `<input type="file">` REAL, transparente (`opacity-0`) y
 * superpuesto exactamente sobre el cuadro visual (`absolute inset-0`) — no un `<label>`
 * envolviendo un input oculto (`display:none`) ni un botón que llama
 * `inputRef.current.click()` programáticamente (los dos intentos anteriores; ninguno
 * abría el selector en al menos un navegador real, aunque sí en las pruebas automatizadas
 * de Chrome DevTools vía CDP — soportar el click sintético/label-forwarding
 * aparentemente no es universal). Con el input real recibiendo el click directo del
 * usuario no hay ninguna capa de indirección de la que depender: es el patrón más básico
 * y compatible de "custom file input" que existe.
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
 * antes de llamar `onChange`; un archivo rechazado nunca se propaga al padre. El espacio
 * a la derecha del avatar (antes vacío — la tarjeta es `w-full` pero el avatar es un
 * cuadro fijo de 80px) ahora muestra los requisitos y, si aplica, el error.
 */

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

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
      <div className="flex items-start gap-4">
        <div className="group relative w-20 shrink-0">
          {/* Caja puramente visual — ya no es ella la que recibe el click, solo pinta el
              contenido debajo del input real transparente. */}
          <div
            className="pointer-events-none block h-20 w-20 overflow-hidden rounded-lg border border-base-300 bg-base-200 shadow-sm"
            aria-hidden="true"
          >
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-base-content/40">
                <Camera className="h-6 w-6" />
              </div>
            )}
            {/* Overlay de cámara al hover, visible solo si ya hay una foto (si no la
                hay, el ícono de la cámara ya está a la vista dentro del cuadro). */}
            {preview && (
              <div className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          {/* El disparador real: el propio `<input type="file">`, transparente y
              superpuesto exacto sobre la caja visual — ver comentario del encabezado del
              archivo sobre por qué NO es un `<label>` ni un `<button onClick>` con
              `.click()` programático. */}
          <input
            type="file"
            aria-label={preview ? "Cambiar foto" : "Subir foto"}
            title={preview ? "Cambiar foto" : "Subir foto"}
            className="absolute inset-0 h-20 w-20 cursor-pointer rounded-lg opacity-0"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-error text-error-content shadow-sm transition-colors hover:bg-error/90"
              title="Eliminar foto"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Espacio antes vacío a la derecha del avatar (la tarjeta es `w-full`, pero de
            una columna angosta — 250px medidos en vivo dentro del grid de 3 columnas de
            Step3StudentData — y el avatar un cuadro fijo de 80px, dejaban ~120px sin
            usar). Texto corto a propósito: con ese ancho, frases más largas como
            "Formatos permitidos: ..." quedaban en una escalera de una palabra por línea.
            Muestra los requisitos reales de formato/tamaño y, si aplica, el error de la
            última selección rechazada. */}
        <div className="flex-1 pt-1">
          <p className="text-xs font-semibold text-base-content/60">Formato y tamaño:</p>
          <p className="text-xs text-base-content/50">JPG, JPEG, PNG</p>
          <p className="text-xs text-base-content/50">Máx. 3MB</p>
          {error && <p className="mt-1.5 text-xs font-medium text-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

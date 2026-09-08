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
 * (keenthemes.com/metronic): la foto MISMA es el disparador del selector de archivo (un
 * `<label>` envolviendo el `<input type="file">` oculto), con un overlay de cámara que
 * aparece al pasar el mouse — una sola zona de interacción en vez de dos. Se mantiene
 * cuadrado (`rounded-lg`), no circular como en la referencia — decisión explícita, no
 * se copia el círculo. El botón "✕" de quitar en la esquina se mantiene igual.
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
 */

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

import type { PhotoFieldProps } from "./types";

/**
 * Componente controlado desde afuera (`value`/`onChange`) — sin `Controller`, sin
 * `control`. Ni `file` ni `removed` tocan RHF (ver la corrección documentada en
 * `PhotoFieldProps`, `./types.ts`): quien lo consuma decide dónde vive ese estado, igual
 * que `uploadedFiles`/`updateUploadedFiles` ya funciona hoy en Matrículas.
 */
export function PhotoField({ label, value, onChange, preloadedUrl }: PhotoFieldProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

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
    if (selected) onChange({ file: selected, removed: false });
    // Permite volver a elegir el mismo archivo dos veces seguidas.
    e.target.value = "";
  };

  const handleRemove = () => onChange({ file: null, removed: true });

  return (
    <div className="form-control w-full rounded-lg border border-base-300 bg-base-200/40 p-4 shadow-sm">
      <span className="label-text mb-2 block font-medium text-base-content/70">{label}</span>
      <div className="inline-block">
        <div className="group relative w-20 shrink-0">
          {/* La foto es el disparador: click en cualquier parte del cuadro abre el
              selector de archivo, sin un botón "Cambiar" aparte. */}
          <label
            className="block h-20 w-20 cursor-pointer overflow-hidden rounded-lg border border-base-300 bg-base-200 shadow-sm"
            title={preview ? "Cambiar foto" : "Subir foto"}
          >
            {preview ? (
              <img src={preview} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-base-content/40">
                <Camera className="h-6 w-6" aria-hidden="true" />
              </div>
            )}
            {/* Overlay de cámara al hover, visible solo si ya hay una foto (si no la
                hay, el ícono de la cámara ya está a la vista dentro del cuadro). */}
            {preview && (
              <div className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-error-content shadow-sm transition-colors hover:bg-error/90"
              title="Eliminar foto"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

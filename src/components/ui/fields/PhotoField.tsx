/**
 * Foto (informe §3.2, §5.2). Compuesto: el valor no es un string de formulario sino
 * `{file, removed}` (`PhotoFieldValue`, ver `./types.ts`) + una URL preexistente que
 * puede necesitar "olvidarse" explícitamente.
 *
 * Reproduce visualmente `PhotoUploadField` (`components/matriculas/Step3StudentData.tsx`
 * líneas 336-473): mismo layout (avatar 20x20 + botón "Subir Foto"/"Cambiar" + botón
 * "Quitar" ✕), mismas clases. Simplificación real que gana la migración (documentada en
 * el informe): la bandera `_uploaded` de hoy es redundante con `Controller` —
 * `field.value.file !== null` ya la reemplaza, no hace falta un segundo booleano gemelo.
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
import { Controller } from "react-hook-form";

import type { PhotoFieldProps, PhotoFieldValue } from "./types";

const EMPTY_VALUE: PhotoFieldValue = { file: null, removed: false };

export function PhotoField({ dataKey, label, control, preloadedUrl, onFileStaged }: PhotoFieldProps) {
  return (
    <Controller
      name={dataKey}
      control={control}
      defaultValue={EMPTY_VALUE}
      render={({ field }) => {
        const value = (field.value as PhotoFieldValue | undefined) ?? EMPTY_VALUE;
        return (
          <PhotoFieldBody
            value={value}
            label={label}
            preloadedUrl={preloadedUrl}
            onChange={(next) => {
              field.onChange(next);
              onFileStaged(next.file);
            }}
          />
        );
      }}
    />
  );
}

function PhotoFieldBody({
  value,
  label,
  preloadedUrl,
  onChange,
}: {
  value: PhotoFieldValue;
  label: string;
  preloadedUrl?: string;
  onChange: (next: PhotoFieldValue) => void;
}) {
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
    <div className="form-control w-full bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm col-span-1">
      <label className="label pt-0">
        <span className="label-text font-medium text-gray-600">{label}</span>
      </label>
      <div className="flex items-center gap-4">
        <div className="avatar relative group shrink-0">
          <div className="w-20 h-20 rounded-lg bg-gray-200 shadow-md overflow-hidden border border-gray-300">
            {preview ? (
              <img src={preview} alt="Foto" className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400" />
            )}
          </div>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error text-white shadow-md"
              title="Eliminar foto"
            >
              ✕
            </button>
          )}
        </div>
        <label className="flex flex-col cursor-pointer">
          <span className="btn btn-sm btn-outline btn-primary gap-2">
            {preview ? "Cambiar" : "Subir Foto"}
          </span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>
    </div>
  );
}

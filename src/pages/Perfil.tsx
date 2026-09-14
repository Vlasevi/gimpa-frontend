/**
 * Mi perfil: foto, nombre y correo de la cuenta. Solo el propio usuario cambia su foto
 * (plan matrícula v2, decisión 3): `PUT/DELETE /api/accounts/me/photo/`. El backend la
 * redimensiona, la guarda en JPEG y le quita los metadatos (EXIF/GPS).
 *
 * Si la cuenta es de un estudiante, muestra también el acudiente vigente (el de su
 * última matrícula aprobada), que es a quien le llegan los códigos de verificación.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Loader2, Trash2, User } from "lucide-react";

import { useAuth } from "@/components/Login/loginLogic";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/utils/api";

const PHOTO_ENDPOINT = "/api/accounts/me/photo/";
const MAX_BYTES = 10 * 1024 * 1024;

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-base-content/50">{label}</dt>
      <dd className="mt-1 text-base-content">{value || "—"}</dd>
    </div>
  );
}

export default function Perfil() {
  const { user, updateUser } = useAuth();
  const { toast, flash } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (!user) return null;

  const send = async (method: "PUT" | "DELETE", body?: FormData) => {
    const response = await fetch(apiUrl(PHOTO_ENDPOINT), { method, body });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "No se pudo actualizar la foto.");
    updateUser(data);
  };

  const upload = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      flash("error", "La foto debe ser JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      flash("error", "La foto no puede pesar más de 10 MB.");
      return;
    }
    const form = new FormData();
    form.append("photo", file);
    setBusy("upload");
    try {
      await send("PUT", form);
      setImageFailed(false);
      flash("success", "Foto actualizada");
    } catch (e) {
      flash("error", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  /** `false` = falló: el diálogo queda abierto para reintentar. */
  const remove = async () => {
    setBusy("delete");
    try {
      await send("DELETE");
      flash("success", "Foto eliminada");
      return true;
    } catch (e) {
      flash("error", (e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const isStudent = user.role === "student";
  const hasPhoto = !!user.photo_url && !imageFailed;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Toast toast={toast} />
      <h1 className="font-display text-3xl font-bold text-secondary">Mi perfil</h1>

      <section
        aria-labelledby="foto-title"
        className="flex flex-col items-center gap-6 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="avatar">
          <div className="w-32 rounded-2xl bg-base-200 ring-1 ring-base-300">
            {hasPhoto ? (
              <img src={user.photo_url!} alt={`Foto de ${user.displayname}`} onError={() => setImageFailed(true)} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-base-content/30">
                <User className="h-14 w-14" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <h2 id="foto-title" className="font-display text-2xl text-secondary">
              {user.displayname}
            </h2>
            <p className="text-sm text-base-content/60">{user.email}</p>
          </div>
          <p className="text-sm text-base-content/70">
            Tu foto se ve en la plataforma. Usa una foto de frente, con buena luz. JPG, PNG o WEBP de
            hasta 10 MB.
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              className="btn btn-primary btn-sm gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={busy !== null}
            >
              {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
              {busy === "upload" ? "Subiendo foto…" : hasPhoto ? "Cambiar foto" : "Subir foto"}
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2 text-error"
                onClick={() => setConfirmDelete(true)}
                disabled={busy !== null}
              >
                {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                {busy === "delete" ? "Eliminando…" : "Eliminar foto"}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="cuenta-title" className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <h2 id="cuenta-title" className="font-display text-lg font-semibold text-secondary">
          Cuenta
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombres" value={user.first_name} />
          <Field label="Apellidos" value={user.last_name} />
          <Field label="Correo" value={user.email} />
        </dl>
        <p className="mt-4 text-xs text-base-content/50">
          El nombre y el correo vienen de tu cuenta institucional de Microsoft.
        </p>
      </section>

      {isStudent && (
        <section aria-labelledby="acudiente-title" className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <h2 id="acudiente-title" className="font-display text-lg font-semibold text-secondary">
            Acudiente registrado
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={user.guardian_full_name} />
            <Field label="Parentesco" value={user.guardian_relationship} />
            <Field label="Correo" value={user.guardian_email} />
            <Field label="Teléfono" value={user.guardian_phone} />
          </dl>
          <p className="mt-4 text-xs text-base-content/50">
            Se actualiza cuando la institución aprueba tu matrícula. A este correo llegan los códigos
            de verificación. Para cambiarlo, actualiza el acudiente en tu próxima{" "}
            <Link to="/matriculas" className="link link-primary">
              matrícula
            </Link>
            .
          </p>
        </section>
      )}

      <ConfirmDeleteDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Eliminar tu foto de perfil"
        confirmText="Eliminar foto"
        irreversible={false}
      >
        <p>Tu cuenta quedará sin foto hasta que subas otra.</p>
      </ConfirmDeleteDialog>
    </div>
  );
}

import { useState } from "react";

const SIZES = {
  sm: "w-10 text-sm",
  lg: "w-14 text-lg",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Foto de perfil del estudiante o, si no hay (o no carga), sus iniciales. Decorativo:
 * el nombre siempre va al lado en texto. */
export function StudentAvatar({
  name,
  photoUrl,
  size = "sm",
}: {
  name: string;
  photoUrl: string | null | undefined;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      <div className="avatar shrink-0">
        <div className={`${SIZES[size]} rounded-full border border-base-300`}>
          <img src={photoUrl} alt="" onError={() => setFailed(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="avatar avatar-placeholder shrink-0" aria-hidden="true">
      <div className={`${SIZES[size]} rounded-full bg-primary/10 font-semibold text-primary`}>
        <span>{initials(name)}</span>
      </div>
    </div>
  );
}

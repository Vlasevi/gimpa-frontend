import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  Loader2,
  X,
} from "lucide-react";
import { apiUrl } from "@/utils/api";
import { useAuth } from "@/components/Login/loginLogic";
import useBodyScrollLock from "@/hooks/useBodyScrollLock";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { Toast } from "@/components/ui/Toast";
import { iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";
import { useToast } from "@/hooks/use-toast";

type CatalogItem = { key: string; label: string; isSelf: boolean };
type CatalogGroup = { group: string; capabilities: CatalogItem[] };
type CapFlat = { key: string; label: string; group: string; isSelf: boolean };
type RoleLite = { slug: string; name: string };
type Role = {
  slug: string;
  name: string;
  isSystem: boolean;
  capabilities: string[];
  viewableRoles: string[];
};

const rolesUrl = apiUrl("/api/accounts/roles/");
const capsUrl = apiUrl("/api/accounts/capabilities/");

export default function Roles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [capsFlat, setCapsFlat] = useState<CapFlat[]>([]);
  const [allRoles, setAllRoles] = useState<RoleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Role | null>(null);
  // Toast compartido (arriba a la derecha), el mismo del resto de la plataforma.
  const { toast, flash } = useToast();

  const groupOf = useMemo(() => {
    const m = new Map<string, string>();
    capsFlat.forEach((c) => m.set(c.key, c.group));
    return m;
  }, [capsFlat]);

  const roleName = useMemo(() => {
    const m = new Map<string, string>();
    allRoles.forEach((r) => m.set(r.slug, r.name));
    return m;
  }, [allRoles]);


  const load = async () => {
    setLoading(true);
    try {
      const [capRes, rolesRes] = await Promise.all([fetch(capsUrl), fetch(rolesUrl)]);
      if (capRes.ok) {
        const cap = await capRes.json();
        setCatalog(cap.catalog || []);
        setCapsFlat(cap.capabilities || []);
        setAllRoles(cap.roles || []);
      }
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-secondary">Roles y Permisos</h1>
        <p className="mt-2 text-base-content/70">Solo un administrador puede gestionar roles.</p>
      </div>
    );
  }

  /** `false` = falló: el diálogo de confirmación queda abierto para reintentar. */
  const handleDelete = async (role: Role) => {
    try {
      const res = await fetch(apiUrl(`/api/accounts/roles/${role.slug}/`), { method: "DELETE" });
      if (res.ok) {
        flash("success", `Rol "${role.name}" eliminado`);
        load();
        return true;
      }
      const data = await res.json().catch(() => ({}));
      flash("error", data.detail || "No se pudo eliminar el rol.");
    } catch {
      flash("error", "No hay conexión con el servidor. Intenta de nuevo.");
    }
    return false;
  };

  const domainsOf = (role: Role): string[] => {
    const set = new Set<string>();
    role.capabilities.forEach((k) => {
      const g = groupOf.get(k);
      if (g) set.add(g);
    });
    return [...set];
  };

  const RoleRow = ({ role }: { role: Role }) => {
    const isAdmin = role.slug === "admin";
    const domains = domainsOf(role);
    const sees = role.viewableRoles.includes("*")
      ? "Todos"
      : role.viewableRoles.length
        ? role.viewableRoles.map((s) => roleName.get(s) || s).join(", ")
        : "Solo a sí mismo";

    return (
      <tr className="border-b border-base-200 last:border-0 hover:bg-base-200/40">
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-base-content">{role.name}</span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Lock className="h-3 w-3" /> Bloqueado
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          {isAdmin ? (
            <span className="text-sm text-base-content/70">Todos los permisos</span>
          ) : domains.length ? (
            <div className="flex flex-wrap gap-1.5">
              {domains.slice(0, 4).map((d) => (
                <span
                  key={d}
                  className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {d}
                </span>
              ))}
              {domains.length > 4 && (
                <span className="px-1 text-xs text-base-content/50">+{domains.length - 4}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-base-content/40">Sin permisos</span>
          )}
        </td>
        <td className="px-6 py-4 text-sm text-base-content/70">{sees}</td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              className={`${iconBtnClass} ${iconHover.primary} disabled:hover:bg-transparent`}
              title={isAdmin ? "El rol admin está bloqueado" : "Editar rol"}
              aria-label={`Editar el rol ${role.name}`}
              disabled={isAdmin}
              onClick={() => setEditing(role)}
            >
              <Pencil className={iconClass} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${iconBtnClass} ${iconHover.error} disabled:hover:bg-transparent`}
              title={isAdmin ? "El rol admin no se puede borrar" : "Eliminar rol"}
              aria-label={`Eliminar el rol ${role.name}`}
              disabled={isAdmin}
              onClick={() => setToDelete(role)}
            >
              <Trash2 className={iconClass} aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-secondary">Roles y Permisos</h1>
          <p className="mt-1 text-base-content/70">
            Crea roles y define qué puede hacer y a quién puede ver cada uno.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Crear rol
        </button>
      </div>

      {loading ? (
        <LoadingState compact className="py-16" label="Cargando roles…" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-300 text-left text-xs uppercase tracking-wide text-base-content/50">
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">Puede hacer</th>
                <th className="px-6 py-3 font-medium">Puede ver</th>
                <th className="px-6 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <RoleRow key={r.slug} role={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <RoleEditor
          role={editing === "new" ? null : editing}
          catalog={catalog}
          allRoles={allRoles}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            flash("success", msg);
            load();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDeleteDialog
          isOpen
          onClose={() => setToDelete(null)}
          onConfirm={() => handleDelete(toDelete)}
          title="Eliminar rol"
          confirmText="Eliminar rol"
        >
          <p>
            Se eliminará el rol <strong>{toDelete.name}</strong>. Las personas con ese rol se quedan sin sus
            permisos.
          </p>
        </ConfirmDeleteDialog>
      )}

      <Toast toast={toast} />
    </div>
  );
}

// ---- Modal de creación/edición -----------------------------------------

function RoleEditor({
  role,
  catalog,
  allRoles,
  onClose,
  onSaved,
}: {
  role: Role | null;
  catalog: CatalogGroup[];
  allRoles: RoleLite[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  useBodyScrollLock(true);
  const [name, setName] = useState(role?.name ?? "");
  const [caps, setCaps] = useState<Set<string>>(new Set(role?.capabilities ?? []));
  const [viewAll, setViewAll] = useState<boolean>((role?.viewableRoles ?? []).includes("*"));
  const [viewRoles, setViewRoles] = useState<Set<string>>(
    new Set((role?.viewableRoles ?? []).filter((s) => s !== "*")),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCap = (key: string) =>
    setCaps((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleGroup = (keys: string[], on: boolean) =>
    setCaps((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const toggleViewRole = (slug: string) =>
    setViewRoles((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });

  const save = async () => {
    if (!role && !name.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      capabilities: [...caps],
      viewableRoles: viewAll ? ["*"] : [...viewRoles],
    };
    const res = await fetch(role ? apiUrl(`/api/accounts/roles/${role.slug}/`) : rolesUrl, {
      method: role ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(role ? `Rol "${body.name}" actualizado.` : `Rol "${body.name}" creado.`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "No se pudo guardar el rol.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-base-300 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-secondary">
              {role ? role.name : "Nuevo rol"}
            </h2>
            <p className="text-sm text-base-content/60">
              {caps.size} permiso{caps.size === 1 ? "" : "s"} seleccionado
              {caps.size === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            className={`${iconBtnClass} ${iconHover.neutral}`}
          >
            <X className={iconClass} aria-hidden="true" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-base-content/70">
              Nombre del rol
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Coordinación"
              className="h-11 w-full rounded-lg border border-base-300 bg-base-200 px-4 text-base text-base-content placeholder:text-base-content/40 transition-colors focus:border-primary focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            />
          </div>

          {/* Capabilities agrupadas */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-base-content">Permisos</h3>
            {catalog.map((g) => {
              const keys = g.capabilities.map((c) => c.key);
              const selected = keys.filter((k) => caps.has(k)).length;
              const allOn = selected === keys.length;
              return (
                <div key={g.group} className="rounded-xl border border-base-300">
                  <div className="flex items-center justify-between border-b border-base-200 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                      {g.group}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-base-content/50">
                        {selected}/{keys.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGroup(keys, !allOn)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {allOn ? "Quitar todo" : "Seleccionar todo"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 p-2 sm:grid-cols-2">
                    {g.capabilities.map((c) => (
                      <label
                        key={c.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-200"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={caps.has(c.key)}
                          onChange={() => toggleCap(c.key)}
                        />
                        <span className="text-sm text-base-content/80">{c.label}</span>
                        {c.isSelf && (
                          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                            propio
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* viewableRoles */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-base-content">¿A qué personas puede ver?</h3>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-200">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm"
                checked={viewAll}
                onChange={(e) => setViewAll(e.target.checked)}
              />
              <span className="text-sm font-medium text-base-content/80">Todos los roles</span>
            </label>
            {!viewAll && (
              <div className="mt-1 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {allRoles.map((r) => (
                  <label
                    key={r.slug}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-200"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={viewRoles.has(r.slug)}
                      onChange={() => toggleViewRole(r.slug)}
                    />
                    <span className="text-sm text-base-content/80">{r.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-base-300 px-6 py-4">
          <button
            onClick={onClose}
            className="h-11 rounded-xl border border-base-300 bg-base-100 px-5 text-sm font-medium text-base-content transition-colors hover:bg-base-200"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-content shadow-sm transition-all hover:bg-primary/95 disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {role ? "Guardar cambios" : "Crear rol"}
          </button>
        </div>
      </div>
    </div>
  );
}

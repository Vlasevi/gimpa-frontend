/**
 * "Registrar nuevo usuario" / editar usuario (Usuarios). Es el modelo del formato de
 * diálogo de formulario de la plataforma (DESIGN_SYSTEM §12b): usa `ui/FormDialog`
 * (`FormDialog`, `FormSection`, `FormInput`, `FormSelect`, `FormActions`), igual que
 * "Registrar usuario" y "Nueva matrícula" de Matrículas.
 */

import { useState, useEffect } from "react";
import { UserPlus, User, Mail, Phone, UserCog, Users } from "lucide-react";
import { apiUrl, buildHeaders } from "@/utils/api";
import { useAuth } from "@/components/Login/loginLogic";
import { LoadingState } from "@/components/ui/LoadingState";
import {
    FormActions,
    FormDialog,
    FormGrid,
    FormInput,
    FormSection,
    FormSelect,
} from "@/components/ui/FormDialog";
import type { ToastVariant } from "@/hooks/use-toast";

const RELATIONSHIP_OPTIONS = ["Padre", "Madre", "Abuelo/a", "Tío/a", "Tutor Legal", "Otro"].map(
    (value) => ({ value, label: value }),
);

// Fallback de etiquetas mientras carga la lista dinámica de roles.
const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    rector: "Rector",
    administrativo: "Administrativo",
    teacher: "Profesor",
    psychologist: "Psicóloga",
    student: "Estudiante",
    otros: "Otros",
    acudiente: "Acudiente",
};

type RoleOption = { slug: string; name: string; isSystem: boolean };

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: any;
    isLoadingData?: boolean;
    /** Toast de la página (arriba a la derecha): el resultado no se muestra dentro del modal. */
    flash: (type: ToastVariant, msg: string) => void;
}

/** Mensaje legible del error del backend (`detail` o el primer error de un campo). */
function errorText(data: unknown, fallback: string): string {
    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        if (typeof record.detail === "string") return record.detail;
        for (const value of Object.values(record)) {
            if (Array.isArray(value) && typeof value[0] === "string") return value[0];
            if (typeof value === "string") return value;
        }
    }
    return fallback;
}

export function UserFormModal({ isOpen, onClose, onSuccess, userToEdit, isLoadingData = false, flash }: UserFormModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const canSelectRole = Boolean(user?.permissions?.users?.canCreate);
    const canAssignAdminRole = user?.role === "admin";

    // Roles disponibles (dinámicos, desde la tabla Role).
    const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
    useEffect(() => {
        if (!isOpen || !canSelectRole) return;
        fetch(apiUrl("/api/accounts/roles/"))
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setAvailableRoles(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [isOpen, canSelectRole]);
    const roleLabel = (slug: string) =>
        availableRoles.find((r) => r.slug === slug)?.name || ROLE_LABELS[slug] || slug;
    const isEditing = !!userToEdit;
    // No se puede cambiar el propio rol (el backend también lo bloquea)
    const isEditingSelf = isEditing && userToEdit?.email === user?.email;

    const [form, setForm] = useState({
        displayname: "",
        first_name: "",
        last_name: "",
        email: "",
        role: "student",
        // Guardian fields
        guardian_full_name: "",
        guardian_email: "",
        guardian_phone: "",
        guardian_relationship: "",
    });

    // Reset form when modal opens or userToEdit changes
    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                setForm({
                    displayname: userToEdit.displayname || "",
                    first_name: userToEdit.first_name || "",
                    last_name: userToEdit.last_name || "",
                    email: userToEdit.email || "",
                    role: userToEdit.role || "student",
                    guardian_full_name: userToEdit.guardian_full_name || "",
                    guardian_email: userToEdit.guardian_email || "",
                    guardian_phone: userToEdit.guardian_phone || "",
                    guardian_relationship: userToEdit.guardian_relationship || "",
                });
            } else {
                setForm({
                    displayname: "",
                    first_name: "",
                    last_name: "",
                    email: "",
                    role: "student",
                    guardian_full_name: "",
                    guardian_email: "",
                    guardian_phone: "",
                    guardian_relationship: "",
                });
            }
        }
    }, [isOpen, userToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "first_name" && !isEditing) {
            setForm((prev) => ({
                ...prev,
                first_name: value,
                displayname: value + " " + prev.last_name,
            }));
        } else if (name === "last_name" && !isEditing) {
            setForm((prev) => ({
                ...prev,
                last_name: value,
                displayname: prev.first_name + " " + value,
            }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // El `Select` no participa en la validación nativa del formulario (el select nativo con `required` sí).
        if (form.role === "student" && !form.guardian_relationship) {
            flash("error", "Selecciona la relación del acudiente.");
            document.getElementById("user-form-guardian-relationship")?.focus();
            return;
        }
        setLoading(true);

        const endpoint = apiUrl("/api/accounts/users/register/");
        const method = isEditing ? "PUT" : "POST";

        // Prepare data: clean guardian fields if not student
        const dataToSend: any = { ...form };
        if (dataToSend.role !== "student") {
            dataToSend.guardian_full_name = null;
            dataToSend.guardian_email = null;
            dataToSend.guardian_phone = null;
            dataToSend.guardian_relationship = null;
        }

        try {
            const res = await fetch(endpoint, {
                method: method,
                headers: buildHeaders(),
                body: JSON.stringify(dataToSend),
                credentials: "include",
            });

            if (res.ok) {
                const name = [form.first_name, form.last_name].filter(Boolean).join(" ") || form.email;
                flash("success", isEditing ? `Usuario ${name} actualizado` : `Usuario ${name} registrado`);
                onSuccess();
                onClose();
            } else {
                const fallback = isEditing ? "No se pudo guardar el usuario." : "No se pudo registrar el usuario.";
                flash("error", errorText(await res.json().catch(() => null), fallback));
            }
        } catch {
            flash("error", "No hay conexión con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const isStudent = form.role === "student";

    // Título de la cabecera: al editar, el nombre del usuario (como un detalle);
    // al crear, la acción. Durante la carga se mantiene el contexto de edición.
    const headerTitle = isLoadingData
        ? "Editar usuario"
        : isEditing
            ? `${form.first_name} ${form.last_name}`.trim() || "Editar usuario"
            : "Registrar nuevo usuario";

    const headerDescription = isLoadingData ? (
        "Cargando datos…"
    ) : isEditing ? (
        <>
            {form.email && <span>{form.email}</span>}
            {form.role && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                    {roleLabel(form.role)}
                </span>
            )}
        </>
    ) : (
        "Completa los datos del nuevo usuario"
    );

    return (
        <FormDialog
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            description={headerDescription}
            icon={isEditing || isLoadingData ? UserCog : UserPlus}
        >
            {isLoadingData ? (
                <LoadingState compact className="py-20" label="Cargando datos…" />
            ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <FormSection title="Datos del usuario" required>
                        <FormGrid>
                            <FormInput
                                label="Nombre"
                                icon={User}
                                name="first_name"
                                required
                                placeholder="Ej: Juan"
                                value={form.first_name}
                                onChange={handleChange}
                            />
                            <FormInput
                                label="Apellido"
                                icon={User}
                                name="last_name"
                                required
                                placeholder="Ej: Pérez"
                                value={form.last_name}
                                onChange={handleChange}
                            />
                            <FormInput
                                label="Email"
                                icon={Mail}
                                type="email"
                                name="email"
                                placeholder="ejemplo@correo.com"
                                value={form.email}
                                onChange={handleChange}
                                readOnly={isEditing}
                                title={isEditing ? "El email no se puede cambiar" : undefined}
                            />
                            {canSelectRole ? (
                                <div title={isEditingSelf ? "No puedes cambiar tu propio rol" : undefined}>
                                    <FormSelect
                                        label="Rol"
                                        name="role"
                                        required
                                        value={form.role}
                                        onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
                                        disabled={isEditingSelf}
                                        options={[
                                            // Roles dinámicos desde la tabla Role. admin solo si el actor es admin.
                                            ...availableRoles
                                                .filter((r) => r.slug !== "admin" || canAssignAdminRole)
                                                .map((r) => ({ value: r.slug, label: r.name })),
                                            // Asegura que el rol actual (al editar) siempre tenga opción.
                                            ...(form.role && !availableRoles.some((r) => r.slug === form.role)
                                                ? [{ value: form.role, label: roleLabel(form.role) }]
                                                : []),
                                        ]}
                                    />
                                </div>
                            ) : (
                                <input type="hidden" name="role" value="student" />
                            )}
                        </FormGrid>
                    </FormSection>

                    {isStudent && (
                        <FormSection title="Datos del acudiente" required>
                            <FormGrid>
                                <FormInput
                                    label="Nombre completo"
                                    icon={Users}
                                    name="guardian_full_name"
                                    required
                                    placeholder="Ej: María García"
                                    value={form.guardian_full_name}
                                    onChange={handleChange}
                                />
                                <FormSelect
                                    id="user-form-guardian-relationship"
                                    label="Relación"
                                    name="guardian_relationship"
                                    required
                                    value={form.guardian_relationship}
                                    onChange={(v) => setForm((prev) => ({ ...prev, guardian_relationship: v }))}
                                    placeholder="Selecciona…"
                                    options={RELATIONSHIP_OPTIONS}
                                />
                                <FormInput
                                    label="Email acudiente"
                                    icon={Mail}
                                    type="email"
                                    name="guardian_email"
                                    required
                                    placeholder="acudiente@correo.com"
                                    value={form.guardian_email}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Teléfono acudiente"
                                    icon={Phone}
                                    type="tel"
                                    name="guardian_phone"
                                    required
                                    placeholder="Ej: 3001234567"
                                    value={form.guardian_phone}
                                    onChange={handleChange}
                                />
                            </FormGrid>
                        </FormSection>
                    )}

                    <FormActions
                        onCancel={onClose}
                        busy={loading}
                        submitText={isEditing ? "Guardar" : "Registrar"}
                        busyText={isEditing ? "Guardando…" : "Registrando…"}
                    />
                </form>
            )}
        </FormDialog>
    );
}

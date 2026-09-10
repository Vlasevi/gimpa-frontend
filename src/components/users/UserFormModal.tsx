import { useState, useEffect } from "react";
import { UserPlus, User, Mail, Phone, Save, X, UserCog, Users, ChevronDown } from "lucide-react";
import { apiUrl, buildHeaders } from "@/utils/api";
import { useAuth } from "@/components/Login/loginLogic";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { LoadingState } from "@/components/ui/LoadingState";

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
}

export function UserFormModal({ isOpen, onClose, onSuccess, userToEdit, isLoadingData = false }: UserFormModalProps) {
    const { user } = useAuth();
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
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
            setSuccessMsg("");
            setErrorMsg("");
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
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

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
                setSuccessMsg(isEditing ? "¡Usuario actualizado!" : "¡Usuario registrado exitosamente!");
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                const errorData = await res.json();
                let errorText = "Error en la operación.";
                if (typeof errorData.detail === "string") {
                    errorText = `Error: ${errorData.detail}`;
                } else if (errorData.email) {
                    errorText = `Error Email: ${errorData.email}`;
                } else {
                    errorText = `Error: ${JSON.stringify(errorData)}`;
                }
                setErrorMsg(errorText);
            }
        } catch (error) {
            setErrorMsg("Error de conexión al servidor.");
        } finally {
            setLoading(false);
        }
    };

    const isStudent = form.role === "student";

    const [isVisible, setIsVisible] = useState(false);

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    // `fill-mode-forwards` en la salida evita el parpadeo al cerrar (el elemento
    // conserva el estado final desplazado/transparente hasta desmontarse).
    const modalAnimation = isOpen
        ? "animate-in fade-in slide-in-from-bottom-16 duration-500"
        : "animate-out fade-out slide-out-to-bottom-16 duration-300 fill-mode-forwards";

    const backdropAnimation = isOpen
        ? "animate-in fade-in duration-300"
        : "animate-out fade-out duration-300 fill-mode-forwards";

    // Common input styles (Compact version)
    const inputClass = "w-full pl-9 pr-3 py-2 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-base-content/30 text-sm";

    // Select class with custom arrow handling
    const selectClass = "w-full pl-3 pr-8 py-2 border border-base-300 rounded-lg bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer text-sm";

    const labelClass = "text-xs font-bold text-base-content mb-1 block";
    const iconClass = "absolute inset-y-0 left-0 pl-3 flex items-center text-base-content/40 group-focus-within:text-primary pointer-events-none transition-colors";

    // Chevron for select
    const ChevronIcon = () => (
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-base-content/50">
            <ChevronDown className="h-4 w-4" />
        </div>
    );

    // Título de la cabecera: al editar, el nombre del usuario (como un detalle);
    // al crear, la acción. Durante la carga se mantiene el contexto de edición.
    const headerTitle = isLoadingData
        ? "Editar Usuario"
        : isEditing
            ? `${form.first_name} ${form.last_name}`.trim() || "Editar Usuario"
            : "Registrar Nuevo Usuario";

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto ${backdropAnimation}`}>
            <div className={`w-full max-w-3xl max-h-[90vh] bg-base-200 border border-base-300 rounded-lg shadow-2xl flex flex-col overflow-hidden font-sans ${modalAnimation}`}>

                {/* HEADER estándar: mismo lenguaje que el detalle de matrícula/contratación
                    (cabecera clara, avatar con borde institucional, título font-display). */}
                <header className="bg-base-100 border-b border-base-300 px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-2 border-primary p-1 bg-base-100 shrink-0">
                            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                                {isEditing || isLoadingData ? (
                                    <UserCog className="w-8 h-8 text-primary/70" />
                                ) : (
                                    <UserPlus className="w-8 h-8 text-primary/70" />
                                )}
                            </div>
                        </div>
                        <div>
                            <h2 className="font-display text-2xl font-bold text-secondary leading-tight">
                                {headerTitle}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {isLoadingData ? (
                                    <span className="text-sm text-base-content/50">Cargando datos…</span>
                                ) : isEditing ? (
                                    <>
                                        {form.email && (
                                            <span className="text-sm text-base-content/60">{form.email}</span>
                                        )}
                                        {form.role && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                                                {roleLabel(form.role)}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm text-base-content/60">
                                        Completa los datos del nuevo usuario
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
                    >
                        <X className="h-6 w-6 text-base-content" />
                    </button>
                </header>

                {/* CONTENT */}
                {isLoadingData ? (
                    <LoadingState compact className="flex-1 py-20" label="Cargando datos…" />
                ) : (
                    <form className="flex-1 overflow-y-auto p-6 space-y-5" onSubmit={handleSubmit}>

                        {/* Messages */}
                        {successMsg && (
                            <div className="bg-success/10 border border-success/20 text-success px-4 py-2 rounded-lg text-sm">
                                {successMsg}
                            </div>
                        )}
                        {errorMsg && (
                            <div className="bg-error/10 border border-error/20 text-error px-4 py-2 rounded-lg text-sm">
                                {errorMsg}
                            </div>
                        )}

                        {/* SECTION 1: USER DATA - Removed border */}
                        <div className="bg-base-100 p-5 rounded-lg shadow-sm">
                            <h3 className="text-primary font-bold text-base mb-4 flex items-center border-b border-base-200 pb-2">
                                Datos del Usuario
                                <span className="text-error ml-1">*</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* First Name */}
                                <div>
                                    <label className={labelClass}>
                                        Nombre <span className="text-error">*</span>
                                    </label>
                                    <div className="relative group">
                                        <span className={iconClass}>
                                            <User className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="first_name"
                                            required
                                            placeholder="Ej: Juan"
                                            value={form.first_name}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className={labelClass}>
                                        Apellido <span className="text-error">*</span>
                                    </label>
                                    <div className="relative group">
                                        <span className={iconClass}>
                                            <User className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="last_name"
                                            required
                                            placeholder="Ej: Pérez"
                                            value={form.last_name}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className={labelClass}>
                                        Email <span className="text-error">*</span>
                                    </label>
                                    <div className="relative group">
                                        <span className={iconClass}>
                                            <Mail className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="ejemplo@correo.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            readOnly={isEditing}
                                            className={`${inputClass} ${isEditing ? "bg-base-200 cursor-not-allowed" : ""}`}
                                            title={isEditing ? "El email no se puede cambiar" : ""}
                                        />
                                    </div>
                                </div>

                                {/* Role */}
                                {canSelectRole ? (
                                    <div>
                                        <label className={labelClass}>
                                            Rol <span className="text-error">*</span>
                                        </label>
                                        <div className="relative group">
                                            <select
                                                name="role"
                                                required
                                                value={form.role}
                                                onChange={handleChange}
                                                disabled={isEditingSelf}
                                                className={`${selectClass} ${isEditingSelf ? "bg-base-200 cursor-not-allowed" : ""}`}
                                                title={isEditingSelf ? "No puedes cambiar tu propio rol" : ""}
                                            >
                                                {/* Roles dinámicos desde la tabla Role. admin solo si el actor es admin. */}
                                                {availableRoles
                                                    .filter((r) => r.slug !== "admin" || canAssignAdminRole)
                                                    .map((r) => (
                                                        <option key={r.slug} value={r.slug}>
                                                            {r.name}
                                                        </option>
                                                    ))}
                                                {/* Asegura que el rol actual (al editar) siempre tenga opción. */}
                                                {form.role &&
                                                    !availableRoles.some((r) => r.slug === form.role) && (
                                                        <option value={form.role}>{roleLabel(form.role)}</option>
                                                    )}
                                            </select>
                                            <ChevronIcon />
                                        </div>
                                    </div>
                                ) : (
                                    <input type="hidden" name="role" value="student" />
                                )}
                            </div>
                        </div>

                        {/* SECTION 2: GUARDIAN DATA (Only for students) - Removed border */}
                        {isStudent && (
                            <div className="bg-base-100 p-5 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="text-primary font-bold text-base mb-4 flex items-center border-b border-base-200 pb-2">
                                    Datos del Acudiente
                                    <span className="text-error ml-1">*</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Guardian Full Name */}
                                    <div>
                                        <label className={labelClass}>
                                            Nombre Completo <span className="text-error">*</span>
                                        </label>
                                        <div className="relative group">
                                            <span className={iconClass}>
                                                <Users className="h-4 w-4" />
                                            </span>
                                            <input
                                                type="text"
                                                name="guardian_full_name"
                                                required={isStudent}
                                                placeholder="Ej: María García"
                                                value={form.guardian_full_name}
                                                onChange={handleChange}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {/* Guardian Relationship */}
                                    <div>
                                        <label className={labelClass}>
                                            Relación <span className="text-error">*</span>
                                        </label>
                                        <div className="relative group">
                                            <select
                                                name="guardian_relationship"
                                                required={isStudent}
                                                value={form.guardian_relationship}
                                                onChange={handleChange}
                                                className={selectClass}
                                            >
                                                <option value="">Seleccione...</option>
                                                <option value="Padre">Padre</option>
                                                <option value="Madre">Madre</option>
                                                <option value="Abuelo/a">Abuelo/a</option>
                                                <option value="Tío/a">Tío/a</option>
                                                <option value="Tutor Legal">Tutor Legal</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                            <ChevronIcon />
                                        </div>
                                    </div>

                                    {/* Guardian Email */}
                                    <div>
                                        <label className={labelClass}>
                                            Email Acudiente <span className="text-error">*</span>
                                        </label>
                                        <div className="relative group">
                                            <span className={iconClass}>
                                                <Mail className="h-4 w-4" />
                                            </span>
                                            <input
                                                type="email"
                                                name="guardian_email"
                                                required={isStudent}
                                                placeholder="acudiente@correo.com"
                                                value={form.guardian_email}
                                                onChange={handleChange}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {/* Guardian Phone */}
                                    <div>
                                        <label className={labelClass}>
                                            Teléfono Acudiente <span className="text-error">*</span>
                                        </label>
                                        <div className="relative group">
                                            <span className={iconClass}>
                                                <Phone className="h-4 w-4" />
                                            </span>
                                            <input
                                                type="tel"
                                                name="guardian_phone"
                                                required={isStudent}
                                                placeholder="Ej: 3001234567"
                                                value={form.guardian_phone}
                                                onChange={handleChange}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FOOTER / BUTTONS */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-300">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="btn btn-ghost"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary text-primary-content shadow-sm"
                            >
                                {loading ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    <span>{isEditing ? "Guardar" : "Registrar"}</span>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { UserPlus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { apiUrl, buildHeaders } from "@/utils/api";
import { useAuth } from "@/components/Login/loginLogic";
import { UserFormModal } from "@/components/users/UserFormModal";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { LoadingState } from "@/components/ui/LoadingState";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";
import { iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";

interface User {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    displayname?: string;
    guardian_full_name?: string;
    guardian_email?: string;
    guardian_phone?: string;
    guardian_relationship?: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: "admin", label: "Administrador" },
    { value: "rector", label: "Rector" },
    { value: "administrativo", label: "Administrativo" },
    { value: "teacher", label: "Profesor" },
    { value: "psychologist", label: "Psicóloga" },
    { value: "student", label: "Estudiante" },
    { value: "otros", label: "Otros" },
];

export default function Usuarios() {
    const { user } = useAuth();
    const userPermissions = user?.permissions?.users;
    const canViewUsers = Boolean(userPermissions?.canView);
    const canCreateUsers = Boolean(userPermissions?.canCreate);
    const canEditUsers = Boolean(userPermissions?.canEdit);
    const canDeleteUsers = Boolean(userPermissions?.canDelete);

    if (!canViewUsers) {
        return <Navigate to="/unauthorized" replace />;
    }

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
    const [loadingUserDetail, setLoadingUserDetail] = useState(false);

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Toast compartido (arriba a la derecha), el mismo de Matrículas.
    const { toast, flash: showToast } = useToast();

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch(apiUrl("/api/accounts/users/"), {
                credentials: "include",
                headers: buildHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Error al cargar usuarios");
            }
        } catch (err) {
            setError("Error de conexión al servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = () => {
        setEditingUser(undefined);
        setIsFormModalOpen(true);
    };

    const handleEdit = async (user: User) => {
        // Open modal immediately with loading state
        setEditingUser(undefined);
        setLoadingUserDetail(true);
        setIsFormModalOpen(true);

        try {
            const response = await fetch(apiUrl(`/api/accounts/users/${user.email}/`), {
                credentials: "include",
                headers: buildHeaders(),
            });

            if (response.ok) {
                const fullUserData = await response.json();
                setEditingUser(fullUserData);
            } else {
                const errorData = await response.json();
                showToast("error", errorData.detail || "Error al cargar datos del usuario");
                setIsFormModalOpen(false);
            }
        } catch (error) {
            showToast("error", "Error de conexión al cargar usuario");
            setIsFormModalOpen(false);
        } finally {
            setLoadingUserDetail(false);
        }
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    /** `false` = falló: el diálogo de confirmación queda abierto para reintentar. */
    const confirmDelete = async () => {
        if (!userToDelete) return false;
        try {
            const response = await fetch(apiUrl("/api/accounts/users/register/"), {
                method: "DELETE",
                headers: buildHeaders(),
                body: JSON.stringify({ email: userToDelete.email }),
                credentials: "include",
            });

            if (response.ok) {
                fetchUsers();
                showToast("success", `Usuario ${getUserDisplayName(userToDelete)} eliminado`);
                return true;
            }
            const data = await response.json().catch(() => ({}));
            showToast("error", data.detail || "Error al eliminar usuario");
        } catch {
            showToast("error", "Error de conexión al eliminar usuario");
        }
        return false;
    };

    // Filter users by search term and role (frontend search)
    const filteredUsers = users.filter((u) => {
        const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "" || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when search or role filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    // Helper function to get display name
    const getUserDisplayName = (user: User) => {
        if (user.first_name || user.last_name) {
            return `${user.first_name} ${user.last_name}`.trim();
        }
        return user.email;
    };

    // Role badge color
    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            admin: "badge-error",
            rector: "badge-warning",
            teacher: "badge-info",
            psychologist: "badge-secondary",
            administrativo: "badge-primary",
            otros: "badge-neutral",
            student: "badge-success",
        };
        const labels: Record<string, string> = {
            admin: "Administrador",
            rector: "Rector",
            teacher: "Profesor",
            psychologist: "Psicóloga",
            administrativo: "Administrativo",
            otros: "Otros",
            student: "Estudiante",
        };
        return (
            <span className={`badge ${colors[role] || "badge-ghost"} badge-sm`}>
                {labels[role] || role}
            </span>
        );
    };

    return (
        <div className="container mx-auto px-6 pt-2 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="font-display text-3xl font-bold text-secondary">Gestión de Usuarios</h1>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="input input-bordered w-96"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <FilterSelect
                        className="w-56"
                        ariaLabel="Filtrar por rol"
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={[
                            { value: "", label: "Todos los roles" },
                            ...ROLE_OPTIONS,
                        ]}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {canCreateUsers && (
                        <button className="btn btn-primary" onClick={handleCreate}>
                            <UserPlus className="w-5 h-5 mr-2" />
                            Nuevo Usuario
                        </button>
                    )}
                    <button className="btn" onClick={fetchUsers}>
                        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="alert alert-error mb-4">
                    <span>{error}</span>
                </div>
            )}

            {/* Users table */}
            <div className="bg-base-100 rounded-lg shadow-sm border border-base-300 overflow-hidden">
                <table className="table w-full table-fixed">
                    <thead className="bg-base-200 text-base-content">
                        <tr>
                            <th className="w-[30%]">Nombre</th>
                            <th className="w-[40%]">Email</th>
                            <th className="w-[15%]">Rol</th>
                            <th className="w-[15%] text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-8">
                                    <LoadingState compact label="Cargando usuarios…" />
                                </td>
                            </tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-base-content/50">
                                    {filteredUsers.length === 0 && (searchTerm || roleFilter)
                                        ? "No se encontraron usuarios que coincidan con los filtros"
                                        : "No se encontraron usuarios"}
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((u) => (
                                <tr key={u.email} className="hover:bg-base-200/50 transition-colors">
                                    <td className="font-medium truncate" title={getUserDisplayName(u)}>
                                        {getUserDisplayName(u)}
                                    </td>
                                    <td className="text-base-content/60 truncate" title={u.email}>
                                        {u.email}
                                    </td>
                                    <td>{getRoleBadge(u.role)}</td>
                                    <td className="text-right">
                                        <div className="flex justify-center gap-1">
                                            {canEditUsers && (
                                                <button
                                                    type="button"
                                                    className={`${iconBtnClass} ${iconHover.primary}`}
                                                    title="Editar"
                                                    aria-label={`Editar a ${getUserDisplayName(u)}`}
                                                    onClick={() => handleEdit(u)}
                                                >
                                                    <Pencil className={iconClass} aria-hidden="true" />
                                                </button>
                                            )}
                                            {canDeleteUsers && (
                                                <button
                                                    type="button"
                                                    className={`${iconBtnClass} ${iconHover.error}`}
                                                    title="Eliminar"
                                                    aria-label={`Eliminar a ${getUserDisplayName(u)}`}
                                                    onClick={() => handleDeleteClick(u)}
                                                >
                                                    <Trash2 className={iconClass} aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && filteredUsers.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-base-content/60">
                        Mostrando {startIndex + 1} a {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length} usuarios
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="btn"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            «
                        </button>

                        <div className="join">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <input
                                    key={page}
                                    type="radio"
                                    name="pagination"
                                    className="join-item btn btn-square"
                                    aria-label={String(page)}
                                    checked={page === currentPage}
                                    onChange={() => setCurrentPage(page)}
                                />
                            ))}
                        </div>

                        <button
                            className="btn"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            »
                        </button>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <UserFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSuccess={fetchUsers}
                flash={showToast}
                userToEdit={editingUser}
                isLoadingData={loadingUserDetail}
            />

            {/* Confirmación de eliminar (componente compartido) */}
            {userToDelete && (
                <ConfirmDeleteDialog
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Eliminar usuario"
                    confirmText="Eliminar usuario"
                >
                    <p>
                        Se eliminará al usuario <strong>{getUserDisplayName(userToDelete)}</strong> ({userToDelete.email})
                        con sus datos y sus archivos asociados.
                    </p>
                </ConfirmDeleteDialog>
            )}

            {/* Toast de feedback */}
            <Toast toast={toast} />
        </div>
    );
}

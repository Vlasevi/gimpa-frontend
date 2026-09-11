import React, { useContext, useState, useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Spinner from "@/components/auxiliar/Spinner";
import { apiUrl, AUTH_PATHS, API_ENDPOINTS } from "@/utils/api";
import {
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/utils/tokens";
import { clearAllDrafts } from "@/hooks/useAutosaveDraft";

// Tipos de roles del backend. Con roles dinámicos, el rol es cualquier slug; se listan
// los de sistema para autocompletar, pero `(string & {})` permite cualquier valor.
export type UserRole =
  | 'admin'
  | 'rector'
  | 'administrativo'
  | 'coordinacion'
  | 'teacher'
  | 'student'
  | 'psychologist'
  | 'acudiente'
  | 'otros'
  | (string & {});

// Permisos por sección que vienen del backend
export interface SectionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove?: boolean;
  canManage?: boolean;
  canExport?: boolean;
  // Operación interna de admisiones (fase 2)
  canValidate?: boolean;
  canManagePayments?: boolean;
  canReviewDocuments?: boolean;
  // Agenda y evaluación de admisiones (fase 3)
  canScheduleInterviews?: boolean;
  canConductFamilyInterview?: boolean;
  canConductAcademicDiagnosis?: boolean;
  canConductPsychopedReview?: boolean;
  // Comité y decisión de admisiones (fase 4)
  canManageCommittee?: boolean;
  canDecide?: boolean;
}

// Permisos de visibilidad/edición de documentos por clase de sensibilidad
export interface DocumentPermissions {
  canViewNormal: boolean;
  canViewMedical: boolean;
  canViewSensitive: boolean;
  canEditMedical: boolean;
}

// Permisos del módulo de contratación
export interface ContractingPermissions {
  canManage: boolean;
  canViewAll: boolean;
  canFillOwn: boolean;
}

export interface UserPermissions {
  global: SectionPermissions;
  users: SectionPermissions;
  enrollments: SectionPermissions;
  grades: SectionPermissions;
  payments: SectionPermissions;
  certifications: SectionPermissions;
  documents: DocumentPermissions;
  contracting: ContractingPermissions;
  admissions: SectionPermissions;
}

// Secciones cuyo valor es SectionPermissions (excluye 'documents' y
// 'contracting', que usan su propia forma). Útil para guards/hooks por sección.
export type PermissionSection = Exclude<
  keyof UserPermissions,
  "documents" | "contracting"
>;

export interface User {
  displayname: string;
  email: string;
  first_name: string;
  last_name: string;
  // Puede ser null: un usuario nuevo entra SIN rol hasta que un admin se lo asigne.
  role: UserRole | null;
  // null → "cuenta sin accesos".
  permissions: UserPermissions | null;
  guardian_full_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  user_data?: Record<string, any>;
}

// Payload que devuelven login-admissions y login-social/exchange.
export interface AuthPayload {
  access: string;
  refresh: string;
  user: User;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  checkAuth: () => Promise<void>;
  loginWithPayload: (payload: AuthPayload) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  isLoggingOut: false,
  checkAuth: async () => {},
  loginWithPayload: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  // Rehidratación al cargar: si hay refresh en localStorage, pedimos /me. El
  // interceptor global adjunta el Bearer y refresca el access si hace falta.
  const checkAuth = async () => {
    setLoading(true);

    if (!getRefreshToken()) {
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.me), {
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setAuthenticated(true);
      } else {
        clearTokens();
        setAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      clearTokens();
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Tras login por correo o canje del one-time code del SSO.
  const loginWithPayload = (payload: AuthPayload) => {
    setTokens(payload.access, payload.refresh);
    setUser(payload.user);
    setAuthenticated(true);
    setLoading(false);
  };

  const logout = async () => {
    setIsLoggingOut(true);
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await fetch(apiUrl(AUTH_PATHS.logout), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
      }
    } catch (error) {
      // Ignoramos errores de red en logout: igual limpiamos el estado local.
    } finally {
      clearTokens();
      // Borradores de formularios sin guardar (solo viven en este navegador y pueden
      // traer datos de salud): no deben quedar para el siguiente que use el equipo.
      clearAllDrafts();
      setAuthenticated(false);
      setUser(null);
      navigate("/login", { replace: true });
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, isLoading, isLoggingOut, checkAuth, loginWithPayload, logout }}
    >
      {children}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-base-100/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-base-content/70">Cerrando sesión…</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Hook helper para acceder a permisos de una sección específica
export function usePermissions(section: PermissionSection): SectionPermissions {
  const { user } = useAuth();

  const defaultPermissions: SectionPermissions = {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canManage: false,
  };

  if (!user?.permissions) {
    return defaultPermissions;
  }

  return user.permissions[section] || defaultPermissions;
}

// Hook helper para verificar si el usuario tiene un rol específico
export function useHasRole(...roles: UserRole[]): boolean {
  const { user } = useAuth();
  if (!user?.role) return false;
  return roles.includes(user.role);
}

/**
 * ¿Es una cuenta externa de admisiones (acudiente)?
 *
 * Se decide por **capabilities**, no por el slug del rol: cualquier usuario cuyo único
 * acceso sea admisiones recibe la experiencia del acudiente. Así, si mañana se crea un
 * rol distinto con ese mismo alcance desde `/roles`, funciona sin tocar código.
 */
export function isGuardianOnly(user: User | null): boolean {
  const p = user?.permissions;
  if (!p) return false;

  const hasStaffAccess =
    p.users?.canView ||
    p.enrollments?.canView ||
    p.grades?.canView ||
    p.payments?.canView ||
    p.certifications?.canView ||
    p.contracting?.canManage ||
    p.contracting?.canViewAll ||
    p.contracting?.canFillOwn;

  return !hasStaffAccess && Boolean(p.admissions?.canView);
}

/** Ruta de inicio según a qué tiene acceso el usuario. */
export function resolveHomePath(user: User | null): string {
  if (isGuardianOnly(user)) return "/admisiones";
  return "/dashboard";
}

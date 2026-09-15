import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import {
  AuthProvider,
  ProtectedRoute,
  useAuth,
  isGuardianOnly,
  resolveHomePath,
} from "@/components/Login/loginLogic";
import { PermissionRoute } from "@/components/PermissionRoute";
import Spinner from "@/components/auxiliar/Spinner";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Layout from "./components/Layout";
import AcudienteLayout from "./components/AcudienteLayout";
import Dashboard from "./pages/Dashboard";
import Estudiantes from "./pages/Estudiantes";
import Matriculas from "./pages/Matriculas";
import Notas from "./pages/Notas";
import Pagos from "./pages/Pagos";
import Certificados from "./pages/Certificados";
import Usuarios from "./pages/Usuarios";
import Roles from "./pages/Roles";
import Contratacion from "./pages/Contratacion";
import MiContrato from "./pages/MiContrato";
import Perfil from "./pages/Perfil";
import Admisiones from "./pages/Admisiones";
import ActividadPage from "@/components/admisiones/valoracion/ActividadPage";
import NotAuthorized from "./pages/NotAuthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Envía a cada quien a su inicio: el acudiente a admisiones, el staff al dashboard. */
const HomeRedirect = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  return <Navigate to={resolveHomePath(user)} replace />;
};

/** Marco según quién entra: el acudiente ve su propia área; el resto, la institucional. */
const AppArea = () => {
  const { user } = useAuth();
  return isGuardianOnly(user) ? <AcudienteLayout /> : <Layout />;
};

/**
 * Rutas institucionales. Un acudiente no tiene nada que hacer aquí, así que se le
 * devuelve a su propia área.
 */
const StaffOnly = () => {
  const { user } = useAuth();
  if (isGuardianOnly(user)) return <Navigate to="/admisiones" replace />;
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/unauthorized" element={<NotAuthorized />} />
          <Route path="/404" element={<NotFound />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppArea />}>
              {/* --- Solo staff --- */}
              <Route element={<StaffOnly />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/estudiantes" element={<Estudiantes />} />
                <Route
                  path="/matriculas"
                  element={
                    <PermissionRoute section="enrollments" anyOf={["canView"]}>
                      <Matriculas />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/notas"
                  element={
                    <PermissionRoute section="grades" anyOf={["canView", "canManage"]}>
                      <Notas />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/pagos"
                  element={
                    <PermissionRoute section="payments" anyOf={["canView", "canManage"]}>
                      <Pagos />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/certificados"
                  element={
                    <PermissionRoute section="certifications" anyOf={["canView", "canManage"]}>
                      <Certificados />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <PermissionRoute section="users" anyOf={["canView"]}>
                      <Usuarios />
                    </PermissionRoute>
                  }
                />
                <Route path="/roles" element={<Roles />} />
                <Route path="/contratacion" element={<Contratacion />} />
                <Route path="/mi-contrato" element={<MiContrato />} />
                <Route path="/perfil" element={<Perfil />} />
                {/* Formulario de una actividad de la valoración (se abre en otra pestaña). */}
                <Route path="/admisiones/:id/:actividad" element={<ActividadPage />} />
              </Route>

              {/* Acudiente y staff comparten la ruta; la página elige la vista. Las URLs
                  viejas (`/admisiones-admin`, `/admisiones/<código>/…`) llevan aquí. */}
              <Route path="/admisiones" element={<Admisiones />} />
              <Route path="/admisiones/*" element={<Navigate to="/admisiones" replace />} />
              <Route path="/admisiones-admin" element={<Navigate to="/admisiones" replace />} />
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
export default App;

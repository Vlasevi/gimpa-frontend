import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AdmisionesAdmin from "./pages/AdmisionesAdmin";
import MisAdmisiones from "./pages/admisiones/MisAdmisiones";
import NuevaAdmision from "./pages/admisiones/NuevaAdmision";
import DetalleAdmision from "./pages/admisiones/DetalleAdmision";
import SolicitudWizard from "./pages/admisiones/SolicitudWizard";
import NotAuthorized from "./pages/NotAuthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Envía a cada quien a su inicio: el acudiente a admisiones, el staff al dashboard. */
const HomeRedirect = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  return <Navigate to={resolveHomePath(user)} replace />;
};

/**
 * Área institucional. Un acudiente no tiene nada que hacer aquí (vería el sidebar
 * del colegio), así que se le devuelve a su propia área.
 */
const StaffArea = () => {
  const { user } = useAuth();
  if (isGuardianOnly(user)) return <Navigate to="/admisiones" replace />;
  return <Layout />;
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
            {/* --- Área institucional (staff) --- */}
            <Route element={<StaffArea />}>
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
              <Route
                path="/admisiones-admin"
                element={
                  <PermissionRoute section="admissions" anyOf={["canView"]}>
                    <AdmisionesAdmin />
                  </PermissionRoute>
                }
              />
              <Route path="/roles" element={<Roles />} />
              <Route path="/contratacion" element={<Contratacion />} />
              <Route path="/mi-contrato" element={<MiContrato />} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>

            {/* --- Área del acudiente (admisiones) --- */}
            <Route element={<AcudienteLayout />}>
              <Route path="/admisiones" element={<MisAdmisiones />} />
              <Route path="/admisiones/nueva" element={<NuevaAdmision />} />
              <Route path="/admisiones/:code" element={<DetalleAdmision />} />
              <Route
                path="/admisiones/:code/solicitud"
                element={<SolicitudWizard />}
              />
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

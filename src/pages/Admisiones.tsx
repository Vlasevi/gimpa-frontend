// pages/Admisiones.tsx
import { Navigate } from "react-router-dom";
import { isGuardianOnly, useAuth } from "@/components/Login/loginLogic";
import { AdmisionesAcudiente } from "@/components/admisiones/AdmisionesAcudiente";
import AdmisionesAdmin from "@/components/admisiones/AdmisionesAdmin";

/** `/admisiones`: el acudiente ve sus solicitudes; el staff, el panel de expedientes. */
const Admisiones = () => {
  const { user } = useAuth();

  if (!user) return null;
  if (isGuardianOnly(user)) return <AdmisionesAcudiente />;
  if (!user.permissions?.admissions?.canView) return <Navigate to="/unauthorized" replace />;
  return <AdmisionesAdmin />;
};

export default Admisiones;

import { useNavigate } from 'react-router-dom';

export default function NotAuthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <div className="text-center space-y-6 p-8">
        <div className="text-6xl">🚫</div>
        <h1 className="text-4xl font-bold">Acceso No Autorizado</h1>
        <p className="text-xl text-base-content/60 max-w-md">
          No tienes permisos para acceder a esta página con tu rol actual.
        </p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}

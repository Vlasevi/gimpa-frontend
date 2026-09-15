import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "@/assets/logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: ruta inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-base-100 p-10 text-center shadow-xl">
        <img
          src={Logo}
          alt="Escudo de Gimnasio El Paraíso"
          className="mx-auto h-20 w-auto select-none"
          draggable={false}
        />

        <p className="mt-8 font-display text-6xl font-bold tracking-tight text-secondary">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-base-content">
          Página no encontrada
        </h1>
        <p className="mt-3 text-base text-base-content/60">
          La página que buscas no existe o fue movida.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-6 text-base font-medium text-primary-content shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

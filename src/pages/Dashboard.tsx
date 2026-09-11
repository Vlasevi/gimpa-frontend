import welcome from "@/assets/welcome.png";

export default function Dashboard() {
  return (
    // El banner ya trae el título, el mensaje y su propio fondo redondeado: va sin
    // tarjeta alrededor. Dentro del <h1> para que la página conserve su encabezado
    // (el `alt` es el nombre accesible del título).
    <h1 className="mx-auto max-w-3xl">
      <img
        src={welcome}
        alt="¡Bienvenido a la plataforma de GIMPA! Has iniciado sesión exitosamente"
        className="h-auto w-full select-none"
        draggable={false}
      />
    </h1>
  );
}

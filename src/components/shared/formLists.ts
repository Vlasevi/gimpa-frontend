// Listas compartidas de opciones (mismas que la matrícula del estudiante).
export const COUNTRIES = [
  "Colombia",
  "Venezuela",
  "Estados Unidos",
  "España",
  "México",
  "Ecuador",
  "Perú",
  "Otro",
];

export const DOCUMENT_TYPES = [
  "Registro Civil (RC)",
  "Tarjeta de Identidad (TI)",
  "Cédula de Ciudadanía (CC)",
  "Cédula de Extranjería (CE)",
  "Pasaporte (PP)",
  "Permiso de Protección Temporal (PPT)",
];

export const EPS_LIST = [
  "Nueva EPS",
  "Coosalud EPS-S",
  "Mutual SER",
  "Salud Total EPS S.A.",
  "Asmet Salud",
  "Capital Salud EPS-S S.A.S.",
  "Savia Salud EPS",
  "EPS Sanitas (Actualmente intervenida)",
  "EPS Sura",
  "Compensar EPS",
  "Comfenalco Valle",
  "Famisanar (Actualmente intervenida)",
  "Servicio Occidental de Salud (SOS) (Actualmente intervenida)",
  "Aliansalud EPS",
  "Empresas Públicas de Medellín (EPM)",
  "Fondo de Pasivo Social de Ferrocarriles Nacionales de Colombia",
  "Cajacopi Atlántico",
  "Capresoca",
  "Comfachocó",
  "EPS Familiar de Colombia",
  "Salud Mía",
  "Dusakawi EPSI",
  "Asociación Indígena del Cauca",
  "Anas Wayuu EPSI",
  "Mallamas EPSI",
  "Pijaos Salud EPSI",
];

export const COLOMBIA_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
  "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
  "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
  "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
  "Vaupés", "Vichada",
];

export const ATLANTICO_CITIES = [
  "Barranquilla", "Baranoa", "Campo de la Cruz", "Candelaria", "Galapa",
  "Juan de Acosta", "Luruaco", "Malambo", "Manatí", "Palmar de Varela",
  "Piojó", "Polonuevo", "Ponedera", "Puerto Colombia", "Repelón",
  "Sabanagrande", "Sabanalarga", "Santa Lucía", "Santo Tomás", "Soledad",
  "Suan", "Tubará", "Usiacurí",
];

// Barrios de Barranquilla (dropdown cuando la ciudad es Barranquilla). Termina en "Otro".
export const BARRIOS_BARRANQUILLA = [
  "7 de Abril", "7 de Agosto", "Adela de Char", "Alameda del Río", "Alfonso López",
  "Alianza", "Altamira", "Alto Prado", "Altos de Riomar", "Altos del Limón", "América",
  "Andalucia", "Atlántico", "Barlovento", "Barrio Abajo", "Bella Arena", "Bellavista",
  "Bendición de Dios", "Bernardo Hoyos", "Bethania", "Bosque", "Boston", "Boyacá",
  "Buena Esperanza", "Buenos Aires", "California", "Campito", "Campo Alegre",
  "Carlos Meisel", "Carrizal", "Casa Blanca", "Centro", "Centro Histórico", "Cevillar",
  "Chiquinquirá", "Ciudadela 20 de Julio", "Ciudadela de Paz", "Colombia", "Concepción",
  "Conjunto Residencial", "Country", "Cuchilla de Villate", "El Campito", "El Carmen",
  "El Castillo", "El Edén", "El Ferry", "El Golf", "El Limón", "El Limoncito",
  "El Milagro", "El Oasis", "El Paraíso", "El Parque", "El Poblado", "El Pueblo",
  "El Recreo", "El Santuario", "El Silencio", "El Valle", "Galán", "Gerlein y Villate",
  "Granadillo", "Hipódromo", "Juan Mina (Corregimiento)", "Kennedy", "La Ceiba",
  "La Chinita", "La Cumbre", "La Floresta", "La Florida", "La Luz", "La Magdalena",
  "La Manga", "La María", "La Paz", "La Peña", "La Playa", "La Pradera", "La Sierrita",
  "La Trinidad", "La Unión", "La Victoria", "Las Américas", "Las Colinas", "Las Delicias",
  "Las Estrellas", "Las Flores", "Las Gardenias", "Las Malvinas", "Las Mercedes",
  "Las Nieves", "Las Palmas", "Las Terrazas", "Lipaya", "Loma Fresca", "Los Alpes",
  "Los Andes", "Los Continentes", "Los Girasoles", "Los Jobos", "Los Nogales",
  "Los Olivos", "Los Pinos", "Lucero", "Me Quejo", "Modelo", "Montecristo", "Montes",
  "Nueva Colombia", "Nueva Granada", "Olaya", "Pasadena", "Pumarejo", "Rebolo", "Recreo",
  "Riomar", "Rosales", "San Felipe", "San Isidro", "San José", "San Luis", "San Martín",
  "San Nicolás", "San Pedro", "San Vicente", "Santa Ana", "Santa Lucía", "Santa María",
  "Santa Mónica", "Santo Domingo", "Santo Domingo de Guzmán", "Siape", "Simón Bolívar",
  "Tabor", "Tayrona", "Universal", "Villa Blanca", "Villa Campestre", "Villa Carolina",
  "Villa del Carmen", "Villa del Rosario", "Villa del Sol", "Villa del Sur",
  "Villa San Carlos", "Villa San Pedro", "Villa Santos", "Villate", "Villas de San Pablo",
  "Zona Franca", "Otro",
];

export const GENDERS = ["Masculino", "Femenino"];
export const BLOOD_ABO = ["A", "B", "AB", "O"];
export const BLOOD_RH = ["+", "-"];
export const ACCOUNT_TYPES = ["Ahorros", "Corriente"];
export const EDUCATION_LEVELS = [
  "Bachiller",
  "Técnico",
  "Tecnólogo",
  "Profesional",
  "Especialización",
  "Maestría",
  "Doctorado",
];

/** Religión: el mismo desplegable en Matrículas y Admisiones. */
export const RELIGIONS = [
  { value: "CATOLICA", label: "Católica" },
  { value: "CRISTIANA", label: "Cristiana" },
  { value: "JUDIA", label: "Judía" },
  { value: "MUSULMANA", label: "Musulmana" },
  { value: "ATEA", label: "Atea" },
  { value: "OTRA", label: "Otra" },
];

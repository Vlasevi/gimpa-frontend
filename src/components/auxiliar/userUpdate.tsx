import { useState, useEffect, useRef } from "react";
import { apiUrl, buildHeaders } from "@/utils/api";
import { Select } from "@/components/ui/Select";

const registerEndpoint = apiUrl("/api/accounts/users/register/");
const usersListEndpoint = apiUrl("/api/accounts/users/");

const RELATIONSHIP_OPTIONS = ["Padre", "Madre", "Abuelo/a", "Tío/a", "Tutor Legal", "Otro"].map(
  (value) => ({ value, label: value }),
);

// ComboBox component (reutilizado de Step3StudentData)
const ComboBox = ({
  value,
  setValue,
  options,
  label,
  disabled,
  required,
}: any) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar query con value cuando el dropdown está cerrado
  useEffect(() => {
    if (!open) {
      setQuery(value || "");
    }
  }, [value, open]);

  const inputValue = typeof query === "string" ? query : "";

  // Función para normalizar texto (eliminar tildes)
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredOptions =
    inputValue === ""
      ? options
      : options.filter((o: string) => {
          const normalizedOption = normalizeText(o);
          const normalizedInput = normalizeText(inputValue);

          // Buscar si el texto completo empieza con el input O si alguna palabra empieza con el input
          if (normalizedOption.includes(normalizedInput)) {
            return true;
          }

          return false;
        });

  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text font-medium text-gray-600">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`input input-bordered w-full focus:input-primary transition-all ${
            disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
          }`}
          placeholder={label}
          value={inputValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(value || "");
          }}
          onBlur={() => {
            // Delay para permitir click en opciones
            setTimeout(() => setOpen(false), 200);
          }}
          disabled={disabled}
          required={required}
          autoComplete="off"
        />

        {open && filteredOptions.length > 0 && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50"
          >
            {filteredOptions.map((o: string, index: number) => (
              <div
                key={`${o}-${index}`}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-500 hover:text-white ${
                  o === value ? "bg-blue-500 text-white" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(o);
                  setQuery(o);
                  setOpen(false);
                }}
              >
                {o}
              </div>
            ))}
          </div>
        )}

        {open && filteredOptions.length === 0 && inputValue && !disabled && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-50">
            <p className="text-sm text-gray-500">
              No se encontraron estudiantes
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function UserUpdate({ onCancel, onSuccess }) {
  const inputBorder = "border border-gray-300";
  const [successMsg, setSuccessMsg] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [form, setForm] = useState({
    displayname: "",
    first_name: "",
    last_name: "",
    email: "",
    guardian_full_name: "",
    guardian_email: "",
    guardian_phone: "",
    guardian_relationship: "",
  });
  const [loading, setLoading] = useState(false);

  // Generar opciones para el ComboBox (email + nombre)
  const studentOptions = students.map(
    (student) => `${student.email} - ${student.first_name} ${student.last_name}`
  );

  console.log("Students:", students);
  console.log("StudentOptions:", studentOptions);
  console.log("Loading:", loadingStudents);

  // Cargar lista de estudiantes al montar el componente
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(usersListEndpoint, {
        method: "GET",
        headers: buildHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Estudiantes cargados:", data);
        setStudents(data);
      } else {
        console.error("Error al cargar estudiantes:", res.status);
      }
    } catch (error) {
      console.error("Error al cargar estudiantes:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchUserData = async (email: string) => {
    setLoading(true);
    try {
      const userDetailEndpoint = apiUrl(
        `/api/accounts/users/${encodeURIComponent(email)}/`
      );
      const res = await fetch(userDetailEndpoint, {
        method: "GET",
        headers: buildHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const userData = await res.json();
        setForm({
          displayname: userData.displayname || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          guardian_full_name: userData.guardian_full_name || "",
          guardian_email: userData.guardian_email || "",
          guardian_phone: userData.guardian_phone || "",
          guardian_relationship: userData.guardian_relationship || "",
        });
        setSuccessMsg("");
      } else {
        setSuccessMsg("Error al cargar los datos del usuario");
      }
    } catch (error) {
      setSuccessMsg("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSelect = (e) => {
    const email = e.target.value;
    setSelectedEmail(email);
    if (email) {
      fetchUserData(email);
    } else {
      // Resetear formulario si no hay email seleccionado
      setForm({
        displayname: "",
        first_name: "",
        last_name: "",
        email: "",
        guardian_full_name: "",
        guardian_email: "",
        guardian_phone: "",
        guardian_relationship: "",
      });
    }
  };

  // Handler para el ComboBox - extraer email del formato "email - nombre apellido"
  const handleStudentComboChange = (value: string) => {
    if (!value) {
      setSelectedEmail("");
      setForm({
        displayname: "",
        first_name: "",
        last_name: "",
        email: "",
        guardian_full_name: "",
        guardian_email: "",
        guardian_phone: "",
        guardian_relationship: "",
      });
      return;
    }

    // Extraer email del formato "email - nombre apellido"
    const email = value.split(" - ")[0];
    setSelectedEmail(email);
    fetchUserData(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "first_name") {
      setForm({ ...form, first_name: value, displayname: value });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCancel = () => {
    setForm({
      displayname: "",
      first_name: "",
      last_name: "",
      email: "",
      guardian_full_name: "",
      guardian_email: "",
      guardian_phone: "",
      guardian_relationship: "",
    });
    setSelectedEmail("");
    setSuccessMsg("");
    if (onCancel) onCancel();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // El `Select` no participa en la validación nativa del formulario (el select nativo con `required` sí).
    if (!form.guardian_relationship) {
      setSuccessMsg("Error: Selecciona la relación del acudiente.");
      document.getElementById("guardian_relationship")?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(registerEndpoint, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (res.ok) {
        setSuccessMsg("¡Estudiante actualizado exitosamente!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        const errorData = await res.json();
        let errorMsg = "";
        if (typeof errorData.detail === "string") {
          errorMsg = `Error: ${errorData.detail}`;
        } else if (errorData.email && Array.isArray(errorData.email)) {
          errorMsg = `Error: ${errorData.email[0]}`;
        } else {
          errorMsg = `Error: ${JSON.stringify(errorData)}`;
        }
        setSuccessMsg(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="space-y-4 bg-white" onSubmit={handleSubmit}>
      {successMsg && (
        <div
          className={`font-semibold mb-2 ${
            successMsg.includes("Error") ? "text-red-600" : "text-green-600"
          }`}
        >
          {successMsg}
        </div>
      )}

      {/* Selector de Estudiante */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
          Seleccionar Estudiante
        </h3>

        {/* ComboBox con búsqueda */}
        <ComboBox
          value={
            selectedEmail
              ? studentOptions.find((opt) => opt.startsWith(selectedEmail)) ||
                ""
              : ""
          }
          setValue={handleStudentComboChange}
          options={studentOptions}
          label="Buscar Estudiante por Email o Nombre"
          disabled={loadingStudents}
          required={true}
        />

        {/* Debug info */}
        {studentOptions.length > 0 && (
          <p className="text-xs text-gray-500">
            {studentOptions.length} estudiante(s) disponible(s)
          </p>
        )}
        {loadingStudents && (
          <p className="text-xs text-blue-500">Cargando estudiantes...</p>
        )}
        {!loadingStudents && studentOptions.length === 0 && (
          <p className="text-xs text-red-500">No hay estudiantes disponibles</p>
        )}
      </div>

      {/* Sección: Datos del Estudiante */}
      {selectedEmail && (
        <>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Datos del Estudiante
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="first_name"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  className={`flex h-10 w-full rounded-md border ${inputBorder} bg-base-100 px-3 py-2 text-base placeholder:text-base-content/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                  id="first_name"
                  name="first_name"
                  required
                  placeholder="Ej: Juan"
                  value={form.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="last_name"
                >
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  className={`flex h-10 w-full rounded-md border ${inputBorder} bg-base-100 px-3 py-2 text-base placeholder:text-base-content/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                  id="last_name"
                  name="last_name"
                  required
                  placeholder="Ej: Pérez"
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Sección: Datos del Acudiente */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Datos del Acudiente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="guardian_full_name"
                >
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  className={`flex h-10 w-full rounded-md border ${inputBorder} bg-base-100 px-3 py-2 text-base placeholder:text-base-content/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                  id="guardian_full_name"
                  name="guardian_full_name"
                  required
                  placeholder="Ej: María García"
                  value={form.guardian_full_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="guardian_relationship"
                >
                  Relación <span className="text-red-500">*</span>
                </label>
                <Select
                  id="guardian_relationship"
                  name="guardian_relationship"
                  required
                  value={form.guardian_relationship}
                  onChange={(v) => setForm((f) => ({ ...f, guardian_relationship: v }))}
                  placeholder="Seleccione..."
                  options={RELATIONSHIP_OPTIONS}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="guardian_email"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className={`flex h-10 w-full rounded-md border ${inputBorder} bg-base-100 px-3 py-2 text-base placeholder:text-base-content/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                  id="guardian_email"
                  name="guardian_email"
                  required
                  placeholder="acudiente@correo.com"
                  value={form.guardian_email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="guardian_phone"
                >
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className={`flex h-10 w-full rounded-md border ${inputBorder} bg-base-100 px-3 py-2 text-base placeholder:text-base-content/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                  id="guardian_phone"
                  name="guardian_phone"
                  required
                  placeholder="Ej: 3001234567"
                  value={form.guardian_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border ${inputBorder} bg-base-100 hover:bg-base-200 h-10 px-4 py-2`}
              type="button"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 px-4 py-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Actualizar estudiante"
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

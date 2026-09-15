/**
 * Formulario "Registrar usuario" (cuenta de estudiante + acudiente) del panel de Matrículas.
 *
 * Formato de diálogo de formulario (DESIGN_SYSTEM §12b, `ui/FormDialog`): secciones en
 * tarjetas, etiquetas de 12 px en negrita con `*`, campos con ícono, "Cancelar" + botón con
 * spinner. El resultado va en el toast de la página: los errores los muestra este
 * formulario con `flash`; el éxito lo anuncia quien lo abre (`onSuccess`).
 */

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Mail, Phone, User, Users } from "lucide-react";

import { FormActions, FormGrid, FormInput, FormSection, FormSelect } from "@/components/ui/FormDialog";
import type { ToastVariant } from "@/hooks/use-toast";
import { apiUrl, buildHeaders } from "@/utils/api";

const endpoint = apiUrl("/api/accounts/users/register/");

const RELATIONSHIP_OPTIONS = ["Padre", "Madre", "Abuelo/a", "Tío/a", "Tutor Legal", "Otro"].map((value) => ({
  value,
  label: value,
}));

const EMPTY_FORM = {
  displayname: "",
  first_name: "",
  last_name: "",
  email: "",
  guardian_full_name: "",
  guardian_email: "",
  guardian_phone: "",
  guardian_relationship: "",
};

type FormState = typeof EMPTY_FORM;

interface UserRegisterProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  /** Toast de la página (arriba a la derecha). */
  flash: (type: ToastVariant, msg: string) => void;
}

/** Mensaje legible del error del backend (`detail` o el primer error de un campo). */
function errorText(data: unknown): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (typeof value === "string") return value;
    }
  }
  return "No se pudo registrar el usuario.";
}

const RELATIONSHIP_ID = "register-guardian-relationship";

export default function UserRegister({ onCancel, onSuccess, flash }: UserRegisterProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((current) =>
      name === "first_name"
        ? { ...current, first_name: value, displayname: value }
        : { ...current, [name]: value },
    );
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    onCancel?.();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // El `Select` no participa en la validación nativa del formulario (el select nativo con `required` sí).
    if (!form.guardian_relationship) {
      flash("error", "Selecciona la relación del acudiente.");
      document.getElementById(RELATIONSHIP_ID)?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        onSuccess?.();
      } else {
        flash("error", errorText(await res.json().catch(() => null)));
      }
    } catch {
      flash("error", "No hay conexión con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormSection title="Datos del estudiante" required>
        <FormGrid>
          <FormInput
            label="Nombre"
            icon={User}
            name="first_name"
            required
            placeholder="Ej: Juan"
            value={form.first_name}
            onChange={handleChange}
          />
          <FormInput
            label="Apellido"
            icon={User}
            name="last_name"
            required
            placeholder="Ej: Pérez"
            value={form.last_name}
            onChange={handleChange}
          />
          <FormInput
            label="Email"
            icon={Mail}
            type="email"
            name="email"
            required
            full
            placeholder="ejemplo@correo.com"
            value={form.email}
            onChange={handleChange}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Datos del acudiente" required>
        <FormGrid>
          <FormInput
            label="Nombre completo"
            icon={Users}
            name="guardian_full_name"
            required
            placeholder="Ej: María García"
            value={form.guardian_full_name}
            onChange={handleChange}
          />
          <FormSelect
            id={RELATIONSHIP_ID}
            label="Relación"
            name="guardian_relationship"
            required
            value={form.guardian_relationship}
            onChange={(v) => setForm((f) => ({ ...f, guardian_relationship: v }))}
            placeholder="Selecciona…"
            options={RELATIONSHIP_OPTIONS}
          />
          <FormInput
            label="Email acudiente"
            icon={Mail}
            type="email"
            name="guardian_email"
            required
            placeholder="acudiente@correo.com"
            value={form.guardian_email}
            onChange={handleChange}
          />
          <FormInput
            label="Teléfono acudiente"
            icon={Phone}
            type="tel"
            name="guardian_phone"
            required
            placeholder="Ej: 3001234567"
            value={form.guardian_phone}
            onChange={handleChange}
          />
        </FormGrid>
      </FormSection>

      <FormActions onCancel={handleCancel} busy={loading} submitText="Registrar" busyText="Registrando…" />
    </form>
  );
}

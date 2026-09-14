/**
 * Pestaña de Comité / Decisión final (P14–P15) del panel de staff.
 *
 * El comité es la decisión final: un formulario con preguntas dinámicas (esquema
 * sembrado en el backend) más la decisión, el grado/ruta aprobados, las condiciones y el
 * mensaje al acudiente. Registrar mueve el expediente a su estado terminal y notifica.
 *
 * Migrado a react-hook-form en el Paso 7 del refactor de Admisiones
 * (docs/plan-admisiones-ui-rhf-acordeon.md), por consistencia con el resto del módulo
 * (Pasos 2-3). Un único `useForm()` para {decision, route, conditions, messagePublic,
 * answers}, hidratado con `reset()` cuando llega el dato del servidor. `answers.<key>`
 * usa `Controller` (los tipos `bool`/`scale`/`select` no son un `<input>` nativo con un
 * `onChange` de string plano); el resto usa `register`. El payload enviado al backend
 * NO cambia: se sigue construyendo explícitamente con las mismas claves
 * (`decision`, `answers`, `route_approved`, `conditions`, `message_public`).
 */

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Loader2, Gavel, CheckCircle2, Lock } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import type { SectionPermissions } from "@/components/Login/loginLogic";
import {
  inputClass,
  textareaClass,
  labelClass,
  adminPrimaryBtnClass,
} from "@/components/ui/formStyles";
import { Select } from "@/components/ui/Select";
import type { FlashFn } from "@/components/admisiones/admin/adminTypes";

type QuestionType = "text" | "textarea" | "select" | "bool" | "scale";

interface Question {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
}

interface DecisionData {
  form: { version: number; questions: Question[] };
  decided: boolean;
  decision: string;
  decision_label: string;
  answers: Record<string, unknown>;
  grade_approved: number | null;
  route_approved: string;
  conditions: string;
  message_public: string;
  decided_at: string | null;
}

interface DecisionFormValues {
  decision: string;
  route: string;
  conditions: string;
  messagePublic: string;
  answers: Record<string, unknown>;
}

const DECISIONS = [
  { value: "ADMITIDO", label: "Admitido" },
  { value: "ADMITIDO_CON_CONDICIONES", label: "Admitido con condiciones" },
  { value: "LISTA_ESPERA", label: "Lista de espera" },
  { value: "REQUIERE_NUEVA_VALORACION", label: "Requiere nueva valoración" },
  { value: "NO_ADMITIDO", label: "No admitido" },
  { value: "DESISTIDO", label: "Desistido" },
];

const ROUTES = [
  { value: "REGULAR", label: "Regular" },
  { value: "FLEXIBLE", label: "Flexible" },
  { value: "DIAGNOSTICO", label: "Diagnóstico" },
  { value: "PREESCOLAR", label: "Preescolar" },
  { value: "OTRA", label: "Otra" },
];

// La ruta es opcional: "—" (sin ruta) sigue siendo una opción elegible para quitarla.
const ROUTE_OPTIONS = [{ value: "", label: "—" }, ...ROUTES];

// Preguntas opcionales del comité: "—" deja la respuesta vacía.
const BOOL_OPTIONS = [
  { value: "", label: "—" },
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

const SCALE_OPTIONS = [
  { value: "", label: "—" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
];

const EMPTY_VALUES: DecisionFormValues = {
  decision: "",
  route: "",
  conditions: "",
  messagePublic: "",
  answers: {},
};

export function DecisionPanel({
  code,
  perms,
  flash,
  onChanged,
}: {
  code: string;
  perms: SectionPermissions;
  flash: FlashFn;
  onChanged: () => void;
}) {
  const [data, setData] = useState<DecisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, reset } = useForm<DecisionFormValues>({
    defaultValues: EMPTY_VALUES,
  });
  const decisionValue = useWatch({ control, name: "decision" });

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsDecision(code));
      if (!res.ok) return;
      const d: DecisionData = await res.json();
      setData(d);
      reset({
        decision: d.decision ?? "",
        route: d.route_approved ?? "",
        conditions: d.conditions ?? "",
        messagePublic: d.message_public ?? "",
        answers: { ...(d.answers ?? {}) },
      });
    } finally {
      setLoading(false);
    }
  }, [code, reset]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = handleSubmit(async (values) => {
    if (!values.decision) {
      flash("error", "Elige una decisión.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsDecision(code), {
        method: "POST",
        body: JSON.stringify({
          decision: values.decision,
          answers: values.answers,
          route_approved: values.route,
          conditions: values.conditions,
          message_public: values.messagePublic,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flash(
          "error",
          typeof err?.detail === "string" ? err.detail : "No se pudo registrar la decisión.",
        );
        return;
      }
      onChanged();
      flash("success", "Decisión registrada.");
      await load();
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-base-content/60">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando decisión…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/60">
        <Lock className="h-4 w-4" />
        No autorizado para ver la decisión.
      </p>
    );
  }

  const needsConditions = decisionValue === "ADMITIDO_CON_CONDICIONES";
  const canDecide = perms.canDecide;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {data.decided && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Decisión registrada: <strong>{data.decision_label}</strong>
        </div>
      )}

      {/* Formulario del comité (preguntas sembradas) */}
      <div className="space-y-3 rounded-xl border border-base-300 p-4">
        <h3 className="flex items-center gap-2 font-display font-semibold text-secondary">
          <Gavel className="h-4 w-4" />
          Comité de admisión
        </h3>
        {data.form.questions.map((q) => (
          <Controller
            key={q.key}
            name={`answers.${q.key}`}
            control={control}
            render={({ field }) => (
              <QuestionField
                question={q}
                value={field.value}
                disabled={!canDecide}
                onChange={field.onChange}
              />
            )}
          />
        ))}
      </div>

      {/* Decisión */}
      <div className="grid gap-3 rounded-xl border border-base-300 p-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Decisión *</label>
          <Controller
            name="decision"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={!canDecide}
                options={DECISIONS}
                placeholder="Elige…"
              />
            )}
          />
        </div>
        <div>
          <label className={labelClass}>Ruta aprobada</label>
          <Controller
            name="route"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={!canDecide}
                options={ROUTE_OPTIONS}
                placeholder="—"
              />
            )}
          />
        </div>
        {needsConditions && (
          <div className="sm:col-span-2">
            <label className={labelClass}>Condiciones *</label>
            <textarea
              rows={2}
              className={textareaClass}
              disabled={!canDecide}
              {...register("conditions")}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelClass}>
            Mensaje para el acudiente (lo recibirá por correo)
          </label>
          <textarea
            rows={2}
            className={textareaClass}
            disabled={!canDecide}
            {...register("messagePublic")}
          />
        </div>
      </div>

      {canDecide ? (
        <button type="submit" disabled={saving} className={adminPrimaryBtnClass}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Gavel className="h-4 w-4" />
          )}
          {data.decided ? "Actualizar decisión" : "Registrar decisión"}
        </button>
      ) : (
        <p className="text-sm text-base-content/60">
          Solo el rector/administrador puede registrar la decisión.
        </p>
      )}
    </form>
  );
}

function QuestionField({
  question,
  value,
  disabled,
  onChange,
}: {
  question: Question;
  value: unknown;
  disabled?: boolean;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{question.label}</label>
      {question.type === "textarea" ? (
        <textarea
          rows={2}
          className={textareaClass}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : question.type === "select" ? (
        <Select
          value={value == null ? "" : String(value)}
          disabled={disabled}
          onChange={onChange}
          options={[
            { value: "", label: "—" },
            ...(question.options ?? []).map((o) => ({ value: o, label: o })),
          ]}
          placeholder="—"
        />
      ) : question.type === "bool" ? (
        <Select
          value={value === true ? "si" : value === false ? "no" : ""}
          disabled={disabled}
          onChange={(v) => onChange(v === "" ? null : v === "si")}
          options={BOOL_OPTIONS}
          placeholder="—"
        />
      ) : question.type === "scale" ? (
        <Select
          value={value == null ? "" : String(value)}
          disabled={disabled}
          onChange={(v) => onChange(v ? Number(v) : null)}
          options={SCALE_OPTIONS}
          placeholder="—"
        />
      ) : (
        <input
          className={inputClass}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

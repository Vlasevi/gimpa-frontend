/**
 * Tipos de la valoración GIMPA AVANZA (espejo de `admissions/instruments/*.json` y de
 * `evaluation_service` en el backend). Ver `docs/plan-valoracion-gimpa-avanza.md`.
 *
 * Una plantilla de paquete trae instrumentos; cada instrumento, bloques. Lo que se
 * registra en un instrumento es un objeto plano: los campos (`fields`) y las preguntas
 * (`questionnaire`) van por su nombre; el resto de bloques guarda lo suyo bajo su `id`.
 */

import type { FileRule } from "@/components/admisiones/admissionTypes";

export type ActivityKind =
  | "ENTREVISTA_FAMILIAR"
  | "ENTREVISTA_ASPIRANTE"
  | "EXAMEN"
  | "CONSOLIDADO"
  | "CONCEPTO";

/** Nombres de las actividades (espejo de `ActivityKind` en el backend). */
export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  ENTREVISTA_FAMILIAR: "Entrevista psicológica familiar",
  ENTREVISTA_ASPIRANTE: "Entrevista psicológica al aspirante",
  EXAMEN: "Examen académico de admisión",
  CONSOLIDADO: "Informe consolidado interdisciplinario",
  CONCEPTO: "Concepto del Comité de Admisiones",
};

export interface FieldSpec {
  name: string;
  type: "text" | "textarea" | "date" | "time" | "select" | "yesno" | "checkbox-group";
  label: string;
  options?: string[];
  required?: boolean;
  full?: boolean;
  startsRow?: boolean;
  placeholder?: string;
}

interface BlockBase {
  id: string;
  title?: string;
  required?: boolean;
}

export interface IndicatorItem {
  id: string;
  text: string;
  /** Solo la entrevista al aspirante: el momento, la frase fija y la evidencia esperada. */
  moment?: string;
  prompt?: string;
  evidence?: string;
}

export type Block =
  | (BlockBase & { type: "notice"; text: string })
  | (BlockBase & { type: "rules"; items: { moment: string; rule: string }[] })
  | (BlockBase & { type: "context"; items: { label: string; source: string }[] })
  | (BlockBase & { type: "fields"; fields: FieldSpec[] })
  | (BlockBase & { type: "questionnaire"; items: { id: string; text: string }[] })
  | (BlockBase & { type: "scored_indicators"; items: IndicatorItem[] })
  | (BlockBase & {
      type: "supports";
      categories: { id: string; label: string; examples: string }[];
    })
  | (BlockBase & { type: "validity" })
  | (BlockBase & {
      type: "consolidation_grid";
      sources: { value: string; label: string }[];
      dimensions: { id: string; label: string }[];
    })
  | (BlockBase & {
      type: "concept";
      options: { value: string; label: string; description: string }[];
    })
  | (BlockBase & { type: "exam_scoring"; dictation_rule?: string })
  | (BlockBase & { type: "exam_profile" })
  | (BlockBase & { type: "materials" })
  | (BlockBase & { type: "attachment"; label: string; accept: string });

export interface Instrument {
  id: string;
  /** `null` si la sección no es un instrumento del paquete (la hoja de respuestas). */
  number: number | null;
  title: string;
  blocks: Block[];
}

export interface ExamStructure {
  code: string;
  areas: { label: string; items: number[]; max: number }[];
  items: { n: number; max: number; text: string }[];
  rubric_item: number;
  rubric: { id: string; label: string; max: number; descriptor: string }[];
  subcomponents: { key: string; label: string; items: number[]; max: number }[];
  bands: Record<string, { min: number; max: number; label: string }[]>;
  bands_warning: string;
}

export interface ExamResult {
  total: number;
  max: number;
  complete: boolean;
  pending_items: number[];
  subcomponents: { key: string; label: string; score: number; max: number; complete: boolean }[];
  areas: { label: string; score: number; max: number; complete: boolean }[];
  band: { age: number; range: string; label: string } | null;
  bands_warning: string;
}

export interface AnswerKey {
  items: Record<string, string>;
  dictation_words: string[];
  dictation_rule: string;
}

export interface ActivityRow {
  kind: ActivityKind;
  slug: string;
  label: string;
  status: "PENDIENTE" | "PROGRAMADA" | "EN_CURSO" | "COMPLETADA";
  status_label: string;
  assigned_to: number | null;
  assigned_to_name: string;
  has_schedule: boolean;
  scheduled_at: string | null;
  modality: "VIRTUAL" | "PRESENCIAL";
  meeting_link: string;
  completed_at: string | null;
  completed_by_name: string;
  can_open: boolean;
  is_mine: boolean;
}

export interface ValidityValue {
  level: string;
  reason: string;
}

export interface ActivityDetail {
  application: {
    id: number;
    code: string;
    applicant_name: string;
    grade: string;
    age: string;
    status: string;
    status_label: string;
  };
  package: {
    code: string;
    version: string;
    title: string;
    central_rule: string;
    scale: { code: string; label: string; criterion: string }[];
    validity: { code: string; label: string; use: string }[];
    age_references: Record<string, string>;
  };
  activity: ActivityRow;
  can_edit: boolean;
  instruments: Instrument[];
  answers: Record<string, Record<string, unknown>>;
  data_versions: Record<string, number>;
  context: Record<string, string>;
  materials: { key: string; label: string }[];
  has_attachment: boolean;
  attachment_rule?: FileRule;
  attachment_url: string | null;
  missing: string[];
  exam?: {
    structure: ExamStructure;
    result: ExamResult | null;
    can_view_key: boolean;
    /** Paquete del examen (se asigna aparte del de psicología). */
    stage: string;
    stage_label: string;
    can_change: boolean;
    stages: { suggested: string; age: string; options: StageOption[] };
  };
  sources?: { exam: ExamResult | null; exam_validity: ValidityValue | null };
}

export interface StageOption {
  value: string;
  label: string;
  available: boolean;
}

export interface EvaluationSummary {
  status: string;
  can_assign: boolean;
  stages: { suggested: string; age: string; options: StageOption[] };
  /** Etapas con paquete de examen cargado (puede diferir de `stages`). */
  exam_stages: { suggested: string; age: string; options: StageOption[] };
  can_change_exam?: boolean;
  evaluation: {
    stage: string;
    stage_label: string;
    package: string;
    /** Examen asignado; puede ser de otra etapa que el paquete. */
    exam_stage: string;
    exam_stage_label: string;
    exam_changed_at: string | null;
    exam_changed_by_name: string;
    round: number;
    assigned_at: string | null;
    assigned_by_name: string;
  } | null;
  activities: ActivityRow[];
}

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface CommitteeConcept {
  value: string;
  label: string;
  criterios: string;
  evidencia: string;
  plan_o_evidencia: string;
  fecha_revision: string;
  participantes: string;
  registered_by_name: string;
  registered_at: string | null;
}

export interface DecisionPanelData {
  status: string;
  concept: CommitteeConcept | null;
  expected: string[];
  options: { value: string; label: string }[];
  reopenable: { value: ActivityKind; label: string }[];
  decided: boolean;
  decision: string;
  decision_label: string;
  conditions: string;
  message_public: string;
  differs_from_concept_reason: string;
  decided_at: string | null;
  decided_by_name: string;
}

/** "Título (Instrumento N)", como lo nombra el backend en lo que falta (`instrument_label`). */
export function instrumentLabel(instrument: Pick<Instrument, "title" | "number">): string {
  return instrument.number ? `${instrument.title} (Instrumento ${instrument.number})` : instrument.title;
}

/** Fecha y hora legibles ("22 de septiembre de 2026, 8:00 a. m."). */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
}

/** Etiquetas de la escala 0–5 (el detalle viene del paquete). */
export const SCORE_OPTIONS = ["NO", "0", "1", "2", "3", "4", "5"] as const;
export const scoreLabel = (v: string) => (v === "NO" ? "N/O" : v);

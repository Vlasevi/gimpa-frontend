/**
 * Contrato jerárquico de la valoración: nodos por type, respuestas por id.
 * Los componentes y sus claves se cargan por separado desde la API protegida.
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

/** Cada nodo mantiene las mismas seis propiedades; su tipo define cómo representarlo. */
interface NodeBase<T extends string, C, G> {
  id: string; type: T; title: string | null; content: C | null;
  config: G | null; children: ContentNode[] | null;
}
export interface Scoring {
  mode: "points" | "rubric" | "observational_scale";
  max: number | null; step: number | null; required?: boolean; scale_ref?: string;
  rubric: { id: string; label: string; max: number; step?: number; descriptor: string }[] | null;
}
type TextContent = { text: string };
type GroupConfig = { number?: number | string | null; code?: string; duration?: string;
  expected_evidence?: string | null; criterion?: string | null; aggregation?: "sum"; key?: string;
  average?: { mode: "mean"; exclude: string[]; decimals: number } };
export type ContentNode =
  | NodeBase<"instrument" | "section" | "area" | "question_group" | "indicator_group" | "support_group" | "exam_profile", TextContent, GroupConfig>
  | NodeBase<"notice" | "reference_text" | "reference_material", TextContent, { delivery?: string; duration?: string }>
  | NodeBase<"reference_table", { headers: string[]; rows: string[][] }, null>
  | NodeBase<"reference_image", { src: string; alt: string }, null>
  | NodeBase<"question", TextContent, { number?: number; reference_ids: string[] | null;
      response: { input: "textarea"; required: boolean } | null; scoring: Scoring | null }>
  | NodeBase<"indicator", TextContent, { required: boolean; scoring: Scoring; record: { support: boolean; evidence: boolean } }>
  | NodeBase<"field", null, { input: FieldSpec["type"] | "checkbox"; required: boolean;
      options: string[] | null; placeholder?: string | null; layout: { full: boolean; starts_row: boolean | null } }>
  | NodeBase<"validity", null, { required: boolean; catalog_ref: string }>
  | NodeBase<"consolidation_dimension", null, { sources: { value: string; label: string }[] }>
  | NodeBase<"concept", null, { required: boolean; options: { value: string; label: string; description: string }[] }>
  | NodeBase<"context_item", null, { source: string }>
  | NodeBase<"answer_guide", null, { access: string[] }>
  | NodeBase<"expected_answer", TextContent, { question_id: string }>
  | NodeBase<"attachment", null, { required: boolean; label: string; accept: string }>
  | NodeBase<"materials", null, null>;
export type Instrument = ContentNode;
export interface Methodology {
  central_rule: string | null; age_references: Record<string, string> | null;
  scale: { code: string; label: string; criterion: string }[] | null;
  validity: { code: string; label: string; use: string }[] | null;
  exam: Record<string, unknown> | null;
}
export function* walkNodes(nodes: ContentNode[]): Generator<ContentNode> {
  for (const node of nodes) { yield node; yield* walkNodes(node.children ?? []); }
}

export interface ExamStructure {
  code: string;
  areas: { label: string; items: number[]; max: number }[];
  items: { n: number; max: number; text: string; step?: number }[];
  rubric_item: number | null;
  rubric: { id: string; label: string; max: number; descriptor: string }[];
  subcomponents: { key: string; label: string; items: number[]; max: number }[];
  bands: Record<string, { min: number; max: number; label: string }[]>;
  bands_warning: string;
  methodology_warnings?: string[];
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
  methodology_warnings?: string[];
}

export interface AnswerKey {
  package: string; version: string; stage: string | null; title: string;
  content: ContentNode[]; methodology: Methodology;
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
    /** Rango propio de esta actividad; puede faltar mientras se actualiza la API. */
    ages?: [number, number] | null;
    central_rule: string | null;
    scale: { code: string; label: string; criterion: string }[];
    validity: { code: string; label: string; use: string }[];
    age_references: Record<string, string>;
  };
  methodology: Methodology;
  schema_revision: string;
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
    structure: ExamStructure | null;
    result: ExamResult | null;
    can_view_key: boolean;
    /** Paquete del examen (se asigna aparte del de psicología). */
    stage: string;
    stage_label: string;
    route?: string | null;
    route_label?: string;
    revision?: string;
    can_change: boolean;
    stages: { suggested: string; age: string; options: StageOption[] };
  };
  sources?: {
    exam: ExamResult | null; exam_validity: ValidityValue | null;
    teacher_package: { code: string; version: string; stage: string; title: string; label: string; route_label: string };
  };
}

export interface StageOption {
  value: string;
  label: string;
  available: boolean;
  routes?: { value: string; label: string }[];
  suggested_route?: string;
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
    exam_route?: string | null;
    exam_route_label?: string;
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
export function instrumentLabel(instrument: Instrument): string {
  const number = instrument.type === "instrument" ? instrument.config?.number : null;
  return number ? `${instrument.title} (Instrumento ${number})` : instrument.title ?? "";
}

/** Fecha y hora legibles ("22 de septiembre de 2026, 8:00 a. m."). */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
}

/** Etiquetas de la escala 0–5 (el detalle viene del paquete). */
export const SCORE_OPTIONS = ["N/O", "0", "1", "2", "3", "4", "5"] as const;
export const scoreLabel = (v: string) => (v === "N/O" ? "N/O" : v);

/**
 * `/admisiones/:id/:actividad`: el formulario de una actividad de la valoración.
 *
 * Se abre en otra pestaña desde el expediente. Cada instrumento del paquete es una
 * tarjeta con su propio `useForm()` y su propio "Guardar" (PATCH por instrumento, con
 * versión para no pisar lo guardado desde otro lugar). Mientras se escribe, una copia
 * local evita perder lo escrito si se cierra la pestaña. "Marcar como completada" pide
 * al backend que verifique lo obligatorio.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, ExternalLink, Save } from "lucide-react";

import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/Toast";
import { SubSection } from "@/components/ui/SubSection";
import { LoadingState } from "@/components/ui/LoadingState";
import { BusyLabel } from "@/components/ui/BusyLabel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { outlineBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { cardClass, metaTextClass, titleClass } from "@/components/ui/textStyles";
import type { SectionValues } from "@/components/ui/fields/types";
import {
  BlockView,
  ExamResultTable,
  SELF_READONLY,
  toFormValues,
  toServerValues,
} from "@/components/admisiones/valoracion/blocks";
import {
  formatWhen,
  instrumentLabel,
  type ActivityDetail,
  type AnswerKey,
  type Instrument,
} from "@/components/admisiones/valoracion/types";

type Flash = (type: "success" | "error", msg: string) => void;

interface DraftMeta {
  baseVersion: number;
}

function InstrumentCard({
  instrument,
  detail,
  open,
  onToggle,
  onDetail,
  answerKey,
  flash,
}: {
  instrument: Instrument;
  detail: ActivityDetail;
  open: boolean;
  onToggle: () => void;
  onDetail: (d: ActivityDetail) => void;
  answerKey: AnswerKey | null;
  flash: Flash;
}) {
  const label = instrumentLabel(instrument);
  const canEdit = detail.can_edit;
  const serverValues = toFormValues(instrument, detail.answers[instrument.id] ?? {});
  const form = useForm<SectionValues>({ defaultValues: serverValues });
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const versionRef = useRef(detail.data_versions[instrument.id] ?? 0);
  const draft = useAutosaveDraft<SectionValues, DraftMeta>({
    key: `valoracion:${detail.application.id}:${detail.activity.kind}:${instrument.id}`,
    enabled: canEdit,
  });

  // Recupera lo escrito y no guardado, si se escribió sobre la versión que hay en el
  // servidor (si alguien guardó después, el borrador ya no aplica y se descarta).
  useEffect(() => {
    if (!canEdit) return;
    const stored = draft.peekDraft();
    if (!stored) return;
    if (stored.meta?.baseVersion === versionRef.current) {
      form.reset(stored.value, { keepDefaultValues: true });
      setRestored(true);
    } else {
      draft.discard();
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { unsubscribe } = form.watch((values, { name }) => {
      if (name === undefined || !form.formState.isDirty) return;
      draft.push(values as SectionValues, { baseVersion: versionRef.current });
    });
    return unsubscribe;
    // `form` y `draft` mantienen identidad entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsActivity(detail.application.id, detail.activity.slug), {
        method: "PATCH",
        body: JSON.stringify({
          instrument: instrument.id,
          data: toServerValues(instrument, form.getValues()),
          version: versionRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const next = data as ActivityDetail;
        versionRef.current = next.data_versions[instrument.id] ?? versionRef.current + 1;
        form.reset(toFormValues(instrument, next.answers[instrument.id] ?? {}));
        draft.discard();
        setRestored(false);
        onDetail(next);
        // Lo obligatorio que sigue faltando en este instrumento (el backend lo nombra
        // "Título (Instrumento N): campo").
        const prefix = `${label}: `;
        const missing = next.missing.filter((m) => m.startsWith(prefix)).map((m) => m.slice(prefix.length));
        flash(
          "success",
          missing.length
            ? `Guardado. Aún falta: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? "…" : ""}.`
            : `Guardado: ${label}.`,
        );
      } else if (res.status === 409) {
        flash("error", "Este instrumento se guardó desde otro lugar. Recarga la página para ver lo último.");
      } else {
        flash("error", typeof data?.detail === "string" ? data.detail : "No pudimos guardar el instrumento.");
      }
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  const saved = (detail.data_versions[instrument.id] ?? 0) > 0;
  const status = saved && !form.formState.isDirty ? "complete" : "incomplete";

  return (
    <SubSection
      id={`inst-${instrument.id}`}
      title={label}
      subtitle={restored ? "Tienes cambios sin guardar recuperados en este dispositivo." : undefined}
      open={open}
      onToggle={onToggle}
      status={canEdit ? status : undefined}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-6"
      >
        {instrument.blocks.map((block) => {
          const view = (
            <BlockView
              block={block}
              control={form.control}
              register={form.register}
              setValue={form.setValue}
              detail={detail}
              canEdit={canEdit}
              answerKey={answerKey}
              onDetail={onDetail}
              flash={flash}
            />
          );
          return SELF_READONLY.has(block.type) ? (
            <div key={block.id}>{view}</div>
          ) : (
            <fieldset key={block.id} disabled={!canEdit} className="min-w-0">
              {view}
            </fieldset>
          );
        })}

        {canEdit && (
          <div className="flex justify-end border-t border-base-300 pt-4">
            <button type="submit" disabled={saving} className={primaryBtnClass}>
              <BusyLabel busy={saving} busyText="Guardando…">
                <Save className="h-4 w-4" />
                Guardar
              </BusyLabel>
            </button>
          </div>
        )}
      </form>
    </SubSection>
  );
}

/** Para el consolidado: el resultado del examen y enlaces a las entrevistas. */
function SourcesPanel({ detail }: { detail: ActivityDetail }) {
  if (!detail.sources) return null;
  const { exam, exam_validity } = detail.sources;
  const base = `/admisiones/${detail.application.id}`;
  return (
    <div className={`${cardClass} space-y-4 p-5`}>
      <h2 className={titleClass}>Fuentes para integrar</h2>
      <div className="flex flex-wrap gap-2">
        {[
          ["entrevista-familiar", "Entrevista familiar"],
          ["entrevista-aspirante", "Entrevista al aspirante"],
          ["examen", "Examen académico"],
        ].map(([slug, label]) => (
          <a key={slug} href={`${base}/${slug}`} target="_blank" rel="noreferrer" className={`${outlineBtnClass} btn-sm`}>
            <ExternalLink className="h-4 w-4" />
            {label}
          </a>
        ))}
      </div>
      {detail.exam?.structure || exam ? (
        <div>
          <p className={metaTextClass}>
            Resultado del examen
            {exam_validity?.level ? ` · validez ${exam_validity.level}` : ""}
          </p>
          {detail.exam?.structure ? (
            <ExamResultTable structure={detail.exam.structure} result={exam} />
          ) : (
            <p className="mt-1 text-sm">
              {exam ? `${exam.total} / ${exam.max}${exam.band ? ` · ${exam.band.label}` : ""}` : "Sin calificar."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ActividadPage() {
  const { id = "", actividad = "" } = useParams();
  const appId = Number(id);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { toast, flash } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsActivity(appId, actividad));
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const d = data as ActivityDetail;
        setDetail(d);
        setOpen((prev) => (prev.size ? prev : new Set([d.instruments[0]?.id].filter(Boolean) as string[])));
      } else {
        setError(typeof data?.detail === "string" ? data.detail : "No encontramos esta actividad.");
      }
    } catch {
      setError("No pudimos conectar con el servidor.");
    }
  }, [appId, actividad]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (detail) document.title = `${detail.activity.label} · ${detail.application.applicant_name}`;
  }, [detail]);

  // La clave del examen se carga sola para quien puede verla (docente asignado y rectora):
  // la respuesta esperada va junto a cada pregunta.
  const canViewKey = !!detail?.exam?.can_view_key;
  useEffect(() => {
    if (!canViewKey || answerKey) return;
    apiFetch(API_ENDPOINTS.admissionsExamKey(appId))
      .then((res) => (res.ok ? res.json() : null))
      .then((key: AnswerKey | null) => {
        if (key) setAnswerKey(key);
        else flash("error", "No pudimos cargar la clave del examen.");
      })
      .catch(() => flash("error", "No pudimos cargar la clave del examen."));
  }, [canViewKey, answerKey, appId, flash]);

  const complete = async (): Promise<boolean> => {
    try {
      const res = await apiFetch(API_ENDPOINTS.admissionsActivityComplete(appId, actividad), { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDetail(data as ActivityDetail);
        flash("success", "Actividad completada.");
        return true;
      }
      flash("error", typeof data?.detail === "string" ? data.detail : "No pudimos completar la actividad.");
      return false;
    } catch {
      flash("error", "No pudimos conectar con el servidor.");
      return false;
    }
  };

  if (error) {
    return (
      <div role="alert" className="mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-error/25 bg-error/5 p-6">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <p className="font-medium text-base-content">{error}</p>
      </div>
    );
  }
  if (!detail) return <LoadingState label="Cargando actividad…" />;

  const { activity, application } = detail;
  const done = activity.status === "COMPLETADA";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Toast toast={toast} />

      <div className={`${cardClass} p-5`}>
        <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
          {detail.package.title} · {detail.package.code} v{detail.package.version}
        </p>
        <h1 className={`${titleClass} mt-1 text-2xl`}>{activity.label}</h1>
        <p className="mt-1 text-base-content/70">
          {application.applicant_name} · {application.grade} · {application.age}
        </p>
        <p className={`mt-1 ${metaTextClass}`}>
          Responsable: {activity.assigned_to_name || "—"}
          {activity.scheduled_at && ` · ${formatWhen(activity.scheduled_at)}`}
          {` · ${activity.status_label}`}
        </p>
        {done && (
          <p className="mt-3 flex items-center gap-2 text-sm text-accent">
            <CheckCircle2 className="h-5 w-5" />
            Completada por {activity.completed_by_name} el {formatWhen(activity.completed_at)}.
          </p>
        )}
        {!detail.can_edit && !done && (
          <p className={`mt-3 ${metaTextClass}`}>Solo lectura: la registra el responsable asignado.</p>
        )}
      </div>

      {detail.package.central_rule && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-base-content/80">
          {detail.package.central_rule}
        </p>
      )}

      <SourcesPanel detail={detail} />

      <div className="space-y-4">
        {detail.instruments.map((inst) => (
          <InstrumentCard
            key={inst.id}
            instrument={inst}
            detail={detail}
            open={open.has(inst.id)}
            onToggle={() =>
              setOpen((prev) => {
                const next = new Set(prev);
                if (next.has(inst.id)) next.delete(inst.id);
                else next.add(inst.id);
                return next;
              })
            }
            onDetail={setDetail}
            answerKey={answerKey}
            flash={flash}
          />
        ))}
      </div>

      {detail.can_edit && (
        <div className={`${cardClass} space-y-3 p-5`}>
          {detail.missing.length > 0 ? (
            <div>
              <p className="font-medium text-base-content">Falta para completar</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-base-content/70">
                {detail.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={metaTextClass}>Todo lo obligatorio está diligenciado y guardado.</p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={detail.missing.length > 0}
              className="btn btn-success gap-2 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar como completada
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={complete}
        tone="success"
        title="Marcar como completada"
        confirmText="Completar"
        pendingText="Completando…"
      >
        <p>
          Después de completar <strong>{activity.label}</strong> ya no se puede editar; solo
          la rectora puede reabrirla. Revisa que todo esté guardado.
        </p>
      </ConfirmDialog>
    </div>
  );
}

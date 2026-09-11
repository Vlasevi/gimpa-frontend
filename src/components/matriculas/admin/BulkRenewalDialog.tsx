/**
 * Renovación anual (plan §14): toma las matrículas aprobadas del año "desde" y crea,
 * para cada estudiante, una matrícula "Creada" del año "hacia" con el grado siguiente.
 * Primero se ve la vista previa (`dryRun`), después se crean (con confirmación).
 */

import { useEffect, useId, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { enrollmentApi, type BulkRenewalResult } from "@/components/matriculas/enrollmentApi";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ghostBtnClass, labelClass, primaryBtnClass, selectClass } from "@/components/ui/formStyles";
import { currentYear, errorMessage, type FlashFn } from "./shared";

interface BulkRenewalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se crearon matrículas del año indicado. */
  onDone: (toYear: number) => void;
  flash: FlashFn;
  /** Años con matrículas, para ofrecer como origen. */
  years: number[];
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function BulkRenewalDialog({ isOpen, onClose, onDone, flash, years }: BulkRenewalDialogProps) {
  const ids = useId();
  const thisYear = currentYear();
  const [fromYear, setFromYear] = useState(thisYear);
  const [toYear, setToYear] = useState(thisYear + 1);
  const [preview, setPreview] = useState<BulkRenewalResult | null>(null);
  const [loading, setLoading] = useState<"preview" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFromYear(thisYear);
    setToYear(thisYear + 1);
    setPreview(null);
    setError(null);
    setConfirming(false);
  }, [isOpen, thisYear]);

  const fromOptions = Array.from(new Set([...years, thisYear - 1, thisYear])).sort((a, b) => b - a);
  const toOptions = [fromYear + 1, fromYear + 2];

  const changeFrom = (value: number) => {
    setFromYear(value);
    if (toYear <= value) setToYear(value + 1);
    setPreview(null);
  };

  const runPreview = async () => {
    setLoading("preview");
    setError(null);
    try {
      setPreview(await enrollmentApi.bulkRenewal(fromYear, toYear, true));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const create = async () => {
    setConfirming(false);
    setLoading("create");
    setError(null);
    try {
      const result = await enrollmentApi.bulkRenewal(fromYear, toYear, false);
      const created = result.created.length;
      flash(
        "success",
        created
          ? `${plural(created, "matrícula creada", "matrículas creadas")} para ${toYear}`
          : `No se creó ninguna matrícula para ${toYear}`,
      );
      onDone(toYear);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const toCreate = preview?.created.length ?? 0;
  const busy = loading !== null;
  // Con la confirmación abierta, Escape cierra solo la confirmación.
  const handleClose = () => {
    if (busy || confirming) return;
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        closeOnBackdrop={false}
        labelledBy={`${ids}-title`}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border-base-300 bg-base-100 p-0 gap-0 shadow-xl"
      >
        <div className="shrink-0 border-b border-base-300 px-6 py-4">
          <h2 id={`${ids}-title`} className="font-display text-lg font-bold text-secondary">
            Renovar matrículas
          </h2>
          <p className="mt-1 text-sm text-base-content/60">
            Crea las matrículas del año nuevo para los estudiantes con matrícula aprobada. Cada una queda
            «Creada», con el grado siguiente, para que el estudiante la diligencie. Undécimo no se renueva.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor={`${ids}-from`} className={labelClass}>
                Desde (matrículas aprobadas de)
              </label>
              <select
                id={`${ids}-from`}
                className={selectClass}
                value={fromYear}
                disabled={busy}
                autoFocus
                onChange={(e) => changeFrom(Number(e.target.value))}
              >
                {fromOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${ids}-to`} className={labelClass}>
                Hacia (año que se crea)
              </label>
              <select
                id={`${ids}-to`}
                className={selectClass}
                value={toYear}
                disabled={busy}
                onChange={(e) => {
                  setToYear(Number(e.target.value));
                  setPreview(null);
                }}
              >
                {toOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-outline gap-2" disabled={busy} onClick={runPreview}>
              {loading === "preview" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Calculando…
                </>
              ) : (
                "Ver vista previa"
              )}
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-error/25 bg-error/5 p-3 text-sm text-error">
              {error}
            </div>
          )}

          <p className="sr-only" aria-live="polite">
            {preview
              ? `Vista previa lista: ${preview.created.length === 1 ? "se creará 1" : `se crearán ${preview.created.length}`} y ${preview.skipped.length === 1 ? "se omite 1" : `se omiten ${preview.skipped.length}`}.`
              : ""}
          </p>
          <div>
            {preview && (
              <div className="space-y-5">
                <section aria-labelledby={`${ids}-created`}>
                  <h3 id={`${ids}-created`} className="text-sm font-semibold text-base-content">
                    Se crearán ({preview.created.length})
                  </h3>
                  {preview.created.length ? (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-base-300">
                      <table className="table table-sm">
                        <caption className="sr-only">Matrículas que se crearán para {toYear}</caption>
                        <thead className="bg-base-200 text-base-content">
                          <tr>
                            <th scope="col">Estudiante</th>
                            <th scope="col">Grado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.created.map((row) => (
                            <tr key={row.student_id}>
                              <td>
                                <span className="block font-medium text-base-content">{row.name || row.email}</span>
                                <span className="block text-xs text-base-content/50">{row.email}</span>
                              </td>
                              <td className="whitespace-nowrap">
                                {row.from_grade}
                                <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-base-content/40" aria-hidden="true" />
                                <span className="sr-only"> pasa a </span>
                                <span className="font-medium text-base-content">{row.to_grade}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-base-content/60">
                      No hay estudiantes para renovar de {fromYear} a {toYear}.
                    </p>
                  )}
                </section>

                {preview.skipped.length > 0 && (
                  <section aria-labelledby={`${ids}-skipped`}>
                    <h3 id={`${ids}-skipped`} className="text-sm font-semibold text-base-content">
                      Se omiten ({preview.skipped.length})
                    </h3>
                    <ul className="mt-2 divide-y divide-base-300 rounded-lg border border-base-300">
                      {preview.skipped.map((row) => (
                        <li key={row.student_id} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:justify-between sm:gap-4">
                          <span className="text-base-content">
                            {row.name || row.email}
                            <span className="text-base-content/50"> · {row.from_grade}</span>
                          </span>
                          <span className="text-base-content/60">{row.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-base-300 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" className={ghostBtnClass} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={primaryBtnClass}
            disabled={!toCreate || busy}
            onClick={() => setConfirming(true)}
          >
            {loading === "create" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creando…
              </>
            ) : toCreate ? (
              `Crear ${plural(toCreate, "matrícula", "matrículas")}`
            ) : (
              "Crear matrículas"
            )}
          </button>
        </div>
      </Modal>

      {confirming && (
        <Alert
          isOpen
          onClose={() => setConfirming(false)}
          onAccept={create}
          title="Crear matrículas"
          variant="info"
          acceptText={`Crear ${plural(toCreate, "matrícula", "matrículas")}`}
          cancelText="Cancelar"
        >
          <p>
            {toCreate === 1 ? "Se creará" : "Se crearán"} {plural(toCreate, "matrícula", "matrículas")} para {toYear} con el grado siguiente. Cada
            estudiante la verá al entrar a Matrículas. Las que se crean no se borran en bloque.
          </p>
        </Alert>
      )}
    </>
  );
}

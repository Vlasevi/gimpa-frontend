/**
 * Paso 4 — Leer y firmar contrato, pagaré y hoja de matrícula.
 *
 * - Los PDF sin firmar se piden uno por uno, en binario (plan 15.3; antes llegaban los 3
 *   en base64, ~3 MB). La hoja lleva la foto del estudiante (hallazgo #38).
 * - Cada documento se marca como leído cuando el usuario llega al final en el visor, y
 *   "Firmar documentos" se habilita solo con los 3 leídos (plan 15.6, hallazgo #16).
 * - La firma y la huella de cada firmante se cargan una vez (en el panel o sobre el PDF)
 *   y se estampan en los 3 documentos. Al firmar, los 3 PDF se suben de inmediato
 *   (`POST …/signed/`): recargar ya no pierde lo firmado (plan 15.2).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, CheckCircle2, Eye, Fingerprint, Loader2, PenLine, Upload, X } from "lucide-react";

import { LoadingState } from "@/components/ui/LoadingState";
import { ghostBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { PdfModal, embedImagesInPdf, type FieldOverlay } from "@/components/pdf/PdfSignViewer";
import {
  ApiError,
  enrollmentApi,
  openDocument,
  type SignatureLayout,
  type StudentEnrollment,
  type UnsignedKind,
} from "@/components/matriculas/enrollmentApi";
import type { FlashFn } from "./types";

const DOCS: { kind: UnsignedKind; label: string; description: string }[] = [
  { kind: "contrato", label: "Contrato de matrícula", description: "Prestación del servicio educativo" },
  { kind: "pagare", label: "Pagaré", description: "Título valor que respalda el pago de la pensión" },
  { kind: "hoja_matricula", label: "Hoja de matrícula", description: "Formulario institucional con la foto del estudiante" },
];

type ImageType = "signature" | "fingerprint";
type SignerImages = Partial<Record<ImageType, { file: File; preview: string }>>;

/** Nombre del campo de firma/huella de un firmante en cada plantilla. */
function fieldName(kind: UnsignedKind, signerNumber: string, type: ImageType) {
  if (kind === "hoja_matricula") return `${type}_${signerNumber}`;
  return `${kind === "contrato" ? "guardian" : "deudor"}${signerNumber}_${type}`;
}

/** Firmante (`guardian1`/`guardian2`) y tipo a partir del nombre de un campo. */
function parseField(name: string): { signerKey: string; type: ImageType } | null {
  const standard = name.match(/^(?:guardian|deudor)(\d+)_(signature|fingerprint)$/);
  if (standard) return { signerKey: `guardian${standard[1]}`, type: standard[2] as ImageType };
  const hoja = name.match(/^(signature|fingerprint)_(\d+)$/);
  if (hoja) return { signerKey: `guardian${hoja[2]}`, type: hoja[1] as ImageType };
  return null;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function ImagePicker({
  label,
  icon: Icon,
  value,
  onSelect,
  onClear,
}: {
  label: string;
  icon: typeof PenLine;
  value?: { preview: string };
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-base-300 bg-base-100">
        {value ? (
          <img src={value.preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <Icon className="h-5 w-5 text-base-content/30" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className="btn btn-outline btn-primary btn-xs gap-1" onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          {value ? `Cambiar ${label.toLowerCase()}` : `Subir ${label.toLowerCase()}`}
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-xs gap-1" onClick={onClear} aria-label={`Quitar ${label.toLowerCase()}`}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Quitar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onSelect(file);
        }}
      />
    </div>
  );
}

export function StepSign({
  enrollment,
  onBack,
  onSigned,
  onNext,
  flash,
}: {
  enrollment: StudentEnrollment;
  onBack: () => void;
  onSigned: (next: StudentEnrollment) => void;
  onNext: () => void;
  flash: FlashFn;
}) {
  const alreadySigned = !!enrollment.progress?.signed;
  const [resign, setResign] = useState(false);
  const signing = !alreadySigned || resign;

  const [layout, setLayout] = useState<SignatureLayout | null>(null);
  const [pdfs, setPdfs] = useState<Partial<Record<UnsignedKind, Uint8Array>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [read, setRead] = useState<Set<UnsignedKind>>(new Set());
  const [openKind, setOpenKind] = useState<UnsignedKind | null>(null);
  const [images, setImages] = useState<Record<string, SignerImages>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [lay, ...files] = await Promise.all([
        enrollmentApi.signatureLayout(enrollment.id),
        ...DOCS.map((d) => enrollmentApi.unsignedPdf(enrollment.id, d.kind)),
      ]);
      setLayout(lay);
      setPdfs(Object.fromEntries(DOCS.map((d, i) => [d.kind, files[i]])));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "No se pudieron preparar los documentos.");
    }
  }, [enrollment.id]);

  useEffect(() => {
    if (signing) load();
  }, [signing, load]);

  // Libera las vistas previas al salir.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => {
      Object.values(imagesRef.current).forEach((s) =>
        Object.values(s).forEach((img) => img && URL.revokeObjectURL(img.preview)),
      );
    },
    [],
  );

  const setImage = useCallback((signerKey: string, type: ImageType, file: File | null) => {
    if (file && !["image/png", "image/jpeg"].includes(file.type)) {
      flash("error", "La firma y la huella deben ser imágenes PNG o JPG.");
      return;
    }
    setImages((prev) => {
      const current = prev[signerKey]?.[type];
      if (current) URL.revokeObjectURL(current.preview);
      return {
        ...prev,
        [signerKey]: { ...prev[signerKey], [type]: file ? { file, preview: URL.createObjectURL(file) } : undefined },
      };
    });
  }, [flash]);

  const signers = useMemo(() => layout?.signers ?? [], [layout]);
  const missingImages = signers.reduce(
    (n, s) => n + (images[s.key]?.signature ? 0 : 1) + (images[s.key]?.fingerprint ? 0 : 1),
    0,
  );
  const allRead = DOCS.every((d) => read.has(d.kind));
  const canSign = !!layout && allRead && missingImages === 0 && !submitting;

  const overlaysFor = useMemo(
    () => (kind: UnsignedKind): FieldOverlay[] =>
      Object.entries(layout?.signatureFields[kind] ?? {}).flatMap(([name, rect]) => {
        const parsed = parseField(name);
        if (!parsed || !signers.some((s) => s.key === parsed.signerKey)) return [];
        return [
          {
            fieldName: name,
            label: parsed.type === "signature" ? "Firma" : "Huella",
            rect,
            preview: images[parsed.signerKey]?.[parsed.type]?.preview ?? null,
            onSelect: (file: File) => setImage(parsed.signerKey, parsed.type, file),
            onClear: () => setImage(parsed.signerKey, parsed.type, null),
          },
        ];
      }),
    [layout, signers, images, setImage],
  );

  const sign = async () => {
    if (!layout) return;
    setSubmitting(true);
    try {
      const signed: Record<string, Blob> = {};
      for (const doc of DOCS) {
        const list: { fieldName: string; dataUrl: string }[] = [];
        for (const signer of signers) {
          const number = signer.key.replace("guardian", "");
          for (const type of ["signature", "fingerprint"] as ImageType[]) {
            const img = images[signer.key]?.[type];
            if (img) list.push({ fieldName: fieldName(doc.kind, number, type), dataUrl: await fileToDataUrl(img.file) });
          }
        }
        const bytes = await embedImagesInPdf(pdfs[doc.kind]!, list, layout.signatureFields[doc.kind] ?? {});
        signed[`${doc.kind}_signed`] = new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
      }
      const res = await enrollmentApi.uploadSigned(
        enrollment.id,
        signed as Record<"contrato_signed" | "pagare_signed" | "hoja_matricula_signed", Blob>,
      );
      if (res.enrollment) onSigned(res.enrollment);
      flash("success", "Documentos firmados");
      onNext();
    } catch (e) {
      flash("error", e instanceof ApiError ? e.message : "No se pudieron firmar los documentos.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Ya firmados: se pueden ver o volver a firmar ---
  if (!signing) {
    return (
      <section aria-labelledby="step-title" className="space-y-5">
        <h2 id="step-title" className="font-display text-xl font-semibold text-secondary">
          Documentos firmados
        </h2>
        <div role="status" className="alert alert-success alert-soft text-sm">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Ya firmaste el contrato, el pagaré y la hoja de matrícula.
        </div>
        <ul className="space-y-2">
          {DOCS.map((d) => (
            <li key={d.kind} className="flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-100 px-4 py-3">
              <span className="font-medium">{d.label}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1.5"
                onClick={() =>
                  openDocument(enrollment.id, `${d.kind}_signed`).catch((e) =>
                    flash("error", e instanceof ApiError ? e.message : "No se pudo abrir el documento."),
                  )
                }
                aria-label={`Ver ${d.label} firmado`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Ver
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" className={ghostBtnClass} onClick={onBack}>
            Atrás
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn btn-outline btn-primary" onClick={() => setResign(true)}>
              Volver a firmar
            </button>
            <button type="button" className={primaryBtnClass} onClick={onNext}>
              Continuar
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="alert alert-error alert-soft flex flex-wrap justify-between gap-3">
        <span>{loadError}</span>
        <button type="button" className="btn btn-sm" onClick={load}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!layout || DOCS.some((d) => !pdfs[d.kind])) {
    return <LoadingState label="Preparando los documentos con tus datos…" />;
  }

  const openDoc = DOCS.find((d) => d.kind === openKind);

  return (
    <section aria-labelledby="step-title" className="space-y-6">
      <div>
        <h2 id="step-title" className="font-display text-xl font-semibold text-secondary">
          Lee y firma los documentos
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Abre cada documento y léelo hasta el final. Carga la firma y la huella de cada firmante: se
          estamparán en los tres documentos al pulsar «Firmar documentos».
        </p>
      </div>

      {(enrollment.documents ?? []).some((d) => d.kind === "signed" && d.status === "REJECTED") && (
        <div role="alert" className="alert alert-warning alert-soft text-sm">
          <span>
            La institución pidió volver a firmar:{" "}
            {(enrollment.documents ?? [])
              .filter((d) => d.kind === "signed" && d.status === "REJECTED")
              .map((d) => `${d.label}${d.reject_reason ? ` (${d.reject_reason})` : ""}`)
              .join(", ")}
            .
          </span>
        </div>
      )}

      <ol className="space-y-3" aria-label="Documentos por leer">
        {DOCS.map((d) => {
          const done = read.has(d.kind);
          return (
            <li key={d.kind} className="flex flex-col gap-3 rounded-xl border border-base-300 bg-base-100 p-4 sm:flex-row sm:items-center">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${done ? "bg-success/10 text-success" : "bg-base-200 text-base-content/50"}`}
                aria-hidden="true"
              >
                {done ? <BookOpenCheck className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{d.label}</p>
                <p className="text-xs text-base-content/60">{d.description}</p>
              </div>
              <span className={`badge badge-sm ${done ? "badge-success badge-soft" : "badge-ghost"}`}>
                {done ? "Leído" : "Sin leer"}
              </span>
              <button type="button" className="btn btn-outline btn-primary btn-sm" onClick={() => setOpenKind(d.kind)}>
                {done ? "Abrir de nuevo" : "Abrir y leer"}
              </button>
            </li>
          );
        })}
      </ol>

      <fieldset className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
        <legend className="px-1 font-display text-base font-semibold text-secondary">Firmantes</legend>
        <ul className="grid gap-4 md:grid-cols-2">
          {signers.map((s) => (
            <li key={s.key} className="space-y-3 rounded-xl bg-base-100 p-4 shadow-sm">
              <p className="text-sm font-semibold text-base-content">{s.label}</p>
              <ImagePicker
                label="Firma"
                icon={PenLine}
                value={images[s.key]?.signature}
                onSelect={(f) => setImage(s.key, "signature", f)}
                onClear={() => setImage(s.key, "signature", null)}
              />
              <ImagePicker
                label="Huella"
                icon={Fingerprint}
                value={images[s.key]?.fingerprint}
                onSelect={(f) => setImage(s.key, "fingerprint", f)}
                onClear={() => setImage(s.key, "fingerprint", null)}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      {!canSign && !submitting && (
        <p className="text-sm text-base-content/70" role="status">
          {!allRead
            ? `Falta leer ${DOCS.filter((d) => !read.has(d.kind)).map((d) => d.label.toLowerCase()).join(", ")}.`
            : `Faltan ${missingImages} ${missingImages === 1 ? "imagen" : "imágenes"} de firma o huella.`}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className={ghostBtnClass} onClick={onBack} disabled={submitting}>
          Atrás
        </button>
        <button type="button" className={primaryBtnClass} onClick={sign} disabled={!canSign}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Firmando documentos…" : "Firmar documentos"}
        </button>
      </div>

      {openDoc && pdfs[openDoc.kind] && (
        <PdfModal
          pdfData={pdfs[openDoc.kind]!}
          title={openDoc.label}
          onClose={() => setOpenKind(null)}
          overlays={overlaysFor(openDoc.kind)}
          onReadToEnd={() => setRead((prev) => new Set(prev).add(openDoc.kind))}
          footer={
            <p className="text-sm text-base-content/70" role="status">
              {read.has(openDoc.kind)
                ? "Leíste el documento completo."
                : "Desplázate hasta el final para marcarlo como leído."}
            </p>
          }
        />
      )}
    </section>
  );
}

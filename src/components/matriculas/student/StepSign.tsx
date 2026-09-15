/**
 * Paso 4 — Leer y firmar contrato, pagaré y hoja de matrícula.
 *
 * - Los PDF sin firmar se piden uno por uno, en binario (plan 15.3; antes llegaban los 3
 *   en base64, ~3 MB). La hoja lleva la foto del estudiante (hallazgo #38).
 * - Cada documento se marca como leído cuando el usuario llega al final en el visor, y
 *   "Firmar documentos" se habilita solo con los 3 leídos (plan 15.6, hallazgo #16).
 * - La firma y la huella de cada firmante se cargan UNA vez, en el panel de firmantes, y
 *   se colocan solas en los campos de los 3 documentos. Dentro del visor esos campos son
 *   solo vista previa (sin botones para subir otra vez). Al firmar se estampan con pdf-lib
 *   y los 3 PDF se suben de inmediato (`POST …/signed/`): recargar ya no pierde lo firmado
 *   (plan 15.2).
 * - Una URL `blob:` por imagen, creada al elegirla y revocada al cambiarla, quitarla o
 *   salir del paso; el panel y los 3 visores comparten esa misma URL.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, CheckCircle2, Eye, Fingerprint, PenLine, Upload, X } from "lucide-react";

import { BusyLabel } from "@/components/ui/BusyLabel";
import { LoadingState } from "@/components/ui/LoadingState";
import { outlineBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { PdfModal, embedImagesInPdf, type EmbedImage, type FieldOverlay } from "@/components/pdf/PdfSignViewer";
import {
  ApiError,
  enrollmentApi,
  openDocument,
  type SignatureLayout,
  type StudentEnrollment,
  type UnsignedKind,
} from "@/components/matriculas/enrollmentApi";
import type { FlashFn } from "./types";
import { cardTitleClass, titleClass } from "@/components/ui/textStyles";

const DOCS: { kind: UnsignedKind; label: string; description: string }[] = [
  { kind: "contrato", label: "Contrato de matrícula", description: "Prestación del servicio educativo" },
  { kind: "pagare", label: "Pagaré", description: "Título valor que respalda el pago de la pensión" },
  { kind: "hoja_matricula", label: "Hoja de matrícula", description: "Formulario institucional con la foto del estudiante" },
];

type ImageType = "signature" | "fingerprint";
const IMAGE_TYPES: ImageType[] = ["signature", "fingerprint"];
/** `preview` es la URL `blob:` del archivo, una sola por imagen. */
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

  // Última versión de las imágenes, para revocar sus URL al cambiarlas y al salir.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      Object.values(imagesRef.current).forEach((s) =>
        Object.values(s).forEach((img) => img && URL.revokeObjectURL(img.preview)),
      );
    },
    [],
  );

  // La URL se crea aquí, una vez por archivo elegido (nunca dentro de un `setState` ni
  // en cada render), y la anterior se revoca en el mismo momento.
  const setImage = useCallback((signerKey: string, type: ImageType, file: File | null) => {
    if (file && !["image/png", "image/jpeg"].includes(file.type)) {
      flash("error", "La firma y la huella deben ser imágenes PNG o JPG.");
      return;
    }
    const current = imagesRef.current;
    const previous = current[signerKey]?.[type];
    const next = {
      ...current,
      [signerKey]: { ...current[signerKey], [type]: file ? { file, preview: URL.createObjectURL(file) } : undefined },
    };
    imagesRef.current = next;
    setImages(next);
    if (previous) URL.revokeObjectURL(previous.preview);
  }, [flash]);

  const signers = useMemo(() => layout?.signers ?? [], [layout]);
  const missingImages = signers.reduce(
    (n, s) => n + (images[s.key]?.signature ? 0 : 1) + (images[s.key]?.fingerprint ? 0 : 1),
    0,
  );
  const allRead = DOCS.every((d) => read.has(d.kind));
  const canSign = !!layout && allRead && missingImages === 0 && !submitting;

  // Vista previa de la firma y la huella en cada campo de cada documento: sin
  // `onSelect`/`onClear`, así el visor no ofrece subirlas otra vez. Un arreglo estable
  // por documento: el visor no vuelve a pintar las páginas si solo cambia otra cosa.
  const overlaysByKind = useMemo(() => {
    const byKind = {} as Record<UnsignedKind, FieldOverlay[]>;
    for (const doc of DOCS) {
      byKind[doc.kind] = Object.entries(layout?.signatureFields[doc.kind] ?? {}).flatMap(([name, rect]) => {
        const parsed = parseField(name);
        if (!parsed || !signers.some((s) => s.key === parsed.signerKey)) return [];
        const preview = images[parsed.signerKey]?.[parsed.type]?.preview;
        if (!preview) return [];
        return [{ fieldName: name, label: parsed.type === "signature" ? "Firma" : "Huella", rect, preview }];
      });
    }
    return byKind;
  }, [layout, signers, images]);

  const sign = async () => {
    if (!layout) return;
    setSubmitting(true);
    try {
      // Cada imagen se lee una sola vez y sus bytes sirven para los 3 documentos.
      const bytesByFile = new Map<File, Uint8Array>();
      const bytesOf = async (file: File) => {
        let bytes = bytesByFile.get(file);
        if (!bytes) {
          bytes = new Uint8Array(await file.arrayBuffer());
          bytesByFile.set(file, bytes);
        }
        return bytes;
      };
      const signed: Record<string, Blob> = {};
      for (const doc of DOCS) {
        const list: EmbedImage[] = [];
        for (const signer of signers) {
          const number = signer.key.replace("guardian", "");
          for (const type of IMAGE_TYPES) {
            const img = images[signer.key]?.[type];
            if (img) list.push({ fieldName: fieldName(doc.kind, number, type), bytes: await bytesOf(img.file) });
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
        <h2 id="step-title" className={titleClass}>
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
          <button type="button" className={outlineBtnClass} onClick={onBack}>
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
  const rejectedSigned = (enrollment.documents ?? []).filter((d) => d.kind === "signed" && d.status === "REJECTED");

  return (
    <section aria-labelledby="step-title" className="space-y-6">
      <div>
        <h2 id="step-title" className={titleClass}>
          Lee y firma los documentos
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Carga una sola vez la firma y la huella de cada firmante: se colocan solas en los tres
          documentos. Después abre cada documento y léelo hasta el final.
        </p>
      </div>

      {rejectedSigned.length > 0 && (
        <div role="alert" className="alert alert-warning alert-soft text-sm">
          <span>
            La institución pidió volver a firmar:{" "}
            {rejectedSigned.map((d) => `${d.label}${d.reject_reason ? ` (${d.reject_reason})` : ""}`).join(", ")}.
          </span>
        </div>
      )}

      <fieldset className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
        <legend className={`px-1 ${cardTitleClass}`}>Firmantes</legend>
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

      {!canSign && !submitting && (
        <p className="text-sm text-base-content/70" role="status">
          {missingImages > 0
            ? `Faltan ${missingImages} ${missingImages === 1 ? "imagen" : "imágenes"} de firma o huella.`
            : `Falta leer ${DOCS.filter((d) => !read.has(d.kind)).map((d) => d.label.toLowerCase()).join(", ")}.`}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className={outlineBtnClass} onClick={onBack} disabled={submitting}>
          Atrás
        </button>
        <button type="button" className={primaryBtnClass} onClick={sign} disabled={!canSign}>
          <BusyLabel busy={submitting} busyText="Firmando documentos…">
            Firmar documentos
          </BusyLabel>
        </button>
      </div>

      {openDoc && pdfs[openDoc.kind] && (
        <PdfModal
          pdfData={pdfs[openDoc.kind]!}
          title={openDoc.label}
          onClose={() => setOpenKind(null)}
          overlays={overlaysByKind[openDoc.kind]}
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

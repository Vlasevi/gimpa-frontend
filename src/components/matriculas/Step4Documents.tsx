// components/matriculas/steps/Step4Documents.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { LoadingState } from "@/components/ui/LoadingState";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// ─── Types ────────────────────────────────────────────────────────────────────
type FieldRect = { page: number; x: number; y: number; w: number; h: number };

interface FieldOverlay {
  fieldName: string;
  label: string;
  rect: FieldRect;
  preview: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}

// ─── OverlayZone ──────────────────────────────────────────────────────────────
const OverlayZone = ({
  left,
  top,
  width,
  height,
  label,
  preview,
  onSelect,
  onClear,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  preview: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute" style={{ left, top, width, height }}>
      {preview ? (
        <div className="w-full h-full relative group cursor-pointer">
          <img
            src={preview}
            alt={label}
            className="w-full h-full object-contain"
          />
          <button
            className="absolute -top-1 -right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            ✕
          </button>
          <div
            className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded"
            onClick={() => inputRef.current?.click()}
          />
        </div>
      ) : (
        <button
          className="w-full h-full border-2 border-dashed border-primary/60 rounded bg-primary/5 hover:bg-primary/15 flex flex-col items-center justify-center cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <svg
            className="w-4 h-4 text-primary/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-[8px] text-primary/70 font-medium mt-0.5 leading-tight text-center px-1">
            {label}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

// ─── PdfPage ──────────────────────────────────────────────────────────────────
const PdfPage = ({
  page,
  scale,
  pageIndex,
  overlays,
}: {
  page: PDFPageProxy;
  scale: number;
  pageIndex: number;
  overlays?: FieldOverlay[];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageHeightPts = page.getViewport({ scale: 1 }).height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const ctx = canvas.getContext("2d")!;
    const renderTask = page.render({ canvasContext: ctx, viewport });

    return () => {
      renderTask.cancel();
    };
  }, [page, scale]);

  const pageOverlays =
    overlays?.filter((o) => o.rect.page === pageIndex) ?? [];

  return (
    <div className="relative mx-auto" style={{ width: "fit-content" }}>
      <canvas ref={canvasRef} className="shadow-md rounded block" />
      {pageOverlays.map((o) => (
        <OverlayZone
          key={o.fieldName}
          left={o.rect.x * scale}
          top={(pageHeightPts - o.rect.y - o.rect.h) * scale}
          width={o.rect.w * scale}
          height={o.rect.h * scale}
          label={o.label}
          preview={o.preview}
          onSelect={o.onSelect}
          onClear={o.onClear}
        />
      ))}
    </div>
  );
};

// ─── PdfViewer ────────────────────────────────────────────────────────────────
const PdfViewer = ({
  pdfData,
  scale,
  overlays,
}: {
  pdfData: Uint8Array;
  scale: number;
  overlays?: FieldOverlay[];
}) => {
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const dataRef = useRef<Uint8Array>(new Uint8Array(pdfData));

  useEffect(() => {
    const updateWidth = () => {
      if (!containerRef.current) return;
      setContainerWidth(containerRef.current.clientWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    dataRef.current = new Uint8Array(pdfData);
  }, [pdfData]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }

      const loadingTask = pdfjs.getDocument({ data: dataRef.current.slice(0) });
      const doc = await loadingTask.promise;
      if (cancelled) {
        doc.destroy();
        return;
      }

      docRef.current = doc;
      const loaded: PDFPageProxy[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        if (cancelled) {
          doc.destroy();
          return;
        }
        loaded.push(p);
      }
      setPages(loaded);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pdfData]);

  if (loading) {
    return <LoadingState compact className="h-48" label="Cargando documentos…" />;
  }

  const firstPageWidth = pages[0]?.getViewport({ scale: 1 }).width ?? 0;
  const fitScale =
    containerWidth > 0 && firstPageWidth > 0
      ? Math.max(0.4, (containerWidth - 8) / firstPageWidth)
      : scale;
  const effectiveScale = Math.min(scale, fitScale);

  return (
    <div ref={containerRef} className="flex flex-col gap-4 p-4 w-full overflow-x-hidden">
      {pages.map((page, i) => (
        <PdfPage
          key={i}
          page={page}
          scale={effectiveScale}
          pageIndex={i}
          overlays={overlays}
        />
      ))}
    </div>
  );
};

// ─── PdfModal ─────────────────────────────────────────────────────────────────
const PdfModal = ({
  pdfData,
  title,
  onClose,
  overlays,
}: {
  pdfData: Uint8Array;
  title: string;
  onClose: () => void;
  overlays?: FieldOverlay[];
}) => {
  const [scale, setScale] = useState(1.2);
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.4));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
      style={{
        backdropFilter: "blur(6px)",
        backgroundColor: "rgba(0,0,0,0.55)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-[96vw] max-w-[1300px]"
        style={{ maxHeight: "95vh" }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <span className="font-semibold text-gray-800">{title}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
              <button
                className="btn btn-xs btn-ghost min-h-0 h-6 px-2"
                onClick={zoomOut}
                disabled={scale <= 0.4}
              >
                −
              </button>
              <span className="text-xs font-mono w-10 text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <button
                className="btn btn-xs btn-ghost min-h-0 h-6 px-2"
                onClick={zoomIn}
                disabled={scale >= 3}
              >
                +
              </button>
            </div>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overflow-x-hidden bg-gray-100 flex-1">
          <PdfViewer pdfData={pdfData} scale={scale} overlays={overlays} />
        </div>
      </div>
    </div>
  );
};

// ─── pdf-lib helper ───────────────────────────────────────────────────────────
async function embedImagesInPdf(
  pdfBytes: Uint8Array,
  images: { fieldName: string; dataUrl: string }[],
  fieldRects: Record<string, FieldRect>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes.slice(0));
  const pages = doc.getPages();

  for (const { fieldName, dataUrl } of images) {
    const rect = fieldRects[fieldName];
    if (!rect || !dataUrl) continue;

    const imgBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
    const isPng = dataUrl.includes("image/png");
    const img = isPng
      ? await doc.embedPng(imgBytes)
      : await doc.embedJpg(imgBytes);

    const page = pages[rect.page];
    if (!page) continue;

    const aspect = img.width / img.height;
    let drawW = rect.w;
    let drawH = drawW / aspect;
    if (drawH > rect.h) {
      drawH = rect.h;
      drawW = drawH * aspect;
    }
    const drawX = rect.x + (rect.w - drawW) / 2;
    const drawY = rect.y + (rect.h - drawH) / 2;

    page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
  }

  const result = await doc.save();
  return new Uint8Array(result);
}

// ─── Step4Documents ────────────────────────────────────────────────────────────
interface UnsignedPdfs {
  contrato: Uint8Array | null;
  pagare: Uint8Array | null;
  hoja_matricula: Uint8Array | null;
  signers: { label: string; key: string }[];
  signatureFields: Record<string, Record<string, FieldRect>>;
}

interface SignerImages {
  signature: { file: File; preview: string } | null;
  fingerprint: { file: File; preview: string } | null;
}

export const Step4Documents = ({
  next,
  back,
  unsignedPdfs,
  updateUploadedFiles,
  signedPdfs,
  setSignedPdfs,
}: {
  next: () => void;
  back: () => void;
  unsignedPdfs: UnsignedPdfs;
  updateUploadedFiles: (files: Record<string, File>) => void;
  signedPdfs: { contrato: Uint8Array | null; pagare: Uint8Array | null; hoja_matricula: Uint8Array | null };
  setSignedPdfs: React.Dispatch<React.SetStateAction<{ contrato: Uint8Array | null; pagare: Uint8Array | null; hoja_matricula: Uint8Array | null }>>;
  [key: string]: any;
}) => {
  const [openDoc, setOpenDoc] = useState<"contrato" | "pagare" | "hoja_matricula" | null>(null);
  const [signerImages, setSignerImages] = useState<
    Record<string, SignerImages>
  >({});
  const [signing, setSigning] = useState(false);

  const { signers, signatureFields } = unsignedPdfs;

  // Count total fields and how many are filled
  const totalFields = signers.length * 2; // signature + fingerprint per signer
  const filledFields = signers.reduce(
    (n, s) =>
      n +
      (signerImages[s.key]?.signature ? 1 : 0) +
      (signerImages[s.key]?.fingerprint ? 1 : 0),
    0,
  );
  const allImagesUploaded = totalFields > 0 && filledFields === totalFields;
  const isSigned =
    signedPdfs.contrato !== null &&
    signedPdfs.pagare !== null &&
    signedPdfs.hoja_matricula !== null;

  const handleImageSelect = useCallback(
    (signerKey: string, type: "signature" | "fingerprint", file: File) => {
      const preview = URL.createObjectURL(file);
      setSignerImages((prev) => ({
        ...prev,
        [signerKey]: {
          ...prev[signerKey],
          [type]: { file, preview },
        } as SignerImages,
      }));
      setSignedPdfs({ contrato: null, pagare: null, hoja_matricula: null });
    },
    [],
  );

  const handleImageClear = useCallback(
    (signerKey: string, type: "signature" | "fingerprint") => {
      setSignerImages((prev) => {
        const current = prev[signerKey];
        if (current?.[type]?.preview)
          URL.revokeObjectURL(current[type]!.preview);
        return {
          ...prev,
          [signerKey]: { ...current, [type]: null } as SignerImages,
        };
      });
      setSignedPdfs({ contrato: null, pagare: null, hoja_matricula: null });
    },
    [],
  );

  // Build interactive overlays for a given document
  const buildOverlays = useCallback(
    (docKey: "contrato" | "pagare" | "hoja_matricula"): FieldOverlay[] => {
      const rects = signatureFields[docKey] || {};
      const result: FieldOverlay[] = [];

      for (const [fieldName, rect] of Object.entries(rects)) {
        let signerKey = "";
        let imageType: "signature" | "fingerprint" | null = null;

        const standardMatch = fieldName.match(
          /^(guardian|deudor)(\d+)_(signature|fingerprint)$/,
        );
        const hojaMatch = fieldName.match(/^(signature|fingerprint)_(\d+)$/);

        if (standardMatch) {
          const [, , num, type] = standardMatch;
          signerKey = `guardian${num}`;
          imageType = type as "signature" | "fingerprint";
        } else if (hojaMatch) {
          const [, type, num] = hojaMatch;
          signerKey = `guardian${num}`;
          imageType = type as "signature" | "fingerprint";
        }

        if (!signerKey || !imageType) continue;

        const signer = signers.find((s) => s.key === signerKey);
        if (!signer) continue;

        const typeLabel = imageType === "signature" ? "Firma" : "Huella";

        result.push({
          fieldName,
          label: typeLabel,
          rect,
          preview: signerImages[signerKey]?.[imageType]?.preview ?? null,
          onSelect: (file: File) =>
            handleImageSelect(signerKey, imageType, file),
          onClear: () => handleImageClear(signerKey, imageType),
        });
      }

      return result;
    },
    [signers, signatureFields, signerImages, handleImageSelect, handleImageClear],
  );

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleSign = async () => {
    if (!unsignedPdfs.contrato || !unsignedPdfs.pagare || !unsignedPdfs.hoja_matricula) return;
    setSigning(true);

    try {
      const buildImageList = async (docKey: "contrato" | "pagare" | "hoja_matricula") => {
        const images: { fieldName: string; dataUrl: string }[] = [];
        for (const signer of signers) {
          const imgs = signerImages[signer.key];
          if (!imgs) continue;

          const num = signer.key.replace("guardian", "");
          const prefix =
            docKey === "contrato"
              ? `guardian${num}`
              : docKey === "pagare"
                ? `deudor${num}`
                : null;

          if (imgs.signature) {
            images.push({
              fieldName:
                docKey === "hoja_matricula"
                  ? `signature_${num}`
                  : `${prefix}_signature`,
              dataUrl: await fileToDataUrl(imgs.signature.file),
            });
          }
          if (imgs.fingerprint) {
            images.push({
              fieldName:
                docKey === "hoja_matricula"
                  ? `fingerprint_${num}`
                  : `${prefix}_fingerprint`,
              dataUrl: await fileToDataUrl(imgs.fingerprint.file),
            });
          }
        }
        return images;
      };

      const [contratoImages, pagareImages, hojaImages] = await Promise.all([
        buildImageList("contrato"),
        buildImageList("pagare"),
        buildImageList("hoja_matricula"),
      ]);

      const [signedContrato, signedPagare, signedHoja] = await Promise.all([
        embedImagesInPdf(
          unsignedPdfs.contrato,
          contratoImages,
          signatureFields.contrato || {},
        ),
        embedImagesInPdf(
          unsignedPdfs.pagare,
          pagareImages,
          signatureFields.pagare || {},
        ),
        embedImagesInPdf(
          unsignedPdfs.hoja_matricula,
          hojaImages,
          signatureFields.hoja_matricula || {},
        ),
      ]);

      setSignedPdfs({
        contrato: signedContrato,
        pagare: signedPagare,
        hoja_matricula: signedHoja,
      });

      // Push signed PDFs as File objects to parent state for upload in Step6
      updateUploadedFiles({
        contrato_signed: new File(
          [signedContrato],
          "contrato_firmado.pdf",
          { type: "application/pdf" },
        ),
        pagare_signed: new File(
          [signedPagare],
          "pagare_firmado.pdf",
          { type: "application/pdf" },
        ),
        hoja_matricula_signed: new File(
          [signedHoja],
          "hoja_matricula_firmada.pdf",
          { type: "application/pdf" },
        ),
      });
    } catch (e) {
      console.error("Error firmando PDFs:", e);
    } finally {
      setSigning(false);
    }
  };

  const docs = [
    {
      key: "contrato" as const,
      label: "Contrato de matrícula",
      description: "Contrato de prestación de servicios educativos",
    },
    {
      key: "pagare" as const,
      label: "Pagaré educativo",
      description: "Título valor de obligación de pago",
    },
    {
      key: "hoja_matricula" as const,
      label: "Hoja de matrícula",
      description: "Formulario institucional de matrícula",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-secondary">
        Firmas y Documentos
      </h2>
      <p className="text-sm text-gray-500">
        Abre cada documento y haz clic en los campos resaltados para subir la
        firma y huella directamente sobre el PDF.
      </p>

      {/* Progress indicator */}
      {totalFields > 0 && !isSigned && (
        <div className="flex items-center gap-3">
          <progress
            className="progress progress-primary flex-1"
            value={filledFields}
            max={totalFields}
          />
          <span className="text-xs text-gray-500 shrink-0">
            {filledFields}/{totalFields} campos
          </span>
        </div>
      )}

      {isSigned && (
        <div className="alert alert-success text-sm">
          Documentos firmados correctamente. Puedes previsualizarlos antes de
          continuar.
        </div>
      )}

      {/* Document cards */}
      <div className="flex flex-col gap-3">
        {docs.map(({ key, label, description }) => {
          const pdf = isSigned ? signedPdfs[key] : unsignedPdfs[key];
          return (
            <div
              key={key}
              className="card border bg-base-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body p-4 flex-row items-center gap-4">
                <div className="bg-red-100 text-red-600 font-bold text-sm rounded-lg px-3 py-2 shrink-0">
                  PDF
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-400">{description}</p>
                </div>
                <button
                  className="btn btn-sm btn-outline btn-primary shrink-0"
                  onClick={() => setOpenDoc(key)}
                  disabled={!pdf}
                >
                  {pdf ? (
                    isSigned ? "Ver documento" : "Ver y firmar"
                  ) : (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sign button */}
      {allImagesUploaded && !isSigned && (
        <button
          className="btn btn-secondary w-full"
          onClick={handleSign}
          disabled={signing}
        >
          {signing ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Firmando documentos...
            </>
          ) : (
            "Firmar documentos"
          )}
        </button>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button className="btn btn-ghost" onClick={back}>
          Atrás
        </button>
        <button className="btn btn-primary" onClick={next} disabled={!isSigned}>
          Siguiente
        </button>
      </div>

      {/* PDF modal with interactive overlays */}
      {openDoc &&
        (isSigned ? signedPdfs[openDoc] : unsignedPdfs[openDoc]) && (
          <PdfModal
            pdfData={
              (isSigned ? signedPdfs[openDoc] : unsignedPdfs[openDoc])!
            }
            title={
              openDoc === "contrato"
                ? "Contrato de matrícula"
                : openDoc === "pagare"
                  ? "Pagaré educativo"
                  : "Hoja de matrícula"
            }
            onClose={() => setOpenDoc(null)}
            overlays={isSigned ? undefined : buildOverlays(openDoc)}
          />
        )}
    </div>
  );
};

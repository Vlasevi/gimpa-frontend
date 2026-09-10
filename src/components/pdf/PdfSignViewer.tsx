// components/pdf/PdfSignViewer.tsx
// Visor de PDF con zonas de firma/imagen superpuestas. Componente compartido
// entre el flujo de matrícula (Step4Documents) y el de contratación.
import { useState, useEffect, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { LoadingState } from "@/components/ui/LoadingState";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldRect = { page: number; x: number; y: number; w: number; h: number };

export interface FieldOverlay {
  fieldName: string;
  label: string;
  rect: FieldRect;
  preview: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}

// ─── OverlayZone ──────────────────────────────────────────────────────────────
export const OverlayZone = ({
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
          <img src={preview} alt={label} className="w-full h-full object-contain" />
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
          <svg className="w-4 h-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
    const renderTask = page.render({ canvas, canvasContext: ctx, viewport } as any);

    return () => {
      renderTask.cancel();
    };
  }, [page, scale]);

  const pageOverlays = overlays?.filter((o) => o.rect.page === pageIndex) ?? [];

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
export const PdfViewer = ({
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
    return <LoadingState compact className="h-48" label="Cargando documento…" />;
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
        <PdfPage key={i} page={page} scale={effectiveScale} pageIndex={i} overlays={overlays} />
      ))}
    </div>
  );
};

// ─── PdfModal ─────────────────────────────────────────────────────────────────
export const PdfModal = ({
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

  useBodyScrollLock(true);

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
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-[96vw] max-w-[1300px]" style={{ maxHeight: "95vh" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <span className="font-semibold text-gray-800">{title}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
              <button className="btn btn-xs btn-ghost min-h-0 h-6 px-2" onClick={zoomOut} disabled={scale <= 0.4}>−</button>
              <span className="text-xs font-mono w-10 text-center select-none">{Math.round(scale * 100)}%</span>
              <button className="btn btn-xs btn-ghost min-h-0 h-6 px-2" onClick={zoomIn} disabled={scale >= 3}>+</button>
            </div>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
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
export async function embedImagesInPdf(
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
    const img = isPng ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);

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

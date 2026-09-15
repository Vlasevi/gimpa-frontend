// components/pdf/PdfSignViewer.tsx
// Visor de PDF con zonas de firma/imagen superpuestas. Componente compartido
// entre el flujo de matrícula (paso de firmas) y el de contratación.
//
// Accesibilidad (hallazgo #18): `PdfModal` es un `role="dialog"` modal con título,
// botones con nombre ("Alejar", "Acercar", "Cerrar"), foco inicial en el diálogo y
// devolución del foco al cerrar. `onReadToEnd` avisa cuando el usuario llegó al final
// del documento (plan 15.6: solo se firma lo que se leyó).
//
// Zonas de firma (`overlays`):
// - Con `onSelect`/`onClear` son interactivas: el usuario sube la imagen sobre el PDF
//   (Contratación).
// - Sin ellos son solo una vista previa: la imagen ya cargada aparece donde quedará al
//   firmar y, si todavía no hay imagen, no se dibuja nada (Matrículas: la firma y la huella
//   se cargan una sola vez en el panel de firmantes).
//
// Rendimiento: el documento de pdf.js (y su Web Worker) se destruye al cerrar el visor;
// las páginas no se vuelven a dibujar si solo cambia el padre (mismo `page` y `scale`).
import { memo, useState, useEffect, useId, useRef, type ReactNode } from "react";
import { Minus, Plus, X } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import { PDFDocument, type PDFImage } from "pdf-lib";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { LoadingState } from "@/components/ui/LoadingState";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Zoom con el que abre el visor: 100 % (1 px de pantalla por punto del PDF). */
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const SCALE_STEP = 0.2;

// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldRect = { page: number; x: number; y: number; w: number; h: number };

export interface FieldOverlay {
  fieldName: string;
  label: string;
  rect: FieldRect;
  preview: string | null;
  /** Sin `onSelect` la zona es solo vista previa (no invita a subir nada). */
  onSelect?: (file: File) => void;
  onClear?: () => void;
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
  onSelect?: (file: File) => void;
  onClear?: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Solo vista previa: la imagen donde quedará estampada, sin botones.
  if (!onSelect) {
    if (!preview) return null;
    return (
      <div className="pointer-events-none absolute" style={{ left, top, width, height }}>
        <img src={preview} alt={label} className="h-full w-full object-contain" draggable={false} />
      </div>
    );
  }

  return (
    <div className="absolute" style={{ left, top, width, height }}>
      {preview ? (
        <div className="w-full h-full relative group cursor-pointer">
          <img src={preview} alt={label} className="w-full h-full object-contain" />
          {onClear && (
            <button
              type="button"
              aria-label={`Quitar ${label.toLowerCase()}`}
              className="absolute -top-1 -right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label={`Cambiar ${label.toLowerCase()}`}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/10 focus-visible:bg-black/10 transition-colors rounded"
            onClick={() => inputRef.current?.click()}
          />
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Subir ${label.toLowerCase()}`}
          className="w-full h-full border-2 border-dashed border-primary/60 rounded bg-primary/5 hover:bg-primary/15 flex flex-col items-center justify-center cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Plus className="w-4 h-4 text-primary/60" aria-hidden="true" />
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
        tabIndex={-1}
        aria-hidden="true"
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
// `memo`: con el mismo `page`, `scale` y `overlays` no se vuelve a renderizar (p. ej.
// cuando el padre cambia el pie "Leíste el documento completo").
const PdfPage = memo(function PdfPage({
  page,
  scale,
  pageIndex,
  overlays,
}: {
  page: PDFPageProxy;
  scale: number;
  pageIndex: number;
  overlays?: FieldOverlay[];
}) {
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
    const renderTask = page.render({ canvas, canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]);
    // Cancelar un render lo rechaza: no es un error.
    renderTask.promise.catch(() => undefined);

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
});

// ─── PdfViewer ────────────────────────────────────────────────────────────────
export const PdfViewer = ({
  pdfData,
  scale,
  overlays,
  onLoaded,
}: {
  pdfData: Uint8Array;
  scale: number;
  overlays?: FieldOverlay[];
  /** Se llama cuando todas las páginas quedaron cargadas. */
  onLoaded?: () => void;
}) => {
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  // Ancho disponible (sin el padding) para que la página nunca se salga del visor. El
  // contenedor existe desde el primer render, así que se mide también al abrir.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    // pdf.js se queda con el buffer que recibe (lo pasa al worker): se le da una copia.
    const task = pdfjs.getDocument({ data: pdfData.slice() });

    task.promise
      .then(async (doc) => {
        const loaded: PDFPageProxy[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          loaded.push(page);
        }
        if (cancelled) return;
        setPages(loaded);
        setLoading(false);
        onLoadedRef.current?.();
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      // Libera el documento y su Web Worker (antes quedaban vivos tras cerrar el visor).
      void task.destroy();
    };
  }, [pdfData]);

  const firstPageWidth = pages[0]?.getViewport({ scale: 1 }).width ?? 0;
  const fitScale =
    containerWidth > 0 && firstPageWidth > 0 ? Math.max(MIN_SCALE, containerWidth / firstPageWidth) : scale;
  const effectiveScale = Math.min(scale, fitScale);

  return (
    <div ref={containerRef} className="flex flex-col gap-4 p-4 w-full overflow-x-hidden">
      {loading ? (
        <LoadingState compact className="h-48" label="Cargando documento…" />
      ) : failed ? (
        <p role="alert" className="py-12 text-center text-sm text-error">
          No se pudo mostrar el documento. Ciérralo y vuelve a abrirlo.
        </p>
      ) : (
        pages.map((page, i) => (
          <PdfPage key={i} page={page} scale={effectiveScale} pageIndex={i} overlays={overlays} />
        ))
      )}
    </div>
  );
};

// ─── PdfModal ─────────────────────────────────────────────────────────────────
export const PdfModal = ({
  pdfData,
  title,
  onClose,
  overlays,
  onReadToEnd,
  footer,
}: {
  pdfData: Uint8Array;
  title: string;
  onClose: () => void;
  overlays?: FieldOverlay[];
  /** Se llama una vez, cuando el usuario llega al final del documento. */
  onReadToEnd?: () => void;
  /** Franja inferior opcional (p. ej. "Llegaste al final del documento"). */
  footer?: ReactNode;
}) => {
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const zoomIn = () => setScale((s) => Math.min(Math.round((s + SCALE_STEP) * 10) / 10, MAX_SCALE));
  const zoomOut = () => setScale((s) => Math.max(Math.round((s - SCALE_STEP) * 10) / 10, MIN_SCALE));
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reachedEndRef = useRef(false);
  const onReadToEndRef = useRef(onReadToEnd);
  onReadToEndRef.current = onReadToEnd;

  useBodyScrollLock(true);

  // Foco inicial en el diálogo y devolución del foco al cerrar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const checkEnd = () => {
    const el = scrollRef.current;
    if (!el || reachedEndRef.current) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      reachedEndRef.current = true;
      onReadToEndRef.current?.();
    }
  };

  // Mantiene el foco dentro del diálogo con Tab / Shift+Tab.
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/60 p-2 backdrop-blur-sm md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="flex w-[96vw] max-w-[1300px] flex-col rounded-2xl bg-base-100 shadow-2xl focus:outline-none"
        style={{ maxHeight: "95vh" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-5 py-3">
          <h2 id={titleId} className="font-display text-lg font-semibold text-secondary">
            {title}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-base-200 px-2 py-1" role="group" aria-label="Zoom">
              <button
                type="button"
                className="btn btn-ghost btn-xs h-7 min-h-0 px-2"
                onClick={zoomOut}
                disabled={scale <= MIN_SCALE}
                aria-label="Alejar"
                title="Alejar"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-12 select-none text-center font-mono text-xs" aria-live="polite">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs h-7 min-h-0 px-2"
                onClick={zoomIn}
                disabled={scale >= MAX_SCALE}
                aria-label="Acercar"
                title="Acercar"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Cerrar documento"
              title="Cerrar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          onScroll={checkEnd}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-base-200"
        >
          <PdfViewer
            pdfData={pdfData}
            scale={scale}
            overlays={overlays}
            // Si el documento cabe entero sin scroll, ya se "leyó hasta el final".
            onLoaded={() => requestAnimationFrame(checkEnd)}
          />
        </div>
        {footer && <div className="shrink-0 border-t border-base-300 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

// ─── pdf-lib helper ───────────────────────────────────────────────────────────
/** Una imagen para estampar en un campo: sus bytes (PNG o JPG) o un data URL. */
export type EmbedImage = { fieldName: string } & (
  | { bytes: Uint8Array; dataUrl?: never }
  | { dataUrl: string; bytes?: never }
);

const isPngBytes = (b: Uint8Array) => b.length > 3 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

/**
 * Estampa imágenes (firma, huella) en los rectángulos de sus campos. Recibe los bytes
 * directamente (o un data URL, que pdf-lib decodifica sin `fetch`). Si la misma imagen va
 * en varios campos del documento, se incrusta una sola vez.
 */
export async function embedImagesInPdf(
  pdfBytes: Uint8Array,
  images: EmbedImage[],
  fieldRects: Record<string, FieldRect>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes.slice(0));
  const pages = doc.getPages();
  const embedded = new Map<Uint8Array | string, PDFImage>();

  const embed = async (source: Uint8Array | string): Promise<PDFImage> => {
    const cached = embedded.get(source);
    if (cached) return cached;
    const png = typeof source === "string" ? source.startsWith("data:image/png") : isPngBytes(source);
    const img = png ? await doc.embedPng(source) : await doc.embedJpg(source);
    embedded.set(source, img);
    return img;
  };

  for (const image of images) {
    const rect = fieldRects[image.fieldName];
    const source = image.bytes ?? image.dataUrl;
    if (!rect || !source) continue;

    const page = pages[rect.page];
    if (!page) continue;
    const img = await embed(source);

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

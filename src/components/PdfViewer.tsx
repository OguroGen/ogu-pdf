import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfViewerProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
};

export function PdfViewer({ pdf, pageNumber, scale }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    const renderTaskRef: { current: { cancel: () => void } | null } = {
      current: null,
    };

    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) {
        return;
      }

      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const renderTask = page.render({
        canvas,
        viewport,
        transform,
      });
      renderTaskRef.current = renderTask;
      try {
        await renderTask.promise;
      } catch {
        // キャンセルや再描画時の失敗は無視する
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdf, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full bg-[#f7f3eb] shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
    />
  );
}

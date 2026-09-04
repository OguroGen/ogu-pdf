import { useCallback, useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { DropZone } from "./components/DropZone";
import { PasswordDialog } from "./components/PasswordDialog";
import { PdfViewer } from "./components/PdfViewer";
import { Toolbar } from "./components/Toolbar";
import { decryptPdf, downloadPdf, unlockedFileName } from "./lib/decryptPdf";
import { openPdf } from "./lib/openPdf";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

type Session = {
  fileName: string;
  bytes: Uint8Array;
  password: string;
  pdf: PDFDocumentProxy;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    fileName: string;
    bytes: Uint8Array;
  } | null>(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.25);

  const reset = useCallback(() => {
    setSession((current) => {
      void current?.pdf.destroy();
      return null;
    });
    setPendingFile(null);
    setNeedPassword(false);
    setWrongPassword(false);
    setOpening(false);
    setSaving(false);
    setError(null);
    setPageNumber(1);
    setScale(1.25);
  }, []);

  const tryOpen = useCallback(
    async (fileName: string, bytes: Uint8Array, password = "") => {
      setOpening(true);
      setError(null);
      const result = await openPdf(bytes, password);
      setOpening(false);

      if (result.status === "ok") {
        setSession((current) => {
          void current?.pdf.destroy();
          return { fileName, bytes, password, pdf: result.pdf };
        });
        setPendingFile(null);
        setNeedPassword(false);
        setWrongPassword(false);
        setPageNumber(1);
        return;
      }

      if (result.status === "password-required") {
        setPendingFile({ fileName, bytes });
        setNeedPassword(true);
        setWrongPassword(result.isWrongPassword);
        return;
      }

      setError(result.message);
      setPendingFile(null);
      setNeedPassword(false);
    },
    [],
  );

  const handleFile = async (file: File) => {
    reset();
    const buffer = await file.arrayBuffer();
    await tryOpen(file.name, new Uint8Array(buffer));
  };

  const handleSave = async () => {
    if (!session) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const unlocked = await decryptPdf(session.bytes, session.password);
      downloadPdf(unlocked, unlockedFileName(session.fileName));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "解除したPDFの保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setPageNumber((page) => Math.max(1, page - 1));
      } else if (event.key === "ArrowRight") {
        setPageNumber((page) => Math.min(session.pdf.numPages, page + 1));
      } else if (event.key === "+" || event.key === "=") {
        setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP));
      } else if (event.key === "-") {
        setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session]);

  return (
    <div className="flex min-h-dvh flex-col">
      {session ? (
        <>
          <Toolbar
            fileName={session.fileName}
            pageNumber={pageNumber}
            pageCount={session.pdf.numPages}
            scale={scale}
            saving={saving}
            onPrev={() => setPageNumber((page) => Math.max(1, page - 1))}
            onNext={() =>
              setPageNumber((page) => Math.min(session.pdf.numPages, page + 1))
            }
            onZoomOut={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
            onZoomIn={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
            onSave={() => void handleSave()}
            onClose={reset}
          />
          <main className="flex flex-1 justify-center overflow-auto bg-[#0c1016] px-4 py-8">
            {session.pdf.numPages === 0 ? (
              <p className="self-center text-sm text-white/60">このPDFには表示できるページがありません。</p>
            ) : (
              <PdfViewer pdf={session.pdf} pageNumber={pageNumber} scale={scale} />
            )}
          </main>
          <p className="border-t border-white/10 bg-[#161c26] px-4 py-3 text-center text-xs leading-6 text-white/50">
            保存したPDFにはパスワード保護がなくなります。閲覧も解除も、この端末の中だけで行われます。
            {error ? <span className="block text-[#f0a090]">{error}</span> : null}
          </p>
        </>
      ) : (
        <>
          <DropZone disabled={opening} error={error} onFile={(file) => void handleFile(file)} />
          <p className="px-4 py-6 text-center text-xs text-white/40">
            開封用パスワードが分かるPDFに対応しています。パスワード解析は行いません。
          </p>
        </>
      )}

      {needPassword && pendingFile ? (
        <PasswordDialog
          fileName={pendingFile.fileName}
          isWrongPassword={wrongPassword}
          onSubmit={(password) => {
            void tryOpen(pendingFile.fileName, pendingFile.bytes, password);
          }}
          onCancel={reset}
        />
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { DropZone } from "./components/DropZone";
import { FileList } from "./components/FileList";
import { PasswordDialog } from "./components/PasswordDialog";
import { PdfViewer } from "./components/PdfViewer";
import { Toolbar } from "./components/Toolbar";
import { decryptPdf } from "./lib/decryptPdf";
import {
  isAbortError,
  readEntryBytes,
  saveUnlockedPdf,
  type PdfEntry,
} from "./lib/localFiles";
import { openPdf } from "./lib/openPdf";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

type Session = {
  entry: PdfEntry;
  bytes: Uint8Array;
  password: string;
  pdf: PDFDocumentProxy;
};

function saveResultMessage(method: "directory" | "picker" | "download"): string {
  if (method === "directory") {
    return "元のフォルダに、パスワードを外したPDFを保存しました。";
  }
  if (method === "picker") {
    return "パスワードを外したPDFを保存しました。";
  }
  return "パスワードを外したPDFをダウンロードしました。保存先はブラウザの設定に従います。";
}

export default function App() {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<{
    entry: PdfEntry;
    bytes: Uint8Array;
  } | null>(null);
  const [passwords, setPasswords] = useState<Map<string, string>>(() => new Map());
  const [needPassword, setNeedPassword] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.25);

  const reset = useCallback(() => {
    setSession((current) => {
      void current?.pdf.destroy();
      return null;
    });
    setEntries([]);
    setPending(null);
    setPasswords(new Map());
    setNeedPassword(false);
    setWrongPassword(false);
    setOpening(false);
    setSaving(false);
    setSavingAll(false);
    setError(null);
    setNotice(null);
    setPageNumber(1);
    setScale(1.25);
  }, []);

  const tryOpen = useCallback(async (entry: PdfEntry, bytes: Uint8Array, password = "") => {
    setOpening(true);
    setError(null);
    setNotice(null);
    const result = await openPdf(bytes, password);
    setOpening(false);

    if (result.status === "ok") {
      setSession((current) => {
        void current?.pdf.destroy();
        return { entry, bytes, password, pdf: result.pdf };
      });
      setPasswords((current) => {
        const next = new Map(current);
        next.set(entry.id, password);
        return next;
      });
      setPending(null);
      setNeedPassword(false);
      setWrongPassword(false);
      setPageNumber(1);
      return;
    }

    if (result.status === "password-required") {
      setPending({ entry, bytes });
      setNeedPassword(true);
      setWrongPassword(result.isWrongPassword);
      return;
    }

    setError(result.message);
    setPending(null);
    setNeedPassword(false);
  }, []);

  const openEntry = useCallback(
    async (entry: PdfEntry, password?: string) => {
      try {
        const bytes = await readEntryBytes(entry);
        await tryOpen(entry, bytes, password ?? passwords.get(entry.id) ?? "");
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : "PDFを開けませんでした。");
      }
    },
    [passwords, tryOpen],
  );

  const handleEntries = async (nextEntries: PdfEntry[]) => {
    reset();
    setEntries(nextEntries);
    if (nextEntries[0]) {
      await openEntry(nextEntries[0], "");
    }
  };

  const handleSave = async () => {
    if (!session) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const unlocked = await decryptPdf(session.bytes, session.password);
      const method = await saveUnlockedPdf(session.entry, unlocked);
      setNotice(saveResultMessage(method));
    } catch (saveError) {
      if (!isAbortError(saveError)) {
        setError(
          saveError instanceof Error ? saveError.message : "解除したPDFの保存に失敗しました。",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    setError(null);
    setNotice(null);
    let saved = 0;
    let failed = 0;
    try {
      for (const entry of entries) {
        try {
          const bytes =
            session?.entry.id === entry.id ? session.bytes : await readEntryBytes(entry);
          const password =
            session?.entry.id === entry.id
              ? session.password
              : (passwords.get(entry.id) ?? "");
          const unlocked = await decryptPdf(bytes, password);
          await saveUnlockedPdf(entry, unlocked);
          saved += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) {
        setNotice(`${saved}件を、元のフォルダに保存しました。`);
      } else {
        setError(
          `${saved}件を保存し、${failed}件は失敗しました。パスワードが必要なファイルは先に開いてください。`,
        );
      }
    } finally {
      setSavingAll(false);
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

  const viewing = entries.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {viewing ? (
        <>
          <Toolbar
            fileName={session?.entry.relativePath ?? entries[0]?.relativePath ?? ""}
            pageNumber={pageNumber}
            pageCount={session?.pdf.numPages ?? 0}
            scale={scale}
            saving={saving}
            savingAll={savingAll}
            canSave={Boolean(session)}
            canSaveAll={entries.length > 1 && entries.every((entry) => entry.directoryHandle)}
            onPrev={() => setPageNumber((page) => Math.max(1, page - 1))}
            onNext={() =>
              setPageNumber((page) => Math.min(session?.pdf.numPages ?? 1, page + 1))
            }
            onZoomOut={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
            onZoomIn={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
            onSave={() => void handleSave()}
            onSaveAll={() => void handleSaveAll()}
            onClose={reset}
          />
          <div className="flex min-h-0 flex-1">
            <FileList
              entries={entries}
              activeId={session?.entry.id ?? pending?.entry.id}
              onSelect={(entry) => {
                if (entry.id !== session?.entry.id) {
                  void openEntry(entry);
                }
              }}
            />
            <main className="flex flex-1 justify-center overflow-auto bg-[#0c1016] px-4 py-8">
              {session ? (
                session.pdf.numPages === 0 ? (
                  <p className="self-center text-sm text-white/60">
                    このPDFには表示できるページがありません。
                  </p>
                ) : (
                  <PdfViewer pdf={session.pdf} pageNumber={pageNumber} scale={scale} />
                )
              ) : (
                <p className="self-center text-sm text-white/60">
                  左の一覧からPDFを選んでください。
                </p>
              )}
            </main>
          </div>
          <p className="border-t border-white/10 bg-[#161c26] px-4 py-3 text-center text-xs leading-6 text-white/50">
            保存したPDFにはパスワード保護がなくなります。元のファイルは残し、同じ場所に
            `_unlocked.pdf` として保存します。
            {notice ? <span className="block text-[#9fd4a8]">{notice}</span> : null}
            {error ? <span className="block text-[#f0a090]">{error}</span> : null}
          </p>
        </>
      ) : (
        <>
          <DropZone
            disabled={opening}
            error={error}
            onEntries={(next) => void handleEntries(next)}
            onError={setError}
          />
          <p className="px-4 py-6 text-center text-xs text-white/40">
            開封用パスワードが分かるPDFに対応しています。パスワード解析は行いません。
          </p>
        </>
      )}

      {needPassword && pending ? (
        <PasswordDialog
          fileName={pending.entry.relativePath}
          isWrongPassword={wrongPassword}
          onSubmit={(password) => {
            void tryOpen(pending.entry, pending.bytes, password);
          }}
          onCancel={() => {
            setNeedPassword(false);
            setWrongPassword(false);
            setPending(null);
            if (!session && entries.length <= 1) {
              reset();
            }
          }}
        />
      ) : null}
    </div>
  );
}

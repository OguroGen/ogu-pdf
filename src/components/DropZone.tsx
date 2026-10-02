import { useEffect, useRef } from "react";
import {
  entriesFromDrop,
  entriesFromFileList,
  isAbortError,
  pickPdfFiles,
  pickPdfFolder,
  type PdfEntry,
} from "../lib/localFiles";

type DropZoneProps = {
  disabled?: boolean;
  error?: string | null;
  onEntries: (entries: PdfEntry[]) => void;
  onError: (message: string | null) => void;
};

export function DropZone({ disabled, error, onEntries, onError }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const emitEntries = (entries: PdfEntry[]) => {
    if (entries.length === 0) {
      onError("PDFファイルが見つかりませんでした。");
      return;
    }
    onError(null);
    onEntries(entries);
  };

  const handleFilesClick = async () => {
    try {
      const picked = await pickPdfFiles();
      if (picked) {
        emitEntries(picked);
        return;
      }
      fileInputRef.current?.click();
    } catch (error) {
      if (!isAbortError(error)) {
        onError(error instanceof Error ? error.message : "ファイルを開けませんでした。");
      }
    }
  };

  const handleFolderClick = async () => {
    try {
      const picked = await pickPdfFolder();
      if (picked) {
        emitEntries(picked);
        return;
      }
      folderInputRef.current?.click();
    } catch (error) {
      if (!isAbortError(error)) {
        onError(error instanceof Error ? error.message : "フォルダを開けませんでした。");
      }
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4">
      <div
        className="w-full rounded-3xl border border-dashed border-white/20 bg-[#1b2430]/80 px-8 py-16 text-center transition hover:border-[#c56a32]/70 hover:bg-[#1b2430]"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void (async () => {
            try {
              emitEntries(await entriesFromDrop(event.dataTransfer));
            } catch (dropError) {
              onError(
                dropError instanceof Error ? dropError.message : "ドロップした項目を開けませんでした。",
              );
            }
          })();
        }}
      >
        <p className="text-sm tracking-[0.2em] text-[#c56a32]">LOCAL PDF</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-wide">
          パスワード付きPDFの閲覧と解除
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65">
          ファイルはこの端末のブラウザ内だけで処理します。パスワードもPDFも外部に送信されません。
          保存先は、元のファイルやフォルダがあった場所を初期値にします。
        </p>
        <p className="mt-8 text-sm text-white/80">
          ここにPDFまたはフォルダをドロップ
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg bg-[#c56a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#d1763d] disabled:opacity-60"
            onClick={() => void handleFilesClick()}
          >
            ファイルを選ぶ
          </button>
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5 disabled:opacity-60"
            onClick={() => void handleFolderClick()}
          >
            フォルダを選ぶ
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            void entriesFromFileList(event.target.files).then(emitEntries);
            event.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void entriesFromFileList(event.target.files).then(emitEntries);
            event.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p className="mt-4 text-sm text-[#f0a090]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

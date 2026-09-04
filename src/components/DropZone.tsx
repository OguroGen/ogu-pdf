import { useRef } from "react";

type DropZoneProps = {
  disabled?: boolean;
  error?: string | null;
  onFile: (file: File) => void;
};

export function DropZone({ disabled, error, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const takePdf = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return;
    }
    onFile(file);
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4">
      <button
        type="button"
        disabled={disabled}
        className="w-full rounded-3xl border border-dashed border-white/20 bg-[#1b2430]/80 px-8 py-16 text-center transition hover:border-[#c56a32]/70 hover:bg-[#1b2430] disabled:cursor-wait disabled:opacity-70"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) {
            takePdf(event.dataTransfer.files);
          }
        }}
      >
        <p className="text-sm tracking-[0.2em] text-[#c56a32]">LOCAL PDF</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-wide">
          パスワード付きPDFの閲覧と解除
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65">
          ファイルはこの端末のブラウザ内だけで処理します。パスワードもPDFも外部に送信されません。
        </p>
        <p className="mt-8 text-sm text-white/80">
          ここにPDFをドロップするか、クリックして選択
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            takePdf(event.target.files);
            event.target.value = "";
          }}
        />
      </button>
      {error ? (
        <p className="mt-4 text-sm text-[#f0a090]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

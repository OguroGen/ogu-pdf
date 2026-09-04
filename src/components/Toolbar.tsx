type ToolbarProps = {
  fileName: string;
  pageNumber: number;
  pageCount: number;
  scale: number;
  saving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onSave: () => void;
  onClose: () => void;
};

export function Toolbar({
  fileName,
  pageNumber,
  pageCount,
  scale,
  saving,
  onPrev,
  onNext,
  onZoomOut,
  onZoomIn,
  onSave,
  onClose,
}: ToolbarProps) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#161c26] px-4 py-3">
      <button
        type="button"
        className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
        onClick={onClose}
      >
        閉じる
      </button>
      <p className="min-w-0 flex-1 truncate text-sm text-white/85" title={fileName}>
        {fileName}
      </p>
      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm disabled:opacity-40"
          disabled={pageNumber <= 1}
          onClick={onPrev}
        >
          前へ
        </button>
        <span className="min-w-20 px-2 text-center text-sm tabular-nums text-white/80">
          {pageNumber} / {pageCount}
        </span>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm disabled:opacity-40"
          disabled={pageNumber >= pageCount}
          onClick={onNext}
        >
          次へ
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
        <button type="button" className="rounded-md px-2 py-1 text-sm" onClick={onZoomOut}>
          −
        </button>
        <span className="min-w-14 px-1 text-center text-sm tabular-nums text-white/80">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" className="rounded-md px-2 py-1 text-sm" onClick={onZoomIn}>
          ＋
        </button>
      </div>
      <button
        type="button"
        disabled={saving}
        className="rounded-lg bg-[#c56a32] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#d1763d] disabled:opacity-60"
        onClick={onSave}
      >
        {saving ? "解除しています…" : "パスワードを外して保存"}
      </button>
    </header>
  );
}

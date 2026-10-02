import type { PdfEntry } from "../lib/localFiles";

type FileListProps = {
  entries: PdfEntry[];
  activeId?: string;
  onSelect: (entry: PdfEntry) => void;
};

export function FileList({ entries, activeId, onSelect }: FileListProps) {
  if (entries.length <= 1) {
    return null;
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#161c26]">
      <p className="px-4 py-3 text-xs tracking-wide text-white/45">
        PDF {entries.length}件
      </p>
      <ul className="min-h-0 flex-1 overflow-auto px-2 pb-3">
        {entries.map((entry) => {
          const active = entry.id === activeId;
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm leading-5 ${
                  active
                    ? "bg-[#c56a32]/20 text-white"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
                title={entry.relativePath}
                onClick={() => onSelect(entry)}
              >
                <span className="block truncate">{entry.name}</span>
                {entry.relativePath !== entry.name ? (
                  <span className="mt-0.5 block truncate text-xs text-white/40">
                    {entry.relativePath}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

import { unlockedFileName } from "./decryptPdf";

export type PdfEntry = {
  id: string;
  name: string;
  relativePath: string;
  directoryHandle?: FileSystemDirectoryHandle;
  fileHandle?: FileSystemFileHandle;
  file?: File;
};

type DataTransferItemWithHandle = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

const PDF_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "PDF",
    accept: { "application/pdf": [".pdf"] },
  },
];

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function isPdfFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf");
}

function skipDirectoryName(name: string): boolean {
  return name.startsWith(".") || name === "node_modules";
}

export async function readEntryBytes(entry: PdfEntry): Promise<Uint8Array> {
  if (entry.fileHandle) {
    const file = await entry.fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
  if (entry.file) {
    return new Uint8Array(await entry.file.arrayBuffer());
  }
  throw new Error("ファイルを読み込めませんでした。");
}

export async function pickPdfFiles(): Promise<PdfEntry[] | null> {
  if (typeof window.showOpenFilePicker === "function") {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: PDF_PICKER_TYPES,
      excludeAcceptAllOption: true,
    });
    return Promise.all(handles.map((handle, index) => entryFromFileHandle(handle, index)));
  }
  return null;
}

export async function pickPdfFolder(): Promise<PdfEntry[] | null> {
  if (typeof window.showDirectoryPicker !== "function") {
    return null;
  }
  const directory = await window.showDirectoryPicker({ mode: "readwrite" });
  const entries = await collectPdfsFromDirectory(directory);
  if (entries.length === 0) {
    throw new Error("このフォルダにPDFファイルが見つかりませんでした。");
  }
  return entries;
}

export async function entriesFromFileList(fileList: FileList | null): Promise<PdfEntry[]> {
  if (!fileList || fileList.length === 0) {
    return [];
  }
  const files = [...fileList].filter((file) => isPdfFileName(file.name));
  return files.map((file, index) => {
    const relativePath = file.webkitRelativePath || file.name;
    return {
      id: `${index}:${relativePath}`,
      name: file.name,
      relativePath,
      file,
    };
  });
}

export async function entriesFromDrop(dataTransfer: DataTransfer): Promise<PdfEntry[]> {
  const items = [...dataTransfer.items] as DataTransferItemWithHandle[];
  const canUseHandles = items.some((item) => typeof item.getAsFileSystemHandle === "function");

  if (canUseHandles) {
    const collected: PdfEntry[] = [];
    let index = 0;
    for (const item of items) {
      if (item.kind !== "file") {
        continue;
      }
      const handle = await item.getAsFileSystemHandle?.();
      if (!handle) {
        continue;
      }
      if (handle.kind === "directory") {
        collected.push(
          ...(await collectPdfsFromDirectory(handle as FileSystemDirectoryHandle, "", index)),
        );
        index = collected.length;
      } else if (handle.kind === "file" && isPdfFileName(handle.name)) {
        collected.push(await entryFromFileHandle(handle as FileSystemFileHandle, index));
        index += 1;
      }
    }
    if (collected.length > 0) {
      return collected;
    }
  }

  return entriesFromFileList(dataTransfer.files);
}

async function entryFromFileHandle(
  fileHandle: FileSystemFileHandle,
  index: number,
): Promise<PdfEntry> {
  return {
    id: `${index}:${fileHandle.name}`,
    name: fileHandle.name,
    relativePath: fileHandle.name,
    fileHandle,
  };
}

async function collectPdfsFromDirectory(
  directory: FileSystemDirectoryHandle,
  prefix = "",
  startIndex = 0,
): Promise<PdfEntry[]> {
  const entries: PdfEntry[] = [];
  let index = startIndex;

  for await (const [name, handle] of directory.entries()) {
    if (handle.kind === "directory") {
      if (skipDirectoryName(name)) {
        continue;
      }
      const nested = await collectPdfsFromDirectory(
        handle as FileSystemDirectoryHandle,
        `${prefix}${name}/`,
        index,
      );
      entries.push(...nested);
      index += nested.length;
      continue;
    }
    if (!isPdfFileName(name)) {
      continue;
    }
    const relativePath = `${prefix}${name}`;
    entries.push({
      id: `${index}:${relativePath}`,
      name,
      relativePath,
      directoryHandle: directory,
      fileHandle: handle as FileSystemFileHandle,
    });
    index += 1;
  }

  return entries;
}

async function ensureDirectoryWritable(
  directory: FileSystemDirectoryHandle,
): Promise<boolean> {
  const permissioned = directory as FileSystemDirectoryHandle & {
    queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  };
  if (typeof permissioned.queryPermission !== "function") {
    return true;
  }
  const current = await permissioned.queryPermission({ mode: "readwrite" });
  if (current === "granted") {
    return true;
  }
  if (typeof permissioned.requestPermission !== "function") {
    return false;
  }
  return (await permissioned.requestPermission({ mode: "readwrite" })) === "granted";
}

export async function saveUnlockedPdf(
  entry: PdfEntry,
  bytes: Uint8Array,
): Promise<"directory" | "picker" | "download"> {
  const fileName = unlockedFileName(entry.name);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  if (entry.directoryHandle && (await ensureDirectoryWritable(entry.directoryHandle))) {
    const handle = await entry.directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(copy);
    await writable.close();
    return "directory";
  }

  const startIn = entry.fileHandle ?? entry.directoryHandle;
  if (typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      ...(startIn ? { startIn } : {}),
      types: PDF_PICKER_TYPES,
    });
    const writable = await handle.createWritable();
    await writable.write(copy);
    await writable.close();
    return "picker";
  }

  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return "download";
}

type DecryptRequest = {
  id: number;
  pdfBytes: Uint8Array;
  password: string;
};

type DecryptSuccess = {
  id: number;
  data: Uint8Array;
  error?: undefined;
};

type DecryptFailure = {
  id: number;
  data?: undefined;
  error: string;
};

type DecryptResponse = DecryptSuccess | DecryptFailure;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (bytes: Uint8Array) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker("/qpdf/decrypt-worker.js");
  worker.onmessage = (event: MessageEvent<DecryptResponse>) => {
    const { id, data, error } = event.data;
    const task = pending.get(id);
    if (!task) {
      return;
    }
    pending.delete(id);
    if (error || !data) {
      task.reject(new Error(error ?? "PDFの復号に失敗しました。"));
      return;
    }
    task.resolve(data);
  };
  worker.onerror = (event) => {
    const message = event.message || "復号ワーカーでエラーが発生しました。";
    for (const [id, task] of pending) {
      task.reject(new Error(message));
      pending.delete(id);
    }
  };
  return worker;
}

export function decryptPdf(
  pdfBytes: Uint8Array,
  password = "",
): Promise<Uint8Array> {
  const id = nextId++;
  const request: DecryptRequest = { id, pdfBytes, password };

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(request);
  });
}

export function unlockedFileName(originalName: string): string {
  const trimmed = originalName.replace(/\.pdf$/i, "");
  return `${trimmed}_unlocked.pdf`;
}

export function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

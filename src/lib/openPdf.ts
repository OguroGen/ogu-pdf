import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

export type OpenPdfOk = {
  status: "ok";
  pdf: PDFDocumentProxy;
};

export type OpenPdfNeedPassword = {
  status: "password-required";
  isWrongPassword: boolean;
};

export type OpenPdfError = {
  status: "error";
  message: string;
};

export type OpenPdfResult = OpenPdfOk | OpenPdfNeedPassword | OpenPdfError;

export async function openPdf(
  data: Uint8Array,
  password?: string,
): Promise<OpenPdfResult> {
  try {
    const loadingTask = getDocument({
      data: data.slice(),
      password: password || undefined,
    });
    const pdf = await loadingTask.promise;
    return { status: "ok", pdf };
  } catch (error) {
    if (isPasswordException(error)) {
      return {
        status: "password-required",
        isWrongPassword: error.code === PasswordResponses.INCORRECT_PASSWORD,
      };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "PDFを開けませんでした。",
    };
  }
}

function isPasswordException(
  error: unknown,
): error is { name: string; code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "PasswordException"
  );
}

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getDocument, PasswordResponses } from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const createModule = require("@neslinesli93/qpdf-wasm");
const wasmPath = join(
  dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json")),
  "dist",
  "qpdf.wasm",
);

const locked = new Uint8Array(readFileSync("tmp/locked.pdf"));
const password = "test1234";

async function expectPasswordRequired() {
  try {
    await getDocument({ data: locked.slice() }).promise;
    throw new Error("expected password prompt");
  } catch (error) {
    if (error?.name !== "PasswordException") {
      throw error;
    }
  }
}

async function expectWrongPassword() {
  try {
    await getDocument({ data: locked.slice(), password: "wrong" }).promise;
    throw new Error("expected incorrect password");
  } catch (error) {
    if (error?.code !== PasswordResponses.INCORRECT_PASSWORD) {
      throw error;
    }
  }
}

async function openWithPassword() {
  const pdf = await getDocument({ data: locked.slice(), password }).promise;
  if (pdf.numPages < 1) {
    throw new Error("expected at least one page");
  }
  await pdf.destroy();
}

async function decryptAndOpen() {
  const qpdf = await createModule({ locateFile: () => wasmPath });
  qpdf.FS.writeFile("/input.pdf", locked);
  try {
    qpdf.callMain(["--password=" + password, "/input.pdf", "--decrypt", "/output.pdf"]);
  } catch (error) {
    if (!(error && error.name === "ExitStatus" && error.status === 0)) {
      throw error;
    }
  }
  const unlocked = qpdf.FS.readFile("/output.pdf");
  const pdf = await getDocument({ data: unlocked }).promise;
  if (pdf.numPages < 1) {
    throw new Error("unlocked pdf did not open");
  }
  await pdf.destroy();
}

await expectPasswordRequired();
await expectWrongPassword();
await openWithPassword();
await decryptAndOpen();
console.log("pdf open and decrypt checks passed");

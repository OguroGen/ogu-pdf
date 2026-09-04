import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const createModule = require("@neslinesli93/qpdf-wasm");
const wasmPath = join(
  dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json")),
  "dist",
  "qpdf.wasm",
);

function makeOnePagePdf(text) {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  const add = (chunk) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += chunk;
  };

  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  add(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
  );
  add("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET\n`;
  add(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`);

  const xrefStart = Buffer.byteLength(pdf);
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function withQpdf(fn) {
  const qpdf = await createModule({
    locateFile: () => wasmPath,
  });
  try {
    return fn(qpdf);
  } catch (error) {
    if (error && error.name === "ExitStatus") {
      if (error.status !== 0) {
        throw new Error(`qpdf exited with ${error.status}`);
      }
      return 0;
    }
    throw error;
  }
}

mkdirSync("tmp", { recursive: true });
const plain = makeOnePagePdf("Hello PDF");
writeFileSync("tmp/plain.pdf", plain);

const locked = await withQpdf((qpdf) => {
  qpdf.FS.writeFile("/plain.pdf", plain);
  const code = qpdf.callMain([
    "--encrypt",
    "test1234",
    "owner1234",
    "256",
    "--",
    "/plain.pdf",
    "/locked.pdf",
  ]);
  if (code !== 0) {
    throw new Error(`failed to encrypt pdf: ${code}`);
  }
  return qpdf.FS.readFile("/locked.pdf");
});
writeFileSync("tmp/locked.pdf", locked);

console.log("wrote tmp/plain.pdf and tmp/locked.pdf (password: test1234)");

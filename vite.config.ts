import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function copyQpdfAssets(): Plugin {
  const root = dirname(fileURLToPath(import.meta.url));
  const dist = join(root, "node_modules", "@neslinesli93", "qpdf-wasm", "dist");
  const dest = join(root, "public", "qpdf");

  const copy = () => {
    mkdirSync(dest, { recursive: true });
    cpSync(join(dist, "qpdf.js"), join(dest, "qpdf.js"));
    cpSync(join(dist, "qpdf.wasm"), join(dest, "qpdf.wasm"));
  };

  return {
    name: "copy-qpdf-assets",
    buildStart() {
      copy();
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyQpdfAssets()],
});

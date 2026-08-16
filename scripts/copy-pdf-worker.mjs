import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const candidates = [
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "node_modules/pdfjs-dist/build/pdf.worker.mjs",
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
];
const dest = "public/pdf.worker.min.mjs";
const src = candidates.find((c) => existsSync(c));

if (!src) {
  console.error("[copy-pdf-worker] pdf.worker not found in pdfjs-dist — is it installed?");
  process.exit(0); // don't hard-fail installs; the app surfaces a clear error if missing
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] ${src} -> ${dest}`);

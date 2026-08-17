// Copy Tesseract worker + WASM core into /public so OCR runs fully self-hosted
// (no third-party CDN, no first-scan download). Language data lives in
// public/tessdata/eng.traineddata.gz (committed). Mirrors copy-pdf-worker.mjs.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const destDir = "public/tesseract";
mkdirSync(destDir, { recursive: true });

// tesseract.js-core may be hoisted to the top level or nested under tesseract.js,
// depending on the installer — check both.
const coreBases = [
  "node_modules/tesseract.js-core",
  "node_modules/tesseract.js/node_modules/tesseract.js-core",
];
const coreDir = coreBases.find((b) => existsSync(b)) || coreBases[0];
const workerCandidates = [
  "node_modules/tesseract.js/dist/worker.min.js",
  "node_modules/tesseract.js/dist/worker.min.mjs",
];
const workerSrc = workerCandidates.find((c) => existsSync(c)) || workerCandidates[0];

// worker + the LSTM core variants (default OEM). Ship SIMD and non-SIMD so the
// browser can pick either; each .wasm.js loads its sibling .wasm.
const assets = [
  [workerSrc, "worker.min.js"],
  [`${coreDir}/tesseract-core-simd-lstm.wasm.js`, "tesseract-core-simd-lstm.wasm.js"],
  [`${coreDir}/tesseract-core-simd-lstm.wasm`, "tesseract-core-simd-lstm.wasm"],
  [`${coreDir}/tesseract-core-lstm.wasm.js`, "tesseract-core-lstm.wasm.js"],
  [`${coreDir}/tesseract-core-lstm.wasm`, "tesseract-core-lstm.wasm"],
];

let copied = 0;
for (const [src, name] of assets) {
  if (!existsSync(src)) {
    console.error(`[copy-ocr-assets] missing ${src} — is tesseract.js installed?`);
    continue;
  }
  copyFileSync(src, `${destDir}/${name}`);
  copied++;
}
console.log(`[copy-ocr-assets] copied ${copied}/${assets.length} assets -> ${destDir}`);
// Don't hard-fail installs; the app surfaces a clear error if OCR assets are missing.

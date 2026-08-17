"use client";

import * as pdfjsLib from "pdfjs-dist";
import { SlipData } from "./types";
import { CATALOG } from "./catalog";
import { Word, reconstructColumns, extractFromColumns, scoreConfidence } from "./slipCore";

// Served from /public (copied there by scripts/copy-pdf-worker.mjs on install/build).
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const CATALOG_NAMES = CATALOG.map((p) => p.name);

export type ProgressFn = (percent: number, label: string) => void;

export interface ParseResult {
  data: SlipData;
  rawText: string;
  detected: string[];
  usedOcr: boolean;
}

/** Visual text lines from the PDF's text layer (top-to-bottom, left-to-right). */
async function extractLines(bytes: Uint8Array): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items as Array<{ str?: string; transform?: number[] }>) {
      const s = (it.str || "").replace(/\s+/g, " ");
      if (!s.trim() || !it.transform) continue;
      const key = Math.round(it.transform[5] / 3) * 3;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push({ x: it.transform[4], s });
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const line = rows.get(y)!.sort((a, b) => a.x - b.x).map((r) => r.s).join(" ").replace(/\s{2,}/g, " ").trim();
      if (line) lines.push(line);
    }
    await page.cleanup();
  }
  return lines;
}

/**
 * OCR path: render each page, OCR with word bounding boxes, and reconstruct the
 * admin order page's two columns. Used when the text layer is missing/garbled.
 */
async function ocrColumns(bytes: Uint8Array, onProgress?: ProgressFn): Promise<{ left: string[]; right: string[]; raw: string }> {
  const { createWorker } = await import("tesseract.js");
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const worker = await createWorker("eng", 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (onProgress && m.status === "recognizing text") onProgress(Math.round((m.progress || 0) * 100), "Reading the slip…");
    },
  });
  const left: string[] = [], right: string[] = [];
  const rawParts: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress?.(0, doc.numPages > 1 ? `Reading page ${p}…` : "Reading the slip…");
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      rawParts.push(data.text || "");
      const words: Word[] = [];
      for (const b of data.blocks || [])
        for (const par of (b.paragraphs || []) as any[])
          for (const ln of (par.lines || []) as any[])
            for (const w of (ln.words || []) as any[])
              if ((w.text || "").trim()) words.push({ t: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
      const cols = reconstructColumns(words, viewport.width);
      left.push(...cols.left);
      right.push(...cols.right);
      canvas.width = 0;
      canvas.height = 0;
      await page.cleanup();
    }
  } finally {
    await worker.terminate();
  }
  return { left, right, raw: rawParts.join("\n") };
}

export async function parseSlip(file: File, onProgress?: ProgressFn): Promise<ParseResult> {
  // Read the file once. pdf.js detaches whatever buffer it's given, so we hand each
  // pass its own throwaway copy (.slice()) and never touch the master bytes.
  onProgress?.(0, "Reading PDF…");
  const bytes = new Uint8Array(await file.arrayBuffer());

  // 1) Try the text layer (fast).
  const flatLines = await extractLines(bytes.slice());
  const flat = extractFromColumns(flatLines, [], CATALOG_NAMES);
  const flatScore = scoreConfidence(flat.data);

  // A clean packing slip parses well from the text layer — use it, no OCR needed.
  if (flatScore >= 5) {
    return { data: flat.data, rawText: flatLines.join("\n"), detected: flat.detected, usedOcr: false };
  }

  // 2) Text layer missing or garbled (e.g. the admin order-page print) → OCR + columns.
  onProgress?.(0, "Reading the slip…");
  const { left, right, raw } = await ocrColumns(bytes.slice(), onProgress);
  const ocr = extractFromColumns(left, right, CATALOG_NAMES);

  // Keep whichever read is more complete.
  const best = scoreConfidence(ocr.data) >= flatScore ? ocr : flat;
  return {
    data: best.data,
    rawText: best === ocr ? raw : flatLines.join("\n"),
    detected: best.detected,
    usedOcr: best === ocr,
  };
}

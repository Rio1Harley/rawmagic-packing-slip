"use client";

import * as pdfjsLib from "pdfjs-dist";
import { SlipData, SlipItem, emptySlip } from "./types";

// Served from /public (copied there by scripts/copy-pdf-worker.mjs on install/build).
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export type ProgressFn = (percent: number, label: string) => void;

export interface ParseResult {
  data: SlipData;
  rawText: string;
  detected: string[];
  usedOcr: boolean;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-]{7,}\d)/;
const PRODUCTY = /(gift box|hamper|perfume|soap|scrub|body butter|butter|bath salt|salt|body wash|wash|aloe|face pack|essential oil|oil|diffuser|freshener|freshner|candle|edit|gel|solid perfume)/i;
const HEADING = /^(bill\s*to|billing|payment|order\b|items?\b|quantity|product|sku|subtotal|total|thank|notes?\b|shipping method|delivery)/i;
const isProperty = (line: string) => line.match(/^([A-Za-z][A-Za-z0-9 ._#-]{0,30}?)\s*[:：]\s*(.+)$/);

/** Extract visual text lines (top-to-bottom, left-to-right) from the PDF's text layer. */
async function extractLines(buf: ArrayBuffer): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
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

/** OCR fallback for PDFs with no text layer (outlined text / scanned images). */
async function ocrLines(buf: ArrayBuffer, onProgress?: ProgressFn): Promise<string[]> {
  const { recognize } = await import("tesseract.js");
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data } = await recognize(canvas, "eng", {
      logger: (m: { status?: string; progress?: number }) => {
        if (onProgress && m.status === "recognizing text") {
          onProgress(Math.round(((p - 1 + (m.progress || 0)) / doc.numPages) * 100), `Scanning page ${p}…`);
        }
      },
    });
    (data.text || "").split("\n").forEach((l) => {
      const t = l.replace(/\s+/g, " ").trim();
      if (t) lines.push(t);
    });
    canvas.width = 0;
    canvas.height = 0;
    await page.cleanup();
  }
  return lines;
}

/** Heuristic field extraction — works on both text-layer lines and OCR lines. */
function extractFields(lines: string[]): { data: SlipData; detected: string[] } {
  const data = emptySlip();
  const detected: string[] = [];
  const mark = (f: string) => { if (!detected.includes(f)) detected.push(f); };
  const raw = lines.join("\n");

  // order number
  for (const l of lines) {
    let m = l.match(/order\s*(?:name|no\.?|number|#)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9/#_-]{2,})/i);
    if (m && !/online store|confirmation/i.test(l)) { data.orderNumber = m[1].replace(/^#/, ""); mark("orderNumber"); break; }
    m = l.match(/\b([A-Z]{1,5}\/[A-Za-z]+\/\d+)\b/) || l.match(/(#\s?\d{3,})/);
    if (m) { data.orderNumber = m[1].replace(/[#\s]/g, ""); mark("orderNumber"); break; }
  }

  // date
  const dateLine = lines.find((l) =>
    /\b(\d{1,2}\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}?,?\s*\d{4}\b/i.test(l) ||
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(l)
  );
  if (dateLine) {
    const m = dateLine.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (m) { data.orderDate = m[1]; mark("orderDate"); }
  }

  const emailM = raw.match(EMAIL_RE);
  if (emailM) { data.email = emailM[0]; mark("email"); }

  // ship-to block
  const shipIdx = lines.findIndex((l) => /^(ship\s*to|shipping address|deliver(?:y| to)|ship-to|customer)\b/i.test(l));
  if (shipIdx > -1) {
    const block: string[] = [];
    for (let i = shipIdx + 1; i < lines.length && block.length < 7; i++) {
      const l = lines[i];
      if (!l || HEADING.test(l) || /same as shipping/i.test(l)) break;
      block.push(l);
    }
    if (block.length) {
      data.shipToName = block[0];
      mark("shipToName");
      const addr: string[] = [];
      for (const l of block.slice(1)) {
        const ph = l.match(PHONE_RE);
        if (ph && l.replace(PHONE_RE, "").replace(/[^A-Za-z]/g, "").length < 3) {
          data.phone = ph[1].trim(); mark("phone");
        } else if (EMAIL_RE.test(l)) {
          if (!data.email) { data.email = l.match(EMAIL_RE)![0]; mark("email"); }
        } else {
          const inlinePh = l.match(PHONE_RE);
          if (inlinePh && !data.phone) { data.phone = inlinePh[1].trim(); mark("phone"); }
          addr.push(l.replace(PHONE_RE, "").replace(/\s{2,}/g, " ").trim());
        }
      }
      data.shipToAddress = addr.filter(Boolean).join("\n");
      if (data.shipToAddress) mark("shipToAddress");
    }
  }
  if (!data.phone) {
    const ph = raw.match(/(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/);
    if (ph) { data.phone = ph[0].trim(); mark("phone"); }
  }

  // gift-box properties + gift message
  const details: string[] = [];
  let firstPropIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/gift message/i.test(l)) {
      let msg = l.replace(/.*gift message\s*[:：]?/i, "").trim();
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j] || isProperty(lines[j]) || HEADING.test(lines[j])) break;
        msg += (msg ? " " : "") + lines[j];
      }
      if (msg) { data.giftMessage = msg.trim(); mark("giftMessage"); }
      continue;
    }
    const prop = isProperty(l);
    if (prop) {
      const key = prop[1].trim();
      const val = prop[2].trim();
      if (/^_/.test(key)) continue;
      if (/^(box size|item\s*\d+|scent|size|pack|colou?r|fragrance|variant|option|type|flavou?r)/i.test(key)) {
        if (firstPropIdx === -1) firstPropIdx = i;
        details.push(`${key}: ${val}`);
      }
    }
  }

  const looksLikeTitle = (s: string) =>
    !!s && s.trim().length >= 2 && s.length < 80 && !isProperty(s) && !HEADING.test(s) &&
    /[A-Za-z]/.test(s) && !/₹|\brs\.?\b|\binr\b|\$|@|https?:|www\.|\bindia\b|\b\d{5,}\b/i.test(s);
  const cleanTitle = (s: string) =>
    s.replace(/\s*[x×]\s*\d{1,3}\s*$/i, "").replace(/^\s*\d{1,3}\s*[x×]\s*/i, "").replace(/^\s*\d{1,3}\s+(?=[A-Za-z])/, "").replace(/\s+(SKU\b|₹|Rs\.?\s*\d).*/i, "").trim();

  const items: SlipItem[] = [];
  if (firstPropIdx > 0) {
    for (let k = firstPropIdx - 1; k >= 0 && firstPropIdx - k <= 4; k--) {
      if (looksLikeTitle(lines[k])) { items.push({ title: cleanTitle(lines[k]), variant: "", qty: "1", price: "", details }); break; }
    }
    if (items.length === 0) items.push({ title: "Gift Box", variant: "", qty: "1", price: "", details });
  }
  if (items.length === 0) {
    for (const l of lines) {
      let qty = "", title = "", m: RegExpMatchArray | null;
      if ((m = l.match(/^(\d{1,3})\s*[x×]\s*(.+)$/))) { qty = m[1]; title = m[2]; }
      else if ((m = l.match(/^(.+?)\s*[x×]\s*(\d{1,3})\b/))) { qty = m[2]; title = m[1]; }
      else if ((m = l.match(/^(\d{1,3})\s+(\D.+)$/)) && PRODUCTY.test(m[2])) { qty = m[1]; title = m[2]; }
      const t = title ? cleanTitle(title) : "";
      if (t && looksLikeTitle(t)) items.push({ title: t, variant: "", qty: String(parseInt(qty, 10) || 1), price: "", details: [] });
    }
  }
  if (items.length === 0) {
    const pl = lines.find((l) => PRODUCTY.test(l) && looksLikeTitle(l));
    if (pl) items.push({ title: cleanTitle(pl), variant: "", qty: "1", price: "", details: [] });
  }

  data.items = items;
  if (items.length) mark("items");
  return { data, detected };
}

export async function parseSlip(file: File, onProgress?: ProgressFn): Promise<ParseResult> {
  // pdf.js transfers (detaches) the ArrayBuffer to its worker, so each pass reads a
  // fresh copy from the File rather than sharing one buffer.
  let lines = await extractLines(await file.arrayBuffer());
  let usedOcr = false;

  // No usable text layer (outlined text / scanned image) → OCR fallback.
  const chars = lines.join("").replace(/\s/g, "").length;
  if (chars < 40) {
    usedOcr = true;
    onProgress?.(0, "No text found — scanning with OCR…");
    lines = await ocrLines(await file.arrayBuffer(), onProgress);
  }

  const { data, detected } = extractFields(lines);
  return { data, rawText: lines.join("\n"), detected, usedOcr };
}

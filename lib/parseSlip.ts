"use client";

import * as pdfjsLib from "pdfjs-dist";
import { SlipData, SlipItem, emptySlip } from "./types";

// Served from /public (copied there by scripts/copy-pdf-worker.mjs on install/build).
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export interface ParseResult {
  data: SlipData;
  rawText: string;
  detected: string[];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-]{7,}\d)/;
const PRODUCTY = /(gift box|hamper|perfume|soap|scrub|body butter|butter|bath salt|salt|body wash|wash|aloe|face pack|essential oil|oil|diffuser|freshener|freshner|candle|edit|gel|solid perfume)/i;

/** Extract visual text lines (top-to-bottom, left-to-right) from every page. */
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
      const row = rows.get(y)!.sort((a, b) => a.x - b.x);
      const line = row.map((r) => r.s).join(" ").replace(/\s{2,}/g, " ").trim();
      if (line) lines.push(line);
    }
    await page.cleanup();
  }
  return lines;
}

const HEADING = /^(bill\s*to|billing|payment|order\b|items?\b|quantity|product|sku|subtotal|total|thank|notes?\b|shipping method|delivery)/i;

function isProperty(line: string): RegExpMatchArray | null {
  return line.match(/^([A-Za-z][A-Za-z0-9 ._#-]{0,30}?)\s*[:：]\s*(.+)$/);
}

export async function parseSlip(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const lines = await extractLines(buf);
  const raw = lines.join("\n");
  const data = emptySlip();
  const detected: string[] = [];
  const mark = (f: string) => { if (!detected.includes(f)) detected.push(f); };

  // ---- order number ----
  for (const l of lines) {
    let m = l.match(/order\s*(?:name|no\.?|number|#)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9/#_-]{2,})/i);
    if (m && !/online store|confirmation/i.test(l)) { data.orderNumber = m[1].replace(/^#/, ""); mark("orderNumber"); break; }
    m = l.match(/\b([A-Z]{1,5}\/[A-Za-z]+\/\d+)\b/) || l.match(/(#\s?\d{3,})/);
    if (m) { data.orderNumber = m[1].replace(/[#\s]/g, ""); mark("orderNumber"); break; }
  }

  // ---- date ----
  const dateLine = lines.find((l) =>
    /\b(\d{1,2}\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}?,?\s*\d{4}\b/i.test(l) ||
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(l)
  );
  if (dateLine) {
    const m = dateLine.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (m) { data.orderDate = m[1]; mark("orderDate"); }
  }

  // ---- global email ----
  const emailM = raw.match(EMAIL_RE);
  if (emailM) { data.email = emailM[0]; mark("email"); }

  // ---- ship-to block ----
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

  // ---- gift message + gift-box properties + items ----
  const details: string[] = [];
  let productTitle = "";
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
      if (/^_/.test(key) || /^(email|phone|order|contact|subtotal|total|taxes?|shipping|paid|billing|customer|tracking)$/i.test(key)) continue;
      if (/^(box size|item\s*\d+|scent|size|pack)/i.test(key)) { details.push(`${key}: ${val}`); mark("items"); }
      continue;
    }
    if (!productTitle && PRODUCTY.test(l) && l.length < 60 && !/₹|rs\.?|inr|\$/i.test(l)) {
      productTitle = l.replace(/\s*[x×]\s*\d+.*$/i, "").replace(/^\d+\s*[x×]\s*/i, "").trim();
    }
  }

  // Quantity x title lines (regular products, non-gift-box)
  const items: SlipItem[] = [];
  for (const l of lines) {
    let m = l.match(/^(\d{1,3})\s*[x×]\s*(.{2,}?)(?:\s*[-–]\s*.*)?$/);
    if (!m) m = l.match(/^(.{2,}?)\s*[x×]\s*(\d{1,3})\b/) ? [l, RegExp.$2, RegExp.$1] as unknown as RegExpMatchArray : null;
    if (m && PRODUCTY.test(m[2]) && !/₹|rs\.?|inr|\$/i.test(m[2])) {
      items.push({ qty: String(parseInt(m[1], 10) || 1), title: m[2].trim(), details: [] });
    }
  }

  if (details.length || productTitle) {
    // gift-box style: one line item with its contents as details
    data.items = [{ qty: "1", title: productTitle || "Gift Box", details }];
  } else if (items.length) {
    data.items = items;
  }
  if (data.items.length) mark("items");

  return { data, rawText: raw, detected };
}

// Pure, browser-free parsing core. Testable in Node against cached OCR fixtures.
// Handles the Shopify admin ORDER-PAGE print (two-column, noisy) via word-box
// column reconstruction, and clean single-column packing slips via flat lines.
import type { SlipData, SlipItem } from "./types";

export interface Word { t: string; x0: number; y0: number; x1: number; y1: number }

export function blankSlip(): SlipData {
  return {
    brandName: "Raw Magic", orderNumber: "", orderDate: "", shipToName: "",
    shipToAddress: "", phone: "", email: "", items: [], giftMessage: "",
    footerNote: "Handcrafted with love · therawmagic.com · @therawmagic",
  };
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const CURRENCY_RE = /\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2}/g;
const PIN_RE = /\b\d{6}\b/;

// ---------------------------------------------------------------------------
// Column reconstruction (for OCR word boxes)
// ---------------------------------------------------------------------------
function clusterRows(words: Word[]): Word[][] {
  if (!words.length) return [];
  const ws = [...words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const hs = ws.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const medH = Math.max(8, hs[Math.floor(hs.length / 2)] || 12);
  const thr = medH * 0.7; // new line when a word drops more than ~0.7 line-heights
  const rows: Word[][] = [];
  let cur: Word[] = [], anchor = -1e9;
  for (const w of ws) {
    if (cur.length && w.y0 - anchor > thr) { rows.push(cur); cur = []; }
    if (!cur.length) anchor = w.y0;
    cur.push(w);
  }
  if (cur.length) rows.push(cur);
  return rows.map((r) => r.sort((a, b) => a.x0 - b.x0));
}

function findColumnX(rows: Word[][], W: number): number {
  const mids: number[] = [];
  for (const r of rows)
    for (let i = 1; i < r.length; i++) {
      const gap = r[i].x0 - r[i - 1].x1;
      const mid = (r[i].x0 + r[i - 1].x1) / 2;
      if (gap > W * 0.1 && mid > W * 0.45 && mid < W * 0.85) mids.push(mid);
    }
  if (mids.length < 3) return Infinity;
  mids.sort((a, b) => a - b);
  return mids[Math.floor(mids.length / 2)];
}

export function reconstructColumns(words: Word[], W: number): { left: string[]; right: string[] } {
  const rows = clusterRows(words);
  const colX = findColumnX(rows, W);
  const join = (arr: Word[]) => arr.map((w) => w.t).join(" ").replace(/\s{2,}/g, " ").trim();
  const left: string[] = [], right: string[] = [];
  for (const r of rows) {
    const l = r.filter((w) => w.x0 < colX), rr = r.filter((w) => w.x0 >= colX);
    if (l.length) left.push(join(l));
    if (rr.length) right.push(join(rr));
  }
  return { left: left.filter(Boolean), right: right.filter(Boolean) };
}

// ---------------------------------------------------------------------------
// Noise / classification helpers
// ---------------------------------------------------------------------------
function isNoise(l: string): boolean {
  const s = l.trim();
  if (!s) return true;
  if (/shopify\.com|admin\.shopify/i.test(s)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s/.test(s)) return true;                 // 8/16/26, 10:39 PM ...
  if (/raw magic\s*[-–—].*order/i.test(s)) return true;
  if (/^\W*(paid|unfulfilled|unfuffilled|fulfilled)\b/i.test(s)) return true;
  if (/standard delivery|no orders$/i.test(s)) return true;
  if (/^(timeline|today|just now|subtotal|taxes|package|total|paid)\b/i.test(s)) return true;
  if (/igst|included\b|by razorpay|payment was processed|order confirmation|confirmation #|placed this order|checkout #/i.test(s)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(s)) return true;                               // page numbers 1/2
  if (/^[\W_]*\d{2,3}[\W_]*$/.test(s)) return true;                          // stray "171"
  if (/^(customer|contact|information|shipping address|billing|billing address|same as shipping address)\b/i.test(s)) return true;
  return false;
}

// Hidden props / bundle metadata / gift message — never shown on the label.
function isHiddenProp(l: string): boolean {
  const s = l.trim();
  return /^_/.test(s) ||
    /_(gift_box|bundle|curated_box)\b/i.test(s) ||
    /(gift_box|curated_box|bundle:)\s*:/i.test(s) ||
    /signature-\d+/i.test(s) ||
    /^combo of\b/i.test(s) ||
    /^(<p>|<\/?>|¢\/?>?|[«»~^]+)\s*/i.test(s) && !/[A-Za-z]{3,}/.test(s.replace(/^(<p>|<\/?>|¢\/?>?|[«»~^]+)\s*/i, "")) ||
    /gift message/i.test(s);
}

const clean = (s: string) =>
  s.replace(/^[\s.·•~^|:*<>¢/\\]+/, "").replace(/[\s.·•~^|:*]+$/, "").replace(/\s{2,}/g, " ").trim();

// Drop leading OCR-junk tokens (stray symbols / single letters / short lowercase
// noise like "oy", "sj", "sv") until the first real word of a name or title.
function stripLeadJunk(s: string): string {
  const toks = s.trim().split(/\s+/);
  while (toks.length > 1) {
    const t = toks[0];
    if (/^[^A-Za-z0-9]+$/.test(t) || t.length <= 1 || (t.length <= 2 && t === t.toLowerCase())) toks.shift();
    else break;
  }
  return toks.join(" ").trim();
}

// ---------------------------------------------------------------------------
// Ship-to block (right column preferred; falls back to left for 1-col slips)
// ---------------------------------------------------------------------------
function extractShipTo(lines: string[]): { name: string; address: string; phone: string } {
  const idx = lines.findIndex((l) => /shipping address|ship\s*to|deliver(?:y| to)/i.test(l));
  let block: string[] = [];
  if (idx > -1) {
    for (let i = idx + 1; i < lines.length && block.length < 8; i++) {
      const l = lines[i].trim();
      if (/billing|same as shipping|^contact\b|payment|subtotal|^total\b/i.test(l)) break;
      block.push(l);
    }
  }
  // Fallback: use the "Customer" heading's following line for the name.
  let name = "", phone = "", addr: string[] = [];
  for (const raw of block) {
    const l = clean(raw);
    if (!l || l.length < 2 || !/[A-Za-z0-9]/.test(l)) continue;
    const digits = l.replace(/\D/g, "");
    if (digits.length >= 10 && l.replace(/[\d\s+\-()]/g, "").length < 3) { phone = l; continue; }
    const nameCand = stripLeadJunk(l);
    if (!name && /^[A-Za-z][A-Za-z .'\-]+$/.test(nameCand) && nameCand.split(/\s+/).length <= 4) { name = nameCand; continue; }
    addr.push(l);
  }
  if (!name) {
    const ci = lines.findIndex((l) => /^customer$/i.test(l.trim()));
    if (ci > -1 && lines[ci + 1]) { const c = stripLeadJunk(clean(lines[ci + 1])); if (/^[A-Za-z][A-Za-z .'\-]+$/.test(c)) name = c; }
  }
  return { name, address: addr.join("\n"), phone: normalizePhone(phone) };
}

function normalizePhone(p: string): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return p.trim();
}

// ---------------------------------------------------------------------------
// Product + includes (left column)
// ---------------------------------------------------------------------------
function normName(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function tokens(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((t) => t.length >= 3 && !/^(the|for|and|own|your|box|edit|gift)$/.test(t));
}
function matchCatalog(line: string, catalog: string[]): string | null {
  const ln = normName(line);
  for (const name of catalog) if (ln.includes(normName(name)) || normName(name).includes(ln) && ln.length > 4) return name;
  // token overlap (handles OCR slips like "DY Reset For Him" → "Daily Reset – For Him")
  const lt = tokens(line);
  let best: { name: string; score: number } | null = null;
  for (const name of catalog) {
    const nt = tokens(name); if (!nt.length) continue;
    const hit = nt.filter((t) => lt.some((x) => x.includes(t) || t.includes(x))).length;
    const score = hit / nt.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { name, score };
  }
  return best ? best.name : null;
}

function priceMode(lines: string[]): string {
  const counts = new Map<string, number>();
  for (const l of lines) for (const m of l.match(CURRENCY_RE) || []) {
    const v = parseFloat(m.replace(/,/g, ""));
    if (v >= 10) counts.set(m, (counts.get(m) || 0) + 1); // ignore 0.00 shipping etc.
  }
  if (!counts.size) return "";
  // Most frequent wins; ties broken by the *smaller* value (avoids ₹-misread like 21,599).
  return [...counts.entries()].sort((a, b) => b[1] - a[1] ||
    parseFloat(a[0].replace(/,/g, "")) - parseFloat(b[0].replace(/,/g, "")))[0][0];
}

function extractOrderAndItems(left: string[], catalog: string[], price: string): { orderNumber: string; orderDate: string; item: SlipItem | null } {
  let orderNumber = "", orderDate = "";
  for (const l of left) {
    if (!orderNumber) { const m = l.match(/\b([A-Z]{1,5}\/[A-Za-z]+\/\d+)\b/); if (m) orderNumber = m[1]; }
    if (!orderDate) { const m = l.match(/\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/); if (m) orderDate = m[1].replace(/,$/, "").replace(/(\d) (\d{4})/, "$1, $2"); }
  }

  let title = "", variant = "";
  const details: string[] = [];
  const payIdx = left.findIndex((l) => /^\W*(subtotal|timeline)\b/i.test(l));
  const upto = payIdx > -1 ? payIdx : left.length;
  const isSize = (s: string) => /^(small|medium|large|regular)$/i.test(s.trim());

  for (let i = 0; i < upto; i++) {
    const l = left[i];
    if (isNoise(l)) continue;
    // Box size → variant (handles "Box size: Medium", "size: Medium", or a lone "Medium")
    const bs = l.match(/(?:box\s*)?size\s*[:：]\s*(.+)/i);
    if (bs) { variant = variant || clean(bs[1]); continue; }
    if (!variant && isSize(l)) { variant = l.trim(); continue; }
    // "Item N: <product>" bundle includes
    const im = l.match(/^\W*item\s*\d+\s*[:：]\s*(.+)$/i);
    if (im) { const c = clean(im[1]); if (c) details.push(c); continue; }
    if (isHiddenProp(l)) continue;
    // Curated "<Product>: <variant>" includes (e.g. "Whipped Body Wash: Galaxy")
    const cm = l.match(/^([A-Za-z][A-Za-z .&'\-]{2,40})\s*[:：]\s*(.+)$/);
    if (cm && matchCatalog(cm[1], catalog)) { details.push(clean(l).replace(/\s*[:：]\s*/, ": ")); continue; }
    // Product title (catalog match)
    if (!title) { const cat = matchCatalog(l, catalog); if (cat) { title = cat; continue; } }
  }
  // No catalog product found → derive title from the price-bearing product row.
  if (!title) {
    for (let i = 0; i < upto; i++) {
      const l = left[i];
      if (isNoise(l) || isHiddenProp(l) || /^\W*item\s*\d+/i.test(l)) continue;
      if ((l.match(CURRENCY_RE) || []).length && /[A-Za-z]{3,}/.test(l)) {
        const t = stripLeadJunk(clean(l.replace(CURRENCY_RE, " ").replace(/\bx\s*\d*\b/gi, " ").replace(/[₹]/g, " ")));
        if (/[A-Za-z]{3,}/.test(t) && t.length <= 60) { title = t; break; }
      }
    }
  }
  if (!title && details.length) title = "Gift Box";
  if (!title && !details.length) return { orderNumber, orderDate, item: null };

  // qty: a genuine "× N" (word-boundary x, so "Box" doesn't match), else 1.
  let qty = "1";
  for (const l of left) { const m = l.match(/(?:^|\s|×)x\s*(\d{1,3})\b/i) || l.match(/×\s*(\d{1,3})\b/); if (m) { qty = m[1]; break; } }

  return { orderNumber, orderDate, item: { title, variant, qty, price, details } };
}

// ---------------------------------------------------------------------------
// Public: extract from reconstructed columns (OCR path)
// ---------------------------------------------------------------------------
export function extractFromColumns(left: string[], right: string[], catalog: string[] = []): { data: SlipData; detected: string[] } {
  const data = blankSlip();
  const detected: string[] = [];
  const mark = (f: string) => { if (!detected.includes(f)) detected.push(f); };
  const addrLines = right.length ? right : left;
  const all = [...left, ...right].join("\n");

  const em = all.match(EMAIL_RE); if (em) { data.email = em[0]; mark("email"); }

  const ship = extractShipTo(addrLines);
  if (ship.name) { data.shipToName = ship.name; mark("shipToName"); }
  if (ship.address) { data.shipToAddress = ship.address; mark("shipToAddress"); }
  if (ship.phone) { data.phone = ship.phone; mark("phone"); }
  if (!data.phone) { const pm = all.match(/(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/); if (pm) { data.phone = normalizePhone(pm[0]); mark("phone"); } }

  const price = priceMode([...left, ...right]);
  const { orderNumber, orderDate, item } = extractOrderAndItems(left, catalog, price);
  if (orderNumber) { data.orderNumber = orderNumber; mark("orderNumber"); }
  if (orderDate) { data.orderDate = orderDate; mark("orderDate"); }
  if (item) { data.items = [item]; mark("items"); }

  return { data, detected };
}

// ---------------------------------------------------------------------------
// Confidence — decides whether a text-layer parse is trustworthy or we OCR.
// ---------------------------------------------------------------------------
const junky = (s: string) => /[_<>¢«»]|bundle:|signature-\d|gift_box|curated_box/i.test(s);
export function scoreConfidence(d: SlipData): number {
  let s = 0;
  if (d.email && EMAIL_RE.test(d.email)) s += 2;
  if (d.shipToName && /^[A-Za-z][A-Za-z .'\-]+$/.test(d.shipToName) && !junky(d.shipToName)) s += 2;
  if (d.items.some((it) => it.title && /[A-Za-z]{3,}/.test(it.title) && !junky(it.title) && it.title.length <= 60)) s += 2;
  if (d.phone) s += 1;
  if (PIN_RE.test(d.shipToAddress)) s += 1;
  if (d.orderNumber && !junky(d.orderNumber)) s += 1;
  return s;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlipData } from "@/lib/types";
import { LabelSize } from "@/lib/sizes";
import { exportSlipToPdf } from "@/lib/exportPdf";

const PX_PER_MM = 3.7795;
const INK = "#1A1A1A";
const GREEN_DARK = "#2E4A38";
const GREEN = "#5FA06B";
const TERRA = "#C15A32";
const CREAM = "#FBFBE3";
const SAND = "#E7E3D7";
const MUTE = "#6B6B60";
const SERIF = '"Old Standard TT", Georgia, serif';

// Sender / return address — printed on the slip beside "Ship To".
const SHIP_FROM = {
  name: "Raw Magic",
  lines: [
    "5th Floor, Maitri Siya Enclave, 502,",
    "opp. Dayanand Saraswati School,",
    "Mamledarwadi, Malad West,",
    "Mumbai, Maharashtra 400064",
  ],
};

const toNum = (s: string) => {
  const n = parseFloat(String(s || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtPrice = (s: string) => (toNum(s) ? inr(toNum(s)) : "—");
const lineTotal = (qty: string, price: string) => (toNum(qty) * toNum(price) ? inr(toNum(qty) * toNum(price)) : "—");

function splitItemDetails(details: string[]) {
  let boxSize = "";
  const includes: string[] = [];
  for (const d of details) {
    const s = d.trim();
    if (!s) continue;
    const bs = s.match(/^(?:box\s*)?size\s*[:：]\s*(.+)$/i);
    if (bs) { boxSize = bs[1].trim(); continue; }
    // Each remaining line is one included product; drop any legacy "Item N:" prefix.
    includes.push(s.replace(/^item\s*\d+\s*[:：]\s*/i, "").trim());
  }
  return { boxSize, includes };
}

export default function SlipPreview({ data, size }: { data: SlipData; size: LabelSize }) {
  const slipRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const Wpx = Math.round(size.wmm * PX_PER_MM);
  const Hpx = Math.round(size.hmm * PX_PER_MM);
  const base = Wpx / 32;

  useEffect(() => {
    function fit() {
      const cw = wrapRef.current?.clientWidth ?? Wpx;
      setScale(Math.min(1, cw / Wpx));
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [Wpx]);

  const addressLines = useMemo(() => data.shipToAddress.split("\n").filter((l) => l.trim()), [data.shipToAddress]);
  const grand = useMemo(() => data.items.reduce((s, it) => s + toNum(it.qty) * toNum(it.price), 0), [data.items]);

  // Column header style. Widths live on the (base-sized) cell divs so header and rows
  // align; text sizing goes on inner spans so it can't shrink the column.
  const th = { fontSize: "0.52em", letterSpacing: "0.08em", color: MUTE, textTransform: "uppercase", fontWeight: 800 } as const;

  async function handleExport() {
    if (!slipRef.current) return;
    setBusy(true);
    setErr("");
    try {
      const safe = (data.orderNumber || "order").replace(/[^\w-]/g, "");
      await exportSlipToPdf(slipRef.current, size.wmm, size.hmm, `RawMagic-Slip-${safe}-${size.id}.pdf`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div ref={wrapRef} style={{ width: "100%" }}>
        <div
          style={{
            width: Wpx * scale,
            height: Hpx * scale,
            margin: "0 auto",
            position: "relative",
            borderRadius: 10,
            boxShadow: "0 18px 46px -26px rgba(26,26,26,0.5)",
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {/* ── Exact-size, exported artboard ── */}
            <div
              ref={slipRef}
              style={{
                width: Wpx,
                height: Hpx,
                backgroundColor: "#ffffff",
                color: INK,
                fontFamily: '"Nunito Sans", sans-serif',
                fontSize: base,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div style={{ height: "0.45em", backgroundColor: GREEN_DARK }} />
              <div style={{ padding: "1.1em 1.3em 1em", height: `calc(100% - 0.45em)`, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                {/* Header — centered logo + slogan */}
                <div style={{ textAlign: "center", paddingTop: "0.15em" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/rawmagic-logo.png" alt="Raw Magic" style={{ height: base * 3.9, width: "auto", maxWidth: "72%", display: "inline-block", objectFit: "contain" }} />
                  <div style={{ fontSize: "0.6em", letterSpacing: "0.3em", color: TERRA, textTransform: "uppercase", marginTop: "0.45em", fontWeight: 700 }}>Handcrafted Bath &amp; Body</div>
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.85em", paddingBottom: "0.5em", borderBottom: `1px solid ${SAND}` }}>
                  <span style={{ fontSize: "0.6em", letterSpacing: "0.2em", color: MUTE, textTransform: "uppercase", fontWeight: 800 }}>Packing Slip</span>
                  <span style={{ textAlign: "right", fontSize: "0.72em", color: INK }}>
                    {data.orderNumber && <span style={{ fontFamily: SERIF }}>#{data.orderNumber}</span>}
                    {data.orderDate && <span style={{ color: MUTE, marginLeft: "0.5em" }}>{data.orderDate}</span>}
                  </span>
                </div>

                {/* Ship to (left) + Ship from (right) */}
                <div style={{ display: "flex", gap: "0.55em", marginTop: "0.7em", alignItems: "stretch" }}>
                  <div style={{ flex: "1 1 0", minWidth: 0, padding: "0.6em 0.75em", backgroundColor: CREAM, border: `1px solid ${SAND}`, borderRadius: "0.5em" }}>
                    <div style={{ fontSize: "0.54em", letterSpacing: "0.18em", color: GREEN, textTransform: "uppercase", fontWeight: 800 }}>Ship To</div>
                    <div style={{ fontFamily: SERIF, fontSize: "1.02em", color: INK, marginTop: "0.12em", lineHeight: 1.15 }}>{data.shipToName || "—"}</div>
                    {addressLines.map((l, i) => (
                      <div key={i} style={{ fontSize: "0.72em", lineHeight: 1.35, color: "#3a3a34" }}>{l}</div>
                    ))}
                    {data.phone && <div style={{ fontSize: "0.72em", color: INK, marginTop: "0.2em", fontWeight: 600 }}>Phone: {data.phone}</div>}
                  </div>
                  <div style={{ flex: "1 1 0", minWidth: 0, padding: "0.6em 0.75em", backgroundColor: "#fff", border: `1px solid ${SAND}`, borderRadius: "0.5em" }}>
                    <div style={{ fontSize: "0.54em", letterSpacing: "0.18em", color: TERRA, textTransform: "uppercase", fontWeight: 800 }}>Ship From</div>
                    <div style={{ fontFamily: SERIF, fontSize: "1.02em", color: INK, marginTop: "0.12em", lineHeight: 1.15 }}>{SHIP_FROM.name}</div>
                    {SHIP_FROM.lines.map((l, i) => (
                      <div key={i} style={{ fontSize: "0.72em", lineHeight: 1.35, color: "#3a3a34" }}>{l}</div>
                    ))}
                  </div>
                </div>

                {/* Items table */}
                <div style={{ marginTop: "0.8em", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: "0.5em", alignItems: "flex-end", paddingBottom: "0.35em", borderBottom: `1.5px solid ${GREEN_DARK}` }}>
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}><span style={th}>Item</span></div>
                    <div style={{ width: "2em", textAlign: "center" }}><span style={th}>Qty</span></div>
                    <div style={{ width: "4.4em", textAlign: "right" }}><span style={th}>Price</span></div>
                    <div style={{ width: "4.8em", textAlign: "right" }}><span style={th}>Total</span></div>
                  </div>

                  {data.items.length === 0 ? (
                    <div style={{ fontSize: "0.8em", color: MUTE, padding: "0.5em 0" }}>—</div>
                  ) : (
                    data.items.map((it, i) => {
                      const { boxSize, includes } = splitItemDetails(it.details);
                      return (
                        <div key={i} style={{ display: "flex", gap: "0.5em", alignItems: "flex-start", padding: "0.42em 0", borderBottom: `1px solid ${SAND}` }}>
                          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                            <div style={{ fontFamily: SERIF, fontSize: "0.96em", color: TERRA, lineHeight: 1.15 }}>{it.title || "Item"}</div>
                            {it.variant && <div style={{ fontSize: "0.72em", color: "#5a5a52", marginTop: "0.08em" }}>{it.variant}</div>}
                            {boxSize && (
                              <span style={{ display: "inline-block", marginTop: "0.22em", fontSize: "0.52em", padding: "0.16em 0.6em", backgroundColor: GREEN_DARK, color: "#fff", borderRadius: "999px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{boxSize} box</span>
                            )}
                            {includes.length > 0 && (
                              <div style={{ fontSize: "0.68em", color: "#5a5a52", marginTop: "0.18em", lineHeight: 1.35 }}>
                                <span style={{ color: MUTE }}>Includes: </span>
                                {includes.join(" · ")}
                              </div>
                            )}
                          </div>
                          <div style={{ width: "2em", textAlign: "center" }}><span style={{ fontSize: "0.82em", fontWeight: 700 }}>{it.qty || "1"}</span></div>
                          <div style={{ width: "4.4em", textAlign: "right" }}><span style={{ fontSize: "0.74em", whiteSpace: "nowrap" }}>{fmtPrice(it.price)}</span></div>
                          <div style={{ width: "4.8em", textAlign: "right" }}><span style={{ fontSize: "0.78em", fontWeight: 700, whiteSpace: "nowrap" }}>{lineTotal(it.qty, it.price)}</span></div>
                        </div>
                      );
                    })
                  )}

                  {grand > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: "0.7em", marginTop: "0.55em" }}>
                      <span style={{ fontSize: "0.6em", letterSpacing: "0.14em", color: MUTE, textTransform: "uppercase", fontWeight: 800 }}>Total</span>
                      <span style={{ fontFamily: SERIF, fontSize: "1.18em", color: GREEN_DARK }}>{inr(grand)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ marginTop: "auto", paddingTop: "0.6em", borderTop: `1px solid ${SAND}`, textAlign: "center" }}>
                  <div style={{ fontSize: "0.62em", color: MUTE, lineHeight: 1.4 }}>{data.footerNote}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleExport}
          disabled={busy}
          className="w-full rounded-xl bg-terracotta px-5 py-3.5 font-body text-base font-bold text-white transition hover:bg-terracotta-dark disabled:opacity-60"
        >
          {busy ? "Preparing PDF…" : `Download PDF · ${size.label}`}
        </button>
        {err && <p className="text-center text-sm text-terracotta">{err}</p>}
        <p className="text-center text-xs text-ink/50">Rendered at {size.wmm}×{size.hmm}&nbsp;mm.</p>
      </div>
    </div>
  );
}

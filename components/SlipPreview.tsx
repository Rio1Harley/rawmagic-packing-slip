"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlipData, SlipItem } from "@/lib/types";
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

function LeafMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14.6" stroke={GREEN_DARK} strokeWidth="1.3" />
      <path d="M16 6c-4.6 5-4.6 13 0 20 4.6-7 4.6-15 0-20z" fill={GREEN} />
      <path d="M16 9v14" stroke={CREAM} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function splitItemDetails(details: string[]) {
  let boxSize = "";
  const includes: string[] = [];
  const others: string[] = [];
  for (const d of details) {
    const m = d.match(/^([^:]+):\s*(.+)$/);
    if (m) {
      const k = m[1].trim().toLowerCase();
      const v = m[2].trim();
      if (k.startsWith("box size") || k === "size") boxSize = v;
      else if (/^item\s*\d+/.test(k)) includes.push(v);
      else others.push(`${m[1].trim()}: ${v}`);
    } else {
      others.push(d);
    }
  }
  return { boxSize, includes, others };
}

function ItemRow({ item, base, first }: { item: SlipItem; base: number; first: boolean }) {
  const { boxSize, includes, others } = splitItemDetails(item.details);
  return (
    <div style={{ borderTop: first ? "none" : `1px solid ${SAND}`, padding: "0.45em 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.6em" }}>
        <div style={{ fontFamily: SERIF, fontSize: "1.02em", color: TERRA, lineHeight: 1.2 }}>{item.title || "Item"}</div>
        <div style={{ fontSize: "0.82em", color: INK, whiteSpace: "nowrap", fontWeight: 700 }}>× {item.qty || "1"}</div>
      </div>
      {boxSize && (
        <span
          style={{
            display: "inline-block",
            marginTop: "0.3em",
            fontSize: "0.6em",
            padding: "0.2em 0.7em",
            backgroundColor: GREEN_DARK,
            color: "#ffffff",
            borderRadius: "999px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {boxSize} box
        </span>
      )}
      {includes.length > 0 && (
        <div style={{ marginTop: "0.35em" }}>
          <div style={{ fontSize: "0.58em", color: MUTE, letterSpacing: "0.14em", textTransform: "uppercase" }}>Includes</div>
          <ul style={{ margin: "0.2em 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "0.2em 0.7em" }}>
            {includes.map((x, j) => (
              <li key={j} style={{ fontSize: "0.78em", color: "#3a3a34", display: "flex", alignItems: "center", gap: "0.35em" }}>
                <span style={{ width: "0.32em", height: "0.32em", borderRadius: "999px", backgroundColor: GREEN, display: "inline-block", flex: "0 0 auto" }} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
      {others.map((o, j) => (
        <div key={j} style={{ fontSize: "0.74em", color: "#3a3a34", marginTop: "0.15em" }}>
          {o}
        </div>
      ))}
    </div>
  );
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
            {/* ── The exact-size, exported artboard ── */}
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
                position: "relative",
              }}
            >
              <div style={{ height: "0.45em", backgroundColor: GREEN_DARK }} />
              <div
                style={{
                  padding: "1.15em 1.3em 1em",
                  height: `calc(100% - 0.45em)`,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6em" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55em" }}>
                    <LeafMark size={base * 2.1} />
                    <div>
                      <div style={{ fontFamily: SERIF, fontSize: "1.5em", lineHeight: 1, letterSpacing: "0.05em", color: GREEN_DARK }}>RAW MAGIC</div>
                      <div style={{ fontSize: "0.56em", letterSpacing: "0.22em", color: TERRA, marginTop: "0.35em", textTransform: "uppercase" }}>Handcrafted bath &amp; body</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.58em", letterSpacing: "0.2em", color: MUTE, textTransform: "uppercase" }}>Packing Slip</div>
                    {data.orderNumber && <div style={{ fontFamily: SERIF, fontSize: "1.1em", color: INK }}>#{data.orderNumber}</div>}
                    {data.orderDate && <div style={{ fontSize: "0.62em", color: MUTE }}>{data.orderDate}</div>}
                  </div>
                </div>

                {/* Ship to */}
                <div style={{ marginTop: "0.95em", padding: "0.75em 0.9em", backgroundColor: CREAM, border: `1px solid ${SAND}`, borderRadius: "0.5em" }}>
                  <div style={{ fontSize: "0.58em", letterSpacing: "0.2em", color: GREEN, textTransform: "uppercase", fontWeight: 800 }}>Ship To</div>
                  <div style={{ fontFamily: SERIF, fontSize: "1.16em", color: INK, marginTop: "0.1em" }}>{data.shipToName || "—"}</div>
                  {addressLines.map((l, i) => (
                    <div key={i} style={{ fontSize: "0.8em", lineHeight: 1.4, color: "#3a3a34" }}>{l}</div>
                  ))}
                  {data.phone && <div style={{ fontSize: "0.8em", color: INK, marginTop: "0.2em", fontWeight: 600 }}>Phone: {data.phone}</div>}
                </div>

                {/* Items */}
                <div style={{ marginTop: "0.85em", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: "0.58em", letterSpacing: "0.2em", color: GREEN, textTransform: "uppercase", fontWeight: 800, marginBottom: "0.15em" }}>In this parcel</div>
                  {data.items.length === 0 ? (
                    <div style={{ fontSize: "0.8em", color: MUTE, paddingTop: "0.3em" }}>—</div>
                  ) : (
                    data.items.map((it, i) => <ItemRow key={i} item={it} base={base} first={i === 0} />)
                  )}
                </div>

                {/* Gift message */}
                {data.giftMessage && (
                  <div style={{ marginTop: "0.55em", padding: "0.65em 0.85em", backgroundColor: "#ffffff", border: `1.4px dashed ${GREEN}`, borderRadius: "0.5em" }}>
                    <div style={{ fontSize: "0.56em", letterSpacing: "0.2em", color: TERRA, textTransform: "uppercase", fontWeight: 800 }}>Gift Message</div>
                    <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.92em", color: INK, marginTop: "0.2em", lineHeight: 1.4 }}>&ldquo;{data.giftMessage}&rdquo;</div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: "auto", paddingTop: "0.65em", borderTop: `1px solid ${SAND}`, textAlign: "center" }}>
                  <div style={{ fontSize: "0.64em", color: MUTE, lineHeight: 1.4 }}>{data.footerNote}</div>
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
        <p className="text-center text-xs text-ink/50">Rendered at {size.wmm}×{size.hmm}&nbsp;mm. Nothing is uploaded — the PDF is built in your browser.</p>
      </div>
    </div>
  );
}

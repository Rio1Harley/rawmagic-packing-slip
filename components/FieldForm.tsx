"use client";

import { SlipData, SlipItem } from "@/lib/types";

const inputCls =
  "mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-green";

function Label({ children, detected }: { children: React.ReactNode; detected?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink/55">
      {children}
      {detected && <span className="rounded-full bg-green/15 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-green-dark">auto-filled</span>}
    </span>
  );
}

export default function FieldForm({
  data,
  onChange,
  detected,
}: {
  data: SlipData;
  onChange: (d: SlipData) => void;
  detected: string[];
}) {
  const set = (patch: Partial<SlipData>) => onChange({ ...data, ...patch });
  const has = (f: string) => detected.includes(f);

  function setItem(i: number, patch: Partial<SlipItem>) {
    const items = data.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    set({ items });
  }
  function addItem() {
    set({ items: [...data.items, { qty: "1", title: "", details: [] }] });
  }
  function removeItem(i: number) {
    set({ items: data.items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <Label detected={has("orderNumber")}>Order #</Label>
          <input className={inputCls} value={data.orderNumber} onChange={(e) => set({ orderNumber: e.target.value })} placeholder="1008" />
        </label>
        <label>
          <Label detected={has("orderDate")}>Order date</Label>
          <input className={inputCls} value={data.orderDate} onChange={(e) => set({ orderDate: e.target.value })} placeholder="August 16, 2026" />
        </label>
      </div>

      <label className="block">
        <Label detected={has("shipToName")}>Ship to — name</Label>
        <input className={inputCls} value={data.shipToName} onChange={(e) => set({ shipToName: e.target.value })} placeholder="Kuldeep Sahani" />
      </label>

      <label className="block">
        <Label detected={has("shipToAddress")}>Address (one line per row)</Label>
        <textarea
          className={`${inputCls} min-h-[84px] resize-y whitespace-pre-wrap`}
          value={data.shipToAddress}
          onChange={(e) => set({ shipToAddress: e.target.value })}
          placeholder={"Sector-10\n122001 Gurgaon HR\nIndia"}
        />
      </label>

      <label className="block">
        <Label detected={has("phone")}>Phone</Label>
        <input className={inputCls} value={data.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 92203 40543" />
      </label>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between">
          <Label detected={has("items")}>Items in the parcel</Label>
          <button onClick={addItem} className="rounded-lg border border-green px-2.5 py-1 text-xs font-bold text-green-dark hover:bg-green/10">
            + Add item
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {data.items.length === 0 && <p className="text-sm text-ink/50">No items yet — add one, or upload a slip.</p>}
          {data.items.map((it, i) => (
            <div key={i} className="rounded-xl border border-sand bg-white/70 p-3">
              <div className="flex gap-2">
                <input className={`${inputCls} mt-0 flex-1`} value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="Build Your Own Gift Box" />
                <input className={`${inputCls} mt-0 w-16 text-center`} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} placeholder="1" />
                <button onClick={() => removeItem(i)} aria-label="Remove item" className="rounded-lg px-2 text-ink/40 hover:text-terracotta">
                  ✕
                </button>
              </div>
              <textarea
                className={`${inputCls} min-h-[64px] resize-y font-mono text-xs`}
                value={it.details.join("\n")}
                onChange={(e) => setItem(i, { details: e.target.value.split("\n") })}
                placeholder={"Box size: Medium\nItem 1: Bath Salt\nItem 2: Body Butter"}
              />
              <p className="mt-1 text-[10px] text-ink/45">One detail per line. &ldquo;Box size: …&rdquo; and &ldquo;Item N: …&rdquo; render as a box tag + an Includes list.</p>
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <Label>Footer note</Label>
        <input className={inputCls} value={data.footerNote} onChange={(e) => set({ footerNote: e.target.value })} />
      </label>
    </div>
  );
}

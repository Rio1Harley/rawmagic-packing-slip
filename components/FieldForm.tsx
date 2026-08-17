"use client";

import { useState } from "react";
import { SlipData, SlipItem, emptyItem } from "@/lib/types";
import { CATALOG, findProduct } from "@/lib/catalog";
import Dropdown from "@/components/Dropdown";

const inputCls = "w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-green";

function Label({ children, detected }: { children: React.ReactNode; detected?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink/55">
      {children}
      {detected && <span className="rounded-full bg-green/15 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-green-dark">auto-filled</span>}
    </span>
  );
}

function ItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: SlipItem;
  onChange: (patch: Partial<SlipItem>) => void;
  onRemove: () => void;
}) {
  const product = findProduct(item.title);
  const [manual, setManual] = useState(!!item.title && !product);
  const isMulti = (opt?: string, len = 0) => len > 1 && !/^(title|default title)$/i.test(opt || "title");
  const showVariantSelect = !!product && isMulti(product.optName, product.variants.length);
  const productValue = product ? item.title : manual ? "__custom" : "";

  function onProduct(name: string) {
    if (name === "__custom") {
      setManual(true);
      onChange({ title: "", variant: "", price: "" });
      return;
    }
    setManual(false);
    if (name === "") return onChange({ title: "", variant: "", price: "" });
    const p = findProduct(name);
    const first = p?.variants[0];
    onChange({ title: name, variant: p && isMulti(p.optName, p.variants.length) && first ? first.v : "", price: first?.price || "" });
  }
  function onVariant(v: string) {
    const pv = product?.variants.find((x) => x.v === v);
    onChange({ variant: v, price: pv?.price ?? item.price });
  }

  const productOptions = [
    { value: "", label: "Select a product…" },
    ...CATALOG.map((p) => ({ value: p.name, label: p.name })),
    { value: "__custom", label: "Custom / other…" },
  ];

  return (
    <div className="space-y-2 rounded-xl border border-sand bg-white/70 p-3">
      <div className="flex gap-2">
        <Dropdown value={productValue} onChange={onProduct} options={productOptions} placeholder="Select a product…" className="flex-1" />
        <button onClick={onRemove} aria-label="Remove item" className="rounded-lg px-2 text-lg text-ink/40 hover:text-terracotta">
          ✕
        </button>
      </div>

      {manual && <input className={inputCls} value={item.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Product name" />}

      <div className="flex gap-2">
        {showVariantSelect ? (
          <Dropdown value={item.variant} onChange={onVariant} options={product!.variants.map((v) => ({ value: v.v, label: v.v }))} placeholder="Variant" className="flex-1" />
        ) : (
          <input className={`${inputCls} flex-1`} value={item.variant} onChange={(e) => onChange({ variant: e.target.value })} placeholder="Variant (optional)" />
        )}
        <input className={`${inputCls} w-14 text-center`} value={item.qty} onChange={(e) => onChange({ qty: e.target.value })} inputMode="numeric" placeholder="Qty" />
        <div className="relative w-24">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink/40">₹</span>
          <input className={`${inputCls} pl-6`} value={item.price} onChange={(e) => onChange({ price: e.target.value })} inputMode="decimal" placeholder="Price" />
        </div>
      </div>

      <textarea
        className={`${inputCls} min-h-[52px] resize-y font-mono text-xs`}
        value={item.details.join("\n")}
        onChange={(e) => onChange({ details: e.target.value.split("\n") })}
        placeholder={"Gift-box contents (optional)\nBox size: Medium\nItem 1: Bath Salt"}
      />
    </div>
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
  const setItem = (i: number, patch: Partial<SlipItem>) => set({ items: data.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <Label detected={has("orderNumber")}>Order #</Label>
          <input className={`mt-1 ${inputCls}`} value={data.orderNumber} onChange={(e) => set({ orderNumber: e.target.value })} placeholder="1008" />
        </label>
        <label>
          <Label detected={has("orderDate")}>Order date</Label>
          <input className={`mt-1 ${inputCls}`} value={data.orderDate} onChange={(e) => set({ orderDate: e.target.value })} placeholder="August 16, 2026" />
        </label>
      </div>

      <label className="block">
        <Label detected={has("shipToName")}>Ship to — name</Label>
        <input className={`mt-1 ${inputCls}`} value={data.shipToName} onChange={(e) => set({ shipToName: e.target.value })} placeholder="Kuldeep Sahani" />
      </label>

      <label className="block">
        <Label detected={has("shipToAddress")}>Address (one line per row)</Label>
        <textarea className={`mt-1 ${inputCls} min-h-[84px] resize-y`} value={data.shipToAddress} onChange={(e) => set({ shipToAddress: e.target.value })} placeholder={"Sector-10\n122001 Gurgaon HR\nIndia"} />
      </label>

      <label className="block">
        <Label detected={has("phone")}>Phone</Label>
        <input className={`mt-1 ${inputCls}`} value={data.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 92203 40543" />
      </label>

      <div>
        <div className="flex items-center justify-between">
          <Label detected={has("items")}>Items in the parcel</Label>
          <button onClick={() => set({ items: [...data.items, emptyItem()] })} className="rounded-lg border border-green px-2.5 py-1 text-xs font-bold text-green-dark hover:bg-green/10">
            + Add item
          </button>
        </div>
        <p className="mt-1 text-[11px] text-ink/45">Pick a product to auto-fill its variant &amp; price, or choose &ldquo;Custom&rdquo; to type your own.</p>
        <div className="mt-2 space-y-3">
          {data.items.length === 0 && <p className="text-sm text-ink/50">No items yet — add one, or upload a slip.</p>}
          {data.items.map((it, i) => (
            <ItemEditor key={i} item={it} onChange={(patch) => setItem(i, patch)} onRemove={() => set({ items: data.items.filter((_, idx) => idx !== i) })} />
          ))}
        </div>
      </div>

      <label className="block">
        <Label>Footer note</Label>
        <input className={`mt-1 ${inputCls}`} value={data.footerNote} onChange={(e) => set({ footerNote: e.target.value })} />
      </label>
    </div>
  );
}

"use client";

import { SlipData, SlipItem, emptyItem } from "@/lib/types";
import { CATALOG, findProduct } from "@/lib/catalog";

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
  const showVariantSelect = !!product && product.variants.length > 1 && !/^(title|default title)$/i.test(product.optName || "title");
  const productValue = product ? item.title : item.title ? "__custom" : "";

  function onProduct(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value;
    if (name === "__custom") return onChange({ title: "", variant: "", price: "" });
    if (name === "") return onChange({ title: "", variant: "", price: "" });
    const p = findProduct(name);
    const first = p?.variants[0];
    const multi = !!p && p.variants.length > 1 && !/^(title|default title)$/i.test(p.optName || "title");
    onChange({ title: name, variant: multi && first ? first.v : "", price: first?.price || "" });
  }
  function onVariant(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const pv = product?.variants.find((x) => x.v === v);
    onChange({ variant: v, price: pv?.price ?? item.price });
  }

  return (
    <div className="space-y-2 rounded-xl border border-sand bg-white/70 p-3">
      <div className="flex gap-2">
        <select value={productValue} onChange={onProduct} className={`${inputCls} flex-1`}>
          <option value="">Select a product…</option>
          {CATALOG.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
          <option value="__custom">Custom / other…</option>
        </select>
        <button onClick={onRemove} aria-label="Remove item" className="rounded-lg px-2 text-lg text-ink/40 hover:text-terracotta">
          ✕
        </button>
      </div>

      {productValue === "__custom" && (
        <input className={inputCls} value={item.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Product name" />
      )}

      <div className="flex gap-2">
        {showVariantSelect ? (
          <select value={item.variant} onChange={onVariant} className={`${inputCls} flex-1`}>
            {product!.variants.map((v) => (
              <option key={v.v} value={v.v}>
                {v.v}
              </option>
            ))}
          </select>
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

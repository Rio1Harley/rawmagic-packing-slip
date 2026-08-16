"use client";

import { useState } from "react";
import { LabelSize, SIZES, IN_TO_MM } from "@/lib/sizes";

export default function SizePicker({ value, onChange }: { value: LabelSize; onChange: (s: LabelSize) => void }) {
  const [cw, setCw] = useState("4");
  const [ch, setCh] = useState("6");
  const [unit, setUnit] = useState<"in" | "mm">("in");
  const isCustom = value.id === "custom";

  function applyCustom(w = cw, h = ch, u = unit) {
    const W = parseFloat(w);
    const H = parseFloat(h);
    if (!W || !H) return;
    const wmm = u === "in" ? W * IN_TO_MM : W;
    const hmm = u === "in" ? H * IN_TO_MM : H;
    onChange({
      id: "custom",
      label: `${W}×${H} ${u}`,
      note: `Custom ${W} × ${H} ${u}`,
      wmm: Math.round(wmm * 10) / 10,
      hmm: Math.round(hmm * 10) / 10,
    });
  }

  function onSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id === "custom") {
      applyCustom();
      return;
    }
    const s = SIZES.find((x) => x.id === id);
    if (s) onChange(s);
  }

  return (
    <div>
      <div className="relative">
        <select
          value={value.id}
          onChange={onSelect}
          className="w-full appearance-none rounded-xl border border-sand bg-white px-4 py-3 pr-10 font-heading text-base text-ink outline-none focus:border-green"
        >
          {SIZES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} — {s.wmm}×{s.hmm} mm
            </option>
          ))}
          <option value="custom">Custom size…</option>
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/45">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {isCustom && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-sand bg-white p-3">
          <label className="text-xs font-semibold text-ink/60">
            Width
            <input value={cw} onChange={(e) => setCw(e.target.value)} type="number" min="1" className="mt-1 block w-20 rounded-lg border border-sand px-2 py-1.5 text-sm" />
          </label>
          <span className="pb-2 text-ink/40">×</span>
          <label className="text-xs font-semibold text-ink/60">
            Height
            <input value={ch} onChange={(e) => setCh(e.target.value)} type="number" min="1" className="mt-1 block w-20 rounded-lg border border-sand px-2 py-1.5 text-sm" />
          </label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as "in" | "mm")} className="rounded-lg border border-sand px-2 py-2 text-sm">
            <option value="in">inch</option>
            <option value="mm">mm</option>
          </select>
          <button onClick={() => applyCustom()} className="rounded-lg bg-green px-4 py-2 text-sm font-bold text-white hover:bg-green-dark">
            Apply
          </button>
        </div>
      )}
      <p className="mt-2 text-xs leading-snug text-ink/55">{value.note}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { LabelSize, SIZES, IN_TO_MM } from "@/lib/sizes";

export default function SizePicker({ value, onChange }: { value: LabelSize; onChange: (s: LabelSize) => void }) {
  const [customOpen, setCustomOpen] = useState(value.id === "custom");
  const [cw, setCw] = useState("4");
  const [ch, setCh] = useState("6");
  const [unit, setUnit] = useState<"in" | "mm">("in");

  function applyCustom() {
    const w = parseFloat(cw);
    const h = parseFloat(ch);
    if (!w || !h) return;
    const wmm = unit === "in" ? w * IN_TO_MM : w;
    const hmm = unit === "in" ? h * IN_TO_MM : h;
    onChange({ id: "custom", label: `${w}×${h} ${unit}`, note: `Custom ${w} × ${h} ${unit}`, wmm: Math.round(wmm * 10) / 10, hmm: Math.round(hmm * 10) / 10 });
  }

  const cellBase = "rounded-xl border p-3 text-left transition";
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SIZES.map((s) => {
          const active = value.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setCustomOpen(false);
                onChange(s);
              }}
              className={`${cellBase} ${active ? "border-green-dark bg-green-dark text-white" : "border-sand bg-white hover:border-green"}`}
            >
              <div className="font-heading text-base leading-tight">{s.label}</div>
              <div className={`mt-0.5 text-[11px] leading-tight ${active ? "text-white/75" : "text-ink/55"}`}>
                {s.wmm}×{s.hmm} mm
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setCustomOpen(true)}
          className={`${cellBase} ${value.id === "custom" ? "border-green-dark bg-green-dark text-white" : "border-sand bg-white hover:border-green"}`}
        >
          <div className="font-heading text-base leading-tight">Custom</div>
          <div className={`mt-0.5 text-[11px] leading-tight ${value.id === "custom" ? "text-white/75" : "text-ink/55"}`}>Your size</div>
        </button>
      </div>

      {customOpen && (
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
          <button onClick={applyCustom} className="rounded-lg bg-green px-4 py-2 text-sm font-bold text-white hover:bg-green-dark">
            Apply
          </button>
        </div>
      )}
      <p className="mt-2 text-xs leading-snug text-ink/55">{value.note}</p>
    </div>
  );
}

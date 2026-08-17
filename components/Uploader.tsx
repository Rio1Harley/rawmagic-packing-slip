"use client";

import { useRef, useState } from "react";

export default function Uploader({
  onFile,
  onBlank,
  busy,
  progressLabel,
  error,
}: {
  onFile: (f: File) => void;
  onBlank: () => void;
  busy: boolean;
  progressLabel?: string;
  error: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return;
    onFile(f);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          drag ? "border-green bg-green/10" : "border-sand bg-white/70 hover:border-green"
        }`}
      >
        <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => pick(e.target.files)} />
        <span className="grid h-14 w-14 place-items-center rounded-full bg-green-dark text-cream">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M8 8l4-4 4 4" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <div>
          <p className="font-heading text-xl text-green-dark">Drop your Shopify packing slip</p>
          <p className="mt-1 text-sm text-ink/60">or tap to choose a PDF</p>
        </div>
        {busy && <p className="text-sm font-semibold text-terracotta">{progressLabel || "Reading PDF…"}</p>}
      </div>
      {error && <p className="mt-3 text-center text-sm text-terracotta">{error}</p>}
      <div className="mt-4 text-center">
        <button onClick={onBlank} className="text-sm font-semibold text-green-dark underline underline-offset-4 hover:text-terracotta">
          or fill in the details manually
        </button>
      </div>
    </div>
  );
}

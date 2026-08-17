"use client";

import { useState } from "react";
import Uploader from "@/components/Uploader";
import SizePicker from "@/components/SizePicker";
import FieldForm from "@/components/FieldForm";
import SlipPreview from "@/components/SlipPreview";
import HelpWidget from "@/components/HelpWidget";
import { SlipData, emptySlip } from "@/lib/types";
import { LabelSize, SIZES } from "@/lib/sizes";
import { parseSlip } from "@/lib/parseSlip";

type Stage = "upload" | "edit";

export default function Studio() {
  const [stage, setStage] = useState<Stage>("upload");
  const [data, setData] = useState<SlipData>(emptySlip());
  const [detected, setDetected] = useState<string[]>([]);
  const [size, setSize] = useState<LabelSize>(SIZES[0]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setProgress("Reading PDF…");
    try {
      const res = await parseSlip(file, (p, label) => setProgress(p ? `${label} ${p}%` : label));
      setData(res.data);
      setDetected(res.detected);
      setStage("edit");
    } catch (e) {
      console.error("parseSlip failed:", e);
      setError("Couldn't read that PDF. Try Shopify's Print → Packing slip, or fill in the details manually.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  function startBlank() {
    setData(emptySlip());
    setDetected([]);
    setStage("edit");
  }

  function reset() {
    setData(emptySlip());
    setDetected([]);
    setStage("upload");
    setError("");
  }

  return (
    <main className="min-h-full">
      <header className="border-b border-sand bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rawmagic-mark.png" alt="Raw Magic" className="h-10 w-10" />
            <div className="leading-tight">
              <p className="font-heading text-lg tracking-wide text-green-dark">Raw Magic</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">Packing Slip Studio</p>
            </div>
          </div>
          {stage === "edit" && (
            <button onClick={reset} className="rounded-lg border border-sand bg-white px-3 py-1.5 text-sm font-semibold text-green-dark hover:border-green">
              Start over
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {stage === "upload" ? (
          <div className="mx-auto max-w-xl">
            <div className="mb-6 text-center">
              <h1 className="font-heading text-3xl text-green-dark sm:text-4xl">Brand your packing slip</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/65">
                Upload the packing slip PDF from Shopify. We&rsquo;ll pull out the order details, let you tidy anything, and export a Raw Magic&ndash;styled label in the courier size you need.
              </p>
            </div>
            <Uploader onFile={handleFile} onBlank={startBlank} busy={busy} progressLabel={progress} error={error} />
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr,minmax(300px,380px)] lg:gap-8">
            {/* Controls */}
            <div className="space-y-7">
              <section>
                <h2 className="mb-2 font-heading text-xl text-green-dark">1 · Label size</h2>
                <SizePicker value={size} onChange={setSize} />
              </section>

              {/* Preview on mobile appears here, between the two steps */}
              <section className="lg:hidden">
                <h2 className="mb-2 font-heading text-xl text-green-dark">Preview</h2>
                <SlipPreview data={data} size={size} />
              </section>

              <section>
                <h2 className="mb-2 font-heading text-xl text-green-dark">2 · Check the details</h2>
                {detected.length > 0 && (
                  <p className="mb-3 rounded-lg bg-green/10 px-3 py-2 text-xs text-green-dark">
                    Auto-filled {detected.length} field{detected.length === 1 ? "" : "s"} from your PDF. Please double-check the address and items before printing.
                  </p>
                )}
                <FieldForm data={data} onChange={setData} detected={detected} />
              </section>
            </div>

            {/* Sticky preview (desktop) */}
            <aside className="hidden lg:block">
              <div className="sticky top-6">
                <h2 className="mb-2 font-heading text-xl text-green-dark">Preview</h2>
                <SlipPreview data={data} size={size} />
              </div>
            </aside>
          </div>
        )}
      </div>

      <footer className="border-t border-sand py-6 text-center text-xs text-ink/45">
        Built for Raw Magic by Nextline Creative
      </footer>

      <HelpWidget />
    </main>
  );
}

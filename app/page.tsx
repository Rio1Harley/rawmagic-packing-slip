"use client";

import dynamic from "next/dynamic";
import PinGate from "@/components/PinGate";

// The whole tool is client-only (pdf.js / OCR / jsPDF / html2canvas need the
// browser), so we skip SSR entirely and load it on the client.
const Studio = dynamic(() => import("@/components/Studio"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[60vh] place-items-center text-green-dark">
      <p className="font-heading text-lg">Loading Packing Slip Studio…</p>
    </div>
  ),
});

export default function Page() {
  return (
    <PinGate>
      <Studio />
    </PinGate>
  );
}

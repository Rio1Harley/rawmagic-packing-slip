"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Rasterise the (natural-size) slip element at high DPI and place it on a PDF
 * page of the exact physical size. WYSIWYG: what you preview is what prints.
 */
export async function exportSlipToPdf(el: HTMLElement, wmm: number, hmm: number, filename: string) {
  const longEdgePx = Math.max(el.offsetWidth, el.offsetHeight) || 400;
  // Aim for ~300 DPI on the long edge, clamped so huge A4 exports stay reasonable.
  const scale = Math.min(4, Math.max(2, 1600 / longEdgePx));

  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    imageTimeout: 0,
  });

  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    unit: "mm",
    orientation: wmm > hmm ? "landscape" : "portrait",
    format: [wmm, hmm],
    compress: true,
  });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  pdf.addImage(img, "PNG", 0, 0, pw, ph, undefined, "FAST");
  pdf.save(filename);
}

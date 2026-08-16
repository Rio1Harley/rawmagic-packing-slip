"use client";

import { useState } from "react";

const WA_NUMBER = "919220340543";
const WA_MSG = "Hello, I am facing a issue with the Packaging Slip Portal";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`;

function WhatsappIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.85-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export default function HelpWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-3 print:hidden">
      {open && (
        <div className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-sand bg-white shadow-2xl">
          <div className="flex items-start justify-between bg-green-dark px-4 py-3 text-cream">
            <div>
              <p className="font-heading text-base leading-tight">Need a hand?</p>
              <p className="text-xs text-cream/75">We usually reply within minutes.</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-cream/70 hover:text-cream">✕</button>
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed text-ink/70">Facing a problem with the Packaging Slip Portal? Message us on WhatsApp and we&rsquo;ll sort it out.</p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
            >
              <WhatsappIcon /> Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-green-dark py-2.5 pl-2.5 pr-4 text-cream shadow-lg transition hover:bg-green"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-cream/15">
          {open ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-5.2A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
          )}
        </span>
        <span className="text-sm font-bold">{open ? "Close" : "Facing an issue?"}</span>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export interface Option {
  value: string;
  label: string;
}

/** Brand-styled dropdown (button + listbox) — replaces the native <select> so it
 *  matches the Raw Magic theme on every device instead of the OS picker. */
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-sand bg-white px-3 py-2 text-left text-sm text-ink outline-none transition focus:border-green"
      >
        <span className={`truncate ${selected ? "" : "text-ink/40"}`}>{selected ? selected.label : placeholder || "Select…"}</span>
        <svg
          className={`shrink-0 text-ink/45 transition-transform ${open ? "rotate-180" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-sand bg-white py-1 shadow-2xl">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition ${
                  on ? "bg-cream font-semibold text-green-dark" : "text-ink hover:bg-cream/60"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {on && (
                  <svg className="shrink-0 text-terracotta" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

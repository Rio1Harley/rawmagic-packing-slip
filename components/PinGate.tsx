"use client";

import { useEffect, useState } from "react";

// NOTE: this is a lightweight client-side gate (the PIN lives in the bundle), so it
// deters casual access but is not real authentication. Change PIN here when needed.
const PIN = "0011";
const KEY = "rm-slip-unlocked";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(sessionStorage.getItem(KEY) === "1");
    } catch {}
    setReady(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === PIN) {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
      setUnlocked(true);
    } else {
      setErr(true);
      setPin("");
    }
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-xs rounded-2xl border border-sand bg-white p-6 text-center shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rawmagic-logo.png" alt="Raw Magic" className="mx-auto h-14 w-auto" />
        <p className="mt-3 font-heading text-lg text-green-dark">Packing Slip Studio</p>
        <p className="mt-1 text-sm text-ink/60">Enter your PIN to continue.</p>
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            setErr(false);
          }}
          type="password"
          inputMode="numeric"
          autoFocus
          aria-label="PIN"
          className={`mt-4 w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.5em] outline-none ${err ? "border-terracotta" : "border-sand focus:border-green"}`}
          placeholder="••••"
        />
        {err && <p className="mt-2 text-sm text-terracotta">Wrong PIN — try again.</p>}
        <button type="submit" className="mt-4 w-full rounded-xl bg-green-dark px-4 py-3 font-bold text-cream transition hover:bg-green">
          Unlock
        </button>
      </form>
    </div>
  );
}

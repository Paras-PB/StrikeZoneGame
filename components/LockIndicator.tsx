"use client";
import { useEffect, useState } from "react";
import { lockState } from "@/lib/game";

/** Stinger lock-on readout under the crosshair while ADS. */
export default function LockIndicator({ ads }: { ads: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => tick((x) => x + 1), 80);
    return () => clearInterval(iv);
  }, []);
  if (!ads) return null;
  const locked = lockState.locked;
  const pct = Math.round(lockState.progress * 100);
  return (
    <div className="absolute left-1/2 top-[56%] -translate-x-1/2 text-center">
      {locked ? (
        <div className="text-red-400 font-display font-bold tracking-[0.3em] text-sm animate-pulse" style={{ textShadow: "0 0 10px rgba(0,0,0,0.9)" }}>
          🔒 LOCKED — FIRE
        </div>
      ) : lockState.id !== null ? (
        <div className="text-cyan-300 font-display font-bold tracking-[0.3em] text-xs" style={{ textShadow: "0 0 10px rgba(34,211,238,0.5), 0 0 4px rgba(0,0,0,0.9)" }}>
          LOCKING… {pct}%
        </div>
      ) : (
        <div className="text-cyan-100/50 font-bold tracking-[0.3em] text-[10px]">AIM AT AIR TARGET TO LOCK</div>
      )}
    </div>
  );
}

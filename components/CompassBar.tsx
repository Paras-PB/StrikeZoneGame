"use client";
import { useEffect, useRef } from "react";
import { playerState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

/**
 * V8 — top-center compass strip. The tick sequence is rendered 3× for
 * wrap-around and scrolled with a direct DOM transform in a rAF loop
 * (no React re-renders). Heading convention mirrors Minimap's player
 * arrow: forward = (-sin yaw, -cos yaw), so yaw 0 faces -Z = north and
 * heading° = -yaw in degrees, normalized.
 */
const PX_PER_DEG = 2.4;
const REPEAT_W = 360 * PX_PER_DEG; // 864px per full turn
const CARDINALS: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };
const INTERCARDINAL: Record<number, string> = { 45: "NE", 135: "SE", 225: "SW", 315: "NW" };

export default function CompassBar() {
  const phase = useGameStore((s) => s.phase);
  const stripRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const visible = phase === "playing" || phase === "paused" || phase === "perk";

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const strip = stripRef.current;
      if (!strip) return;
      let deg = (-playerState.yaw * 180) / Math.PI;
      deg = ((deg % 360) + 360) % 360;
      // the middle repeat's current-heading tick lands on the strip origin
      // (container center): tick x = deg*PX_PER_DEG, so shift back by that much
      strip.style.transform = `translateX(${-(deg * PX_PER_DEG)}px)`;
      if (readoutRef.current) {
        const t = `${Math.round(deg)}°`;
        if (readoutRef.current.textContent !== t) readoutRef.current.textContent = t;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 w-[min(520px,60vw)] z-10">
      <div
        className="holo-panel relative h-[30px] overflow-hidden"
        style={{
          maskImage: "linear-gradient(90deg, transparent, black 14%, black 86%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 14%, black 86%, transparent)",
        }}
      >
        {/* strip origin sits at the horizontal center; ticks scroll past it */}
        <div ref={stripRef} className="absolute top-0 left-1/2 h-full will-change-transform">
          {[0, 1, 2].map((rep) =>
            Array.from({ length: 24 }, (_, i) => i * 15).map((d) => {
              const x = (rep - 1) * REPEAT_W + d * PX_PER_DEG;
              const cardinal = CARDINALS[d];
              const inter = INTERCARDINAL[d];
              return (
                <div key={`${rep}-${d}`} className="absolute top-0 h-full" style={{ left: x }}>
                  {cardinal ? (
                    <span className="absolute top-[3px] -translate-x-1/2 font-display font-extrabold text-[13px] text-cyan-200" style={{ textShadow: "0 0 8px rgba(34,211,238,0.7)" }}>
                      {cardinal}
                    </span>
                  ) : inter ? (
                    <span className="absolute top-[7px] -translate-x-1/2 font-display text-[9px] font-semibold text-cyan-400/70">{inter}</span>
                  ) : (
                    <span className="absolute top-[9px] -translate-x-1/2 block w-px h-[7px] bg-cyan-400/50" />
                  )}
                  <span className="absolute bottom-[2px] -translate-x-1/2 block w-px h-[4px] bg-cyan-400/35" />
                </div>
              );
            })
          )}
        </div>
        {/* center caret */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 text-cyan-300 text-[9px] leading-none">▼</div>
        <div className="absolute left-1/2 top-[11px] bottom-[3px] w-px -translate-x-1/2 bg-cyan-300/80" />
      </div>
      <div className="mt-0.5 text-center">
        <span ref={readoutRef} className="font-display text-[11px] font-semibold tracking-[0.2em] text-cyan-300/90">
          0°
        </span>
      </div>
    </div>
  );
}

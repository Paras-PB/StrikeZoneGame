"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { playerState, bermudaPoiAt } from "@/lib/game";

/**
 * V9 — named-location popup for Bermuda Town. While playing on the arena
 * map, polls the player position ~4×/s; when the player enters a POI
 * (BERMUDA_POIS) they weren't already in, the location name splashes in
 * the V8 banner style for ~2 s. Lazy-loaded from page.tsx (imports
 * playerState/three) like CompassBar and Minimap.
 */
export default function LocationTag() {
  const phase = useGameStore((s) => s.phase);
  const mapId = useGameStore((s) => s.mapId);
  const [shown, setShown] = useState<{ name: string; key: number } | null>(null);
  const current = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "playing" || mapId !== "arena") {
      current.current = null;
      setShown(null);
      return;
    }
    const iv = setInterval(() => {
      const poi = bermudaPoiAt(playerState.pos.x, playerState.pos.z);
      if (poi === current.current) return;
      current.current = poi;
      if (poi) {
        setShown({ name: poi, key: Date.now() });
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShown(null), 2100);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [phase, mapId]);

  if (!shown || phase !== "playing" || mapId !== "arena") return null;

  return (
    <div key={shown.key} className="pointer-events-none absolute inset-x-0 top-[57%] z-10 flex flex-col items-center select-none">
      <div className="anim-banner flex flex-col items-center">
        <div
          className="font-display text-[10px] font-semibold tracking-[0.5em] text-cyan-300"
          style={{ textShadow: "0 0 12px rgba(34,211,238,0.5)" }}
        >
          📍 BERMUDA TOWN
        </div>
        <div className="holo-title font-display font-extrabold text-4xl sm:text-5xl tracking-[0.14em] text-center leading-none mt-2">
          {shown.name}
        </div>
      </div>
    </div>
  );
}

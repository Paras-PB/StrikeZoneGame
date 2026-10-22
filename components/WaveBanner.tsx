"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";

/**
 * V8 — animated center-screen splash when a new wave begins.
 *
 * Wave-kind rules are NOT re-derived here: Enemies.spawnWave() already
 * computes them and publishes the results on the store — bossKind
 * (isBossWave/isGunshipWave), objective "defend" (isDefendWave), and
 * storm (isStormWave) are all set before `wave` itself is updated, so
 * reading the store snapshot when `wave` changes gives the game's own
 * classification. Night is wave % 3 === 0, the same test the killfeed
 * and HUD use. Priority: boss > defend > storm > night > normal.
 */
type Banner = { key: number; title: string; sub: string; danger: boolean };

export default function WaveBanner() {
  const wave = useGameStore((s) => s.wave);
  const phase = useGameStore((s) => s.phase);
  const [banner, setBanner] = useState<Banner | null>(null);
  const lastShown = useRef(0);
  const endlessShown = useRef(false);

  useEffect(() => {
    if (wave === 0) {
      lastShown.current = 0;
      endlessShown.current = false;
      return;
    }
    if (phase !== "playing" || wave === lastShown.current) return;
    lastShown.current = wave;
    const s = useGameStore.getState();

    // first endless wave gets the ENDLESS MODE splash instead
    if (s.endless && wave === 11 && !endlessShown.current) {
      endlessShown.current = true;
      setBanner({ key: wave, title: "∞ ENDLESS MODE", sub: "WAVE 11 — HOW FAR CAN YOU GET?", danger: false });
      return;
    }

    let sub: string;
    let danger = false;
    if (s.bossKind === "gunship") {
      sub = "🚁 GUNSHIP INBOUND";
      danger = true;
    } else if (s.bossKind === "juggernaut") {
      sub = "☠ JUGGERNAUT INBOUND";
      danger = true;
    } else if (s.objective === "defend") {
      sub = "🛡️ DEFEND THE ZONE";
    } else if (s.storm) {
      sub = "🌧️ STORM WARNING";
    } else if (wave % 3 === 0) {
      sub = "🌙 NIGHT OPS";
    } else {
      sub = "HOSTILES INBOUND";
    }
    setBanner({
      key: wave,
      title: wave === 10 && !s.endless ? "FINAL WAVE" : `WAVE ${wave}`,
      sub,
      danger,
    });
  }, [wave, phase]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2250);
    return () => clearTimeout(t);
  }, [banner]);

  if (!banner || phase !== "playing") return null;

  return (
    <div key={banner.key} className="pointer-events-none absolute inset-x-0 top-[24%] z-10 flex flex-col items-center select-none">
      <div className="anim-banner flex flex-col items-center">
        <div className="flex items-center gap-4 mb-2">
          <span className="block h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-cyan-300/90" />
          <span className="font-display text-[11px] font-semibold tracking-[0.5em] text-cyan-300">
            {banner.danger ? "⚠ THREAT DETECTED ⚠" : "TACTICAL UPDATE"}
          </span>
          <span className="block h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-cyan-300/90" />
        </div>
        <div className="holo-title font-extrabold text-6xl sm:text-7xl tracking-[0.12em] text-center leading-none">
          {banner.title}
        </div>
        <div
          className={`mt-3 font-display font-semibold text-base sm:text-lg tracking-[0.45em] text-center ${
            banner.danger ? "text-red-400" : "text-cyan-300"
          }`}
          style={{ textShadow: banner.danger ? "0 0 14px rgba(248,113,113,0.6)" : "0 0 14px rgba(34,211,238,0.5)" }}
        >
          {banner.sub}
        </div>
      </div>
    </div>
  );
}

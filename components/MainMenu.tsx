"use client";
import { useGameStore, ACH_DEFS, rankFor } from "@/lib/store";
import type { AchId } from "@/lib/store";

export default function MainMenu() {
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);
  const kills = useGameStore((s) => s.kills);
  const score = useGameStore((s) => s.score);
  const wave = useGameStore((s) => s.wave);
  const timeSurvived = useGameStore((s) => s.timeSurvived);
  const shots = useGameStore((s) => s.shots);
  const hits = useGameStore((s) => s.hits);
  const headshots = useGameStore((s) => s.headshots);
  const bestScore = useGameStore((s) => s.bestScore);
  const newBest = useGameStore((s) => s.newBest);
  const perksOwned = useGameStore((s) => s.perksOwned);
  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  const xp = useGameStore((s) => s.xp);
  const lastRunXp = useGameStore((s) => s.lastRunXp);
  const achievements = useGameStore((s) => s.achievements);
  const bestEndlessWave = useGameStore((s) => s.bestEndlessWave);
  const mapId = useGameStore((s) => s.mapId);
  const setStore = useGameStore((s) => s.set);
  const endless = useGameStore((s) => s.endless);
  const rank = rankFor(xp);

  const continueEndless = () => {
    const s = useGameStore.getState();
    s.resetAmmo();
    s.set({
      phase: "playing",
      endless: true,
      pendingWave: s.wave + 1,
      health: s.maxHealth,
      bossHealth: 0,
      bossMax: 0,
    });
    setTimeout(() => {
      document.querySelector("canvas")?.requestPointerLock?.();
    }, 50);
  };

  const start = async () => {
    startGame();
    // request pointer lock on canvas
    setTimeout(() => {
      const canvas = document.querySelector("canvas");
      canvas?.requestPointerLock?.();
    }, 50);
  };

  if (phase === "playing") return null;

  const isDead = phase === "dead";
  const isVictory = phase === "victory";

  return (
    <div className="menu-bg absolute inset-0 z-10 flex justify-center overflow-y-auto">
      {/* readability overlay above the photo, below the content */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/85 pointer-events-none" />
      <div className="relative max-w-3xl w-full mx-4 my-auto py-6 text-center [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]">
        <div className="text-orange-500 font-black tracking-[0.4em] text-sm mb-2">TACTICAL COMBAT SIMULATOR</div>
        <h1 className="text-7xl font-black tracking-tighter leading-none mb-1">
          STRIKE<span className="text-orange-500">ZONE</span>
        </h1>
        <p className="text-white/60 mb-6 text-sm tracking-wide">
          {isDead
            ? `KIA — Wave ${wave} · ${kills} kills · ${score} pts · survived ${Math.floor(timeSurvived)}s`
            : isVictory
            ? `MISSION COMPLETE — ${kills} kills · ${score} pts · ${Math.floor(timeSurvived)}s`
            : "V3 AIRBORNE — drones in the sky, zones to defend, supply drops, grenades, a sniper, and a Juggernaut at the end. Survive."}
        </p>

        {(isDead || isVictory) && (
          <div className={`inline-block px-4 py-1 rounded font-black tracking-widest text-sm mb-4 ${isVictory ? "bg-green-600" : "bg-red-700"}`}>
            {isVictory ? "ALL WAVES CLEARED" : "YOU DIED"}
          </div>
        )}

        {(isDead || isVictory) && (
          <div className="grid grid-cols-4 gap-3 mb-6 text-center">
            {[
              ["ACCURACY", `${accuracy}%`],
              ["HEADSHOTS", `${headshots}`],
              ["BEST SCORE", `${Math.max(bestScore, score)}`],
              ["PERKS TAKEN", `${perksOwned.length}`],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/5 border border-white/10 rounded p-3">
                <div className="text-[10px] tracking-[0.25em] text-white/50 font-bold">{k}</div>
                <div className="text-2xl font-black">{v}</div>
              </div>
            ))}
          </div>
        )}
        {(isDead || isVictory) && lastRunXp > 0 && (
          <div className="mb-4 text-sm text-white/70">
            <span className="text-cyan-300 font-black">+{lastRunXp} XP</span> · Rank: <b className="text-white">{rank.current}</b>
            {endless && <> · Endless wave {wave} · Best endless wave {Math.max(bestEndlessWave, wave)}</>}
          </div>
        )}
        {newBest && (isDead || isVictory) && (
          <div className="mb-4 text-yellow-300 font-black tracking-[0.3em] text-sm animate-pulse">★ NEW BEST SCORE ★</div>
        )}
        {phase === "menu" && bestScore > 0 && (
          <div className="mb-4 text-yellow-300/80 font-bold tracking-[0.25em] text-xs">BEST SCORE: {bestScore}</div>
        )}

        {phase === "menu" && (
          <div className="grid grid-cols-2 gap-3 mb-3 text-left">
            <button
              onClick={() => setStore({ mapId: "arena" })}
              className={`pointer-events-auto rounded p-4 border transition active:scale-95 ${mapId === "arena" ? "bg-orange-600/25 border-orange-500" : "bg-white/5 border-white/10 hover:border-white/30"}`}
            >
              <div className="font-black tracking-widest text-sm">🏭 THE ARENA</div>
              <div className="text-white/60 text-xs mt-1">The original compound — warehouses, containers, open lanes.</div>
              {mapId === "arena" && <div className="text-orange-400 text-[10px] font-black tracking-widest mt-2">● SELECTED</div>}
            </button>
            <button
              onClick={() => setStore({ mapId: "forest" })}
              className={`pointer-events-auto rounded p-4 border transition active:scale-95 ${mapId === "forest" ? "bg-orange-600/25 border-orange-500" : "bg-white/5 border-white/10 hover:border-white/30"}`}
            >
              <div className="font-black tracking-widest text-sm">🌲 FOREST OUTPOST <span className="text-green-400 text-[10px] align-middle">NEW · V4</span></div>
              <div className="text-white/60 text-xs mt-1">Dawn pines, log cabins and a watchtower — like the photo above. Tree cover everywhere.</div>
              {mapId === "forest" && <div className="text-orange-400 text-[10px] font-black tracking-widest mt-2">● SELECTED</div>}
            </button>
          </div>
        )}


        {phase === "menu" && (
          <>
            <div className="bg-white/5 border border-white/10 rounded p-4 text-left mb-3">
              <div className="font-bold text-orange-400 text-xs tracking-widest mb-3">⌨️ KEY GUIDE — EVERY CONTROL</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-2">
                {[
                  ["W A S D", "Move"],
                  ["MOUSE", "Aim / look around"],
                  ["LMB", "Fire weapon"],
                  ["RMB", "Aim down sights · sniper scope on weapon 4"],
                  ["SHIFT", "Sprint"],
                  ["SPACE", "Jump"],
                  ["C / CTRL", "Slide — needs speed, chain into jumps"],
                  ["R", "Reload"],
                  ["G", "Throw frag grenade"],
                  ["1", "Weapon 1 — MK-7 AR"],
                  ["2", "Weapon 2 — VK-9 SMG"],
                  ["3", "Weapon 3 — BR-12 Shotgun"],
                  ["4", "Weapon 4 — L96 Sniper"],
                  ["5", "Weapon 5 — M249 SAW LMG (100-round belt)"],
                  ["F", "Deploy sentry turret — auto-fires for 45s"],
                  ["X", "Call airstrike on your aim point (earn 1 per 25 kills)"],
                  ["6", "Weapon 6 — Stinger: RMB aim at drones/gunship to lock, then fire"],
                  ["H", "Deploy health bag — stand in its green ring to heal"],
                  ["ESC", "Release the mouse"],
                  ["CLICK", "Choose a perk card between waves"],
                ].map(([k, action]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="shrink-0 bg-white/10 border border-white/25 rounded px-1.5 py-0.5 font-mono font-bold text-[11px] text-white">{k}</span>
                    <span className="text-xs text-white/75 leading-tight">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded p-4 text-left mb-6">
              <div className="font-bold text-orange-400 text-xs tracking-widest mb-2">🎯 HOW TO PLAY</div>
              <ul className="text-xs text-white/75 space-y-1.5 leading-relaxed">
                <li>• Clear every hostile to finish a wave — then <b className="text-white">click 1 of 3 perk cards</b> to upgrade before the next wave.</li>
                <li>• 🛡️ <b className="text-white">Waves 4 &amp; 8 — Defend the Zone:</b> stand inside the glowing ring until the 60-second timer finishes.</li>
                <li>• 📦 A <b className="text-white">supply drop</b> lands every wave — run to the crate for a medkit, ammo, grenades or Overdrive (double damage).</li>
                <li>• 💥 <b className="text-white">Red barrels explode</b> — shoot them near groups. Watch for Exploders (glowing chest) and drones in the sky from wave 5.</li>
                <li>• 🎯 <b className="text-white">Marksmen</b> (wave 6+) paint you with a <b className="text-red-400">red laser</b> — break line of sight before they fire. 🤖 Deploy your <b className="text-white">sentry (F)</b> to hold ground, and spend <b className="text-white">airstrikes (X)</b> on crowds.</li>
                <li>• 🚁 <b className="text-white">The GUNSHIP</b> replaces the Juggernaut on alternating boss waves — it circles overhead, strafes, and drops <b className="text-white">rocket salvos</b> (run from the red circles!). Counter it with the <b className="text-white">Stinger (6)</b>: aim to lock, then fire. 🌧️ Some waves hit a <b className="text-white">storm front</b> — rain, fog, short sightlines.</li>
                <li>• ☠️ <b className="text-white">Wave 10 — the Juggernaut.</b> Beat him to win, then choose <b className="text-white">∞ Endless</b> to see how far you get. Health slowly regenerates if you avoid fire.</li>
              </ul>
            </div>
          </>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={start}
            className="pointer-events-auto bg-orange-600 hover:bg-orange-500 active:scale-95 transition text-2xl font-black tracking-widest px-14 py-4 rounded shadow-[0_0_40px_rgba(255,100,0,0.4)]"
          >
            {phase === "menu" ? "▶ DEPLOY" : "↻ REDEPLOY"}
          </button>
          {isVictory && (
            <button
              onClick={continueEndless}
              className="pointer-events-auto bg-cyan-700 hover:bg-cyan-600 active:scale-95 transition text-2xl font-black tracking-widest px-10 py-4 rounded shadow-[0_0_40px_rgba(0,180,255,0.35)]"
            >
              ∞ ENDLESS
            </button>
          )}
        </div>
        {isVictory && <div className="mt-2 text-xs text-white/40">ENDLESS: waves keep scaling past 10 — how far can you get?</div>}

        {phase === "menu" && (
          <div className="mt-6 text-left bg-white/5 border border-white/10 rounded p-4">
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-black tracking-widest text-sm">RANK: <span className="text-cyan-300">{rank.current}</span></div>
              <div className="text-xs text-white/50">{xp} XP{rank.next ? ` · next: ${rank.next} at ${rank.nextXp}` : " · MAX RANK"}{bestEndlessWave > 0 ? ` · best endless wave ${bestEndlessWave}` : ""}</div>
            </div>
            <div className="h-2 bg-white/10 rounded overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </div>
            <div className="font-bold text-orange-400 text-xs tracking-widest mb-2">ACHIEVEMENTS — {achievements.length}/8</div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ACH_DEFS) as AchId[]).map((id) => {
                const d = ACH_DEFS[id];
                const got = achievements.includes(id);
                return (
                  <div key={id} className={`rounded p-2 border ${got ? "bg-yellow-500/10 border-yellow-400/40" : "bg-black/30 border-white/5 opacity-45"}`} title={d.desc}>
                    <div className="text-lg leading-none mb-1">{d.icon}</div>
                    <div className="text-[10px] font-black tracking-wide leading-tight">{d.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-white/40">Click locks your mouse for aiming · ESC to pause/unlock</div>

        <ClickToLockHelper />
      </div>
    </div>
  );
}

function ClickToLockHelper() {
  return null;
}

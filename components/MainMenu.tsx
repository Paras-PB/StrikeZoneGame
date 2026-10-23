"use client";
import { useState } from "react";
import { useGameStore, ACH_DEFS, rankFor } from "@/lib/store";
import type { AchId } from "@/lib/store";
import SettingsPanel from "./SettingsPanel";

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
  // menu panels live behind the icon toolbar — main menu shows only maps + PLAY
  const [panel, setPanel] = useState<"keys" | "howto" | "settings" | "achievements" | null>(null);
  const togglePanel = (id: "keys" | "howto" | "settings" | "achievements") => setPanel((cur) => (cur === id ? null : id));

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
    <div className="menu-bg holo-scroll absolute inset-0 z-10 flex justify-center overflow-y-auto font-ui">
      {/* readability overlay above the photo, below the content — retinted navy/cyan for V8 */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#020b14]/85 via-[#03141f]/65 to-[#010608]/92 pointer-events-none" />
      <div className="holo-scanlines fixed inset-0 z-[1] pointer-events-none" />
      <div className="relative z-[2] max-w-3xl w-full mx-4 my-auto py-6 text-center [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]">
        <div className="anim-fade-up text-cyan-400 font-display font-semibold tracking-[0.45em] text-sm mb-2" style={{ textShadow: "0 0 14px rgba(34,211,238,0.6)" }}>TACTICAL COMBAT SIMULATOR</div>
        <h1 className="anim-fade-up font-display text-7xl font-extrabold tracking-tight leading-none mb-1" style={{ animationDelay: "60ms" }}>
          STRIKE<span className="text-cyan-400" style={{ textShadow: "0 0 26px rgba(34,211,238,0.75), 0 0 60px rgba(34,211,238,0.35)" }}>ZONE</span>
        </h1>
        <p className="anim-fade-up text-cyan-100/60 mb-6 text-sm tracking-wide" style={{ animationDelay: "120ms" }}>
          {isDead
            ? `KIA — Wave ${wave} · ${kills} kills · ${score} pts · survived ${Math.floor(timeSurvived)}s`
            : isVictory
            ? `MISSION COMPLETE — ${kills} kills · ${score} pts · ${Math.floor(timeSurvived)}s`
            : "V3 AIRBORNE — drones in the sky, zones to defend, supply drops, grenades, a sniper, and a Juggernaut at the end. Survive."}
        </p>

        {(isDead || isVictory) && (
          <div className={`inline-block px-4 py-1 font-display font-bold tracking-widest text-sm mb-4 ${isVictory ? "bg-green-600" : "bg-red-700"}`}>
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
              <div key={k} className="holo-panel p-3">
                <div className="text-[10px] tracking-[0.25em] text-cyan-400/60 font-bold">{k}</div>
                <div className="font-display text-2xl font-extrabold text-cyan-50">{v}</div>
              </div>
            ))}
          </div>
        )}
        {(isDead || isVictory) && lastRunXp > 0 && (
          <div className="mb-4 text-sm text-cyan-100/70">
            <span className="text-cyan-300 font-display font-bold">+{lastRunXp} XP</span> · Rank: <b className="text-cyan-50">{rank.current}</b>
            {endless && <> · Endless wave {wave} · Best endless wave {Math.max(bestEndlessWave, wave)}</>}
          </div>
        )}
        {newBest && (isDead || isVictory) && (
          <div className="mb-4 text-cyan-200 font-display font-bold tracking-[0.3em] text-sm animate-pulse" style={{ textShadow: "0 0 16px rgba(34,211,238,0.7)" }}>★ NEW BEST SCORE ★</div>
        )}
        {phase === "menu" && bestScore > 0 && (
          <div className="mb-4 text-cyan-300/80 font-bold tracking-[0.25em] text-xs">BEST SCORE: {bestScore}</div>
        )}

        {phase === "menu" && (
          <div className="anim-fade-up grid grid-cols-3 gap-3 mb-3 text-left" style={{ animationDelay: "160ms" }}>
            <button
              onClick={() => setStore({ mapId: "arena" })}
              className={`holo-panel holo-hoverable pointer-events-auto p-4 active:scale-95 ${mapId === "arena" ? "holo-corners holo-selected" : ""}`}
            >
              <div className="font-display font-bold tracking-widest text-sm text-cyan-50">🏙️ BERMUDA TOWN</div>
              <div className="text-cyan-100/55 text-xs mt-1">A Free Fire-style town — climbable clock tower, a factory, houses and a container yard.</div>
              {mapId === "arena" && <div className="text-cyan-300 text-[10px] font-black tracking-widest mt-2">● SELECTED</div>}
            </button>
            <button
              onClick={() => setStore({ mapId: "forest" })}
              className={`holo-panel holo-hoverable pointer-events-auto p-4 active:scale-95 ${mapId === "forest" ? "holo-corners holo-selected" : ""}`}
            >
              <div className="font-display font-bold tracking-widest text-sm text-cyan-50">🌲 FOREST OUTPOST</div>
              <div className="text-cyan-100/55 text-xs mt-1">Big leafy trees, log cabins and a watchtower at dawn. Cover everywhere.</div>
              {mapId === "forest" && <div className="text-cyan-300 text-[10px] font-black tracking-widest mt-2">● SELECTED</div>}
            </button>
            <button
              onClick={() => setStore({ mapId: "autumn" })}
              className={`holo-panel holo-hoverable pointer-events-auto p-4 active:scale-95 ${mapId === "autumn" ? "holo-corners holo-selected" : ""}`}
            >
              <div className="font-display font-bold tracking-widest text-sm text-cyan-50">🍂 AUTUMN RIDGE <span className="text-cyan-300 text-[10px] align-middle">NEW · V6</span></div>
              <div className="text-cyan-100/55 text-xs mt-1">Golden trees at sunset, leaves in the air — and things hiding between them.</div>
              {mapId === "autumn" && <div className="text-cyan-300 text-[10px] font-black tracking-widest mt-2">● SELECTED</div>}
            </button>
          </div>
        )}


        {phase === "menu" && (
          <>
            {panel === "keys" && (
            <div className="holo-panel anim-fade-up p-4 text-left mb-3" style={{ animationDelay: "200ms" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="font-display font-bold text-cyan-300 text-xs tracking-widest">⌨️ KEY GUIDE — EVERY CONTROL</div>
                <button onClick={() => setPanel(null)} className="holo-btn-ghost pointer-events-auto px-2 py-0.5 text-xs font-bold" aria-label="Close key guide">✕</button>
              </div>
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
                  ["ESC", "Pause — opens the pause menu (resume / settings / restart / quit)"],
                  ["CLICK", "Choose a perk card between waves"],
                ].map(([k, action]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="holo-keycap shrink-0">{k}</span>
                    <span className="text-[13px] text-cyan-100/70 leading-tight">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            )}
            {panel === "howto" && (
            <div className="holo-panel anim-fade-up p-4 text-left mb-6" style={{ animationDelay: "240ms" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="font-display font-bold text-cyan-300 text-xs tracking-widest">🎯 HOW TO PLAY</div>
                <button onClick={() => setPanel(null)} className="holo-btn-ghost pointer-events-auto px-2 py-0.5 text-xs font-bold" aria-label="Close how to play">✕</button>
              </div>
              <ul className="text-[13px] text-cyan-100/70 space-y-1.5 leading-relaxed">
                <li>• Clear every hostile to finish a wave — then <b className="text-cyan-50">click 1 of 3 perk cards</b> to upgrade before the next wave.</li>
                <li>• 🛡️ <b className="text-cyan-50">Waves 4 &amp; 8 — Defend the Zone:</b> stand inside the glowing ring until the 60-second timer finishes.</li>
                <li>• 📦 A <b className="text-cyan-50">supply drop</b> lands every wave — run to the crate for a medkit, ammo, grenades or Overdrive (double damage).</li>
                <li>• 💥 <b className="text-cyan-50">Red barrels explode</b> — shoot them near groups. Watch for Exploders (glowing chest) and drones in the sky from wave 5.</li>
                <li>• 🎯 <b className="text-cyan-50">Marksmen</b> (wave 6+) paint you with a <b className="text-red-400">red laser</b> — break line of sight before they fire. 🤖 Deploy your <b className="text-cyan-50">sentry (F)</b> to hold ground, and spend <b className="text-cyan-50">airstrikes (X)</b> on crowds.</li>
                <li>• 🚁 <b className="text-cyan-50">The GUNSHIP</b> replaces the Juggernaut on alternating boss waves — it circles overhead, strafes, and drops <b className="text-cyan-50">rocket salvos</b> (run from the red circles!). Counter it with the <b className="text-cyan-50">Stinger (6)</b>: aim to lock, then fire. 🌧️ Some waves hit a <b className="text-cyan-50">storm front</b> — rain, fog, short sightlines.</li>
                <li>• 🥷 <b className="text-cyan-50">In the woods</b> (wave 7+), watch for <b className="text-cyan-50">Stalkers</b> — ghillie ambushers, near-invisible while still, flickering on the minimap. Get close or wing one and he rushes you. 🍂 <b className="text-cyan-50">Autumn Ridge</b> is the woods at sunset.</li>
                <li>• ☠️ <b className="text-cyan-50">Wave 10 — the Juggernaut.</b> Beat him to win, then choose <b className="text-cyan-50">∞ Endless</b> to see how far you get. Health slowly regenerates if you avoid fire.</li>
              </ul>
            </div>
            )}
          </>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={start}
            className="holo-btn pointer-events-auto text-2xl font-extrabold tracking-widest px-14 py-4"
          >
            {phase === "menu" ? "▶ PLAY" : "↻ REPLAY"}
          </button>
          {isVictory && (
            <button
              onClick={continueEndless}
              className="holo-btn-ghost pointer-events-auto text-2xl font-extrabold tracking-widest px-10 py-4 shadow-[0_0_40px_rgba(34,211,238,0.3)]"
            >
              ∞ ENDLESS
            </button>
          )}
        </div>
        {isVictory && <div className="mt-2 text-xs text-cyan-100/40">ENDLESS: waves keep scaling past 10 — how far can you get?</div>}

        {phase === "menu" && (
          <div className="anim-fade-up flex gap-2 justify-center mt-5" style={{ animationDelay: "260ms" }}>
            {(
              [
                ["keys", "⌨️", "KEYS"],
                ["howto", "🎯", "GUIDE"],
                ["settings", "⚙️", "SETTINGS"],
                ["achievements", "🏆", "TROPHIES"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => togglePanel(id)}
                className={`pointer-events-auto px-4 py-2.5 font-display font-bold tracking-widest text-xs active:scale-95 ${panel === id ? "holo-btn" : "holo-btn-ghost"}`}
              >
                <span className="text-base mr-1.5">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        {phase === "menu" && panel === "settings" && (
          <div className="holo-panel anim-fade-up mt-6 text-left p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="font-display font-bold text-cyan-300 text-xs tracking-widest">⚙️ SETTINGS</div>
              <button onClick={() => setPanel(null)} className="holo-btn-ghost pointer-events-auto px-2 py-0.5 text-xs font-bold" aria-label="Close settings">✕</button>
            </div>
            <SettingsPanel />
          </div>
        )}

        {phase === "menu" && panel === "achievements" && (
          <div className="holo-panel anim-fade-up mt-6 text-left p-4">
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-display font-bold tracking-widest text-sm text-cyan-50">RANK: <span className="text-cyan-300">{rank.current}</span></div>
              <button onClick={() => setPanel(null)} className="holo-btn-ghost pointer-events-auto px-2 py-0.5 text-xs font-bold self-center" aria-label="Close achievements">✕</button>
              <div className="text-xs text-cyan-100/50">{xp} XP{rank.next ? ` · next: ${rank.next} at ${rank.nextXp}` : " · MAX RANK"}{bestEndlessWave > 0 ? ` · best endless wave ${bestEndlessWave}` : ""}</div>
            </div>
            <div className="h-2 bg-cyan-950/80 border border-cyan-400/20 overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </div>
            <div className="font-display font-bold text-cyan-300 text-xs tracking-widest mb-2">ACHIEVEMENTS — {achievements.length}/{Object.keys(ACH_DEFS).length}</div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ACH_DEFS) as AchId[]).map((id) => {
                const d = ACH_DEFS[id];
                const got = achievements.includes(id);
                return (
                  <div key={id} className={`p-2 border ${got ? "bg-cyan-400/10 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.2)]" : "bg-black/30 border-cyan-400/10 opacity-45"}`} title={d.desc}>
                    <div className="text-lg leading-none mb-1">{d.icon}</div>
                    <div className="text-[10px] font-black tracking-wide leading-tight">{d.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-cyan-100/40">Click locks your mouse for aiming · ESC to pause/unlock</div>

        <ClickToLockHelper />
      </div>
    </div>
  );
}

function ClickToLockHelper() {
  return null;
}

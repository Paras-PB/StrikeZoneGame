"use client";
import { useGameStore, PERK_DEFS } from "@/lib/store";
import type { PerkId } from "@/lib/store";
import { sfxPerk } from "@/lib/audio";

/** Between-wave upgrade draft: pick 1 of 3, the run keeps every perk. */
export default function PerkDraft() {
  const wave = useGameStore((s) => s.wave);
  const choices = useGameStore((s) => s.perkChoices);
  const perksOwned = useGameStore((s) => s.perksOwned);
  const score = useGameStore((s) => s.score);

  const choose = (id: PerkId) => {
    const s = useGameStore.getState();
    const next = { ...s } as typeof s;
    switch (id) {
      case "damage":
        next.damageMult = s.damageMult * 1.25;
        break;
      case "speed":
        next.moveMult = s.moveMult * 1.12;
        break;
      case "reload":
        next.reloadMult = s.reloadMult * 0.8;
        break;
      case "vitality":
        next.maxHealth = s.maxHealth + 25;
        next.health = Math.min(s.maxHealth + 25, s.health + 25);
        break;
      case "ammo":
        next.ammo = {
          ar: { mag: 30, reserve: Math.min(300, s.ammo.ar.reserve + 90) },
          smg: { mag: 40, reserve: Math.min(360, s.ammo.smg.reserve + 120) },
          sg: { mag: 6, reserve: Math.min(60, s.ammo.sg.reserve + 18) },
          sn: { mag: 5, reserve: Math.min(48, s.ammo.sn.reserve + 10) },
          stinger: { mag: 1, reserve: Math.min(12, s.ammo.stinger.reserve + 3) },
          saw: { mag: 100, reserve: Math.min(400, s.ammo.saw.reserve + 150) },
        };
        break;
      case "regen":
        next.regenMult = s.regenMult * 1.7;
        break;
    }
    s.set({
      damageMult: next.damageMult,
      moveMult: next.moveMult,
      reloadMult: next.reloadMult,
      regenMult: next.regenMult,
      maxHealth: next.maxHealth,
      health: next.health,
      ammo: next.ammo,
      perksOwned: [...s.perksOwned, PERK_DEFS[id].name],
      perkChoices: [],
      phase: "playing",
      pendingWave: s.wave + 1,
    });
    sfxPerk();
    // re-lock the pointer from this click gesture
    setTimeout(() => {
      document.querySelector("canvas")?.requestPointerLock?.();
    }, 30);
  };

  if (choices.length === 0) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#010a12]/80 backdrop-blur-[2px] font-ui">
      <div className="max-w-3xl w-full mx-4 text-center">
        <div className="anim-fade-up text-cyan-300 font-display font-semibold tracking-[0.35em] text-sm mb-1" style={{ textShadow: "0 0 14px rgba(34,211,238,0.55)" }}>WAVE {wave} CLEARED · +250 PTS</div>
        <h2 className="anim-fade-up font-display text-4xl font-extrabold tracking-tight mb-1" style={{ animationDelay: "60ms" }}>
          CHOOSE AN <span className="text-cyan-400" style={{ textShadow: "0 0 20px rgba(34,211,238,0.65)" }}>UPGRADE</span>
        </h2>
        <p className="text-cyan-100/50 text-sm mb-6">Score {score} · perks stack for the rest of the run · Wave {wave + 1} starts on pick{wave + 1 === 10 ? " — the JUGGERNAUT waits" : wave + 1 === 8 || (wave + 1) % 7 === 4 ? " — defend the zone" : (wave + 1) % 3 === 0 ? " — night ops" : ""}</p>

        <div className="grid grid-cols-3 gap-3 text-left">
          {choices.map((id) => {
            const d = PERK_DEFS[id];
            return (
              <button
                key={id}
                onClick={() => choose(id)}
                className="holo-panel holo-corners holo-hoverable anim-fade-up pointer-events-auto p-5 active:scale-95 text-left"
              >
                <div className="text-3xl mb-2">{d.icon}</div>
                <div className="font-display font-bold tracking-wide text-sm mb-1 text-cyan-50">{d.name}</div>
                <div className="text-cyan-100/60 text-[13px] leading-relaxed">{d.desc}</div>
              </button>
            );
          })}
        </div>

        {perksOwned.length > 0 && (
          <div className="mt-5 text-[11px] tracking-widest text-cyan-100/40">
            ACTIVE PERKS: {perksOwned.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

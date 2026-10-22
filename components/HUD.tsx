"use client";
import { useGameStore, WEAPONS } from "@/lib/store";
import type { WeaponId } from "@/lib/store";
import dynamic from "next/dynamic";
const Minimap = dynamic(() => import("./Minimap"), { ssr: false });
const LockIndicator = dynamic(() => import("./LockIndicator"), { ssr: false });

const WEAPON_SLOTS: { id: WeaponId; key: string; label: string }[] = [
  { id: "ar", key: "1", label: "AR" },
  { id: "smg", key: "2", label: "SMG" },
  { id: "sg", key: "3", label: "SG" },
  { id: "sn", key: "4", label: "SNIPER" },
  { id: "saw", key: "5", label: "SAW" },
  { id: "stinger", key: "6", label: "STINGER" },
];

export default function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const ammo = useGameStore((s) => s.ammo);
  const active = useGameStore((s) => s.activeWeapon);
  const reloading = useGameStore((s) => s.reloading);
  const ads = useGameStore((s) => s.ads);
  const kills = useGameStore((s) => s.kills);
  const score = useGameStore((s) => s.score);
  const wave = useGameStore((s) => s.wave);
  const enemiesLeft = useGameStore((s) => s.enemiesLeft);
  const hitmarker = useGameStore((s) => s.hitmarker);
  const hitmarkerKill = useGameStore((s) => s.hitmarkerKill);
  const killfeed = useGameStore((s) => s.killfeed);
  const damageFlash = useGameStore((s) => s.damageFlash);
  const sprinting = useGameStore((s) => s.sprinting);
  const sliding = useGameStore((s) => s.sliding);
  const combo = useGameStore((s) => s.combo);
  const lastKillAt = useGameStore((s) => s.lastKillAt);
  const lastHitDmg = useGameStore((s) => s.lastHitDmg);
  const lastHitAt = useGameStore((s) => s.lastHitAt);
  const bossHealth = useGameStore((s) => s.bossHealth);
  const bossMax = useGameStore((s) => s.bossMax);
  const grenades = useGameStore((s) => s.grenades);
  const turrets = useGameStore((s) => s.turrets);
  const airstrikes = useGameStore((s) => s.airstrikes);
  const mapId = useGameStore((s) => s.mapId);
  const healthBags = useGameStore((s) => s.healthBags);
  const healingAura = useGameStore((s) => s.healingAura);
  const objective = useGameStore((s) => s.objective);
  const objectiveTimeLeft = useGameStore((s) => s.objectiveTimeLeft);
  const playerInZone = useGameStore((s) => s.playerInZone);
  const overdriveUntil = useGameStore((s) => s.overdriveUntil);
  const achToast = useGameStore((s) => s.achToast);
  const bossEnraged = useGameStore((s) => s.bossEnraged);
  const bossKind = useGameStore((s) => s.bossKind);
  const storm = useGameStore((s) => s.storm);
  const night = wave > 0 && wave % 3 === 0;
  const overdrive = Date.now() < overdriveUntil;
  const scoped = ads && active === "sn";
  const comboLive = combo >= 2 && Date.now() - lastKillAt < 3500;
  const bossPct = bossMax > 0 ? Math.max(0, (bossHealth / bossMax) * 100) : 0;

  const w = WEAPONS[active];
  const a = ammo[active];
  const hpPct = Math.max(0, (health / maxHealth) * 100);
  const lowAmmo = a.mag > 0 && a.mag <= Math.ceil(w.mag * 0.25);
  const outOfAmmo = a.mag === 0;

  // segmented health: one segment per 10 HP
  const segTotal = Math.max(1, Math.ceil(maxHealth / 10));
  const segFilled = Math.max(health > 0 ? 1 : 0, Math.min(segTotal, Math.ceil(health / 10)));
  const segColor =
    hpPct > 35
      ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.55)]"
      : hpPct > 20
        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";

  const abilities = [
    { k: "G", label: "FRAG", n: grenades, activeCls: "text-cyan-100" },
    { k: "F", label: "SENTRY", n: turrets, activeCls: "text-cyan-300" },
    { k: "X", label: "AIRSTRIKE", n: airstrikes, activeCls: "text-red-300 animate-pulse" },
    { k: "H", label: "MEDKIT", n: healthBags, activeCls: "text-green-300" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-ui">
      {/* damage vignette */}
      <div
        key={damageFlash}
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(200,0,0,0.55) 100%)",
          opacity: damageFlash ? 1 : 0,
          transition: "opacity 0.6s",
        }}
      />
      {/* low hp vignette — steady amber-red under 35%, heartbeat under 20% */}
      {hpPct < 35 && hpPct >= 20 && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(180,0,0,0.5) 100%)" }}
        />
      )}
      {hpPct < 20 && (
        <div
          className="absolute inset-0 anim-heartbeat"
          style={{ background: "radial-gradient(ellipse at center, transparent 48%, rgba(190,0,0,0.62) 100%)" }}
        />
      )}
      {/* ADS vignette */}
      {ads && <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />}

      {/* crosshair */}
      {!ads && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-10 h-10">
            <div className="absolute left-1/2 top-1/2 w-[4px] h-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 crosshair-dot" />
            <div className={`absolute left-1/2 top-[2px] w-[2px] h-[9px] -translate-x-1/2 bg-cyan-200/90 ${sprinting ? "opacity-40" : ""}`} />
            <div className="absolute left-1/2 bottom-[2px] w-[2px] h-[9px] -translate-x-1/2 bg-cyan-200/90" />
            <div className="absolute top-1/2 left-[2px] h-[2px] w-[9px] -translate-y-1/2 bg-cyan-200/90" />
            <div className="absolute top-1/2 right-[2px] h-[2px] w-[9px] -translate-y-1/2 bg-cyan-200/90" />
          </div>
        </div>
      )}
      {ads && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-[6px] h-[6px] rounded-full border border-cyan-200 bg-red-500/80" />
        </div>
      )}

      {/* hitmarker */}
      {Date.now() - hitmarker < 300 && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`hitmarker-anim w-8 h-8 ${hitmarkerKill ? "text-red-500" : "text-cyan-300"}`}>
            <svg viewBox="0 0 32 32" className="w-full h-full">
              <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="6" y1="6" x2="12" y2="12" />
                <line x1="26" y1="6" x2="20" y2="12" />
                <line x1="6" y1="26" x2="12" y2="20" />
                <line x1="26" y1="26" x2="20" y2="20" />
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* top stats bar (below the compass) */}
      <div className="holo-panel holo-corners absolute top-[64px] left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-2">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-cyan-400 font-bold">WAVE</div>
          <div className="font-display text-2xl font-extrabold leading-none text-cyan-50">{wave || "—"}</div>
          <div className="text-[9px] tracking-[0.2em] text-cyan-100/45 font-bold mt-0.5">{mapId === "forest" ? "🌲 FOREST" : mapId === "autumn" ? "🍂 AUTUMN" : "🏭 ARENA"}</div>
        </div>
        <div className="w-px h-8 bg-cyan-400/20" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-red-400 font-bold">HOSTILES</div>
          <div className="font-display text-2xl font-extrabold leading-none text-cyan-50">{enemiesLeft}</div>
        </div>
        <div className="w-px h-8 bg-cyan-400/20" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-cyan-400/70 font-bold">KILLS</div>
          <div className="font-display text-2xl font-extrabold leading-none text-cyan-50">{kills}</div>
        </div>
        <div className="w-px h-8 bg-cyan-400/20" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-cyan-300 font-bold">SCORE</div>
          <div className="font-display text-2xl font-extrabold leading-none text-cyan-50">{score}</div>
        </div>
      </div>

      {/* boss health bar */}
      {bossMax > 0 && bossHealth > 0 && (
        <div className="absolute top-[128px] left-1/2 -translate-x-1/2 w-[420px] max-w-[70vw]">
          <div className="flex justify-between font-display text-[10px] font-bold tracking-[0.3em] text-red-400 mb-1">
            <span>{bossKind === "gunship" ? `🚁 GUNSHIP${bossEnraged ? " — WEAPONS FREE" : ""}` : `☠ JUGGERNAUT${bossEnraged ? " — ENRAGED" : ""}`}</span>
            <span>{bossHealth}</span>
          </div>
          <div className="h-3.5 bg-[#03111c]/85 overflow-hidden border border-cyan-400/40 shadow-[0_0_16px_rgba(8,145,178,0.25)]">
            <div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 transition-all" style={{ width: `${bossPct}%` }} />
          </div>
        </div>
      )}

      {/* combo + environment badges */}
      <div className="absolute top-[198px] left-4 flex flex-col gap-1.5 items-start">
        {comboLive && (
          <div className={`holo-chip px-3 py-1 font-display font-bold tracking-widest text-sm text-cyan-200 ${combo >= 4 ? "anim-pulse-glow" : ""}`}>
            COMBO ×{Math.min(combo, 5)} — {combo} CHAIN
          </div>
        )}
        {night && <div className="holo-chip px-3 py-1 text-xs font-bold tracking-widest text-cyan-200">🌙 NIGHT OPS</div>}
        {storm && <div className="holo-chip px-3 py-1 text-xs font-bold tracking-widest text-sky-200">🌧️ STORM FRONT</div>}
      </div>

      {/* floating damage number */}
      {lastHitDmg > 0 && Date.now() - lastHitAt < 350 && (
        <div className="absolute left-1/2 top-[56%] -translate-x-1/2 font-display text-cyan-100 font-extrabold text-lg" style={{ textShadow: "0 0 10px rgba(34,211,238,0.8), 0 0 4px rgba(0,0,0,0.9)" }}>
          -{lastHitDmg}
        </div>
      )}

      {/* sniper scope overlay */}
      {scoped && (
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 30vh, rgba(0,0,0,0.97) 31vh)" }}>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/70 -translate-x-1/2" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-black/70 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vh] h-[60vh] rounded-full border-2 border-black/60" />
          <div className="absolute left-1/2 top-[58%] -translate-x-1/2 text-black/60 text-xs font-bold tracking-widest">L96 · 8×</div>
        </div>
      )}

      {/* objective banner */}
      {objective === "defend" && (
        <div className="absolute top-[168px] left-1/2 -translate-x-1/2 text-center">
          <div
            className={`holo-panel inline-block px-5 py-2 font-display font-bold tracking-[0.25em] ${playerInZone ? "text-green-300" : "text-red-300 animate-pulse"}`}
            style={{ borderColor: playerInZone ? "rgba(74,222,128,0.6)" : "rgba(248,113,113,0.6)" }}
          >
            🛡️ DEFEND THE ZONE — {Math.ceil(objectiveTimeLeft)}s {playerInZone ? "" : "· GET IN THE ZONE!"}
          </div>
        </div>
      )}

      {/* overdrive + achievement toast */}
      <div className="absolute top-[168px] right-4 flex flex-col gap-1.5 items-end">
        {overdrive && <div className="holo-chip anim-pulse-glow px-3 py-1 font-display font-bold tracking-widest text-xs text-cyan-200">⚡ OVERDRIVE — 2× DAMAGE</div>}
        {achToast && Date.now() - achToast.at < 4200 && (
          <div className="bg-cyan-400 text-[#02141f] px-3 py-1.5 font-display font-extrabold tracking-wide text-xs shadow-[0_0_24px_rgba(34,211,238,0.55)]">
            {achToast.icon} ACHIEVEMENT — {achToast.name}
          </div>
        )}
      </div>

      {/* killfeed */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
        {killfeed.map((k) => (
          <div key={k.id} className="holo-chip border-l-2 border-l-cyan-400 px-3 py-1 text-xs font-semibold text-cyan-50">
            {k.text}
          </div>
        ))}
      </div>

      {/* bottom left: segmented health */}
      <div className="holo-panel holo-corners absolute bottom-6 left-6 w-80 px-4 py-3">
        <div className="flex justify-between items-baseline text-[11px] font-bold tracking-widest text-cyan-100/70 mb-1.5">
          <span>
            HEALTH
            {healingAura ? <span className="text-green-300"> · ✚ HEALING</span> : sliding ? <span className="text-cyan-300"> · SLIDING</span> : sprinting ? <span className="text-cyan-300"> · SPRINTING</span> : ""}
          </span>
          <span className={`font-display text-lg leading-none ${hpPct <= 20 ? "text-red-400" : hpPct <= 35 ? "text-amber-300" : "text-cyan-50"}`}>
            {Math.ceil(health)}
            <span className="text-[10px] text-cyan-100/40"> / {maxHealth}</span>
          </span>
        </div>
        <div className={`flex gap-[3px] ${hpPct <= 20 ? "animate-pulse" : ""}`}>
          {Array.from({ length: segTotal }, (_, i) => (
            <div
              key={i}
              className={`h-3 flex-1 -skew-x-[16deg] transition-all duration-200 ${i < segFilled ? segColor : "bg-cyan-400/10"}`}
            />
          ))}
        </div>
      </div>

      {/* bottom right: ammo + weapons + abilities */}
      <div className="holo-panel holo-corners absolute bottom-6 right-6 px-4 py-3 text-right">
        <div className="font-display text-[11px] tracking-[0.25em] text-cyan-300 font-bold">
          {w.name}
          {reloading && <span className="text-amber-300 animate-pulse"> · RELOADING</span>}
          {!reloading && outOfAmmo && <span className="text-red-400 animate-pulse"> · NO AMMO — R</span>}
          {!reloading && lowAmmo && <span className="text-amber-300 animate-pulse"> · LOW AMMO</span>}
        </div>
        <div
          className={`font-display font-extrabold text-6xl leading-none ${outOfAmmo ? "text-red-400" : lowAmmo ? "text-amber-300" : "text-cyan-50"}`}
          style={{ textShadow: "0 0 22px rgba(34,211,238,0.35)" }}
        >
          {a.mag}
          <span className="text-2xl text-cyan-200/45"> / {a.reserve}</span>
        </div>
        <div className="mt-2 flex gap-1 justify-end">
          {WEAPON_SLOTS.map((s) => (
            <span
              key={s.id}
              className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wider border ${
                active === s.id
                  ? "border-cyan-300 bg-cyan-400/15 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                  : "border-cyan-400/15 text-cyan-100/40"
              }`}
            >
              {s.key} {s.label}
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 justify-end">
          {abilities.map((ab) => (
            <span
              key={ab.k}
              className={`holo-chip flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold ${ab.n > 0 ? ab.activeCls : "opacity-40 text-cyan-100/50"}`}
            >
              <span className="holo-keycap">{ab.k}</span>
              {ab.label}
              <span className="font-display">×{ab.n}</span>
            </span>
          ))}
          {overdrive && <span className="holo-chip px-2 py-1 text-[11px] font-bold text-cyan-200 anim-pulse-glow">⚡2× DMG</span>}
        </div>
      </div>

      <Minimap />
      {active === "stinger" && <LockIndicator ads={ads} />}

      {/* click to re-lock */}
      <LockHint />
    </div>
  );
}

function LockHint() {
  return (
    <div
      id="lock-hint"
      className="holo-chip absolute left-1/2 top-[62%] -translate-x-1/2 text-xs font-bold tracking-widest text-cyan-100 px-3 py-1 hidden"
    >
      CLICK TO LOCK AIM
    </div>
  );
}

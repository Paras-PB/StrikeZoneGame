"use client";
import { useGameStore, WEAPONS } from "@/lib/store";

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
  const objective = useGameStore((s) => s.objective);
  const objectiveTimeLeft = useGameStore((s) => s.objectiveTimeLeft);
  const playerInZone = useGameStore((s) => s.playerInZone);
  const overdriveUntil = useGameStore((s) => s.overdriveUntil);
  const achToast = useGameStore((s) => s.achToast);
  const bossEnraged = useGameStore((s) => s.bossEnraged);
  const night = wave > 0 && wave % 3 === 0;
  const overdrive = Date.now() < overdriveUntil;
  const scoped = ads && active === "sn";
  const comboLive = combo >= 2 && Date.now() - lastKillAt < 3500;
  const bossPct = bossMax > 0 ? Math.max(0, (bossHealth / bossMax) * 100) : 0;

  const w = WEAPONS[active];
  const a = ammo[active];
  const hpPct = Math.max(0, (health / maxHealth) * 100);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
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
      {/* low hp pulse */}
      {hpPct < 35 && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(180,0,0,0.5) 100%)" }}
        />
      )}
      {/* ADS vignette */}
      {ads && <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />}

      {/* crosshair */}
      {!ads && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-10 h-10">
            <div className="absolute left-1/2 top-1/2 w-[4px] h-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white crosshair-dot" />
            <div className={`absolute left-1/2 top-[2px] w-[2px] h-[9px] -translate-x-1/2 bg-white/90 ${sprinting ? "opacity-40" : ""}`} />
            <div className="absolute left-1/2 bottom-[2px] w-[2px] h-[9px] -translate-x-1/2 bg-white/90" />
            <div className="absolute top-1/2 left-[2px] h-[2px] w-[9px] -translate-y-1/2 bg-white/90" />
            <div className="absolute top-1/2 right-[2px] h-[2px] w-[9px] -translate-y-1/2 bg-white/90" />
          </div>
        </div>
      )}
      {ads && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-[6px] h-[6px] rounded-full border border-white/80 bg-red-500/80" />
        </div>
      )}

      {/* hitmarker */}
      {Date.now() - hitmarker < 300 && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`hitmarker-anim w-8 h-8 ${hitmarkerKill ? "text-red-500" : "text-white"}`}>
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

      {/* top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/50 backdrop-blur px-6 py-2 rounded border border-white/10">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-orange-400 font-bold">WAVE</div>
          <div className="text-2xl font-black leading-none">{wave || "—"}</div>
          <div className="text-[9px] tracking-[0.2em] text-white/45 font-bold mt-0.5">{mapId === "forest" ? "🌲 FOREST" : "🏭 ARENA"}</div>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-red-400 font-bold">HOSTILES</div>
          <div className="text-2xl font-black leading-none">{enemiesLeft}</div>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-white/60 font-bold">KILLS</div>
          <div className="text-2xl font-black leading-none">{kills}</div>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-yellow-400 font-bold">SCORE</div>
          <div className="text-2xl font-black leading-none">{score}</div>
        </div>
      </div>

      {/* boss health bar */}
      {bossMax > 0 && bossHealth > 0 && (
        <div className="absolute top-[74px] left-1/2 -translate-x-1/2 w-[420px] max-w-[70vw]">
          <div className="flex justify-between text-[10px] font-black tracking-[0.3em] text-red-400 mb-1">
            <span>☠ JUGGERNAUT{bossEnraged ? " — ENRAGED" : ""}</span>
            <span>{bossHealth}</span>
          </div>
          <div className="h-3 bg-white/10 rounded overflow-hidden border border-red-500/40">
            <div className="h-full bg-gradient-to-r from-red-800 via-red-600 to-orange-500 transition-all" style={{ width: `${bossPct}%` }} />
          </div>
        </div>
      )}

      {/* combo + night badges */}
      <div className="absolute top-[74px] left-4 flex flex-col gap-1 items-start">
        {comboLive && (
          <div className="bg-orange-600/80 px-3 py-1 rounded font-black tracking-widest text-sm animate-pulse">
            COMBO ×{Math.min(combo, 5)} — {combo} CHAIN
          </div>
        )}
        {night && <div className="bg-indigo-950/80 border border-indigo-400/30 px-3 py-1 rounded text-xs font-bold tracking-widest">🌙 NIGHT OPS</div>}
      </div>

      {/* floating damage number */}
      {lastHitDmg > 0 && Date.now() - lastHitAt < 350 && (
        <div className="absolute left-1/2 top-[56%] -translate-x-1/2 text-yellow-300 font-black text-lg" style={{ textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>
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
        <div className="absolute top-[118px] left-1/2 -translate-x-1/2 text-center">
          <div className={`inline-block px-5 py-2 rounded font-black tracking-[0.25em] border ${playerInZone ? "bg-green-950/70 border-green-400/50 text-green-300" : "bg-red-950/70 border-red-400/50 text-red-300 animate-pulse"}`}>
            🛡️ DEFEND THE ZONE — {Math.ceil(objectiveTimeLeft)}s {playerInZone ? "" : "· GET IN THE ZONE!"}
          </div>
        </div>
      )}

      {/* overdrive + achievement toast */}
      <div className="absolute top-[118px] right-4 flex flex-col gap-1 items-end">
        {overdrive && <div className="bg-amber-600/85 px-3 py-1 rounded font-black tracking-widest text-xs animate-pulse">⚡ OVERDRIVE — 2× DAMAGE</div>}
        {achToast && Date.now() - achToast.at < 4200 && (
          <div className="bg-yellow-500/90 text-black px-3 py-1 rounded font-black tracking-wide text-xs">
            {achToast.icon} ACHIEVEMENT — {achToast.name}
          </div>
        )}
      </div>

      {/* killfeed */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
        {killfeed.map((k) => (
          <div key={k.id} className="bg-black/60 border-l-2 border-orange-500 px-3 py-1 text-xs font-semibold rounded">
            {k.text}
          </div>
        ))}
      </div>

      {/* bottom left: health */}
      <div className="absolute bottom-6 left-6 w-72">
        <div className="flex justify-between text-[11px] font-bold tracking-widest text-white/70 mb-1">
          <span>HEALTH {sliding ? "· SLIDING" : sprinting ? "· SPRINTING" : ""}</span>
          <span>{Math.ceil(health)}</span>
        </div>
        <div className="h-3 bg-white/10 rounded overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all ${hpPct > 60 ? "bg-gradient-to-r from-green-500 to-lime-400" : hpPct > 30 ? "bg-gradient-to-r from-yellow-500 to-orange-400" : "bg-gradient-to-r from-red-600 to-red-400"}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {/* bottom right: ammo */}
      <div className="absolute bottom-6 right-6 text-right">
        <div className="text-[11px] tracking-[0.2em] text-orange-400 font-bold">{w.name} {reloading && <span className="text-yellow-300 animate-pulse">· RELOADING</span>}</div>
        <div className="font-black text-5xl leading-none">
          {a.mag}<span className="text-xl text-white/50"> / {a.reserve}</span>
        </div>
        <div className="mt-1 text-[11px] text-white/60">
          <span className={active === "ar" ? "text-white font-bold border border-white/30 rounded px-1" : "px-1"}>1 AR</span>{" "}
          <span className={active === "smg" ? "text-white font-bold border border-white/30 rounded px-1" : "px-1"}>2 SMG</span>{" "}
          <span className={active === "sg" ? "text-white font-bold border border-white/30 rounded px-1" : "px-1"}>3 SG</span>{" "}
          <span className={active === "sn" ? "text-white font-bold border border-white/30 rounded px-1" : "px-1"}>4 SNIPER</span>{" "}
          <span className={active === "saw" ? "text-white font-bold border border-white/30 rounded px-1" : "px-1"}>5 SAW</span>
        </div>
        <div className="mt-1 text-[11px] text-white/60">
          <span className={grenades > 0 ? "text-orange-300 font-bold" : ""}>G FRAG ×{grenades}</span>
          {" · "}
          <span className={turrets > 0 ? "text-cyan-300 font-bold" : ""}>🤖 F SENTRY ×{turrets}</span>
          {" · "}
          <span className={airstrikes > 0 ? "text-red-300 font-bold animate-pulse" : ""}>✈ X AIRSTRIKE ×{airstrikes}</span>
          {overdrive && <span className="text-amber-300 font-bold"> · ⚡2× DMG</span>}
        </div>
      </div>

      {/* click to re-lock */}
      <LockHint />
    </div>
  );
}

function LockHint() {
  return (
    <div
      id="lock-hint"
      className="absolute left-1/2 top-[62%] -translate-x-1/2 text-xs bg-black/60 px-3 py-1 rounded border border-white/10 hidden"
    >
      CLICK TO LOCK AIM
    </div>
  );
}

"use client";
import { useGameStore } from "@/lib/store";

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
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-black/80 via-black/60 to-black/85 backdrop-blur-[2px]">
      <div className="max-w-2xl w-full mx-4 text-center">
        <div className="text-orange-500 font-black tracking-[0.4em] text-sm mb-2">TACTICAL COMBAT SIMULATOR</div>
        <h1 className="text-7xl font-black tracking-tighter leading-none mb-1">
          STRIKE<span className="text-orange-500">ZONE</span>
        </h1>
        <p className="text-white/60 mb-6 text-sm tracking-wide">
          {isDead
            ? `KIA — Wave ${wave} · ${kills} kills · ${score} pts · survived ${Math.floor(timeSurvived)}s`
            : isVictory
            ? `MISSION COMPLETE — ${kills} kills · ${score} pts · ${Math.floor(timeSurvived)}s`
            : "10 waves. Runners, heavies, exploders — and a Juggernaut at the end. Shoot the red barrels. Earn a perk every wave. Survive."}
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
        {newBest && (isDead || isVictory) && (
          <div className="mb-4 text-yellow-300 font-black tracking-[0.3em] text-sm animate-pulse">★ NEW BEST SCORE ★</div>
        )}
        {phase === "menu" && bestScore > 0 && (
          <div className="mb-4 text-yellow-300/80 font-bold tracking-[0.25em] text-xs">BEST SCORE: {bestScore}</div>
        )}

        <div className="grid grid-cols-2 gap-3 text-left mb-6">
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="font-bold text-orange-400 text-xs tracking-widest mb-2">MOVEMENT — COD FAST</div>
            <ul className="text-sm text-white/80 space-y-1">
              <li><b>WASD</b> move · <b>SHIFT</b> sprint</li>
              <li><b>SPACE</b> jump · <b>C / CTRL</b> slide</li>
              <li>Slide needs momentum — chain it into jumps</li>
            </ul>
          </div>
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="font-bold text-orange-400 text-xs tracking-widest mb-2">COMBAT</div>
            <ul className="text-sm text-white/80 space-y-1">
              <li><b>LMB</b> fire · <b>RMB</b> aim (ADS)</li>
              <li><b>R</b> reload · <b>1 / 2 / 3</b> AR / SMG / Shotgun</li>
              <li>Headshots ×2 · red barrels explode · perks every wave</li>
            </ul>
          </div>
        </div>

        <button
          onClick={start}
          className="pointer-events-auto bg-orange-600 hover:bg-orange-500 active:scale-95 transition text-2xl font-black tracking-widest px-14 py-4 rounded shadow-[0_0_40px_rgba(255,100,0,0.4)]"
        >
          {phase === "menu" ? "▶ DEPLOY" : "↻ REDEPLOY"}
        </button>
        <div className="mt-3 text-xs text-white/40">Click locks your mouse for aiming · ESC to pause/unlock</div>

        <ClickToLockHelper />
      </div>
    </div>
  );
}

function ClickToLockHelper() {
  return null;
}

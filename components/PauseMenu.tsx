"use client";
import { useState } from "react";
import { useGameStore } from "@/lib/store";
import SettingsPanel from "./SettingsPanel";

/**
 * V7 pause menu — shown when pointer lock is released mid-run (Esc).
 * Resume re-locks the pointer from the click gesture (PerkDraft pattern);
 * Restart and Quit reuse the exact flows the menu uses: startGame() for a
 * fresh run, and phase "menu" (the engine clears bots/player from there).
 */
export default function PauseMenu() {
  const wave = useGameStore((s) => s.wave);
  const score = useGameStore((s) => s.score);
  const kills = useGameStore((s) => s.kills);
  const [showSettings, setShowSettings] = useState(false);

  const relock = () => {
    setTimeout(() => {
      try {
        const p = document.querySelector("canvas")?.requestPointerLock?.() as unknown as
          | Promise<void>
          | undefined;
        p?.catch?.(() => {
          /* Chrome cooldown after Esc — page.tsx click-to-lock covers it */
        });
      } catch {
        /* same — the next canvas click re-locks */
      }
    }, 30);
  };

  const resume = () => {
    useGameStore.getState().set({ phase: "playing" });
    relock();
  };

  const restart = () => {
    useGameStore.getState().startGame();
    relock();
  };

  const quitToMenu = () => {
    useGameStore.getState().set({ phase: "menu" });
  };

  const btn =
    "pointer-events-auto w-full py-3 font-display font-bold tracking-[0.25em] text-sm";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#010a12]/80 backdrop-blur-[2px] font-ui">
      <div className="holo-panel holo-corners anim-fade-up max-w-md w-full mx-4 text-center px-6 py-6">
        <div className="text-cyan-400 font-display font-semibold tracking-[0.45em] text-xs mb-1">GAME PAUSED</div>
        <h2 className="font-display text-5xl font-extrabold tracking-tight mb-2">
          PAUS<span className="text-cyan-400" style={{ textShadow: "0 0 22px rgba(34,211,238,0.7)" }}>ED</span>
        </h2>
        <p className="text-cyan-100/60 text-sm mb-6 tracking-wide">
          Wave {wave} · {kills} kills · {score} pts — everything is frozen where you left it.
        </p>

        {showSettings ? (
          <div className="holo-panel p-4 text-left mb-4">
            <div className="font-display font-bold text-cyan-300 text-xs tracking-widest mb-3">⚙️ SETTINGS</div>
            <SettingsPanel />
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <button
              onClick={resume}
              className={`${btn} holo-btn`}
            >
              ▶ RESUME
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`${btn} holo-btn-ghost`}
            >
              ⚙️ SETTINGS
            </button>
            <button onClick={restart} className={`${btn} holo-btn-ghost`}>
              ↻ RESTART RUN
            </button>
            <button
              onClick={quitToMenu}
              className={`${btn} holo-btn-ghost hover:!border-red-400/70 hover:!bg-red-500/10`}
            >
              ✕ QUIT TO MENU
            </button>
          </div>
        )}

        {showSettings && (
          <button onClick={() => setShowSettings(false)} className={`${btn} holo-btn`}>
            ← BACK
          </button>
        )}
        <div className="mt-3 text-xs text-cyan-100/40">If the mouse doesn't re-lock on resume, click the game once.</div>
      </div>
    </div>
  );
}

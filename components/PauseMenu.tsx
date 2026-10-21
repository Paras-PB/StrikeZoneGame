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
    "pointer-events-auto w-full py-3 rounded border font-black tracking-[0.25em] text-sm transition active:scale-95";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="text-orange-500 font-black tracking-[0.4em] text-xs mb-1">GAME PAUSED</div>
        <h2 className="text-5xl font-black tracking-tighter mb-2">
          PAUS<span className="text-orange-500">ED</span>
        </h2>
        <p className="text-white/60 text-sm mb-6 tracking-wide">
          Wave {wave} · {kills} kills · {score} pts — everything is frozen where you left it.
        </p>

        {showSettings ? (
          <div className="bg-white/5 border border-white/10 rounded p-4 text-left mb-4">
            <div className="font-bold text-orange-400 text-xs tracking-widest mb-3">⚙️ SETTINGS</div>
            <SettingsPanel />
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <button
              onClick={resume}
              className={`${btn} bg-orange-600 hover:bg-orange-500 border-orange-500 shadow-[0_0_30px_rgba(255,100,0,0.35)]`}
            >
              ▶ RESUME
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`${btn} bg-white/5 hover:bg-white/10 border-white/15 text-white/85`}
            >
              ⚙️ SETTINGS
            </button>
            <button onClick={restart} className={`${btn} bg-white/5 hover:bg-white/10 border-white/15 text-white/85`}>
              ↻ RESTART RUN
            </button>
            <button
              onClick={quitToMenu}
              className={`${btn} bg-white/5 hover:bg-red-900/40 border-white/15 hover:border-red-500/50 text-white/85`}
            >
              ✕ QUIT TO MENU
            </button>
          </div>
        )}

        {showSettings && (
          <button onClick={() => setShowSettings(false)} className={`${btn} bg-orange-600 hover:bg-orange-500 border-orange-500`}>
            ← BACK
          </button>
        )}
        <div className="mt-3 text-xs text-white/40">If the mouse doesn't re-lock on resume, click the game once.</div>
      </div>
    </div>
  );
}

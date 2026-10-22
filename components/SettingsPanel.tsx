"use client";
import { useGameStore } from "@/lib/store";

/**
 * V7 settings controls — shared by the main menu and the pause menu.
 * Everything writes through the store's setSettings, which persists to
 * localStorage and applies the volume to the audio master gain immediately.
 */
export default function SettingsPanel() {
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);

  const label = "text-[10px] font-black tracking-[0.25em] text-cyan-100/50";
  const value = "font-display text-sm font-bold text-cyan-300 w-14 text-right";

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className={label}>MOUSE SENSITIVITY</span>
          <span className={value}>×{settings.sensitivity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.3}
          max={2.5}
          step={0.05}
          value={settings.sensitivity}
          onChange={(e) => setSettings({ sensitivity: Number(e.target.value) })}
          className="holo-range w-full pointer-events-auto"
        />
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className={label}>MASTER VOLUME</span>
          <span className={value}>{settings.volume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={settings.volume}
          onChange={(e) => setSettings({ volume: Number(e.target.value) })}
          className="holo-range w-full pointer-events-auto"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={label}>INVERT Y (MOUSE)</span>
        <button
          onClick={() => setSettings({ invertY: !settings.invertY })}
          className={`pointer-events-auto px-4 py-1.5 border font-display font-bold tracking-widest text-xs transition active:scale-95 ${
            settings.invertY
              ? "bg-cyan-400/20 border-cyan-400 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.3)]"
              : "bg-cyan-950/40 border-cyan-400/20 text-cyan-100/50 hover:border-cyan-400/50"
          }`}
        >
          {settings.invertY ? "ON" : "OFF"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className={label}>QUALITY</span>
        <div className="flex gap-2">
          {(["high", "low"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setSettings({ quality: q })}
              className={`pointer-events-auto px-4 py-1.5 border font-display font-bold tracking-widest text-xs transition active:scale-95 ${
                settings.quality === q
                  ? "bg-cyan-400/20 border-cyan-400 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.3)]"
                  : "bg-cyan-950/40 border-cyan-400/20 text-cyan-100/50 hover:border-cyan-400/50"
              }`}
            >
              {q.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-cyan-100/40 leading-relaxed">
        Low quality turns shadows off and caps resolution — same as the <span className="font-mono">?lowfx</span> mode.
        Settings save automatically.
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/store";
import { enemyRegistry, playerState, barrelRegistry, turretState, airstrikeState, FOREST_TREES, FOREST_CABINS } from "@/lib/game";

const MM_SIZE = 148;
const MM_WORLD = 120; // world spans -60..60

/** Live tactical minimap: red dots for hostiles (moving in real time), white arrow for the player. */
export default function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useGameStore((s) => s.phase);
  const mapId = useGameStore((s) => s.mapId);

  useEffect(() => {
    if (phase !== "playing") return;
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    let raf = 0;
    const px = (x: number) => ((x + 60) / MM_WORLD) * MM_SIZE;
    const pz = (z: number) => ((z + 60) / MM_WORLD) * MM_SIZE;
    const dot = (x: number, z: number, r: number, color: string) => {
      g.beginPath();
      g.arc(px(x), pz(z), r, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const s = useGameStore.getState();
      g.clearRect(0, 0, MM_SIZE, MM_SIZE);
      g.fillStyle = mapId === "forest" ? "rgba(22,32,19,0.85)" : "rgba(29,27,21,0.85)";
      g.fillRect(0, 0, MM_SIZE, MM_SIZE);

      // static cover
      if (mapId === "forest") {
        g.fillStyle = "rgba(96,138,84,0.55)";
        for (const t of FOREST_TREES) {
          g.beginPath();
          g.arc(px(t.x), pz(t.z), 1.7, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "rgba(158,116,72,0.9)";
        for (const c of FOREST_CABINS) g.fillRect(px(c.x) - 4, pz(c.z) - 3, 8, 6);
        g.fillStyle = "rgba(140,140,132,0.8)";
        g.fillRect(px(24) - 3, pz(-26) - 3, 6, 6); // watchtower
      } else {
        g.fillStyle = "rgba(165,165,158,0.5)";
        const blocks: [number, number, number, number][] = [
          [-28, -20, 18, 12],
          [28, 22, 18, 12],
          [-30, 26, 10, 14],
          [-8, -8, 6.2, 2.5],
          [10, 4, 2.5, 6.2],
          [10, -14, 6.2, 2.5],
          [-18, 8, 6.2, 2.5],
          [22, -6, 6.2, 2.5],
          [2, 24, 6.2, 2.5],
        ];
        for (const [x, z, w, d] of blocks) g.fillRect(px(x - w / 2), pz(z - d / 2), (w / MM_WORLD) * MM_SIZE, (d / MM_WORLD) * MM_SIZE);
      }

      // defend zone ring
      if (s.objective === "defend") {
        g.beginPath();
        g.arc(px(s.zoneX), pz(s.zoneZ), (6 / MM_WORLD) * MM_SIZE, 0, Math.PI * 2);
        g.strokeStyle = s.playerInZone ? "#3dff7a" : "#ff4040";
        g.lineWidth = 1.6;
        g.stroke();
      }

      // explosive barrels
      for (const b of barrelRegistry.values()) if (b.alive) dot(b.pos.x, b.pos.z, 1.8, "#ff8c1a");

      // airstrike target (flashing)
      if (airstrikeState && Math.floor(performance.now() / 180) % 2 === 0) {
        g.beginPath();
        g.arc(px(airstrikeState.x), pz(airstrikeState.z), (6.4 / MM_WORLD) * MM_SIZE, 0, Math.PI * 2);
        g.strokeStyle = "#ff3030";
        g.lineWidth = 2;
        g.stroke();
      }

      // sentry turret
      if (turretState) dot(turretState.pos.x, turretState.pos.z, 2.6, "#39d0ff");

      // hostiles — red dots, live positions
      for (const e of enemyRegistry.values()) {
        if (!e.alive) continue;
        if (e.kind === "boss" || e.kind === "gunship") {
          dot(e.pos.x, e.pos.z, 4.6, "#ff2ad4");
          g.beginPath();
          g.arc(px(e.pos.x), pz(e.pos.z), 6, 0, Math.PI * 2);
          g.strokeStyle = "rgba(255,255,255,0.8)";
          g.lineWidth = 1;
          g.stroke();
        } else if (e.kind === "marksman") {
          dot(e.pos.x, e.pos.z, 3, "#ff7a1c");
        } else if (e.kind === "drone") {
          dot(e.pos.x, e.pos.z, 2.2, "#ff2a2a");
        } else {
          dot(e.pos.x, e.pos.z, 3, "#ff2a2a");
        }
      }

      // player arrow (rotates with view)
      const x = px(playerState.pos.x);
      const y = pz(playerState.pos.z);
      const fx = -Math.sin(playerState.yaw);
      const fz = -Math.cos(playerState.yaw);
      g.save();
      g.translate(x, y);
      g.rotate(Math.atan2(fz, fx));
      g.beginPath();
      g.moveTo(6, 0);
      g.lineTo(-4.5, 4);
      g.lineTo(-4.5, -4);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.strokeStyle = "#ff7a1a";
      g.lineWidth = 1.4;
      g.stroke();
      g.restore();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [phase, mapId]);

  if (phase !== "playing") return null;

  return (
    <div className="absolute top-4 left-4">
      <canvas ref={ref} width={MM_SIZE} height={MM_SIZE} className="rounded border border-white/25 shadow-lg block" />
      <div className="mt-1 flex justify-between text-[9px] font-bold tracking-[0.16em] text-white/65 w-[148px]">
        <span>🗺️ TACTICAL MAP</span>
        <span>
          <span className="text-red-400">●</span> HOSTILE · <span className="text-white">▲</span> YOU
        </span>
      </div>
    </div>
  );
}

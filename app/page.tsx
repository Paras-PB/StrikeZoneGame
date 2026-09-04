"use client";
import dynamic from "next/dynamic";
import MainMenu from "@/components/MainMenu";
import HUD from "@/components/HUD";
import { useGameStore } from "@/lib/store";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), { ssr: false });

export default function Page() {
  const phase = useGameStore((s) => s.phase);
  const onClick = () => {
    if (phase === "playing" && !document.pointerLockElement) {
      document.querySelector("canvas")?.requestPointerLock?.();
    }
  };
  return (
    <main onClick={onClick} className="relative w-screen h-screen overflow-hidden bg-black text-white">
      <GameCanvas />
      {(phase === "menu" || phase === "dead" || phase === "victory") && <MainMenu />}
      {(phase === "playing" || phase === "dead") && <HUD />}
      <div className="absolute bottom-2 right-3 text-[11px] text-white/40 pointer-events-none">
        WASD move · SHIFT sprint · SPACE jump · C slide · RMB aim · LMB shoot · R reload · 1/2 weapons
      </div>
    </main>
  );
}

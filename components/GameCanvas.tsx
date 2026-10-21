"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import World from "./World";
import Player from "./Player";
import Enemies from "./Enemies";
import Effects from "./Effects";
import Barrels from "./Barrels";
import Zone from "./Zone";
import Grenades from "./Grenades";
import SupplyDrop from "./SupplyDrop";
import Turret from "./Turret";
import Airstrike from "./Airstrike";
import { playerState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

type GpuStatus = { checked: boolean; ok: boolean; software: boolean; detail: string };

function checkWebGL(): GpuStatus {
  try {
    const c = document.createElement("canvas");
    const gl =
      (c.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null) ||
      (c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null) ||
      (c.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return { checked: true, ok: false, software: false, detail: "no-context" };
    let renderer = "";
    try {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    } catch {
      renderer = "";
    }
    const software = /swiftshader|basic render|llvmpipe|software|angle \(google/i.test(renderer);
    return { checked: true, ok: true, software, detail: renderer };
  } catch {
    return { checked: true, ok: false, software: false, detail: "exception" };
  }
}

function ResetOnStart() {
  const phase = useGameStore((s) => s.phase);
  if (phase === "menu") {
    playerState.pos.set(0, 0, 14);
    playerState.yaw = Math.PI;
    playerState.pitch = 0;
  }
  return null;
}

export default function GameCanvas() {
  const [gpu, setGpu] = useState<GpuStatus>({ checked: false, ok: true, software: false, detail: "" });

  useEffect(() => {
    setGpu(checkWebGL());
  }, []);

  if (gpu.checked && !gpu.ok) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0d12] p-6 text-center">
        <div className="max-w-lg">
          <div className="text-red-400 font-black tracking-widest text-sm mb-2">WEBGL UNAVAILABLE</div>
          <h2 className="text-2xl font-black mb-3">Your browser blocked the 3D context</h2>
          <p className="text-white/70 text-sm mb-4">
            Three.js could not create a WebGL context (ANGLE / driver exhausted). This is a browser/GPU setting, not a game bug.
          </p>
          <ol className="text-left text-sm text-white/80 space-y-2 bg-white/5 border border-white/10 rounded p-4 mb-4">
            <li>1. Use <b>Chrome</b> or <b>Edge</b> (not an RDP/minimized window) and open <b>http://localhost:3000</b> — never file://.</li>
            <li>2. Enable <b>Settings → System → Use hardware acceleration</b>, then relaunch the browser.</li>
            <li>3. Update your GPU driver, close other 3D tabs, check <b>chrome://gpu</b> shows WebGL enabled.</li>
            <li>4. No GPU? Launch Chrome with software GL: <b>chrome.exe --use-angle=swiftshader --enable-unsafe-swiftshader</b></li>
          </ol>
          <button
            onClick={() => setGpu(checkWebGL())}
            className="bg-orange-600 hover:bg-orange-500 font-bold px-6 py-2 rounded"
          >
            ↻ RETRY 3D
          </button>
        </div>
      </div>
    );
  }

  const lowSpec = gpu.checked && (gpu.software || new URLSearchParams(window.location.search).has("lowfx"));

  return (
    <div className="absolute inset-0">
      {lowSpec && (
        <div className="absolute top-2 left-2 z-20 text-[11px] bg-black/60 border border-white/10 rounded px-2 py-1 text-white/70 pointer-events-none">
          Software rendering — LOW FX mode (shadows off)
        </div>
      )}
      <Canvas
        shadows={!lowSpec}
        dpr={lowSpec ? [1, 1] : [1, 1.5]}
        camera={{ fov: 82, near: 0.05, far: 600, position: [0, 1.65, 14] }}
        gl={{
          antialias: !lowSpec,
          powerPreference: lowSpec ? "low-power" : "high-performance",
          failIfMajorPerformanceCaveat: false,
          stencil: false,
          depth: true,
          alpha: false,
        }}
      >
        <Suspense fallback={null}>
          <ResetOnStart />
          <World />
          <Barrels />
          <Zone />
          <SupplyDrop />
          <Player />
          <Grenades />
          <Turret />
          <Airstrike />
          <Enemies />
          <Effects />
        </Suspense>
      </Canvas>
    </div>
  );
}

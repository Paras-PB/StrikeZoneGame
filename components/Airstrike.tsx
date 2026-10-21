"use client";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { airstrikeState, clearAirstrike, explodeAt, timeState } from "@/lib/game";
import type { AirstrikeState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

const BOMBS = 6;
const MARK_MS = 900;

/**
 * Airstrike (V4): called with X on the player's aim point. A red target ring
 * marks the zone for ~0.9s, then 6 shells land over ~1.6s. Kills credited
 * flat +100 like grenades.
 */
export default function Airstrike() {
  const [strike, setStrike] = useState<{ x: number; z: number; at: number } | null>(null);
  const progress = useRef({ at: 0, bombs: 0, nextAt: 0 });
  const ring = useRef<THREE.Mesh>(null);
  // the strike object we're tracking — identity, not timestamp, because the
  // pause freeze below legitimately shifts startedAt forward (V7)
  const srcRef = useRef<AirstrikeState | null>(null);
  const lastTick = useRef(0);

  useFrame((state) => {
    void state;
    void timeState;
    const as = airstrikeState;
    const nowReal = performance.now();
    const prevTick = lastTick.current;
    lastTick.current = nowReal;

    if (useGameStore.getState().phase === "paused") {
      // freeze the schedule: push the strike clock forward with real time so
      // no bombs land (and none are skipped) while the pause menu is up
      const d = prevTick ? nowReal - prevTick : 0;
      if (d > 0 && as) {
        as.startedAt += d;
        progress.current.at += d;
        progress.current.nextAt += d;
      }
      return;
    }

    if (!as) srcRef.current = null;
    if (as && srcRef.current !== as) {
      srcRef.current = as;
      setStrike({ x: as.x, z: as.z, at: as.startedAt });
      progress.current = { at: as.startedAt, bombs: 0, nextAt: as.startedAt + MARK_MS };
    }
    if (!strike) return;
    const now = performance.now();
    const p = progress.current;

    if (ring.current) {
      const pulse = 1 + Math.sin(now * 0.02) * 0.05;
      ring.current.scale.set(pulse, pulse, 1);
    }

    if (p.bombs < BOMBS && now >= p.nextAt) {
      p.bombs += 1;
      p.nextAt = now + 260;
      const ox = (Math.random() - 0.5) * 9;
      const oz = (Math.random() - 0.5) * 9;
      const killed = explodeAt(new THREE.Vector3(strike.x + ox, 0.6, strike.z + oz), 4.6, 120, 10);
      if (killed.length > 0) {
        const st = useGameStore.getState();
        st.set({ kills: st.kills + killed.length, score: st.score + killed.length * 100 });
        for (const k of killed) {
          if (k.kind === "boss") st.unlockAch("bossslayer");
          st.addKillfeed("✈ AIRSTRIKE KILL +100");
        }
      }
    }
    if (p.bombs >= BOMBS && now > p.nextAt + 350) {
      clearAirstrike();
      setStrike(null);
    }
  });

  if (!strike) return null;

  return (
    <group position={[strike.x, 0, strike.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[5.9, 6.6, 40]} />
        <meshBasicMaterial color="#ff3030" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[5.9, 40]} />
        <meshBasicMaterial color="#ff3030" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 15, 0]}>
        <cylinderGeometry args={[6.2, 6.2, 30, 40, 1, true]} />
        <meshBasicMaterial color="#ff3030" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.3, 0.5, 20]} />
        <meshBasicMaterial color="#ff3030" transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

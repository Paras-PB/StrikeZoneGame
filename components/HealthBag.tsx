"use client";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { bagState, clearBag, playerState, timeState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

const RADIUS = 3.6;
const HEAL_RATE = 15; // hp per second inside the ring

/**
 * Deployable health bag (H): a first-aid station that heals the player
 * 15 HP/s while they stand within its green ring. Lasts 12 seconds.
 */
export default function HealthBag() {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0]);
  const ring = useRef<THREE.Mesh>(null);
  const inAura = useRef(false);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05) * timeState.scale;
    const st = useGameStore.getState();
    const bs = bagState;

    if (bs && performance.now() > bs.until) {
      clearBag();
      st.addKillfeed("✚ HEALTH BAG DEPLETED");
      if (inAura.current) {
        inAura.current = false;
        st.set({ healingAura: false });
      }
    }
    const nowActive = !!bagState;
    if (nowActive !== active) {
      setActive(nowActive);
      if (bagState) setPos([bagState.pos.x, 0, bagState.pos.z]);
    }
    if (!bagState) return;

    // pulse the ring
    if (ring.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.03;
      ring.current.scale.set(s, s, 1);
    }

    // heal while the player stands in the ring
    const d = Math.hypot(playerState.pos.x - bagState.pos.x, playerState.pos.z - bagState.pos.z);
    const inside = d < RADIUS && st.phase === "playing";
    if (inside !== inAura.current) {
      inAura.current = inside;
      st.set({ healingAura: inside });
    }
    if (inside && st.health > 0 && st.health < st.maxHealth) {
      st.set({ health: Math.min(st.maxHealth, st.health + HEAL_RATE * dt) });
    }
  });

  if (!active) return null;

  return (
    <group position={pos}>
      {/* healing radius ring */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[RADIUS - 0.35, RADIUS, 40]} />
        <meshBasicMaterial color="#3dff7a" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[RADIUS - 0.35, 40]} />
        <meshBasicMaterial color="#3dff7a" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {/* the bag: white aid case with red cross */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[0.72, 0.44, 0.5]} />
        <meshStandardMaterial color="#e8e8e4" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.34, 0.03, 0.12]} />
        <meshStandardMaterial color="#d42a2a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.34]} />
        <meshStandardMaterial color="#d42a2a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.24, 0.26]}>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
        <meshStandardMaterial color="#d42a2a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.24, 0.26]}>
        <boxGeometry args={[0.1, 0.3, 0.02]} />
        <meshStandardMaterial color="#d42a2a" roughness={0.5} />
      </mesh>
      {/* handle */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.08]} />
        <meshStandardMaterial color="#8a8a84" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* soft green beacon */}
      <pointLight position={[0, 0.9, 0]} intensity={5} distance={6} color="#3dff7a" />
    </group>
  );
}

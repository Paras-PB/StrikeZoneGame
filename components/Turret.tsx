"use client";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { turretState, clearTurret, enemyRegistry, pushTracer, hitProfile, timeState } from "@/lib/game";
import type { EnemyEntry } from "@/lib/game";
import { useGameStore } from "@/lib/store";
import { sfxEnemyShoot } from "@/lib/audio";

/**
 * Deployable sentry turret (V4): placed with F, lives 45s, auto-fires at the
 * nearest hostile within 34m. Kills are credited flat +100 like grenades.
 */
export default function Turret() {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0]);
  const head = useRef<THREE.Group>(null);
  const cd = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05) * timeState.scale;
    const ts = turretState;
    const st = useGameStore.getState();

    if (ts && performance.now() > ts.until) {
      clearTurret();
      st.addKillfeed("🤖 SENTRY OFFLINE");
    }
    const nowActive = !!turretState;
    if (nowActive !== active) {
      setActive(nowActive);
      if (turretState) setPos([turretState.pos.x, 0, turretState.pos.z]);
    }
    if (!turretState || st.phase !== "playing") return;

    // nearest live hostile
    let best: EnemyEntry | null = null;
    let bestD = 34;
    for (const e of enemyRegistry.values()) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - turretState.pos.x, e.pos.z - turretState.pos.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (head.current && best) {
      head.current.rotation.y = Math.atan2(best.pos.x - turretState.pos.x, best.pos.z - turretState.pos.z) + Math.PI;
    }
    if (!best) return;

    cd.current -= dt;
    if (cd.current > 0) return;
    cd.current = 0.45;
    const prof = hitProfile(best.kind);
    const from = new THREE.Vector3(turretState.pos.x, 1.15, turretState.pos.z);
    const to = new THREE.Vector3(best.pos.x, best.pos.y + prof.chestY, best.pos.z);
    pushTracer(from, to, false);
    sfxEnemyShoot();
    best.health -= 13;
    if (best.health <= 0 && best.alive) {
      best.alive = false;
      const s2 = useGameStore.getState();
      s2.set({ kills: s2.kills + 1, score: s2.score + 100 });
      if (best.kind === "boss") s2.unlockAch("bossslayer");
      s2.addKillfeed("🤖 SENTRY KILL +100");
    }
  });

  if (!active) return null;

  return (
    <group position={pos}>
      {/* base + tripod */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.52, 0.62, 0.16, 12]} />
        <meshStandardMaterial color="#2b2f34" roughness={0.6} metalness={0.5} />
      </mesh>
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.42, 0.28, Math.cos(a) * 0.42]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}>
          <boxGeometry args={[0.09, 0.62, 0.09]} />
          <meshStandardMaterial color="#1c1f23" roughness={0.7} metalness={0.4} />
        </mesh>
      ))}
      {/* pole */}
      <mesh castShadow position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.7, 10]} />
        <meshStandardMaterial color="#3a3f45" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* rotating head: housing, barrel, sensor eye */}
      <group ref={head} position={[0, 1.12, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.46, 0.3, 0.58]} />
          <meshStandardMaterial color="#4a4234" roughness={0.55} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0.02, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.45, 8]} />
          <meshStandardMaterial color="#101216" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.2, -0.1]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color="#39d0ff" emissive="#39d0ff" emissiveIntensity={2.2} />
        </mesh>
        <mesh position={[0.24, 0, 0.1]}>
          <boxGeometry args={[0.04, 0.12, 0.3]} />
          <meshStandardMaterial color="#d8452c" emissive="#d8452c" emissiveIntensity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

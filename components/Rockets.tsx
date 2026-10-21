"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { liveRockets, rocketMarks, explodeAt, enemyRegistry, hitProfile, colliders, timeState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

const MAX_ROCKETS = 8;
const MAX_MARKS = 8;

/**
 * Stinger rockets + gunship salvo telegraphs.
 * Rockets fly physical paths, steer toward their locked target, and detonate
 * via the shared explosion system. Kills credited flat +100 like grenades.
 */
export default function Rockets() {
  const rockets = useRef<(THREE.Group | null)[]>([]);
  const marks = useRef<(THREE.Group | null)[]>([]);
  const tmp = useRef({ desired: new THREE.Vector3(), targetPos: new THREE.Vector3() });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05) * timeState.scale;

    for (let i = liveRockets.length - 1; i >= 0; i--) {
      const r = liveRockets[i];
      r.life -= dt;
      // homing steer
      if (r.targetId !== null) {
        const e = enemyRegistry.get(r.targetId);
        if (e && e.alive) {
          const prof = hitProfile(e.kind);
          tmp.current.targetPos.set(e.pos.x, e.pos.y + prof.chestY, e.pos.z);
          tmp.current.desired.copy(tmp.current.targetPos).sub(r.pos).normalize().multiplyScalar(r.vel.length());
          r.vel.lerp(tmp.current.desired, Math.min(1, dt * 5.5));
        } else {
          r.targetId = null;
        }
      }
      r.pos.addScaledVector(r.vel, dt);

      // impact checks: ground, colliders, proximity to any live enemy
      let boom = r.life <= 0 || r.pos.y <= 0.25;
      if (!boom) {
        for (const c of colliders) {
          if (r.pos.x > c.min.x && r.pos.x < c.max.x && r.pos.y > c.min.y && r.pos.y < c.max.y && r.pos.z > c.min.z && r.pos.z < c.max.z) {
            boom = true;
            break;
          }
        }
      }
      if (!boom) {
        for (const e of enemyRegistry.values()) {
          if (!e.alive) continue;
          const prof = hitProfile(e.kind);
          const dx = e.pos.x - r.pos.x;
          const dy = e.pos.y + prof.chestY - r.pos.y;
          const dz = e.pos.z - r.pos.z;
          const rr = prof.chestR + 1.1;
          if (dx * dx + dy * dy + dz * dz < rr * rr) {
            boom = true;
            break;
          }
        }
      }
      if (boom) {
        liveRockets.splice(i, 1);
        const killed = explodeAt(r.pos.clone(), 5.6, 340, 16);
        if (killed.length > 0) {
          const st = useGameStore.getState();
          st.set({ kills: st.kills + killed.length, score: st.score + killed.length * 100 });
          for (const k of killed) {
            if (k.kind === "boss") st.unlockAch("bossslayer");
            if (k.kind === "gunship") st.unlockAch("skyfall");
            st.addKillfeed("🚀 STINGER KILL +100");
          }
        }
      }
    }

    // sync rocket meshes (orient along velocity)
    for (let i = 0; i < MAX_ROCKETS; i++) {
      const grp = rockets.current[i];
      if (!grp) continue;
      const r = liveRockets[i];
      grp.visible = !!r;
      if (r) {
        grp.position.copy(r.pos);
        tmp.current.targetPos.copy(r.pos).add(r.vel);
        grp.lookAt(tmp.current.targetPos);
      }
    }
    // sync telegraph rings
    for (let i = 0; i < MAX_MARKS; i++) {
      const grp = marks.current[i];
      if (!grp) continue;
      const m = rocketMarks[i];
      grp.visible = !!m;
      if (m) {
        grp.position.set(m.x, 0, m.z);
        const remain = Math.max(0, m.at - performance.now());
        const s = 0.55 + (remain / 1100) * 0.45;
        grp.scale.set(s, 1, s);
      }
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_ROCKETS }).map((_, i) => (
        <group
          key={"r" + i}
          visible={false}
          ref={(g) => {
            rockets.current[i] = g;
          }}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.85, 8]} />
            <meshStandardMaterial color="#4a4e55" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.13, 8, 8]} />
            <meshBasicMaterial color="#ffb02a" />
          </mesh>
          <pointLight intensity={6} distance={7} color="#ff9a3c" />
        </group>
      ))}
      {Array.from({ length: MAX_MARKS }).map((_, i) => (
        <group
          key={"m" + i}
          visible={false}
          ref={(g) => {
            marks.current[i] = g;
          }}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
            <ringGeometry args={[4.4, 5, 32]} />
            <meshBasicMaterial color="#ff3030" transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[4.4, 32]} />
            <meshBasicMaterial color="#ff3030" transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

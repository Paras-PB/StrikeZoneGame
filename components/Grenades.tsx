"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { liveGrenades, explodeAt, colliders, timeState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

const MAX_RENDER = 6;

/**
 * Steps live grenade physics (gravity, ground bounce, wall bounce) and
 * detonates them on fuse expiry via the shared explosion system.
 * Kills from a grenade blast are credited simply (+100, no combo chain).
 */
export default function Grenades() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05) * timeState.scale;
    for (let i = liveGrenades.length - 1; i >= 0; i--) {
      const g = liveGrenades[i];
      g.fuse -= dt;
      g.vel.y -= 22 * dt;
      g.pos.addScaledVector(g.vel, dt);
      // ground bounce
      if (g.pos.y < 0.14) {
        g.pos.y = 0.14;
        g.vel.y = Math.abs(g.vel.y) * 0.42;
        g.vel.x *= 0.75;
        g.vel.z *= 0.75;
        if (Math.abs(g.vel.y) < 0.8) g.vel.y = 0;
      }
      // crude wall bounce vs colliders
      for (const c of colliders) {
        if (
          g.pos.x > c.min.x - 0.12 && g.pos.x < c.max.x + 0.12 &&
          g.pos.z > c.min.z - 0.12 && g.pos.z < c.max.z + 0.12 &&
          g.pos.y > c.min.y && g.pos.y < c.max.y
        ) {
          g.vel.x *= -0.45;
          g.vel.z *= -0.45;
          g.pos.x += g.vel.x * dt * 2;
          g.pos.z += g.vel.z * dt * 2;
        }
      }
      // arena bounds
      g.pos.x = Math.max(-55, Math.min(55, g.pos.x));
      g.pos.z = Math.max(-55, Math.min(55, g.pos.z));

      if (g.fuse <= 0) {
        liveGrenades.splice(i, 1);
        const killed = explodeAt(g.pos.clone(), 5.2, 160, 30);
        if (killed.length > 0) {
          const st = useGameStore.getState();
          st.set({ kills: st.kills + killed.length, score: st.score + killed.length * 100 });
          for (const k of killed) {
            if (k.kind === "boss") st.unlockAch("bossslayer");
            st.addKillfeed("GRENADE KILL +100");
          }
        }
      }
    }
    // sync meshes
    for (let i = 0; i < MAX_RENDER; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const g = liveGrenades[i];
      m.visible = !!g;
      if (g) {
        m.position.copy(g.pos);
        m.rotation.x += dt * 7;
        m.rotation.z += dt * 5;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_RENDER }).map((_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(m) => {
            meshes.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.13, 10, 10]} />
          <meshStandardMaterial color="#2e4426" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

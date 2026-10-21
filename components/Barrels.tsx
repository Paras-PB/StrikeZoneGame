"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { barrelDefsFor, barrelRegistry } from "@/lib/game";
import { useGameStore } from "@/lib/store";

/**
 * Explosive barrels. Their meshes live here (not in World) so visibility can
 * follow barrelRegistry every frame — a barrel disappears when shot and
 * respawns at the start of the next wave.
 */
export default function Barrels() {
  const groups = useRef(new Map<number, THREE.Group>());
  const mapId = useGameStore((s) => s.mapId);

  useFrame(() => {
    for (const [id, g] of groups.current) {
      const entry = barrelRegistry.get(id);
      if (entry) g.visible = entry.alive;
    }
  });

  return (
    <group>
      {barrelDefsFor(mapId).map((d) => (
        <group
          key={d.id}
          position={[d.x, 0, d.z]}
          ref={(g) => {
            if (g) groups.current.set(d.id, g);
            else groups.current.delete(d.id);
          }}
        >
          <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 1.1, 14]} />
            <meshStandardMaterial color="#b3402a" roughness={0.55} metalness={0.4} />
          </mesh>
          {/* hazard band */}
          <mesh position={[0, 0.78, 0]}>
            <cylinderGeometry args={[0.435, 0.435, 0.16, 14]} />
            <meshStandardMaterial color="#f5c542" emissive="#8a6a00" emissiveIntensity={0.35} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.435, 0.435, 0.1, 14]} />
            <meshStandardMaterial color="#1c1c1c" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

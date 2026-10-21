"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/lib/store";

/** Glowing defend-the-zone marker: ring + light beam, green when held, red when empty. */
export default function Zone() {
  const objective = useGameStore((s) => s.objective);
  const zoneX = useGameStore((s) => s.zoneX);
  const zoneZ = useGameStore((s) => s.zoneZ);
  const playerInZone = useGameStore((s) => s.playerInZone);
  const beam = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.55 + Math.sin(t * 3) * 0.2;
    if (beam.current) {
      (beam.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.35;
    }
    if (ring.current) {
      const s = 1 + Math.sin(t * 3) * 0.03;
      ring.current.scale.set(s, s, 1);
    }
  });

  if (objective !== "defend") return null;
  const color = playerInZone ? "#3dff7a" : "#ff4040";

  return (
    <group position={[zoneX, 0, zoneZ]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[5.4, 6, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.4, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh ref={beam} position={[0, 15, 0]}>
        <cylinderGeometry args={[5.8, 5.8, 30, 40, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

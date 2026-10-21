"use client";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { playerState } from "@/lib/game";
import { useGameStore } from "@/lib/store";
import { sfxPerk } from "@/lib/audio";

type DropState = "idle" | "falling" | "landed";
const SPOTS: [number, number][] = [
  [6, -18],
  [-14, 18],
  [20, -2],
  [-24, -12],
  [4, 26],
];

interface Reward {
  name: string;
  apply: () => void;
}

/**
 * One supply drop per wave (from wave 2): a crate parachutes in at a random
 * spot, beacon-lit. Reach it before the wave ends for a random reward.
 */
export default function SupplyDrop() {
  const group = useRef<THREE.Group>(null);
  const stateRef = useRef<DropState>("idle");
  const [, setUiState] = useState<DropState>("idle");
  const schedForWave = useRef(0);
  const dropAt = useRef(0);
  const pos = useRef(new THREE.Vector3());
  const elapsed = useRef(0);

  const setState = (st: DropState) => {
    stateRef.current = st;
    setUiState(st);
  };

  useFrame((frameState, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGameStore.getState();
    const g = group.current;
    if (!g) return;

    if (s.phase !== "playing" || s.wave < 2) {
      if (stateRef.current !== "idle") setState("idle");
      g.visible = false;
      return;
    }

    // schedule this wave's drop
    if (schedForWave.current !== s.wave) {
      schedForWave.current = s.wave;
      dropAt.current = 12 + Math.random() * 18;
      elapsed.current = 0;
      if (stateRef.current !== "idle") setState("idle");
    }

    if (stateRef.current === "idle") {
      g.visible = false;
      elapsed.current += dt;
      if (elapsed.current >= dropAt.current) {
        const [x, z] = SPOTS[Math.floor(Math.random() * SPOTS.length)];
        pos.current.set(x, 42, z);
        setState("falling");
        s.addKillfeed("📦 SUPPLY DROP INBOUND — CHECK THE FLARE");
        g.visible = true;
      }
      return;
    }

    g.visible = true;
    g.position.copy(pos.current);

    if (stateRef.current === "falling") {
      pos.current.y = Math.max(0.6, pos.current.y - dt * 3.2);
      g.rotation.y += dt * 0.6;
      if (pos.current.y <= 0.6) {
        setState("landed");
        useGameStore.getState().addKillfeed("📦 SUPPLY DROP LANDED");
      }
      return;
    }

    // landed: pickup on contact
    const dx = playerState.pos.x - pos.current.x;
    const dz = playerState.pos.z - pos.current.z;
    if (dx * dx + dz * dz < 2.2 * 2.2) {
      const rewards: Reward[] = [
        {
          name: "MEDKIT +60 HP",
          apply: () => s.set({ health: Math.min(s.maxHealth, s.health + 60) }),
        },
        {
          name: "FULL AMMO RESUPPLY",
          apply: () =>
            s.set({
              ammo: {
                ar: { mag: 30, reserve: 240 },
                smg: { mag: 40, reserve: 300 },
                sg: { mag: 6, reserve: 48 },
                sn: { mag: 5, reserve: 40 },
                saw: { mag: 100, reserve: 400 },
                stinger: { mag: 1, reserve: 10 },
              },
            }),
        },
        {
          name: "OVERDRIVE — DOUBLE DAMAGE 20s",
          apply: () => s.set({ overdriveUntil: Date.now() + 20000 }),
        },
        {
          name: "+2 FRAG GRENADES",
          apply: () => s.set({ grenades: Math.min(5, s.grenades + 2) }),
        },
      ];
      const r = rewards[Math.floor(Math.random() * rewards.length)];
      r.apply();
      s.addKillfeed(`📦 ${r.name}`);
      sfxPerk();
      setState("idle");
      schedForWave.current = s.wave;
      dropAt.current = Infinity; // one per wave
      g.visible = false;
    }
    void frameState;
  });

  return (
    <group ref={group} visible={false}>
      {/* crate */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshStandardMaterial color="#7a5a1e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.56]}>
        <boxGeometry args={[0.9, 0.3, 0.02]} />
        <meshStandardMaterial color="#f5c542" emissive="#8a6a00" emissiveIntensity={0.5} />
      </mesh>
      {/* parachute */}
      <mesh position={[0, 2.1, 0]}>
        <coneGeometry args={[1.5, 0.7, 10, 1, true]} />
        <meshStandardMaterial color="#d8452c" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* beacon light column */}
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[0.16, 0.3, 16, 8, 1, true]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} intensity={14} distance={13} color="#ffcf7a" />
    </group>
  );
}

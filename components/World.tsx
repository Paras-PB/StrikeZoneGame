"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Sky, ContactShadows, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { addCollider, clearColliders, setupBarrels, clearTurret, clearAirstrike, FOREST_CABINS, FOREST_TOWER, FOREST_ROCKS, FOREST_TREES, BERMUDA_BOXES, BERMUDA_HOUSES, BERMUDA_CONTAINERS, BERMUDA_CRATES, BERMUDA_LAMPS, BERMUDA_BARRIERS, BERMUDA_SANDBAGS } from "@/lib/game";
import { useGameStore } from "@/lib/store";

/** V9 Bermuda Town ground: one 1024px canvas mapped 1:1 onto the 130 m ground
 *  plane (repeat 1,1), so streets/plaza/pads are drawn in world coordinates.
 *  Canvas mapping: px = (x+65)·K, py = (z+65)·K with K = 1024/130. */
function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const K = 1024 / 130;
  const px = (x: number) => (x + 65) * K;
  const py = (z: number) => (z + 65) * K;
  const rect = (x0: number, z0: number, x1: number, z1: number) => g.fillRect(px(x0), py(z0), (x1 - x0) * K, (z1 - z0) * K);

  // grass base
  g.fillStyle = "#77894e";
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 3 + 1;
    const v = Math.random();
    g.fillStyle = v > 0.66 ? "rgba(46,66,30,0.25)" : v > 0.33 ? "rgba(140,158,92,0.22)" : "rgba(112,96,58,0.18)";
    g.fillRect(x, y, s, s);
  }
  // sandy lot under the container yard
  g.fillStyle = "rgba(178,152,102,0.85)";
  rect(15, 14, 48, 43);
  // concrete pads under factory + houses
  g.fillStyle = "rgba(146,146,140,0.9)";
  rect(-46.5, -27, -19.5, -9);
  for (const [hx, hz] of [
    [22, -30],
    [37, -27],
    [31, -12],
    [11, 37],
    [-17, 31],
  ]) {
    rect(hx - 4.8, hz - 4.3, hx + 4.8, hz + 4.3);
  }
  // sidewalks (drawn wide, asphalt laid over the middle)
  g.fillStyle = "#9aa0a2";
  rect(-6.4, -65, 6.4, 65);
  rect(-65, -6.4, 65, 6.4);
  // asphalt cross streets along x≈0 and z≈0
  g.fillStyle = "#43464b";
  rect(-5, -65, 5, 65);
  rect(-65, -5, 65, 5);
  for (let i = 0; i < 2500; i++) {
    const onX = Math.random() > 0.5;
    const x = onX ? (Math.random() * 2 - 1) * 5 : (Math.random() * 2 - 1) * 65;
    const z = onX ? (Math.random() * 2 - 1) * 65 : (Math.random() * 2 - 1) * 5;
    g.fillStyle = Math.random() > 0.5 ? "rgba(20,20,22,0.2)" : "rgba(120,124,130,0.16)";
    g.fillRect(px(x), py(z), 2, 2);
  }
  // clock-tower plaza: paved disc with a worn painted ring
  g.fillStyle = "#8f8c82";
  g.beginPath();
  g.arc(px(0), py(-12), 12.6 * K, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#7e7a6e";
  g.beginPath();
  g.arc(px(0), py(-12), 11 * K, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(200,181,69,0.75)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(px(0), py(-12), 10.4 * K, 0, Math.PI * 2);
  g.stroke();
  // dashed lane markings (skip the plaza + intersection)
  g.fillStyle = "#c8b545";
  for (let x = -56; x < 56; x += 6) {
    if (Math.abs(x) < 8) continue;
    g.fillRect(px(x), py(0) - 2, 3 * K, 4);
  }
  for (let z = -56; z < 56; z += 6) {
    if (z > -25 && z < 3) continue;
    g.fillRect(px(0) - 2, py(z), 4, 3 * K);
  }
  // crosswalks flanking the intersection
  g.fillStyle = "rgba(230,230,225,0.8)";
  for (let z = -4; z < 4; z += 1.3) {
    g.fillRect(px(7.6), py(z), 0.55 * K, 0.8 * K);
    g.fillRect(px(-8.15), py(z), 0.55 * K, 0.8 * K);
  }
  for (let x = -4; x < 4; x += 1.3) {
    g.fillRect(px(x), py(7.6), 0.8 * K, 0.55 * K);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Container({ position, color, rotation = 0 }: { position: [number, number, number]; color: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.3, 0]}>
        <boxGeometry args={[6.2, 2.6, 2.5]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.35} />
      </mesh>
      {/* ribs */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} castShadow position={[-2.6 + i * 0.75, 1.3, 1.26]}>
          <boxGeometry args={[0.12, 2.5, 0.04]} />
          <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.8)} roughness={0.7} />
        </mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={"b" + i} castShadow position={[-2.6 + i * 0.75, 1.3, -1.26]}>
          <boxGeometry args={[0.12, 2.5, 0.04]} />
          <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.8)} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 2.65, 0]}>
        <boxGeometry args={[6.3, 0.08, 2.6]} />
        <meshStandardMaterial color="#22252a" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Crate({ position, size = 1.2, rotation = 0 }: { position: [number, number, number]; size?: number; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, size / 2, 0]}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="#9a7448" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, size / 2, 0.01 + size / 2]}>
        <boxGeometry args={[size * 0.9, size * 0.12, 0.02]} />
        <meshStandardMaterial color="#6e522f" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, size / 2, -0.01 - size / 2]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[size * 0.9, size * 0.12, 0.02]} />
        <meshStandardMaterial color="#6e522f" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Barrel({ position, color = "#b3402a" }: { position: [number, number, number]; color?: string }) {
  return (
    <mesh castShadow receiveShadow position={[position[0], 0.55, position[2]]}>
      <cylinderGeometry args={[0.42, 0.42, 1.1, 14]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.4} />
    </mesh>
  );
}

function Sandbags({ position, rotation = 0, length = 4 }: { position: [number, number, number]; rotation?: number; length?: number }) {
  const bags = [];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < length; i++) {
      bags.push(
        <mesh key={`${r}-${i}`} castShadow position={[(i - length / 2) * 0.95, 0.25 + r * 0.42, (r % 2) * 0.15]}>
          <capsuleGeometry args={[0.28, 0.55, 3, 8]} />
          <meshStandardMaterial color={r % 2 ? "#8f7f5a" : "#9c8c64"} roughness={1} />
        </mesh>
      );
    }
  }
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>{bags}</group>
    </group>
  );
}

function JerseyBarrier({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[3.2, 0.8, 0.6]} />
        <meshStandardMaterial color="#b9b9b4" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[3.2, 0.3, 0.75]} />
        <meshStandardMaterial color="#a8a8a3" roughness={0.9} />
      </mesh>
    </group>
  );
}

function WatchTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[
        [-1.4, -1.4],
        [1.4, -1.4],
        [-1.4, 1.4],
        [1.4, 1.4],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 2.5, z]}>
          <boxGeometry args={[0.3, 5, 0.3]} />
          <meshStandardMaterial color="#5a4632" roughness={0.9} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, 5, 0]}>
        <boxGeometry args={[4.2, 0.3, 4.2]} />
        <meshStandardMaterial color="#7a6248" roughness={0.9} />
      </mesh>
      {/* railings */}
      {[
        [0, 6, 2.05, 4.2, 0.12, 0.12],
        [0, 6, -2.05, 4.2, 0.12, 0.12],
        [2.05, 6, 0, 0.12, 0.12, 4.2],
        [-2.05, 6, 0, 0.12, 0.12, 4.2],
      ].map((a, i) => (
        <mesh key={i} castShadow position={[a[0], a[1], a[2]]}>
          <boxGeometry args={[a[3], a[4], a[5]]} />
          <meshStandardMaterial color="#4a3a28" />
        </mesh>
      ))}
      {/* roof */}
      <mesh castShadow position={[0, 7.6, 0]}>
        <boxGeometry args={[4.8, 0.2, 4.8]} />
        <meshStandardMaterial color="#33383e" roughness={0.7} metalness={0.3} />
      </mesh>
      {[
        [-2, -2],
        [2, -2],
        [-2, 2],
        [2, 2],
      ].map(([x, z], i) => (
        <mesh key={"r" + i} position={[x, 6.8, z]}>
          <boxGeometry args={[0.15, 1.6, 0.15]} />
          <meshStandardMaterial color="#33383e" />
        </mesh>
      ))}
    </group>
  );
}

/** V9 street lamp: slim pole with a glowing head (visual only — the classic
 *  Floodlights still provide night lighting). Collider comes from BERMUDA_LAMPS. */
function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 5.2, 8]} />
        <meshStandardMaterial color="#2b2f34" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 5.28, 0]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color="#fff3c4" emissive="#ffdf8a" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 5.52, 0]}>
        <coneGeometry args={[0.44, 0.3, 10]} />
        <meshStandardMaterial color="#22262b" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** V9 clock-tower dressing: clock face (south side), corner trims, platform
 *  railing. Body/platform/stairs themselves render from BERMUDA_BOXES. */
function ClockTowerExtras() {
  const rail = "#3a3f45";
  return (
    <group>
      {/* corner trims */}
      {[
        [-2.42, -14.42],
        [2.42, -14.42],
        [-2.42, -9.58],
        [2.42, -9.58],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 4.5, z]}>
          <boxGeometry args={[0.4, 9, 0.4]} />
          <meshStandardMaterial color="#a08a76" roughness={0.9} />
        </mesh>
      ))}
      {/* clock face — south side, toward spawn */}
      <mesh position={[0, 6.8, -9.44]}>
        <ringGeometry args={[1.45, 1.72, 28]} />
        <meshStandardMaterial color="#2e2a26" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 6.8, -9.43]}>
        <circleGeometry args={[1.45, 28]} />
        <meshStandardMaterial color="#f5e9c8" emissive="#ffdf9e" emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.17, 7.03, -9.4]} rotation={[0, 0, -0.85]}>
        <boxGeometry args={[0.09, 0.78, 0.03]} />
        <meshStandardMaterial color="#26221e" />
      </mesh>
      <mesh position={[-0.3, 6.6, -9.4]} rotation={[0, 0, 0.55]}>
        <boxGeometry args={[0.07, 1.18, 0.03]} />
        <meshStandardMaterial color="#26221e" />
      </mesh>
      <mesh position={[0, 6.8, -9.38]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.05, 10]} />
        <meshStandardMaterial color="#26221e" />
      </mesh>
      {/* platform railing (visual) — gaps at the north-west stair entry */}
      {[
        [-3.02, -15.02],
        [3.02, -15.02],
        [-3.02, -8.98],
        [3.02, -8.98],
      ].map(([x, z], i) => (
        <mesh key={"p" + i} position={[x, 9.82, z]}>
          <boxGeometry args={[0.09, 1.05, 0.09]} />
          <meshStandardMaterial color={rail} roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 10.32, -8.98]}>
        <boxGeometry args={[6.2, 0.07, 0.07]} />
        <meshStandardMaterial color={rail} roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[3.02, 10.32, -12]}>
        <boxGeometry args={[0.07, 0.07, 6.2]} />
        <meshStandardMaterial color={rail} roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0.65, 10.32, -15.02]}>
        <boxGeometry args={[4.9, 0.07, 0.07]} />
        <meshStandardMaterial color={rail} roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[-3.02, 10.32, -11.15]}>
        <boxGeometry args={[0.07, 0.07, 4.5]} />
        <meshStandardMaterial color={rail} roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  );
}

/** V9 factory dressing: floor pad, color-block sign, door headers, window
 *  strips. Walls/roof render from BERMUDA_BOXES. */
function FactoryExtras() {
  const winMat = { color: "#9fc4d8", emissive: "#4a6a7a", emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.6 } as const;
  return (
    <group>
      <mesh receiveShadow position={[-33, 0.025, -18]}>
        <boxGeometry args={[25.5, 0.05, 16.5]} />
        <meshStandardMaterial color="#7c7f7c" roughness={1} />
      </mesh>
      {/* sign: color blocking above the south door */}
      <mesh position={[-33, 4.32, -10.14]}>
        <boxGeometry args={[9, 1.1, 0.18]} />
        <meshStandardMaterial color="#d8542e" roughness={0.7} />
      </mesh>
      <mesh position={[-33, 3.66, -10.14]}>
        <boxGeometry args={[9, 0.22, 0.19]} />
        <meshStandardMaterial color="#f2e3c9" roughness={0.7} />
      </mesh>
      {/* door headers (visual — doorways stay full-clearance for bots) */}
      <mesh position={[-33, 4.35, -10.5]}>
        <boxGeometry args={[3.5, 1.3, 0.56]} />
        <meshStandardMaterial color="#4f6f8a" roughness={0.8} />
      </mesh>
      <mesh position={[-21, 4.35, -18]}>
        <boxGeometry args={[0.56, 1.3, 3.5]} />
        <meshStandardMaterial color="#4f6f8a" roughness={0.8} />
      </mesh>
      {/* window strips */}
      <mesh position={[-40.5, 3.9, -10.2]}>
        <boxGeometry args={[6, 0.8, 0.1]} />
        <meshStandardMaterial {...winMat} />
      </mesh>
      <mesh position={[-25.5, 3.9, -10.2]}>
        <boxGeometry args={[6, 0.8, 0.1]} />
        <meshStandardMaterial {...winMat} />
      </mesh>
      <mesh position={[-33, 3.9, -25.8]}>
        <boxGeometry args={[16, 0.8, 0.1]} />
        <meshStandardMaterial {...winMat} />
      </mesh>
      <mesh position={[-20.7, 3.9, -18]}>
        <boxGeometry args={[0.1, 0.8, 9]} />
        <meshStandardMaterial {...winMat} />
      </mesh>
    </group>
  );
}

/** V9 house dressing: floor pad, pitched roof (forest-cabin style pyramid),
 *  ceiling, door frame, warm windows, porch. Walls render from BERMUDA_BOXES;
 *  local space has the door on +z — the group rotation matches BERMUDA_HOUSES. */
function HouseExtras({ x, z, rot, roof }: { x: number; z: number; rot: number; roof: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh receiveShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[8.6, 0.05, 7.6]} />
        <meshStandardMaterial color="#8f8c82" roughness={1} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[8, 0.14, 7]} />
        <meshStandardMaterial color="#4a423a" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 4.1, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.89]}>
        <coneGeometry args={[6.2, 2.2, 4]} />
        <meshStandardMaterial color={roof} roughness={0.9} flatShading />
      </mesh>
      {/* door frame */}
      {[-1.26, 1.26].map((dx) => (
        <mesh key={dx} position={[dx, 1.3, 3.45]}>
          <boxGeometry args={[0.12, 2.6, 0.12]} />
          <meshStandardMaterial color="#4a3a28" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 2.66, 3.45]}>
        <boxGeometry args={[2.64, 0.14, 0.12]} />
        <meshStandardMaterial color="#4a3a28" roughness={1} />
      </mesh>
      {/* windows */}
      {[-2.6, 2.6].map((dx) => (
        <mesh key={"w" + dx} position={[dx, 1.7, 3.53]}>
          <boxGeometry args={[1.1, 0.9, 0.05]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#d8923a" emissiveIntensity={0.55} roughness={0.3} />
        </mesh>
      ))}
      {[-4.03, 4.03].map((dx) => (
        <mesh key={"s" + dx} position={[dx, 1.7, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.1, 0.9, 0.05]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#d8923a" emissiveIntensity={0.55} roughness={0.3} />
        </mesh>
      ))}
      {/* porch slab */}
      <mesh receiveShadow position={[0, 0, 4.3]}>
        <boxGeometry args={[3.2, 0.12, 1.5]} />
        <meshStandardMaterial color="#8f8c82" roughness={1} />
      </mesh>
    </group>
  );
}

function Floodlight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 6, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 12, 8]} />
        <meshStandardMaterial color="#2b2f34" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0, 12, 0]}>
        <boxGeometry args={[1.6, 0.8, 0.4]} />
        <meshStandardMaterial color="#1c1f23" />
      </mesh>
      <mesh position={[0, 12, 0.25]}>
        <planeGeometry args={[1.4, 0.6]} />
        <meshBasicMaterial color="#fff6c8" />
      </mesh>
      <pointLight position={[0, 11.5, 1]} intensity={25} distance={30} color="#ffe9a8" />
    </group>
  );
}


function makeForestTexture(autumn = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = autumn ? "#6e5636" : "#57603c";
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 4 + 1;
    const v = Math.random();
    g.fillStyle = autumn
      ? v > 0.66
        ? "rgba(146,94,32,0.35)"
        : v > 0.33
          ? "rgba(190,130,52,0.28)"
          : "rgba(90,62,32,0.25)"
      : v > 0.66
        ? "rgba(38,48,26,0.3)"
        : v > 0.33
          ? "rgba(110,118,72,0.22)"
          : "rgba(84,70,44,0.2)";
    g.fillRect(x, y, s, s);
  }
  // dirt clearings / path
  g.fillStyle = "rgba(122,104,63,0.5)";
  g.beginPath();
  g.ellipse(512, 640, 190, 130, 0.3, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(220, 260, 150, 110, 0, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Pine({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 1.8, 7]} />
        <meshStandardMaterial color="#4c3a26" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 2.6, 0]}>
        <coneGeometry args={[1.7, 2.6, 8]} />
        <meshStandardMaterial color="#2e4630" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0, 4.1, 0]}>
        <coneGeometry args={[1.3, 2.3, 8]} />
        <meshStandardMaterial color="#35543a" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0, 5.5, 0]}>
        <coneGeometry args={[0.9, 2, 8]} />
        <meshStandardMaterial color="#3d6242" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

const LEAFY_GREEN = ["#3f7a2e", "#4c8a34", "#5da244", "#356b27"];
const LEAFY_GOLD = ["#d9932c", "#e0a83e", "#c47b24", "#b85c1e", "#e8b84e"];

/** Big broadleaf tree from Paras's tree sheet: thick trunk, clustered canopy blobs, gentle sway. */
function LeafyTree({ position, s = 1, gold = false, seed = 0 }: { position: [number, number, number]; s?: number; gold?: boolean; seed?: number }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!grp.current) return;
    const t = state.clock.elapsedTime;
    grp.current.rotation.z = Math.sin(t * 0.7 + seed * 2.1) * 0.022;
    grp.current.rotation.x = Math.cos(t * 0.55 + seed * 1.3) * 0.014;
  });
  const pal = gold ? LEAFY_GOLD : LEAFY_GREEN;
  const blobs: [number, number, number, number][] = [
    [0, 4.6, 0, 1.75],
    [1.15, 4.0, 0.4, 1.3],
    [-1.1, 4.15, -0.3, 1.25],
    [0.35, 5.35, -0.7, 1.2],
    [-0.5, 5.2, 0.75, 1.1],
  ];
  return (
    <group position={position} scale={s}>
      <group ref={grp}>
        <mesh castShadow position={[0, 1.3, 0]} rotation={[0, 0, 0.05]}>
          <cylinderGeometry args={[0.24, 0.42, 2.8, 8]} />
          <meshStandardMaterial color="#5a4630" roughness={1} />
        </mesh>
        <mesh castShadow position={[0.55, 3.1, 0.2]} rotation={[0, 0, -0.7]}>
          <cylinderGeometry args={[0.1, 0.16, 1.6, 6]} />
          <meshStandardMaterial color="#5a4630" roughness={1} />
        </mesh>
        <mesh castShadow position={[-0.5, 3.2, -0.25]} rotation={[0.3, 0, 0.65]}>
          <cylinderGeometry args={[0.09, 0.15, 1.5, 6]} />
          <meshStandardMaterial color="#54422c" roughness={1} />
        </mesh>
        {blobs.map(([x, y, z, r], i) => (
          <mesh key={i} castShadow position={[x, y, z]}>
            <icosahedronGeometry args={[r, 1]} />
            <meshStandardMaterial color={pal[Math.abs(Math.round(seed * 7 + i * 2)) % pal.length]} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Cabin({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[5, 2.8, 4]} />
        <meshStandardMaterial color="#6e5136" roughness={0.95} />
      </mesh>
      {/* log stripes */}
      {[0.5, 1.1, 1.7, 2.3].map((y) => (
        <mesh key={y} position={[0, y, 2.01]}>
          <boxGeometry args={[5.02, 0.07, 0.03]} />
          <meshStandardMaterial color="#59422a" roughness={1} />
        </mesh>
      ))}
      {/* pyramid roof */}
      <mesh castShadow position={[0, 3.6, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.82]}>
        <coneGeometry args={[3.9, 1.7, 4]} />
        <meshStandardMaterial color="#3d3129" roughness={0.9} flatShading />
      </mesh>
      {/* door + warm window */}
      <mesh position={[0.9, 1.05, 2.02]}>
        <boxGeometry args={[0.95, 2.1, 0.06]} />
        <meshStandardMaterial color="#2c2015" roughness={1} />
      </mesh>
      <mesh position={[-1.3, 1.6, 2.02]}>
        <boxGeometry args={[1, 0.8, 0.06]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#d8923a" emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      {/* stone step */}
      <mesh receiveShadow position={[0.9, 0.12, 2.5]}>
        <boxGeometry args={[1.3, 0.24, 0.9]} />
        <meshStandardMaterial color="#7a7a72" roughness={1} />
      </mesh>
    </group>
  );
}

function Rock({ position, s = 1, rotation = 0 }: { position: [number, number, number]; s?: number; rotation?: number }) {
  return (
    <mesh castShadow receiveShadow position={[position[0], 0.45 * s, position[2]]} rotation={[0.2, rotation, 0.1]} scale={s}>
      <dodecahedronGeometry args={[0.85, 0]} />
      <meshStandardMaterial color="#75756c" roughness={1} flatShading />
    </mesh>
  );
}



export default function World() {
  const groundTex = useMemo(() => (typeof document !== "undefined" ? makeGroundTexture() : null), []);
  const forestTex = useMemo(() => (typeof document !== "undefined" ? makeForestTexture(false) : null), []);
  const autumnTex = useMemo(() => (typeof document !== "undefined" ? makeForestTexture(true) : null), []);
  const wave = useGameStore((s) => s.wave);
  const mapId = useGameStore((s) => s.mapId);
  const storm = useGameStore((s) => s.storm);
  const forest = mapId === "forest";
  const autumn = mapId === "autumn";
  const woods = forest || autumn;
  const night = wave > 0 && wave % 3 === 0;

  useEffect(() => {
    clearColliders();
    setupBarrels(mapId);
    clearTurret();
    clearAirstrike();
    // perimeter walls (shared)
    const W = 58;
    addCollider(0, 2, -W, 120, 4, 1);
    addCollider(0, 2, W, 120, 4, 1);
    addCollider(-W, 2, 0, 1, 4, 120);
    addCollider(W, 2, 0, 1, 4, 120);
    if (woods) {
      for (const c of FOREST_CABINS) addCollider(c.x, 1.4, c.z, 5.6, 2.8, 4.6);
      addCollider(FOREST_TOWER[0], 5, FOREST_TOWER[1], 4.2, 0.3, 4.2);
      for (const t of FOREST_TREES) addCollider(t.x, 3, t.z, 0.85, 6.5, 0.85);
      for (const r of FOREST_ROCKS) addCollider(r.x, 0.6, r.z, 1.7 * r.s, 1.3, 1.7 * r.s);
      addCollider(6, 0.6, 20, 1.2, 1.2, 1.2);
      addCollider(-18, 0.6, 4, 1.2, 1.2, 1.2);
      addCollider(0, 0.5, 8, 4, 1, 1);
      addCollider(-4, 0.5, -18, 4, 1, 1);
      return;
    }
    // V9 Bermuda Town — every static box (tower + stairs, factory, houses)
    for (const b of BERMUDA_BOXES) addCollider(b.cx, b.cy, b.cz, b.sx, b.sy, b.sz);
    // container yard
    for (const cn of BERMUDA_CONTAINERS) {
      const alongX = cn.rot === 0;
      addCollider(cn.x, 1.3, cn.z, alongX ? 6.2 : 2.5, 2.6, alongX ? 2.5 : 6.2);
      if (cn.stack) addCollider(cn.x, 3.9, cn.z, alongX ? 6.2 : 2.5, 2.6, alongX ? 2.5 : 6.2);
    }
    for (const cr of BERMUDA_CRATES) addCollider(cr.x, cr.s / 2, cr.z, cr.s, cr.s, cr.s);
    for (const [lx, lz] of BERMUDA_LAMPS) addCollider(lx, 2.6, lz, 0.35, 5.2, 0.35);
    for (const b of BERMUDA_BARRIERS) addCollider(b.x, 0.5, b.z, b.rot === 0 ? 3.2 : 0.75, 1, b.rot === 0 ? 0.75 : 3.2);
    for (const sb of BERMUDA_SANDBAGS) addCollider(sb.x, 0.5, sb.z, 4, 1, 1);
  }, [mapId, woods]);

  return (
    <group>
      <Sky distance={4000} sunPosition={night ? [-60, 4, -100] : storm ? [30, 18, -60] : autumn ? [-70, 9, -45] : forest ? [55, 13, -90] : [85, 36, -110]} turbidity={night ? 2 : storm ? 10 : autumn ? 8 : forest ? 7 : 6} rayleigh={night ? 0.6 : storm ? 0.4 : autumn ? 3.2 : forest ? 3 : 1.7} />
      {night && <Stars radius={220} depth={60} count={3000} factor={5} saturation={0} fade speed={0.6} />}
      <fog attach="fog" args={night ? ["#131b2a", 22, 125] : storm ? ["#59636e", 9, 92] : autumn ? ["#dfa06a", 30, 165] : forest ? ["#c9b98f", 34, 175] : ["#b9cfe0", 60, 235]} />
      <hemisphereLight args={night ? ["#5a6f9e", "#14120e", 0.22] : storm ? ["#6d7683", "#2c2f28", 0.38] : autumn ? ["#ffd9a8", "#5a4632", 0.6] : forest ? ["#ffe9c4", "#43502f", 0.7] : ["#cfe6ff", "#8a7a58", 0.95]} />
      <directionalLight
        position={night ? [-40, 55, -25] : [50, 60, -30]}
        intensity={night ? 0.4 : storm ? 0.75 : autumn ? 1.9 : forest ? 2.2 : 2.45}
        color={night ? "#aebfff" : storm ? "#cfd6dd" : autumn ? "#ffb877" : forest ? "#ffe3ae" : "#fff1d6"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={200}
      />

      {storm && !night && <Rain />}
      {autumn && !night && <FallingLeaves />}

      {!woods && (
        <>
      {/* ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[130, 130]} />
        {groundTex ? (
          <meshStandardMaterial map={groundTex} roughness={1} metalness={0} />
        ) : (
          <meshStandardMaterial color="#8a7f63" roughness={1} />
        )}
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={120} blur={2} far={4} />

      {/* perimeter walls */}
      {[
        [0, -58],
        [0, 58],
      ].map(([x, z], i) => (
        <mesh key={"w" + i} castShadow receiveShadow position={[x, 2, z]}>
          <boxGeometry args={[120, 4, 1]} />
          <meshStandardMaterial color="#7d7f7c" roughness={0.9} />
        </mesh>
      ))}
      {[
        [-58, 0],
        [58, 0],
      ].map(([x, z], i) => (
        <mesh key={"w2" + i} castShadow receiveShadow position={[x, 2, z]}>
          <boxGeometry args={[1, 4, 120]} />
          <meshStandardMaterial color="#7d7f7c" roughness={0.9} />
        </mesh>
      ))}
      {/* wall top wire */}
      {[
        [0, -58],
        [0, 58],
        [-58, 0],
        [58, 0],
      ].map(([x, z], i) => (
        <mesh key={"wire" + i} position={[x, 4.4, z]}>
          <boxGeometry args={i < 2 ? [120, 0.5, 0.2] : [0.2, 0.5, 120]} />
          <meshStandardMaterial color="#3a3a3a" roughness={1} />
        </mesh>
      ))}

      {/* V9 Bermuda Town — static boxes (clock tower + stairs, factory, houses) */}
      {BERMUDA_BOXES.map((b, i) => (
        <mesh key={i} castShadow receiveShadow position={[b.cx, b.cy, b.cz]}>
          <boxGeometry args={[b.sx, b.sy, b.sz]} />
          <meshStandardMaterial color={b.color} roughness={0.85} />
        </mesh>
      ))}
      <ClockTowerExtras />
      <FactoryExtras />
      {BERMUDA_HOUSES.map((h, i) => (
        <HouseExtras key={i} x={h.x} z={h.z} rot={h.rot} roof={h.roof} />
      ))}

      {/* container yard */}
      {BERMUDA_CONTAINERS.map((cn, i) => (
        <group key={i}>
          <Container position={[cn.x, 0, cn.z]} color={cn.color} rotation={cn.rot} />
          {cn.stack && <Container position={[cn.x, 2.6, cn.z]} color={cn.stack} rotation={cn.rot} />}
        </group>
      ))}
      {BERMUDA_CRATES.map((cr, i) => (
        <Crate key={i} position={[cr.x, 0, cr.z]} size={cr.s} rotation={cr.rot ?? 0} />
      ))}
      {BERMUDA_LAMPS.map(([lx, lz], i) => (
        <StreetLamp key={i} position={[lx, 0, lz]} />
      ))}
      {BERMUDA_BARRIERS.map((b, i) => (
        <JerseyBarrier key={i} position={[b.x, 0, b.z]} rotation={b.rot} />
      ))}
      {BERMUDA_SANDBAGS.map((sb, i) => (
        <Sandbags key={i} position={[sb.x, 0, sb.z]} rotation={sb.rot} />
      ))}

      <Floodlight position={[-20, 0, -10]} />
      <Floodlight position={[20, 0, 10]} />
      <Floodlight position={[0, 0, 40]} />
      <Floodlight position={[-35, 0, -35]} />

      {/* distant mountains */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 160;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <coneGeometry args={[40 + (i % 3) * 12, 35 + (i % 4) * 10, 5]} />
            <meshStandardMaterial color="#6b5f4c" roughness={1} flatShading />
          </mesh>
        );
      })}

        </>
      )}

      {woods && (
        <>
          {/* forest floor */}
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[130, 130]} />
            {autumn ? (
              autumnTex ? (
                <meshStandardMaterial map={autumnTex} roughness={1} metalness={0} />
              ) : (
                <meshStandardMaterial color="#6e5636" roughness={1} />
              )
            ) : forestTex ? (
              <meshStandardMaterial map={forestTex} roughness={1} metalness={0} />
            ) : (
              <meshStandardMaterial color="#57603c" roughness={1} />
            )}
          </mesh>
          <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={120} blur={2} far={4} />

          {/* log palisade perimeter */}
          {[
            [0, -58],
            [0, 58],
          ].map(([x, z], i) => (
            <mesh key={"fw" + i} castShadow receiveShadow position={[x, 1.7, z]}>
              <boxGeometry args={[120, 3.4, 0.8]} />
              <meshStandardMaterial color="#4c3a26" roughness={1} />
            </mesh>
          ))}
          {[
            [-58, 0],
            [58, 0],
          ].map(([x, z], i) => (
            <mesh key={"fw2" + i} castShadow receiveShadow position={[x, 1.7, z]}>
              <boxGeometry args={[0.8, 3.4, 120]} />
              <meshStandardMaterial color="#4c3a26" roughness={1} />
            </mesh>
          ))}

          {FOREST_TREES.map((t, i) =>
            autumn ? (
              <LeafyTree key={i} position={[t.x, 0, t.z]} s={t.s * 1.05} gold seed={i * 1.7 + 1} />
            ) : i % 3 === 2 ? (
              <Pine key={i} position={[t.x, 0, t.z]} s={t.s} />
            ) : (
              <LeafyTree key={i} position={[t.x, 0, t.z]} s={t.s * 1.05} seed={i * 1.7 + 1} />
            )
          )}
          {FOREST_CABINS.map((c, i) => (
            <Cabin key={i} position={[c.x, 0, c.z]} rotation={c.r} />
          ))}
          <WatchTower position={[FOREST_TOWER[0], 0, FOREST_TOWER[1]]} />
          {FOREST_ROCKS.map((r, i) => (
            <Rock key={i} position={[r.x, 0, r.z]} s={r.s} rotation={i * 1.3} />
          ))}

          <Crate position={[6, 0, 20]} rotation={0.4} />
          <Crate position={[-18, 0, 4]} />
          <Sandbags position={[0, 0, 8]} />
          <Sandbags position={[-4, 0, -18]} rotation={0.4} />

          <Barrel position={[-19, 0, -12]} color="#3a6ea5" />
          <Barrel position={[23, 0, 21]} color="#4a4e55" />

          <Floodlight position={[-14, 0, -28]} />
          <Floodlight position={[30, 0, 14]} />

          {/* giant trees beyond the palisade */}
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2 + 0.2;
            const r = 78 + (i % 3) * 9;
            return autumn ? (
              <LeafyTree key={"outer" + i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} s={(2.4 + (i % 4) * 0.5) * 1.05} gold seed={i * 2.3} />
            ) : i % 2 === 0 ? (
              <LeafyTree key={"outer" + i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} s={(2.4 + (i % 4) * 0.5) * 1.05} seed={i * 2.3} />
            ) : (
              <Pine key={"outer" + i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} s={2.4 + (i % 4) * 0.5} />
            );
          })}
        </>
      )}

    </group>
  );
}

/** Storm rain: 900 points cycling downward in a box around the arena centre. */
function Rain() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 900;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 110;
      arr[i * 3 + 1] = Math.random() * 34;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const a = (geo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
    const fall = Math.min(dt, 0.05) * 46;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= fall;
      a[i] -= fall * 0.18; // wind slant
      if (a[i + 1] < 0) {
        a[i + 1] = 34;
        a[i] = (Math.random() - 0.5) * 110;
        a[i + 2] = (Math.random() - 0.5) * 110;
      }
    }
    (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#aebfd4" size={0.14} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Autumn: golden leaves drifting down through the whole arena. */
function FallingLeaves() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 320;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 115;
      arr[i * 3 + 1] = Math.random() * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 115;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((state, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const a = (geo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
    const fall = Math.min(dt, 0.05) * 1.7;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= fall;
      a[i] += Math.sin(t * 1.8 + i) * dt * 0.9;
      if (a[i + 1] < 0) {
        a[i + 1] = 16;
        a[i] = (Math.random() - 0.5) * 115;
        a[i + 2] = (Math.random() - 0.5) * 115;
      }
    }
    (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#e8a83e" size={0.17} transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

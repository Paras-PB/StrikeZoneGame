"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Sky, ContactShadows, Stars } from "@react-three/drei";
import { addCollider, clearColliders, setupBarrels, clearTurret, clearAirstrike, FOREST_CABINS, FOREST_TOWER, FOREST_ROCKS, FOREST_TREES } from "@/lib/game";
import { useGameStore } from "@/lib/store";

function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a7f63";
  g.fillRect(0, 0, 1024, 1024);
  // dirt noise
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 3 + 1;
    const v = Math.random();
    g.fillStyle = v > 0.5 ? "rgba(60,50,35,0.25)" : "rgba(200,185,150,0.18)";
    g.fillRect(x, y, s, s);
  }
  // roads
  g.fillStyle = "#3d3f42";
  g.fillRect(0, 462, 1024, 100);
  g.fillRect(462, 0, 100, 1024);
  g.fillStyle = "#2f3134";
  for (let i = 0; i < 2000; i++) {
    g.fillRect(Math.random() * 1024, 462 + Math.random() * 100, 2, 2);
  }
  // lane markings
  g.fillStyle = "#c8b545";
  for (let x = 0; x < 1024; x += 64) {
    g.fillRect(x, 508, 32, 5);
    g.fillRect(508, x, 5, 32);
  }
  // concrete pads
  g.fillStyle = "rgba(120,120,118,0.55)";
  g.fillRect(90, 90, 260, 220);
  g.fillRect(674, 714, 260, 220);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
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

function Warehouse({ position, rotation = 0, color = "#6b7683", w = 18 }: { position: [number, number, number]; rotation?: number; color?: string; w?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 3, 0]}>
        <boxGeometry args={[w, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 7, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[w + 1, 0.4, 13]} />
        <meshStandardMaterial color="#2e3339" roughness={0.8} />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.8, 6.02]}>
        <boxGeometry args={[5, 3.6, 0.1]} />
        <meshStandardMaterial color="#22262b" roughness={0.9} />
      </mesh>
      {/* windows strip */}
      <mesh position={[0, 4.8, 6.02]}>
        <boxGeometry args={[w - 3, 0.7, 0.08]} />
        <meshStandardMaterial color="#9fc4d8" emissive="#4a6a7a" emissiveIntensity={0.35} roughness={0.2} metalness={0.6} />
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


function makeForestTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#57603c";
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const s = Math.random() * 4 + 1;
    const v = Math.random();
    g.fillStyle = v > 0.66 ? "rgba(38,48,26,0.3)" : v > 0.33 ? "rgba(110,118,72,0.22)" : "rgba(84,70,44,0.2)";
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
  const forestTex = useMemo(() => (typeof document !== "undefined" ? makeForestTexture() : null), []);
  const wave = useGameStore((s) => s.wave);
  const mapId = useGameStore((s) => s.mapId);
  const forest = mapId === "forest";
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
    if (forest) {
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
    // warehouses
    addCollider(-28, 3, -20, 18, 6, 12);
    addCollider(28, 3, 22, 18, 6, 12);
    addCollider(-30, 3, 26, 14, 6, 10);
    // containers
    addCollider(-8, 1.3, -8, 6.2, 2.6, 2.5);
    addCollider(-8, 3.9, -8, 6.2, 2.6, 2.5);
    addCollider(10, 1.3, 4, 2.5, 2.6, 6.2);
    addCollider(10, 1.3, -14, 6.2, 2.6, 2.5);
    addCollider(-18, 1.3, 8, 6.2, 2.6, 2.5);
    addCollider(22, 1.3, -6, 6.2, 2.6, 2.5);
    addCollider(22, 3.9, -6, 6.2, 2.6, 2.5);
    addCollider(2, 1.3, 24, 6.2, 2.6, 2.5);
    // crates
    addCollider(0, 0.6, 0, 1.4, 1.2, 1.4);
    addCollider(4, 0.6, -2, 1.2, 1.2, 1.2);
    addCollider(-12, 0.6, -22, 1.2, 1.2, 1.2);
    addCollider(16, 0.6, 14, 1.5, 1.2, 1.5);
    // watchtower platform (standable)
    addCollider(0, 5, -32, 4.2, 0.3, 4.2);
    // sandbags
    addCollider(0, 0.5, 10, 4, 1, 1);
    addCollider(-6, 0.5, -28, 4, 1, 1);
    // barriers
    addCollider(0, 0.5, -6, 3.2, 1, 0.6);
    addCollider(-14, 0.5, 0, 3.2, 1, 0.6);
  }, [mapId, forest]);

  return (
    <group>
      <Sky distance={4000} sunPosition={night ? [-60, 4, -100] : forest ? [55, 13, -90] : [80, 28, -120]} turbidity={night ? 2 : forest ? 7 : 6} rayleigh={night ? 0.6 : forest ? 3 : 2.2} />
      {night && <Stars radius={220} depth={60} count={3000} factor={5} saturation={0} fade speed={0.6} />}
      <fog attach="fog" args={night ? ["#131b2a", 22, 125] : forest ? ["#c9b98f", 34, 175] : ["#c8b08a", 55, 220]} />
      <hemisphereLight args={night ? ["#5a6f9e", "#14120e", 0.22] : forest ? ["#ffe9c4", "#43502f", 0.7] : ["#bfd6ff", "#7a6a4f", 0.75]} />
      <directionalLight
        position={night ? [-40, 55, -25] : [50, 60, -30]}
        intensity={night ? 0.4 : 2.2}
        color={night ? "#aebfff" : forest ? "#ffe3ae" : "#fff1d6"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={200}
      />

      {!forest && (
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

      <Warehouse position={[-28, 0, -20]} color="#6b7683" />
      <Warehouse position={[28, 0, 22]} rotation={Math.PI} color="#7a6f5e" />
      <Warehouse position={[-30, 0, 26]} rotation={Math.PI / 2} color="#5e6b78" w={14} />

      <Container position={[-8, 0, -8]} color="#b3402a" />
      <Container position={[-8, 2.6, -8]} color="#2a5db3" />
      <Container position={[10, 0, 4]} color="#2e7d4f" rotation={Math.PI / 2} />
      <Container position={[10, 0, -14]} color="#c8871f" />
      <Container position={[-18, 0, 8]} color="#3a6ea5" />
      <Container position={[22, 0, -6]} color="#b3402a" />
      <Container position={[22, 2.6, -6]} color="#4a4e55" />
      <Container position={[2, 0, 24]} color="#2a5db3" rotation={0.25} />

      <Crate position={[0, 0, 0]} size={1.4} />
      <Crate position={[4, 0, -2]} rotation={0.4} />
      <Crate position={[4, 1.2, -2]} size={0.9} rotation={0.2} />
      <Crate position={[-12, 0, -22]} />
      <Crate position={[16, 0, 14]} size={1.5} />
      <Crate position={[-4, 0, 16]} rotation={0.7} />
      <Crate position={[26, 0, 8]} rotation={0.3} />

      <Barrel position={[1.9, 0, -2.6]} color="#3a6ea5" />
      <Barrel position={[17, 0, 13]} color="#4a4e55" />
      <Barrel position={[24.9, 0, 10.2]} color="#2e7d4f" />

      <Sandbags position={[0, 0, 10]} />
      <Sandbags position={[-6, 0, -28]} rotation={0.5} />

      <JerseyBarrier position={[0, 0, -6]} />
      <JerseyBarrier position={[-14, 0, 0]} rotation={Math.PI / 2} />
      <JerseyBarrier position={[14, 0, -20]} rotation={0.3} />

      <WatchTower position={[0, 0, -32]} />
      <WatchTower position={[-40, 0, 10]} />

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

      {/* center flag */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 12, 8]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[1.4, 10.8, 0]}>
        <planeGeometry args={[2.8, 1.6]} />
        <meshStandardMaterial color="#c22f2f" side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
        </>
      )}

      {forest && (
        <>
          {/* forest floor */}
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[130, 130]} />
            {forestTex ? (
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

          {FOREST_TREES.map((t, i) => (
            <Pine key={i} position={[t.x, 0, t.z]} s={t.s} />
          ))}
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

          {/* giant pines beyond the palisade */}
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2 + 0.2;
            const r = 78 + (i % 3) * 9;
            return <Pine key={"outer" + i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} s={2.4 + (i % 4) * 0.5} />;
          })}
        </>
      )}

    </group>
  );
}

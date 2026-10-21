"use client";
import { useRef, useMemo, useState, useReducer } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore, PERK_POOL } from "@/lib/store";
import type { PerkId } from "@/lib/store";
import { enemyRegistry, playerState, collideCircle, pushTracer, colliders, explodeAt, resetBarrels, timeState, GUNSHIP_ALT, rocketMarks, pushExplosion } from "@/lib/game";
import type { EnemyKind } from "@/lib/game";
import { sfxEnemyShoot, sfxHurt } from "@/lib/audio";

interface Bot {
  id: number;
  kind: EnemyKind;
  pos: THREE.Vector3;
  health: number;
  maxHealth: number;
  alive: boolean;
  deathT: number;
  shootCd: number;
  burst: number;
  speed: number;
  strafePhase: number;
  dmgMult: number;
  scaleF: number;
  exploded: boolean;
  enraged: boolean;
  aiming: boolean;
  aimT: number;
  // gunship attack state
  atkT: number;
  atkAlt: number;
  strafeT: number;
  shotT: number;
  orbitA: number;
}

let botId = 1;
const MAX_WAVE = 10;
const DRONE_HOVER = 3.3;
const ZONE_SPOTS: [number, number][] = [
  [0, 10],
  [-18, 8],
  [16, 14],
  [0, -6],
];
const FOREST_ZONE_SPOTS: [number, number][] = [
  [0, 18],
  [-12, -14],
  [16, -16],
  [4, -2],
];

const KIND_STATS: Record<EnemyKind, { hp: number; speed: number; scale: number; dmg: number }> = {
  soldier: { hp: 1, speed: 1, scale: 1, dmg: 1 },
  runner: { hp: 0.55, speed: 1.5, scale: 0.94, dmg: 0.7 },
  heavy: { hp: 3.4, speed: 0.6, scale: 1.35, dmg: 1.5 },
  exploder: { hp: 0.7, speed: 1.45, scale: 0.95, dmg: 1 },
  boss: { hp: 1, speed: 0.55, scale: 1.9, dmg: 2 },
  drone: { hp: 0.45, speed: 1.05, scale: 1, dmg: 0.8 },
  marksman: { hp: 0.8, speed: 0.5, scale: 1, dmg: 1 },
  gunship: { hp: 1, speed: 1, scale: 1, dmg: 1 },
};

const KIND_STYLE: Record<EnemyKind, { torso: string; vest: string; visor: string }> = {
  soldier: { torso: "#4a3226", vest: "#1e2126", visor: "#ff2a2a" },
  runner: { torso: "#7a5a1e", vest: "#2e2a1e", visor: "#ffd02a" },
  heavy: { torso: "#3d434f", vest: "#22252b", visor: "#ff7a2a" },
  exploder: { torso: "#6e1f1f", vest: "#3a0f0f", visor: "#ff2a2a" },
  boss: { torso: "#571622", vest: "#1a0508", visor: "#ff2ad4" },
  drone: { torso: "#2c3540", vest: "#171b21", visor: "#39d0ff" },
  marksman: { torso: "#31473a", vest: "#131a15", visor: "#ffb02a" },
  gunship: { torso: "#23282e", vest: "#14171b", visor: "#ff2a2a" },
};

function SoldierMesh({ bot, refs }: { bot: Bot; refs: Map<number, THREE.Group> }) {
  const c = KIND_STYLE[bot.kind];
  return (
    <group
      scale={bot.scaleF}
      ref={(g) => {
        if (g) refs.set(bot.id, g);
        else refs.delete(bot.id);
      }}
    >
      {/* legs */}
      <mesh castShadow position={[-0.14, 0.45, 0]}>
        <boxGeometry args={[0.22, 0.9, 0.26]} />
        <meshStandardMaterial color="#2b2e33" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.14, 0.45, 0]}>
        <boxGeometry args={[0.22, 0.9, 0.26]} />
        <meshStandardMaterial color="#2b2e33" roughness={0.9} />
      </mesh>
      {/* torso + vest */}
      <mesh castShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[0.55, 0.65, 0.34]} />
        <meshStandardMaterial color={c.torso} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 1.18, 0.02]}>
        <boxGeometry args={[0.6, 0.4, 0.4]} />
        <meshStandardMaterial color={c.vest} roughness={0.8} />
      </mesh>
      {/* exploder: explosive charge on the chest */}
      {bot.kind === "exploder" && (
        <mesh position={[0, 1.15, -0.24]}>
          <boxGeometry args={[0.34, 0.34, 0.12]} />
          <meshStandardMaterial color="#ff5a1e" emissive="#ff4400" emissiveIntensity={2.2} roughness={0.5} />
        </mesh>
      )}
      {/* heavy/boss: shoulder armour */}
      {(bot.kind === "heavy" || bot.kind === "boss") && (
        <>
          <mesh castShadow position={[-0.42, 1.42, 0]}>
            <boxGeometry args={[0.28, 0.18, 0.36]} />
            <meshStandardMaterial color={c.vest} roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh castShadow position={[0.42, 1.42, 0]}>
            <boxGeometry args={[0.28, 0.18, 0.36]} />
            <meshStandardMaterial color={c.vest} roughness={0.7} metalness={0.3} />
          </mesh>
        </>
      )}
      {/* arms + gun */}
      <mesh castShadow position={[0.32, 1.2, -0.25]} rotation={[Math.PI / 2.3, 0, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.6]} />
        <meshStandardMaterial color={c.torso} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.18, 1.25, bot.kind === "marksman" ? -0.75 : -0.55]}>
        <boxGeometry args={[0.08, 0.12, bot.kind === "marksman" ? 1.2 : 0.75]} />
        <meshStandardMaterial color="#101216" metalness={0.5} roughness={0.5} />
      </mesh>
      {bot.kind === "marksman" && (
        <mesh position={[0.18, 1.38, -0.6]}>
          <boxGeometry args={[0.06, 0.07, 0.22]} />
          <meshStandardMaterial color="#0c0d0f" metalness={0.6} roughness={0.4} />
        </mesh>
      )}
      {/* head + helmet */}
      <mesh castShadow position={[0, 1.72, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#c9a07a" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.24, 12, 8, 0, Math.PI * 2, 0, 1.5]} />
        <meshStandardMaterial color="#3d4436" roughness={0.9} />
      </mesh>
      {/* visor glow = hostile, colour varies by type */}
      <mesh position={[0, 1.72, -0.19]}>
        <boxGeometry args={[0.26, 0.06, 0.03]} />
        <meshStandardMaterial color={c.visor} emissive={c.visor} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function DroneMesh({ bot, refs }: { bot: Bot; refs: Map<number, THREE.Group> }) {
  const rotors = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rotors.current) rotors.current.rotation.y += dt * 42;
  });
  return (
    <group
      ref={(g) => {
        if (g) refs.set(bot.id, g);
        else refs.delete(bot.id);
      }}
    >
      {/* body */}
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.24, 0.72]} />
        <meshStandardMaterial color="#2c3540" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* sensor eye */}
      <mesh position={[0, -0.05, -0.38]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color="#39d0ff" emissive="#39d0ff" emissiveIntensity={2} />
      </mesh>
      {/* under-light */}
      <mesh position={[0, -0.16, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={2.4} />
      </mesh>
      {/* gun */}
      <mesh position={[0.15, -0.18, -0.2]}>
        <boxGeometry args={[0.07, 0.07, 0.4]} />
        <meshStandardMaterial color="#101216" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* arms + spinning rotors */}
      <group ref={rotors}>
        {[
          [-0.5, -0.5],
          [0.5, -0.5],
          [-0.5, 0.5],
          [0.5, 0.5],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.08, z]}>
            <mesh rotation={[0, (i * Math.PI) / 4, 0]}>
              <boxGeometry args={[0.55, 0.02, 0.07]} />
              <meshBasicMaterial color="#9fb4c8" transparent opacity={0.55} />
            </mesh>
          </group>
        ))}
      </group>
      {[
        [-0.38, -0.38],
        [0.38, -0.38],
        [-0.38, 0.38],
        [0.38, 0.38],
      ].map(([x, z], i) => (
        <mesh key={"a" + i} position={[x * 0.75, 0.02, z * 0.75]} rotation={[0, Math.atan2(x, z), 0]}>
          <boxGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#171b21" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function GunshipMesh({ bot, refs }: { bot: Bot; refs: Map<number, THREE.Group> }) {
  const rotor = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.y += dt * 34;
    if (tail.current) tail.current.rotation.x += dt * 44;
  });
  return (
    <group
      ref={(g) => {
        if (g) refs.set(bot.id, g);
        else refs.delete(bot.id);
      }}
    >
      {/* fuselage */}
      <mesh castShadow>
        <boxGeometry args={[2.1, 1.15, 4.4]} />
        <meshStandardMaterial color="#23282e" roughness={0.45} metalness={0.6} />
      </mesh>
      {/* nose + cockpit glass */}
      <mesh castShadow position={[0, 0.08, -2.5]}>
        <boxGeometry args={[1.7, 0.85, 0.9]} />
        <meshStandardMaterial color="#1a1e23" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.32, -2.85]}>
        <boxGeometry args={[1.45, 0.5, 0.35]} />
        <meshStandardMaterial color="#7fd4ff" emissive="#2a6a8a" emissiveIntensity={0.7} roughness={0.15} metalness={0.7} />
      </mesh>
      {/* engine intakes */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} castShadow position={[x, 0.72, -0.4]}>
          <boxGeometry args={[0.55, 0.4, 1.3]} />
          <meshStandardMaterial color="#14171b" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* tail boom + fin */}
      <mesh castShadow position={[0, 0.22, 3.6]}>
        <boxGeometry args={[0.42, 0.5, 3.2]} />
        <meshStandardMaterial color="#1d2126" roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 0.85, 5.1]}>
        <boxGeometry args={[0.12, 1.1, 0.7]} />
        <meshStandardMaterial color="#8a1f1f" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* tail rotor */}
      <group ref={tail} position={[0.32, 0.85, 5.1]}>
        <mesh>
          <boxGeometry args={[0.04, 1.15, 0.14]} />
          <meshBasicMaterial color="#9fb4c8" transparent opacity={0.6} />
        </mesh>
      </group>
      {/* main rotor */}
      <mesh position={[0, 0.78, -0.2]}>
        <cylinderGeometry args={[0.14, 0.18, 0.5, 8]} />
        <meshStandardMaterial color="#101216" metalness={0.7} roughness={0.35} />
      </mesh>
      <group ref={rotor} position={[0, 1.05, -0.2]}>
        <mesh>
          <boxGeometry args={[11.5, 0.04, 0.5]} />
          <meshBasicMaterial color="#aebbc8" transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[11.5, 0.04, 0.5]} />
          <meshBasicMaterial color="#aebbc8" transparent opacity={0.35} />
        </mesh>
      </group>
      {/* stub wings + rocket pods */}
      {[-1.45, 1.45].map((x) => (
        <group key={x} position={[x, -0.15, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.14, 1.1]} />
            <meshStandardMaterial color="#1d2126" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh castShadow position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.19, 0.19, 1.25, 10]} />
            <meshStandardMaterial color="#3a3f45" roughness={0.45} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* nose minigun */}
      <mesh position={[0.45, -0.5, -2.6]} rotation={[Math.PI / 2.4, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
        <meshStandardMaterial color="#0c0d0f" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* skids */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={"sk" + x} position={[x, -1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 3.6, 6]} />
          <meshStandardMaterial color="#14171b" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* searchlight cone */}
      <mesh position={[0, -6.5, -1]} rotation={[0.12, 0, 0]}>
        <coneGeometry args={[4.2, 12, 20, 1, true]} />
        <meshBasicMaterial color="#ffe9a8" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight position={[0, -1.4, -1]} intensity={60} distance={26} color="#ffe9a8" />
      {/* red nav strobes */}
      <mesh position={[-2.3, 0, 0.5]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshStandardMaterial color="#ff2020" emissive="#ff2020" emissiveIntensity={3} />
      </mesh>
      <mesh position={[2.3, 0, 0.5]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshStandardMaterial color="#20ff60" emissive="#20ff60" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

export default function Enemies() {
  const bots = useRef<Bot[]>([]);
  const groups = useRef(new Map<number, THREE.Group>());
  const waveDelay = useRef(0);
  const defendSpawnT = useRef(0);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [renderIds, setRenderIds] = useState<number[]>([]);

  const tmpV = useMemo(() => new THREE.Vector3(), []);

  const baseHpFor = (w: number) => 90 + w * 14;

  function damagePlayer(dmg: number) {
    const st = useGameStore.getState();
    if (st.phase !== "playing") return;
    const hp = Math.max(0, st.health - dmg);
    st.set({ health: hp, damageFlash: Date.now(), tookDamageThisWave: true });
    playerState.lastHurt?.(0);
    sfxHurt();
    if (hp <= 0) {
      st.finish("dead");
      document.exitPointerLock?.();
      st.addKillfeed("YOU WERE ELIMINATED");
    }
  }

  function explodeBot(b: Bot) {
    if (b.exploded) return;
    b.exploded = true;
    b.alive = false;
    b.deathT = 0;
    const reg = enemyRegistry.get(b.id);
    if (reg) reg.alive = false;
    explodeAt(new THREE.Vector3(b.pos.x, b.pos.y + 1, b.pos.z), 4.6, 90, 34);
  }

  function pickKind(w: number): EnemyKind {
    const r = Math.random();
    if (w >= 6 && r < 0.1) return "marksman";
    if (w >= 4 && r < 0.2) return "heavy";
    if (w >= 5 && r < 0.33) return "drone";
    if (w >= 3 && r < 0.5) return "exploder";
    if (w >= 2 && r < 0.74) return "runner";
    return "soldier";
  }

  function spawnBot(kind: EnemyKind, w: number, posOverride?: THREE.Vector3) {
    const st = KIND_STATS[kind];
    const baseHp = baseHpFor(w);
    let x: number, z: number;
    if (posOverride) {
      x = posOverride.x;
      z = posOverride.z;
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 7;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      // keep away from player spawn
      if (Math.hypot(x - playerState.pos.x, z - playerState.pos.z) < 18) {
        x = -x;
        z = -z;
      }
    }
    const hp =
      kind === "boss"
        ? 1650 + Math.max(0, w - MAX_WAVE) * 220
        : kind === "gunship"
          ? 2300 + Math.max(0, w - MAX_WAVE) * 200
          : Math.round(baseHp * st.hp);
    const speed =
      kind === "boss" ? 4.4 : Math.min(9.5, (5.2 + Math.random() * 1.8 + w * 0.28) * st.speed);
    const b: Bot = {
      id: botId++,
      kind,
      pos: new THREE.Vector3(x, 0, z),
      health: hp,
      maxHealth: hp,
      alive: true,
      deathT: 0,
      shootCd: 1.5 + Math.random() * 2,
      burst: 0,
      speed,
      strafePhase: Math.random() * 10,
      dmgMult: st.dmg,
      scaleF: st.scale,
      exploded: false,
      enraged: false,
      aiming: false,
      aimT: 0,
      atkT: 2.2,
      atkAlt: 0,
      strafeT: 0,
      shotT: 0,
      orbitA: Math.random() * Math.PI * 2,
    };
    bots.current.push(b);
    enemyRegistry.set(b.id, {
      id: b.id,
      pos: b.pos,
      health: b.health,
      maxHealth: b.maxHealth,
      alive: true,
      speed: b.speed,
      radius: 0.5 * st.scale,
      kind,
    });
    return b;
  }

  function isBossWave(w: number, endless: boolean) {
    return w === MAX_WAVE || (endless && w > MAX_WAVE && w % 5 === 0);
  }
  function isGunshipWave(w: number) {
    return Math.floor(w / 5) % 2 === 1;
  }
  function isStormWave(w: number, bossWave: boolean) {
    return !bossWave && w > 1 && w % 4 === 2 && w % 3 !== 0;
  }
  function isDefendWave(w: number, bossWave: boolean) {
    return !bossWave && (w === 8 || w % 7 === 4);
  }

  function spawnWave(w: number) {
    resetBarrels();
    const s = useGameStore.getState();
    s.set({ tookDamageThisWave: false });
    if (w >= 7) s.unlockAch("survivor");
    const bossWave = isBossWave(w, s.endless);
    const defend = isDefendWave(w, bossWave);
    s.set({ storm: isStormWave(w, bossWave) });

    if (defend) {
      const spots = s.mapId === "forest" ? FOREST_ZONE_SPOTS : ZONE_SPOTS;
      const [zx, zz] = spots[w % spots.length];
      s.set({ objective: "defend", objectiveTimeLeft: 60, zoneX: zx, zoneZ: zz, playerInZone: false });
      defendSpawnT.current = 2.4;
      for (let i = 0; i < 5; i++) spawnBot(w === 1 ? "soldier" : pickKind(w), w);
      s.set({ wave: w, enemiesLeft: 5, bossHealth: 0, bossMax: 0 });
      s.addKillfeed(`🛡️ WAVE ${w} — DEFEND THE ZONE FOR 60s`);
      setRenderIds(bots.current.map((b) => b.id));
      force();
      return;
    }

    s.set({ objective: "elim", objectiveTimeLeft: 0 });
    const count = bossWave ? 6 : Math.min(3 + w * 2, 14);
    for (let i = 0; i < count; i++) {
      spawnBot(w === 1 ? "soldier" : pickKind(w), w);
    }
    let total = count;
    if (bossWave) {
      const gunship = isGunshipWave(w);
      const boss = gunship ? spawnBot("gunship", w, new THREE.Vector3(28, 0, 0)) : spawnBot("boss", w, new THREE.Vector3(0, 0, -30));
      total += 1;
      s.set({ bossHealth: boss.health, bossMax: boss.maxHealth, bossEnraged: false, bossKind: gunship ? "gunship" : "juggernaut" });
    } else {
      s.set({ bossHealth: 0, bossMax: 0, bossEnraged: false, bossKind: null });
    }
    s.set({ wave: w, enemiesLeft: total });
    if (bossWave) s.addKillfeed(isGunshipWave(w) ? "🚁 GUNSHIP INBOUND 🚁" : "⚠ JUGGERNAUT INBOUND ⚠");
    else if (s.storm) s.addKillfeed(`🌧️ WAVE ${w} — STORM FRONT, ${total} HOSTILES`);
    else if (w % 3 === 0) s.addKillfeed(`🌙 WAVE ${w} — NIGHT OPS, ${total} HOSTILES`);
    else s.addKillfeed(`WAVE ${w} INBOUND — ${total} HOSTILES`);
    setRenderIds(bots.current.map((b) => b.id));
    force();
  }

  function losBlocked(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const dir = to.clone().sub(from);
    const len = dir.length();
    dir.normalize();
    for (const c of colliders) {
      let tmin = 0, tmax = len;
      let ok = true;
      for (const ax of ["x", "y", "z"] as const) {
        const o = from[ax], d = dir[ax];
        if (Math.abs(d) < 1e-8) {
          if (o < c.min[ax] || o > c.max[ax]) { ok = false; break; }
        } else {
          let t1 = (c.min[ax] - o) / d, t2 = (c.max[ax] - o) / d;
          if (t1 > t2) [t1, t2] = [t2, t1];
          tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
          if (tmin > tmax) { ok = false; break; }
        }
      }
      if (ok && tmin > 1 && tmin < len - 1) return true;
    }
    return false;
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05) * timeState.scale;
    const s = useGameStore.getState();
    const t = state.clock.elapsedTime;

    if (s.phase === "playing" && s.pendingWave > 0) {
      const pw = s.pendingWave;
      s.set({ pendingWave: 0 });
      spawnWave(pw);
    }
    if (s.phase === "playing" && s.wave === 0) {
      if (bots.current.length > 0) {
        bots.current = [];
        enemyRegistry.clear();
        groups.current.clear();
      }
      bots.current = [];
      enemyRegistry.clear();
      spawnWave(1);
    }
    if (s.phase !== "playing") return;

    // sync registry health (hitscan writes there)
    for (const b of bots.current) {
      const reg = enemyRegistry.get(b.id);
      if (reg && b.alive) {
        if (reg.health !== b.health) b.health = reg.health;
        if (b.health <= 0) {
          b.alive = false;
          b.aiming = false;
          b.deathT = 0;
          reg.alive = false;
          if (b.kind === "boss" || b.kind === "gunship") s.set({ bossHealth: 0 });
          if (b.kind === "exploder") explodeBot(b);
        } else if (b.kind === "gunship") {
          if (!b.enraged && b.health <= b.maxHealth * 0.5) {
            b.enraged = true;
            s.set({ bossEnraged: true });
            s.addKillfeed("🚁 GUNSHIP DAMAGED — WEAPONS FREE, IT'S ANGRY");
          }
          if (Math.ceil(b.health) !== s.bossHealth) s.set({ bossHealth: Math.ceil(b.health) });
        } else if (b.kind === "boss") {
          // phase 2: enrage at 40% HP — faster, harder, calls escorts
          if (!b.enraged && b.health <= b.maxHealth * 0.4) {
            b.enraged = true;
            b.speed *= 1.55;
            b.dmgMult *= 1.3;
            s.set({ bossEnraged: true });
            s.addKillfeed("⚠ JUGGERNAUT ENRAGED — ESCORTS INBOUND ⚠");
            for (let i = 0; i < 3; i++) {
              spawnBot(i === 0 ? "runner" : "soldier", s.wave, new THREE.Vector3(b.pos.x + (i - 1) * 3, 0, b.pos.z + 3));
            }
            setRenderIds(bots.current.map((x) => x.id));
            force();
          }
          if (Math.ceil(b.health) !== s.bossHealth) s.set({ bossHealth: Math.ceil(b.health) });
        }
      }
    }

    let aliveCount = 0;

    for (let i = bots.current.length - 1; i >= 0; i--) {
      const b = bots.current[i];
      const g = groups.current.get(b.id);
      if (!b.alive) {
        b.deathT += dt;
        if (g) {
          if (b.kind === "gunship") {
            g.position.y = Math.max(0.8, GUNSHIP_ALT - b.deathT * b.deathT * 3.2);
            g.rotation.z = Math.min(0.9, b.deathT * 1.6);
            g.rotation.x = Math.min(0.5, b.deathT * 0.9);
            if (!b.exploded && g.position.y <= 0.9) {
              b.exploded = true;
              pushExplosion(new THREE.Vector3(b.pos.x, 1, b.pos.z), 8);
            }
          } else if (b.kind === "drone") {
            // drones crash out of the sky
            g.position.y = Math.max(0.25, DRONE_HOVER - b.deathT * 5.5);
            g.rotation.z = Math.min(1.1, b.deathT * 2.4);
            g.rotation.x = Math.min(0.7, b.deathT * 1.8);
          } else {
            g.rotation.x = Math.min(-Math.PI / 2, g.rotation.x - dt * 4);
            g.position.y = Math.max(-0.6, g.position.y - dt * 0.4);
          }
        }
        if (b.deathT > 2.2) {
          bots.current.splice(i, 1);
          enemyRegistry.delete(b.id);
          if (g) g.visible = false;
        }
        continue;
      }
      aliveCount++;

      // steer to player — aggressive rush with fast weave
      tmpV.set(playerState.pos.x - b.pos.x, 0, playerState.pos.z - b.pos.z);
      const dist = tmpV.length();
      tmpV.normalize();

      // ---- gunship: orbits the arena, strafes and fires rocket salvos ----
      if (b.kind === "gunship") {
        const R = 30 + Math.sin(t * 0.11 + b.strafePhase) * 5;
        b.orbitA += ((b.enraged ? 7.4 : 5.6) / R) * dt;
        b.pos.x = Math.cos(b.orbitA) * R;
        b.pos.z = Math.sin(b.orbitA) * R;
        if (g) {
          g.position.set(b.pos.x, GUNSHIP_ALT + Math.sin(t * 0.9 + b.strafePhase) * 0.7, b.pos.z);
          g.rotation.y = Math.atan2(-Math.sin(b.orbitA), Math.cos(b.orbitA)) + Math.PI;
          g.rotation.z = 0.16;
        }
        const greg = enemyRegistry.get(b.id);
        if (greg) {
          greg.pos.copy(b.pos);
          greg.health = b.health;
        }
        // attack cycle
        if (b.strafeT > 0) {
          b.strafeT -= dt;
          b.shotT -= dt;
          if (b.shotT <= 0) {
            b.shotT = 0.11;
            const from = new THREE.Vector3(b.pos.x, GUNSHIP_ALT - 0.6, b.pos.z);
            const target = new THREE.Vector3(
              playerState.pos.x + (Math.random() - 0.5) * 2.4,
              playerState.pos.y + 1.2,
              playerState.pos.z + (Math.random() - 0.5) * 2.4
            );
            pushTracer(from, target, true);
            sfxEnemyShoot();
            const dodge = playerState.sliding ? 0.45 : playerState.sprinting ? 0.75 : 1;
            if (Math.random() < 0.3 * dodge) damagePlayer(5 + s.wave * 0.15);
          }
        } else {
          b.atkT -= dt;
          if (b.atkT <= 0) {
            b.atkAlt += 1;
            if (b.atkAlt % 2 === 1) {
              // rocket salvo: telegraphed marks around the player
              const nowMs = performance.now();
              const offs: [number, number][] = [
                [0, 0],
                [5, 3],
                [-4, 4],
                [2, -5],
              ];
              offs.forEach(([ox, oz], i) => {
                rocketMarks.push({
                  x: Math.max(-50, Math.min(50, playerState.pos.x + ox + (Math.random() - 0.5) * 2)),
                  z: Math.max(-50, Math.min(50, playerState.pos.z + oz + (Math.random() - 0.5) * 2)),
                  at: nowMs + 1050 + i * 150,
                });
              });
              s.addKillfeed("🚁 ROCKET SALVO — MOVE!");
              b.atkT = b.enraged ? 3.4 : 4.6;
            } else {
              b.strafeT = b.enraged ? 2.8 : 2.2;
              b.atkT = b.enraged ? 3.2 : 4.2;
            }
          }
        }
        continue;
      }

      // exploders just run at the player and blow up
      if (b.kind === "exploder" && dist < 2.1) {
        explodeBot(b);
        continue;
      }

      // strafe weave (drones circle wider)
      const strafe = Math.sin(t * 2.3 + b.strafePhase) * (b.kind === "drone" ? 1.25 : 0.95);
      const px = -tmpV.z * strafe;
      const pz = tmpV.x * strafe;
      const wantDist =
        b.kind === "exploder" ? 0.5 : b.kind === "runner" ? 5 : b.kind === "heavy" ? 8.5 : b.kind === "boss" ? 9 : b.kind === "drone" ? 13 : b.kind === "marksman" ? 24 : 6.5;
      let approach = dist > wantDist ? 1.35 : dist < 4 && b.kind !== "drone" ? -0.8 : 0.3;
      if (b.kind === "marksman") approach = dist > 27 ? 1.1 : dist < 18 ? -1 : 0;
      // long-range rush burst closes the gap fast
      let rush = dist > 22 ? 1.4 : dist > 14 ? 1.2 : 1;
      const vx = (tmpV.x * approach + px * 0.65) * b.speed * rush;
      const vz = (tmpV.z * approach + pz * 0.65) * b.speed * rush;

      b.pos.x += vx * dt;
      b.pos.z += vz * dt;
      collideCircle(b.pos, 0.45, 1.7);
      // separation
      for (const o of bots.current) {
        if (o === b || !o.alive) continue;
        const dx = b.pos.x - o.pos.x;
        const dz = b.pos.z - o.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 2.2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          b.pos.x += (dx / d) * dt * 2;
          b.pos.z += (dz / d) * dt * 2;
        }
      }

      if (g) {
        g.position.copy(b.pos);
        if (b.kind === "drone") {
          g.position.y = b.pos.y + DRONE_HOVER + Math.sin(t * 2.1 + b.strafePhase) * 0.25;
        } else {
          // sprinty run bob + lean into motion
          g.position.y = b.pos.y + Math.abs(Math.sin(t * 11 + b.strafePhase)) * 0.09;
        }
        g.rotation.y = Math.atan2(tmpV.x, tmpV.z) + Math.PI;
        g.rotation.x = THREE.MathUtils.clamp(b.speed * 0.02, 0, 0.16);
      }
      const reg = enemyRegistry.get(b.id);
      if (reg) {
        reg.pos.copy(b.pos);
        reg.health = b.health;
      }

      // marksman: telegraphed laser aim, then one heavy shot
      if (b.kind === "marksman") {
        const mFrom = new THREE.Vector3(b.pos.x, b.pos.y + 1.45, b.pos.z);
        const mTo = new THREE.Vector3(playerState.pos.x, playerState.pos.y + 1.35, playerState.pos.z);
        const clear = dist < 47 && !losBlocked(mFrom, mTo);
        if (b.aiming) {
          if (!clear) {
            b.aiming = false;
            b.shootCd = 0.6;
          } else {
            b.aimT -= dt;
            if (b.aimT <= 0) {
              b.aiming = false;
              b.shootCd = 2.4 + Math.random() * 0.9;
              pushTracer(mFrom, mTo, true);
              sfxEnemyShoot();
              damagePlayer((20 + s.wave * 0.8) * b.dmgMult);
            }
          }
        } else {
          b.shootCd -= dt;
          if (b.shootCd <= 0 && clear && dist > 6) {
            b.aiming = true;
            b.aimT = 1.15;
          }
        }
      }

      // shooting (exploders never shoot — they are the bullet)
      if (b.kind !== "marksman") b.shootCd -= dt;
      const eyeY = b.kind === "drone" ? DRONE_HOVER : 1.4;
      if (b.kind !== "exploder" && b.kind !== "marksman" && b.shootCd <= 0 && dist < 48 && dist > 3) {
        // LOS check: sample ray vs colliders coarsely
        const from = new THREE.Vector3(b.pos.x, b.pos.y + eyeY, b.pos.z);
        const to = new THREE.Vector3(playerState.pos.x, playerState.pos.y + 1.4, playerState.pos.z);
        const dir = to.clone().sub(from);
        const len = dir.length();
        dir.normalize();
        let blocked = false;
        for (const c of colliders) {
          // slab test
          let tmin = 0, tmax = len;
          let ok = true;
          for (const ax of ["x", "y", "z"] as const) {
            const o = from[ax], d = dir[ax];
            if (Math.abs(d) < 1e-8) {
              if (o < c.min[ax] || o > c.max[ax]) { ok = false; break; }
            } else {
              let t1 = (c.min[ax] - o) / d, t2 = (c.max[ax] - o) / d;
              if (t1 > t2) [t1, t2] = [t2, t1];
              tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
              if (tmin > tmax) { ok = false; break; }
            }
          }
          if (ok && tmin > 1 && tmin < len - 1) { blocked = true; break; }
        }
        if (!blocked) {
          b.burst = b.kind === "boss" ? 6 : b.kind === "heavy" ? 5 : b.kind === "runner" ? 2 : 3;
          b.shootCd =
            b.kind === "boss"
              ? 0.9 + Math.random() * 0.8
              : 1.1 + Math.random() * 1.6 - s.wave * 0.05;
        } else {
          b.shootCd = 0.4;
        }
      }
      if (b.burst > 0) {
        b.burst -= dt * 7;
        if (Math.random() < dt * 7) {
          const from = new THREE.Vector3(b.pos.x, b.pos.y + eyeY - 0.05, b.pos.z);
          const target = new THREE.Vector3(
            playerState.pos.x + (Math.random() - 0.5) * (1.2 + dist * 0.06),
            playerState.pos.y + 1.3 + (Math.random() - 0.5) * 0.8,
            playerState.pos.z + (Math.random() - 0.5) * (1.2 + dist * 0.06)
          );
          pushTracer(from, target, true);
          sfxEnemyShoot();
          // hit chance
          const dodge = playerState.sliding ? 0.45 : playerState.sprinting ? 0.75 : 1;
          const pHit = Math.max(0.08, 0.42 - dist * 0.007) * dodge;
          if (Math.random() < pHit * 0.5) {
            const dmg = (7 + Math.random() * 7 + s.wave * 0.5) * b.dmgMult;
            damagePlayer(dmg);
          }
        }
      }
    }

    if (s.enemiesLeft !== aliveCount) s.set({ enemiesLeft: aliveCount });
    // keep render list in sync when a corpse is removed
    if (renderIds.length !== bots.current.length) {
      setRenderIds(bots.current.map((b) => b.id));
    }

    // ---- defend-the-zone objective ----
    if (s.objective === "defend" && s.objectiveTimeLeft > 0) {
      const dx = playerState.pos.x - s.zoneX;
      const dz = playerState.pos.z - s.zoneZ;
      const inZone = dx * dx + dz * dz < 36;
      if (inZone !== s.playerInZone) s.set({ playerInZone: inZone });

      // trickle reinforcements keep the pressure on
      defendSpawnT.current -= dt;
      if (defendSpawnT.current <= 0 && aliveCount < 8) {
        defendSpawnT.current = 2.4;
        spawnBot(pickKind(s.wave), s.wave);
        setRenderIds(bots.current.map((b) => b.id));
        force();
      }

      if (inZone) {
        const tl = s.objectiveTimeLeft - dt;
        if (tl <= 0) {
          s.set({ objectiveTimeLeft: 0 });
          // zone held — remaining hostiles are wiped (no score)
          for (const b of bots.current) {
            if (b.alive) {
              b.health = 0;
              if (b.kind === "exploder") b.exploded = true; // wiped cleanly — no parting blast
              const reg = enemyRegistry.get(b.id);
              if (reg) {
                reg.health = 0;
                reg.alive = false;
              }
            }
          }
          s.addKillfeed("🛡️ ZONE HELD — HOSTILES WIPED");
        } else if (Math.ceil(tl) !== Math.ceil(s.objectiveTimeLeft)) {
          s.set({ objectiveTimeLeft: tl });
        }
      }
    }

    // gunship rocket salvos land
    for (let i = rocketMarks.length - 1; i >= 0; i--) {
      if (performance.now() >= rocketMarks[i].at) {
        const m = rocketMarks[i];
        rocketMarks.splice(i, 1);
        explodeAt(new THREE.Vector3(m.x, 0.7, m.z), 5, 55, 30);
      }
    }

    // wave cleared
    const defendDone = s.objective !== "defend" || s.objectiveTimeLeft <= 0;
    if (aliveCount === 0 && bots.current.length === 0 && defendDone) {
      waveDelay.current += dt;
      if (waveDelay.current > 2.5) {
        waveDelay.current = 0;
        const st = useGameStore.getState();
        // wave-clear achievements
        if (!st.tookDamageThisWave) st.unlockAch("untouchable");
        if (s.wave % 3 === 0) st.unlockAch("nightowl");
        if (st.storm) st.unlockAch("stormrider");
        if (s.wave >= MAX_WAVE && !s.endless) {
          st.finish("victory");
          document.exitPointerLock?.();
        } else {
          st.set({
            score: st.score + 250,
            health: Math.min(st.maxHealth, st.health + 30),
            grenades: Math.min(5, st.grenades + 1),
            ammo: {
              ar: { mag: 30, reserve: Math.min(240, st.ammo.ar.reserve + 60) },
              smg: { mag: 40, reserve: Math.min(300, st.ammo.smg.reserve + 80) },
              sg: { mag: 6, reserve: Math.min(48, st.ammo.sg.reserve + 12) },
              sn: { mag: 5, reserve: Math.min(40, st.ammo.sn.reserve + 8) },
              saw: { mag: 100, reserve: Math.min(400, st.ammo.saw.reserve + 120) },
              stinger: { mag: 1, reserve: Math.min(10, st.ammo.stinger.reserve + 2) },
            },
            turrets: Math.min(2, st.turrets + (s.wave % 2 === 0 ? 1 : 0)),
            healthBags: Math.min(3, st.healthBags + (s.wave % 3 === 0 ? 1 : 0)),
          });
          // offer a perk before the next wave
          const pool = [...PERK_POOL];
          const choices: PerkId[] = [];
          while (choices.length < 3 && pool.length > 0) {
            const idx = Math.floor(Math.random() * pool.length);
            choices.push(pool.splice(idx, 1)[0]);
          }
          st.addKillfeed(`WAVE ${s.wave} CLEARED +250`);
          st.set({ phase: "perk", perkChoices: choices });
          document.exitPointerLock?.();
        }
      }
    } else {
      waveDelay.current = 0;
    }

    // reset when going to menu
    const curPhase = (useGameStore.getState().phase as string);
    if (curPhase === "menu" && bots.current.length > 0) {
      bots.current = [];
      enemyRegistry.clear();
      groups.current.clear();
    }
  });

  // render list — snapshot of bots, synced via renderIds
  const byId = new Map(bots.current.map((b) => [b.id, b]));

  return (
    <group>
      {renderIds.map((id) => {
        const b = byId.get(id);
        if (!b) return null;
        return b.kind === "drone" ? (
          <DroneMesh key={id} bot={b} refs={groups.current} />
        ) : b.kind === "gunship" ? (
          <GunshipMesh key={id} bot={b} refs={groups.current} />
        ) : (
          <SoldierMesh key={id} bot={b} refs={groups.current} />
        );
      })}
      {renderIds.map((id) => {
        const b = byId.get(id);
        if (!b || b.kind !== "marksman") return null;
        return <LaserBeam key={"laser" + id} bot={b} />;
      })}
    </group>
  );
}

/** Marksman aim laser: a thin red beam from his rifle to the player while he aims. */
function LaserBeam({ bot }: { bot: Bot }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mid = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.visible = bot.alive && bot.aiming;
    if (!m.visible) return;
    const from = new THREE.Vector3(bot.pos.x, bot.pos.y + 1.45, bot.pos.z);
    const to = new THREE.Vector3(playerState.pos.x, playerState.pos.y + 1.35, playerState.pos.z);
    mid.addVectors(from, to).multiplyScalar(0.5);
    m.position.copy(mid);
    m.scale.set(1, 1, from.distanceTo(to));
    m.lookAt(to);
  });
  return (
    <mesh ref={mesh} visible={false}>
      <boxGeometry args={[0.025, 0.025, 1]} />
      <meshBasicMaterial color="#ff2222" transparent opacity={0.75} depthWrite={false} />
    </mesh>
  );
}

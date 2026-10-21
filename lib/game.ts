// Shared mutable game runtime (no react re-render per frame)
import * as THREE from "three";
import { useGameStore } from "@/lib/store";
import type { MapId } from "@/lib/store";
import { sfxExplosion } from "@/lib/audio";

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export const colliders: AABB[] = [];

export function addCollider(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) {
  colliders.push({
    min: new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
    max: new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
  });
}

export function clearColliders() {
  colliders.length = 0;
}

// Resolve XZ + stand-on-top for a capsule approximated as vertical segment
export function collideCircle(
  pos: THREE.Vector3,
  radius: number,
  height: number
): { groundedOn: number | null } {
  let groundedOn: number | null = null;
  for (const c of colliders) {
    // expand box by radius in XZ
    const ex0 = c.min.x - radius;
    const ex1 = c.max.x + radius;
    const ez0 = c.min.z - radius;
    const ez1 = c.max.z + radius;
    if (pos.x > ex0 && pos.x < ex1 && pos.z > ez0 && pos.z < ez1) {
      const footY = pos.y; // feet
      const headY = pos.y + height;
      const boxTop = c.max.y;
      const boxBottom = c.min.y;
      // standing on top?
      if (footY >= boxTop - 0.45 && footY <= boxTop + 0.35 && headY > boxTop) {
        pos.y = boxTop;
        groundedOn = boxTop;
        continue;
      }
      // side collision only if body overlaps vertically
      if (headY > boxBottom + 0.05 && footY < boxTop - 0.3) {
        // push out along smallest penetration axis
        const dx0 = pos.x - ex0;
        const dx1 = ex1 - pos.x;
        const dz0 = pos.z - ez0;
        const dz1 = pos.z - ez1;
        const m = Math.min(dx0, dx1, dz0, dz1);
        if (m === dx0) pos.x = ex0;
        else if (m === dx1) pos.x = ex1;
        else if (m === dz0) pos.z = ez0;
        else pos.z = ez1;
      }
    }
  }
  // arena bounds
  const B = 56;
  pos.x = Math.max(-B, Math.min(B, pos.x));
  pos.z = Math.max(-B, Math.min(B, pos.z));
  return { groundedOn };
}

// ---- slow-motion (final-kill effect) ----
export const timeState = { scale: 1 };
let slowMoTimer: ReturnType<typeof setTimeout> | null = null;
export function triggerSlowMo(ms = 850) {
  timeState.scale = 0.3;
  if (slowMoTimer) clearTimeout(slowMoTimer);
  slowMoTimer = setTimeout(() => {
    timeState.scale = 1;
  }, ms);
}

// ---- enemy registry for hitscan ----
export type EnemyKind = "soldier" | "runner" | "heavy" | "exploder" | "boss" | "drone" | "marksman";

/** Mesh scale per kind (hit spheres scale with it). */
export const KIND_SCALE: Record<EnemyKind, number> = {
  soldier: 1,
  runner: 0.94,
  heavy: 1.35,
  exploder: 0.95,
  boss: 1.9,
  drone: 1,
  marksman: 1,
};

/** Hitscan profile per kind: heights above feet + sphere radii. */
export function hitProfile(kind: EnemyKind): { chestY: number; headY: number; chestR: number; headR: number } {
  if (kind === "drone") return { chestY: 3.35, headY: 3.35, chestR: 0.55, headR: 0.34 };
  const f = KIND_SCALE[kind];
  return { chestY: 1.15 * f, headY: 1.72 * f, chestR: 0.55 * f, headR: 0.32 * f };
}

export interface EnemyEntry {
  id: number;
  pos: THREE.Vector3; // feet position
  health: number;
  maxHealth: number;
  alive: boolean;
  speed: number;
  radius: number;
  kind: EnemyKind;
}

export const enemyRegistry: Map<number, EnemyEntry> = new Map();

export interface PlayerState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  sliding: boolean;
  sprinting: boolean;
  ads: boolean;
  firingHeld: boolean;
  lastHurt: ((t: number) => void) | null;
}

export const playerState: PlayerState = {
  pos: new THREE.Vector3(0, 0, 14),
  vel: new THREE.Vector3(),
  yaw: Math.PI, // face -z? adjusted in player
  pitch: 0,
  grounded: true,
  sliding: false,
  sprinting: false,
  ads: false,
  firingHeld: false,
  lastHurt: null,
};

// ---- explosive barrels ----
export interface BarrelDef {
  id: number;
  x: number;
  z: number;
}
export const ARENA_BARREL_DEFS: BarrelDef[] = [
  { id: 1, x: 1, z: -3 },
  { id: 2, x: -11, z: -21 },
  { id: 3, x: 24, z: 10 },
  { id: 4, x: -4, z: 17 },
  { id: 5, x: 12, z: -12 },
];

export const FOREST_BARREL_DEFS: BarrelDef[] = [
  { id: 1, x: -18, z: -14 },
  { id: 2, x: 16, z: 20 },
  { id: 3, x: 20, z: -22 },
  { id: 4, x: -22, z: 12 },
  { id: 5, x: 2, z: -26 },
];

export function barrelDefsFor(map: MapId): BarrelDef[] {
  return map === "forest" ? FOREST_BARREL_DEFS : ARENA_BARREL_DEFS;
}

export interface BarrelEntry {
  id: number;
  pos: THREE.Vector3; // center of the barrel
  alive: boolean;
  radius: number;
}

export const barrelRegistry: Map<number, BarrelEntry> = new Map();

export function setupBarrels(map: MapId) {
  barrelRegistry.clear();
  for (const d of barrelDefsFor(map)) {
    barrelRegistry.set(d.id, { id: d.id, pos: new THREE.Vector3(d.x, 0.55, d.z), alive: true, radius: 0.62 });
  }
}
setupBarrels("arena");

export function resetBarrels() {
  for (const b of barrelRegistry.values()) b.alive = true;
}

// ---- FX queues ----
export interface TracerEvent {
  id: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  enemy: boolean;
  idc: number;
}
export interface ImpactEvent {
  id: number;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  blood: boolean;
}
export interface ExplosionEvent {
  id: number;
  pos: THREE.Vector3;
  radius: number;
}
let fxId = 1;
export const tracerQueue: TracerEvent[] = [];
export const impactQueue: ImpactEvent[] = [];
export const explosionQueue: ExplosionEvent[] = [];

export function pushTracer(from: THREE.Vector3, to: THREE.Vector3, enemy = false) {
  tracerQueue.push({ id: fxId++, from: from.clone(), to: to.clone(), enemy, idc: fxId });
  if (tracerQueue.length > 60) tracerQueue.shift();
}
export function pushImpact(pos: THREE.Vector3, blood = false, normal?: THREE.Vector3) {
  impactQueue.push({
    id: fxId++,
    pos: pos.clone(),
    normal: normal ? normal.clone() : new THREE.Vector3(0, 1, 0),
    blood,
  });
  if (impactQueue.length > 60) impactQueue.shift();
}
export function pushExplosion(pos: THREE.Vector3, radius: number) {
  explosionQueue.push({ id: fxId++, pos: pos.clone(), radius });
  if (explosionQueue.length > 10) explosionQueue.shift();
}

// ---- player grenades (physics stepped by components/Grenades.tsx) ----
export interface LiveGrenade {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fuse: number;
}
export const liveGrenades: LiveGrenade[] = [];

export function spawnGrenade() {
  const origin = new THREE.Vector3().copy(playerState.pos);
  origin.y += 1.55;
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(playerState.pitch, playerState.yaw, 0, "YXZ"));
  const vel = dir.multiplyScalar(21);
  vel.y += 4.5;
  liveGrenades.push({ pos: origin.addScaledVector(dir, 0.4), vel, fuse: 1.6 });
  if (liveGrenades.length > 6) liveGrenades.shift();
}

/**
 * Radial explosion: damages every live enemy in range (registry health,
 * Enemies.tsx turns that into deaths) and the player with distance falloff.
 * Returns the registry entries this blast killed, so the shooter can be
 * credited for barrel kills.
 */
export function explodeAt(
  center: THREE.Vector3,
  radius: number,
  maxEnemyDmg: number,
  maxPlayerDmg: number
): EnemyEntry[] {
  pushExplosion(center, radius);
  sfxExplosion();
  const killed: EnemyEntry[] = [];
  for (const e of enemyRegistry.values()) {
    if (!e.alive) continue;
    const c = new THREE.Vector3(e.pos.x, e.pos.y + 1, e.pos.z);
    const d = c.distanceTo(center);
    if (d > radius + e.radius) continue;
    const fall = Math.max(0.25, 1 - d / (radius + e.radius));
    e.health -= maxEnemyDmg * fall;
    if (e.health <= 0 && e.alive) {
      e.alive = false;
      killed.push(e);
    }
  }
  // player damage
  const pd = new THREE.Vector3(playerState.pos.x, playerState.pos.y + 1, playerState.pos.z).distanceTo(center);
  if (pd < radius + 0.6 && maxPlayerDmg > 0) {
    const fall = Math.max(0.2, 1 - pd / (radius + 0.6));
    const st = useGameStore.getState();
    if (st.phase === "playing") {
      const hp = Math.max(0, st.health - maxPlayerDmg * fall);
      st.set({ health: hp, damageFlash: Date.now() });
      playerState.lastHurt?.(performance.now() / 1000);
      if (hp <= 0) {
        st.finish("dead");
        document.exitPointerLock?.();
        st.addKillfeed("KILLED IN ACTION — EXPLOSION");
      }
    }
  }
  return killed;
}

// ---- V4: deployable sentry turret (stepped by components/Turret.tsx) ----
export interface TurretState {
  pos: THREE.Vector3; // feet position
  until: number; // performance.now() deadline
}
export let turretState: TurretState | null = null;
export function deployTurret(pos: THREE.Vector3) {
  turretState = { pos: pos.clone(), until: performance.now() + 45000 };
}
export function clearTurret() {
  turretState = null;
}

// ---- V4: airstrike (stepped by components/Airstrike.tsx) ----
export interface AirstrikeState {
  x: number;
  z: number;
  startedAt: number;
}
export let airstrikeState: AirstrikeState | null = null;
export function callAirstrike(x: number, z: number) {
  airstrikeState = { x, z, startedAt: performance.now() };
}
export function clearAirstrike() {
  airstrikeState = null;
}

// ---- V4 forest layout (shared by World.tsx rendering/colliders and the minimap) ----
// seeded scatter so the forest is identical every load (and colliders match)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FOREST_CABINS: { x: number; z: number; r: number }[] = [
  { x: -22, z: -18, r: 0.15 },
  { x: 20, z: 24, r: -0.2 },
  { x: -26, z: 16, r: 0.1 },
];
const FOREST_TOWER: [number, number] = [24, -26];
const FOREST_ROCKS: { x: number; z: number; s: number }[] = [
  { x: 10, z: 6, s: 1.2 },
  { x: -8, z: -24, s: 1 },
  { x: 28, z: 2, s: 1.4 },
  { x: -30, z: -4, s: 1.1 },
  { x: 14, z: 34, s: 0.9 },
  { x: -16, z: 30, s: 1.3 },
];
const FOREST_ZONE_CLEARINGS: [number, number][] = [
  [0, 18],
  [-12, -14],
  [16, -16],
  [4, -2],
];

const FOREST_TREES: { x: number; z: number; s: number }[] = (() => {
  const rand = mulberry32(1337);
  const out: { x: number; z: number; s: number }[] = [];
  let tries = 0;
  while (out.length < 46 && tries < 600) {
    tries++;
    const x = (rand() * 2 - 1) * 52;
    const z = (rand() * 2 - 1) * 52;
    if (Math.abs(x) < 9 && z > 2 && z < 28) continue; // spawn clearing
    if (FOREST_ZONE_CLEARINGS.some(([zx, zz]) => Math.hypot(x - zx, z - zz) < 8.5)) continue;
    if (FOREST_CABINS.some((c) => Math.hypot(x - c.x, z - c.z) < 7)) continue;
    if (Math.hypot(x - FOREST_TOWER[0], z - FOREST_TOWER[1]) < 6.5) continue;
    if (FOREST_ROCKS.some((r) => Math.hypot(x - r.x, z - r.z) < 3.4)) continue;
    if (out.some((t) => Math.hypot(x - t.x, z - t.z) < 3.4)) continue;
    out.push({ x, z, s: 0.85 + rand() * 0.55 });
  }
  return out;
})();
export { FOREST_CABINS, FOREST_TOWER, FOREST_ROCKS, FOREST_ZONE_CLEARINGS, FOREST_TREES };

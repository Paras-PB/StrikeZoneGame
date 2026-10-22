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

// ---- V7 pause: freeze wall-clock deadlines ----
// Several systems schedule with performance.now() / Date.now() instead of
// frame dt (turret + health-bag expiry, airstrike timing, gunship salvo
// marks, overdrive). While paused, Player's loop calls this once per frame
// and every pending deadline is pushed forward by the real time elapsed
// since the previous call, so a pause of any length expires nothing.
let lastPauseShiftAt: number | null = null;
export function shiftPauseDeadlines() {
  const now = performance.now();
  if (lastPauseShiftAt === null) {
    lastPauseShiftAt = now;
    return;
  }
  const d = now - lastPauseShiftAt;
  lastPauseShiftAt = now;
  if (d <= 0) return;
  if (turretState) turretState.until += d;
  if (bagState) bagState.until += d;
  for (const m of rocketMarks) m.at += d;
  const st = useGameStore.getState();
  if (st.overdriveUntil > Date.now()) st.set({ overdriveUntil: st.overdriveUntil + d });
}
export function resetPauseShift() {
  lastPauseShiftAt = null;
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
export type EnemyKind = "soldier" | "runner" | "heavy" | "exploder" | "boss" | "drone" | "marksman" | "gunship" | "stalker";

/** Mesh scale per kind (hit spheres scale with it). */
export const KIND_SCALE: Record<EnemyKind, number> = {
  soldier: 1,
  runner: 0.94,
  heavy: 1.35,
  exploder: 0.95,
  boss: 1.9,
  drone: 1,
  marksman: 1,
  gunship: 1,
  stalker: 1,
};

/** Hitscan profile per kind: heights above feet + sphere radii. */
export const GUNSHIP_ALT = 13;
export function hitProfile(kind: EnemyKind): { chestY: number; headY: number; chestR: number; headR: number } {
  if (kind === "gunship") return { chestY: GUNSHIP_ALT, headY: GUNSHIP_ALT + 0.6, chestR: 2.7, headR: 1.1 };
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
  alerted?: boolean; // stalkers: false while cloaked in ambush
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
  { id: 1, x: -38, z: -14 }, // factory interior
  { id: 2, x: 29, z: 24.5 }, // container-yard lane
  { id: 3, x: 5.5, z: -19 }, // clock-tower plaza
  { id: 4, x: 23.5, z: -24.8 }, // house porch (Residential)
  { id: 5, x: -8, z: 8 }, // main-street corner
];

export const FOREST_BARREL_DEFS: BarrelDef[] = [
  { id: 1, x: -18, z: -14 },
  { id: 2, x: 16, z: 20 },
  { id: 3, x: 20, z: -22 },
  { id: 4, x: -22, z: 12 },
  { id: 5, x: 2, z: -26 },
];

export function barrelDefsFor(map: MapId): BarrelDef[] {
  return map !== "arena" ? FOREST_BARREL_DEFS : ARENA_BARREL_DEFS;
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
    if (e.kind === "gunship" && center.y < 8) continue; // only altitude blasts reach it
    const c = new THREE.Vector3(e.pos.x, e.pos.y + (e.kind === "gunship" ? GUNSHIP_ALT : 1), e.pos.z);
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

// ---- V9: Bermuda Town layout (Arena reshape — shared by World.tsx rendering/colliders and the minimap) ----
// Streets run along x≈0 and z≈0 (~10 m wide). Every static town box (clock
// tower body + staircase, factory walls + roof, house walls) is generated
// ONCE here as a plain box list: World.tsx renders each box and registers it
// as a collider, so visuals and collision can never drift apart.
export interface BermudaBox {
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
}

export const BERMUDA_TOWER = { x: 0, z: -12 };
export const BERMUDA_FACTORY = { x: -33, z: -18, w: 24, d: 15, h: 5 };

export interface BermudaHouse {
  x: number;
  z: number;
  rot: number; // 0 = door faces +z (south), PI = door faces -z (north) — AABB-safe rotations only
  color: string;
  roof: string;
}
export const BERMUDA_HOUSES: BermudaHouse[] = [
  { x: 22, z: -30, rot: 0, color: "#7fb3a8", roof: "#a34d33" }, // Residential — muted teal
  { x: 37, z: -27, rot: Math.PI, color: "#e0a878", roof: "#5d6d7e" }, // Residential — peach
  { x: 31, z: -12, rot: 0, color: "#8fb6d9", roof: "#a34d33" }, // Residential — sky
  { x: 11, z: 37, rot: Math.PI, color: "#e6d7a8", roof: "#7a4a63" }, // south — cream
  { x: -17, z: 31, rot: 0, color: "#c98a8a", roof: "#5d6d7e" }, // south-west — muted rose
];

export interface BermudaContainer {
  x: number;
  z: number;
  rot: number;
  color: string;
  stack?: string; // color of the second container stacked on top
}
export const BERMUDA_CONTAINERS: BermudaContainer[] = [
  { x: 23, z: 21, rot: 0, color: "#d84a35" },
  { x: 31, z: 21, rot: 0, color: "#2a6db3", stack: "#e0862a" },
  { x: 39, z: 21, rot: 0, color: "#3f9e4d" },
  { x: 25, z: 27.5, rot: 0, color: "#e0862a" },
  { x: 35, z: 27.5, rot: 0, color: "#2a6db3" },
  { x: 27, z: 35.5, rot: Math.PI / 2, color: "#7a4fa3" },
  { x: 38, z: 35.5, rot: 0, color: "#d84a35" },
];

export const BERMUDA_CRATES: { x: number; z: number; s: number; rot?: number }[] = [
  { x: -40, z: -22, s: 1.2, rot: 0.3 }, // factory interior
  { x: -26, z: -13.5, s: 1.2, rot: 0.8 }, // factory interior
  { x: 24, z: -31.5, s: 1.1, rot: 0.2 }, // house interior (Residential)
  { x: 29, z: -13.5, s: 1.1, rot: 0.6 }, // house interior (Residential)
  { x: 14, z: 20, s: 1.3, rot: 0.4 },
  { x: -14, z: 22, s: 1.2, rot: 0.9 },
  { x: -6, z: -34, s: 1.4, rot: 0.1 },
];

export const BERMUDA_LAMPS: [number, number][] = [
  [-5.8, -36],
  [5.8, -18],
  [-5.8, 2],
  [5.8, 18],
  [-5.8, 36],
  [-24, 5.8],
  [24, 5.8],
  [-40, -5.8],
  [40, -5.8],
  [5.8, -44],
];

export const BERMUDA_BARRIERS: { x: number; z: number; rot: number }[] = [
  { x: 8, z: 6, rot: 0 },
  { x: -8, z: 6, rot: 0 },
  { x: 10, z: -23, rot: Math.PI / 2 },
  { x: -24, z: -6, rot: 0 },
];

export const BERMUDA_SANDBAGS: { x: number; z: number; rot: number }[] = [
  { x: 8, z: -4, rot: 0 },
  { x: -28, z: -6, rot: 0 },
];

function bermudaBoxes(): BermudaBox[] {
  const out: BermudaBox[] = [];
  const push = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string) =>
    out.push({ cx, cy, cz, sx, sy, sz, color });

  // -- clock tower (0,-12): solid 5×5 body to 9 m, platform slab on top --
  push(BERMUDA_TOWER.x, 4.5, BERMUDA_TOWER.z, 5, 9, 5, "#8a5a48");
  push(BERMUDA_TOWER.x, 9.12, BERMUDA_TOWER.z, 6.2, 0.35, 6.2, "#6e4a3a");
  // External staircase, all risers 0.375 m (engine step-up snaps ≤0.45 m):
  // flight A climbs the east side south→north (12 steps to a 4.5 m landing)…
  for (let i = 1; i <= 12; i++) {
    const top = i * 0.375;
    push(3.4, top / 2, -6.2 - (i - 0.5) * 0.62, 1.8, top, 0.62, "#83837e");
  }
  push(3.4, 2.25, -14.7, 1.8, 4.5, 2.2, "#83837e"); // landing A
  // …flight B climbs the north face east→west (12 more steps to 9.0 m)…
  for (let j = 1; j <= 12; j++) {
    const top = 4.5 + j * 0.375;
    push(2.5 - (j - 0.5) * 0.62, top / 2, -15.5, 0.62, top, 1.8, "#83837e");
  }
  push(-3.7, 9.05, -15.5, 1.6, 0.35, 1.8, "#6e4a3a"); // bridge onto the platform

  // -- factory (-33,-18): 24×15 walls 5 m, door gaps 3.5 wide (S + E), roof slab --
  const F = BERMUDA_FACTORY;
  const t = 0.5;
  const fc = "#4f6f8a";
  push(F.x, F.h / 2, F.z - F.d / 2, F.w, F.h, t, fc); // north wall
  push(F.x - F.w / 2, F.h / 2, F.z, t, F.h, F.d, fc); // west wall
  push(-39.875, F.h / 2, F.z + F.d / 2, 10.25, F.h, t, fc); // south wall, west of door
  push(-26.125, F.h / 2, F.z + F.d / 2, 10.25, F.h, t, fc); // south wall, east of door
  push(F.x + F.w / 2, F.h / 2, -22.625, t, F.h, 5.75, fc); // east wall, north of door
  push(F.x + F.w / 2, F.h / 2, -13.375, t, F.h, 5.75, fc); // east wall, south of door
  push(F.x, 5.18, F.z, F.w + 0.6, 0.35, F.d + 0.6, "#39434e"); // roof slab

  // -- houses: 4 thin walls each, 2.4 m door gap on the rot side --
  for (const hs of BERMUDA_HOUSES) {
    const w = 8;
    const d = 7;
    const wt = 0.35;
    const hh = 3;
    const dir = hs.rot === 0 ? 1 : -1;
    const fz = hs.z + dir * (d / 2 - wt / 2);
    const bz = hs.z - dir * (d / 2 - wt / 2);
    push(hs.x, hh / 2, bz, w, hh, wt, hs.color); // back wall
    push(hs.x - w / 2 + wt / 2, hh / 2, hs.z, wt, hh, d, hs.color); // left wall
    push(hs.x + w / 2 - wt / 2, hh / 2, hs.z, wt, hh, d, hs.color); // right wall
    const segW = (w - 2.4) / 2;
    push(hs.x - (1.2 + segW / 2), hh / 2, fz, segW, hh, wt, hs.color); // front, left of door
    push(hs.x + (1.2 + segW / 2), hh / 2, fz, segW, hh, wt, hs.color); // front, right of door
  }
  return out;
}
export const BERMUDA_BOXES: BermudaBox[] = bermudaBoxes();

// Named locations for the in-game POI popup (components/LocationTag.tsx).
export const BERMUDA_POIS: { name: string; x0: number; z0: number; x1: number; z1: number }[] = [
  { name: "CLOCK TOWER", x0: -12, z0: -24, x1: 12, z1: 0 },
  { name: "FACTORY", x0: -46, z0: -27, x1: -20, z1: -9 },
  { name: "CONTAINER YARD", x0: 17, z0: 16, x1: 46, z1: 41 },
  { name: "RESIDENTIAL", x0: 14, z0: -37, x1: 46, z1: -5 },
];
export function bermudaPoiAt(x: number, z: number): string | null {
  for (const p of BERMUDA_POIS) {
    if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) return p.name;
  }
  return null;
}

// ---- V5: Stinger lock-on + homing rockets (stepped by components/Rockets.tsx) ----
export const lockState: { id: number | null; progress: number; locked: boolean } = {
  id: null,
  progress: 0,
  locked: false,
};
export function resetLock() {
  lockState.id = null;
  lockState.progress = 0;
  lockState.locked = false;
}

export interface LiveRocket {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetId: number | null;
  life: number;
}
export const liveRockets: LiveRocket[] = [];
export function spawnRocket(origin: THREE.Vector3, dir: THREE.Vector3, targetId: number | null) {
  liveRockets.push({ pos: origin.clone(), vel: dir.clone().multiplyScalar(58), targetId, life: 4.5 });
  if (liveRockets.length > 8) liveRockets.shift();
}

// ---- V5: gunship rocket-salvo telegraphs (rendered by Rockets.tsx, detonated by Enemies.tsx) ----
export interface RocketMark {
  x: number;
  z: number;
  at: number; // performance.now() timestamp of impact
}
export const rocketMarks: RocketMark[] = [];

// ---- health bag: deployable healing station (stepped by components/HealthBag.tsx) ----
export interface BagState {
  pos: THREE.Vector3;
  until: number;
}
export let bagState: BagState | null = null;
export function deployBag(pos: THREE.Vector3) {
  bagState = { pos: pos.clone(), until: performance.now() + 12000 };
}
export function clearBag() {
  bagState = null;
}

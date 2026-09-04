// Shared mutable game runtime (no react re-render per frame)
import * as THREE from "three";

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
        const dz1 = ez1 - pos.z;
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

// ---- enemy registry for hitscan ----
export interface EnemyEntry {
  id: number;
  pos: THREE.Vector3; // feet position
  health: number;
  maxHealth: number;
  alive: boolean;
  speed: number;
  radius: number;
}

export const enemyRegistry: Map<number, EnemyEntry> = new Map();

export const playerState = {
  pos: new THREE.Vector3(0, 0, 14),
  vel: new THREE.Vector3(),
  yaw: Math.PI, // face -z? adjusted in player
  pitch: 0,
  grounded: true,
  sliding: false,
  sprinting: false,
  ads: false,
};

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
let fxId = 1;
export const tracerQueue: TracerEvent[] = [];
export const impactQueue: ImpactEvent[] = [];

export function pushTracer(from: THREE.Vector3, to: THREE.Vector3, enemy = false) {
  tracerQueue.push({ id: fxId++, from: from.clone(), to: to.clone(), enemy, idc: fxId });
  if (tracerQueue.length > 40) tracerQueue.shift();
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

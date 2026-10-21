"use client";
import { useRef, useMemo, useState, useReducer } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore, PERK_POOL } from "@/lib/store";
import type { PerkId } from "@/lib/store";
import { enemyRegistry, playerState, collideCircle, pushTracer, colliders, explodeAt, resetBarrels, timeState } from "@/lib/game";
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
}

let botId = 1;
const MAX_WAVE = 10;

const KIND_STATS: Record<EnemyKind, { hp: number; speed: number; scale: number; dmg: number }> = {
  soldier: { hp: 1, speed: 1, scale: 1, dmg: 1 },
  runner: { hp: 0.55, speed: 1.5, scale: 0.94, dmg: 0.7 },
  heavy: { hp: 3.4, speed: 0.6, scale: 1.35, dmg: 1.5 },
  exploder: { hp: 0.7, speed: 1.45, scale: 0.95, dmg: 1 },
  boss: { hp: 1, speed: 0.55, scale: 1.9, dmg: 2 },
};

const KIND_STYLE: Record<EnemyKind, { torso: string; vest: string; visor: string }> = {
  soldier: { torso: "#4a3226", vest: "#1e2126", visor: "#ff2a2a" },
  runner: { torso: "#7a5a1e", vest: "#2e2a1e", visor: "#ffd02a" },
  heavy: { torso: "#3d434f", vest: "#22252b", visor: "#ff7a2a" },
  exploder: { torso: "#6e1f1f", vest: "#3a0f0f", visor: "#ff2a2a" },
  boss: { torso: "#571622", vest: "#1a0508", visor: "#ff2ad4" },
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
      <mesh castShadow position={[0.18, 1.25, -0.55]}>
        <boxGeometry args={[0.08, 0.12, 0.75]} />
        <meshStandardMaterial color="#101216" metalness={0.5} roughness={0.5} />
      </mesh>
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

export default function Enemies() {
  const bots = useRef<Bot[]>([]);
  const groups = useRef(new Map<number, THREE.Group>());
  const waveDelay = useRef(0);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [renderIds, setRenderIds] = useState<number[]>([]);

  const tmpV = useMemo(() => new THREE.Vector3(), []);

  function damagePlayer(dmg: number) {
    const st = useGameStore.getState();
    if (st.phase !== "playing") return;
    const hp = Math.max(0, st.health - dmg);
    st.set({ health: hp, damageFlash: Date.now() });
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
    if (w >= 4 && r < 0.13) return "heavy";
    if (w >= 3 && r < 0.33) return "exploder";
    if (w >= 2 && r < 0.6) return "runner";
    return "soldier";
  }

  function spawnBot(kind: EnemyKind, w: number, baseHp: number, posOverride?: THREE.Vector3) {
    const st = KIND_STATS[kind];
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
    const hp = kind === "boss" ? 1650 : Math.round(baseHp * st.hp);
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

  function spawnWave(w: number) {
    resetBarrels();
    const baseHp = 90 + w * 14;
    const isBossWave = w === MAX_WAVE;
    const count = isBossWave ? 6 : Math.min(3 + w * 2, 14);
    for (let i = 0; i < count; i++) {
      spawnBot(w === 1 ? "soldier" : pickKind(w), w, baseHp);
    }
    let total = count;
    if (isBossWave) {
      const boss = spawnBot("boss", w, baseHp, new THREE.Vector3(0, 0, -30));
      total += 1;
      useGameStore.getState().set({ bossHealth: boss.health, bossMax: boss.maxHealth });
    } else {
      useGameStore.getState().set({ bossHealth: 0, bossMax: 0 });
    }
    const s = useGameStore.getState();
    s.set({ wave: w, enemiesLeft: total });
    if (isBossWave) s.addKillfeed("⚠ FINAL WAVE — JUGGERNAUT INBOUND ⚠");
    else if (w % 3 === 0) s.addKillfeed(`🌙 WAVE ${w} — NIGHT OPS, ${total} HOSTILES`);
    else s.addKillfeed(`WAVE ${w} INBOUND — ${total} HOSTILES`);
    setRenderIds(bots.current.map((b) => b.id));
    force();
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
          b.deathT = 0;
          reg.alive = false;
          if (b.kind === "boss") s.set({ bossHealth: 0 });
          if (b.kind === "exploder") explodeBot(b);
        } else if (b.kind === "boss" && Math.ceil(b.health) !== s.bossHealth) {
          s.set({ bossHealth: Math.ceil(b.health) });
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
          g.rotation.x = Math.min(-Math.PI / 2, g.rotation.x - dt * 4);
          g.position.y = Math.max(-0.6, g.position.y - dt * 0.4);
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

      // exploders just run at the player and blow up
      if (b.kind === "exploder" && dist < 2.1) {
        explodeBot(b);
        continue;
      }

      // strafe weave (faster + wider than before)
      const strafe = Math.sin(t * 2.3 + b.strafePhase) * 0.95;
      const px = -tmpV.z * strafe;
      const pz = tmpV.x * strafe;
      const wantDist = b.kind === "exploder" ? 0.5 : b.kind === "runner" ? 5 : b.kind === "heavy" ? 8.5 : b.kind === "boss" ? 9 : 6.5;
      let approach = dist > wantDist ? 1.35 : dist < 4 ? -0.8 : 0.3;
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
        // sprinty run bob + lean into motion
        g.position.y = b.pos.y + Math.abs(Math.sin(t * 11 + b.strafePhase)) * 0.09;
        g.rotation.y = Math.atan2(tmpV.x, tmpV.z) + Math.PI;
        g.rotation.x = THREE.MathUtils.clamp(b.speed * 0.02, 0, 0.16);
      }
      const reg = enemyRegistry.get(b.id);
      if (reg) {
        reg.pos.copy(b.pos);
        reg.health = b.health;
      }

      // shooting (exploders never shoot — they are the bullet)
      b.shootCd -= dt;
      if (b.kind !== "exploder" && b.shootCd <= 0 && dist < 48 && dist > 3) {
        // LOS check: sample ray vs colliders coarsely
        const from = new THREE.Vector3(b.pos.x, b.pos.y + 1.4, b.pos.z);
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
          const from = new THREE.Vector3(b.pos.x, b.pos.y + 1.35, b.pos.z);
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

    // wave cleared
    if (aliveCount === 0 && bots.current.length === 0) {
      waveDelay.current += dt;
      if (waveDelay.current > 2.5) {
        waveDelay.current = 0;
        if (s.wave >= MAX_WAVE) {
          s.finish("victory");
          document.exitPointerLock?.();
        } else {
          const st = useGameStore.getState();
          st.set({
            score: st.score + 250,
            health: Math.min(st.maxHealth, st.health + 30),
            ammo: {
              ar: { mag: 30, reserve: Math.min(240, st.ammo.ar.reserve + 60) },
              smg: { mag: 40, reserve: Math.min(300, st.ammo.smg.reserve + 80) },
              sg: { mag: 6, reserve: Math.min(48, st.ammo.sg.reserve + 12) },
            },
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
        return <SoldierMesh key={id} bot={b} refs={groups.current} />;
      })}
    </group>
  );
}

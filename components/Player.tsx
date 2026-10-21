"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { WEAPONS, useGameStore } from "@/lib/store";
import { colliders, collideCircle, enemyRegistry, barrelRegistry, explodeAt, playerState, pushTracer, pushImpact, timeState, triggerSlowMo, hitProfile, spawnGrenade, turretState, deployTurret, callAirstrike } from "@/lib/game";
import type { EnemyKind } from "@/lib/game";
import type { BarrelEntry } from "@/lib/game";
import { sfxShoot, sfxReload, sfxEmpty, sfxHit, sfxHeadshot, sfxStep } from "@/lib/audio";
import WeaponModel from "./WeaponModel";

const keys = new Set<string>();

function rayVsAABB(origin: THREE.Vector3, dir: THREE.Vector3, min: THREE.Vector3, max: THREE.Vector3): number | null {
  let tmin = 0;
  let tmax = Infinity;
  for (const ax of ["x", "y", "z"] as const) {
    const o = origin[ax];
    const d = dir[ax];
    const mn = min[ax];
    const mx = max[ax];
    if (Math.abs(d) < 1e-8) {
      if (o < mn || o > mx) return null;
    } else {
      let t1 = (mn - o) / d;
      let t2 = (mx - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

function rayVsGround(origin: THREE.Vector3, dir: THREE.Vector3): number | null {
  if (dir.y >= -1e-6) return null;
  const t = -origin.y / dir.y;
  return t > 0 ? t : null;
}

export default function Player() {
  const { camera, gl } = useThree();
  const vel = useRef(new THREE.Vector3());
  const onGround = useRef(true);
  const slideTime = useRef(0);
  const slideCooldown = useRef(0);
  const slideDir = useRef(new THREE.Vector3());
  const bobT = useRef(0);
  const fireCooldown = useRef(0);
  const reloadT = useRef(0);
  const lastDamageT = useRef(-10);
  const stepT = useRef(0);
  const recoil = useRef(0);
  const muzzle = useRef<THREE.PointLight>(null);
  const muzzleFlash = useRef(0);
  const camHeight = useRef(1.65);
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), origin: new THREE.Vector3() }), []);

  // input listeners
  useEffect(() => {
    playerState.lastHurt = () => {
      lastDamageT.current = performance.now() / 1000;
    };
    const down = (e: KeyboardEvent) => {
      keys.add(e.code);
      const s = useGameStore.getState();
      if (s.phase !== "playing") return;
      if (e.code === "KeyR") startReload();
      if (e.code === "Digit1") s.set({ activeWeapon: "ar", reloading: false });
      if (e.code === "Digit2") s.set({ activeWeapon: "smg", reloading: false });
      if (e.code === "Digit3") s.set({ activeWeapon: "sg", reloading: false });
      if (e.code === "Digit4") s.set({ activeWeapon: "sn", reloading: false });
      if (e.code === "Digit5") s.set({ activeWeapon: "saw", reloading: false });
      if (e.code === "KeyF" && s.turrets > 0 && !turretState) {
        deployTurret(playerState.pos.clone());
        s.set({ turrets: s.turrets - 1 });
        s.addKillfeed("🤖 SENTRY DEPLOYED — 45s");
      }
      if (e.code === "KeyX" && s.airstrikes > 0) {
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(playerState.pitch, playerState.yaw, 0, "YXZ"));
        const eyeY = playerState.pos.y + 1.6;
        let t = 22;
        if (dir.y < -0.05) t = Math.min(60, eyeY / -dir.y);
        const tx = Math.max(-50, Math.min(50, playerState.pos.x + dir.x * t));
        const tz = Math.max(-50, Math.min(50, playerState.pos.z + dir.z * t));
        callAirstrike(tx, tz);
        s.set({ airstrikes: s.airstrikes - 1 });
        s.addKillfeed("✈ AIRSTRIKE INBOUND");
      }
      if (e.code === "KeyG" && s.grenades > 0) {
        s.set({ grenades: s.grenades - 1 });
        spawnGrenade();
      }
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const mouseDown = (e: MouseEvent) => {
      const s = useGameStore.getState();
      if (s.phase !== "playing") return;
      if (document.pointerLockElement !== gl.domElement) return;
      if (e.button === 0) playerState.firingHeld = true;
      if (e.button === 2) s.set({ ads: true });
    };
    const mouseUp = (e: MouseEvent) => {
      if (e.button === 0) playerState.firingHeld = false;
      if (e.button === 2) useGameStore.getState().set({ ads: false });
    };
    const ctx = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    gl.domElement.addEventListener("contextmenu", ctx);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      gl.domElement.removeEventListener("contextmenu", ctx);
    };
  }, [gl]);

  // mouse look
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      if (useGameStore.getState().phase !== "playing") return;
      const gs = useGameStore.getState();
      const ads = gs.ads;
      const sens = ads && gs.activeWeapon === "sn" ? 0.00045 : ads ? 0.0011 : 0.0021;
      playerState.yaw -= e.movementX * sens;
      playerState.pitch -= e.movementY * sens;
      playerState.pitch = Math.max(-1.45, Math.min(1.45, playerState.pitch));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [gl]);

  function startReload() {
    const s = useGameStore.getState();
    const w = WEAPONS[s.activeWeapon];
    const a = s.ammo[s.activeWeapon];
    if (s.reloading || a.mag === w.mag || a.reserve === 0) return;
    s.set({ reloading: true });
    reloadT.current = w.reloadTime * s.reloadMult;
    sfxReload();
  }

  function registerKill(head: boolean, base: number, label: string, opts?: { barrel?: boolean; kind?: EnemyKind }) {
    const st = useGameStore.getState();
    const now = Date.now();
    const combo = now - st.lastKillAt < 3500 ? st.combo + 1 : 1;
    const mult = Math.min(combo, 5);
    const pts = base * mult;
    const newHeadshots = st.headshots + (head ? 1 : 0);
    const newBarrelKills = st.barrelKills + (opts?.barrel ? 1 : 0);
    const newKills = st.kills + 1;
    st.set({
      kills: newKills,
      score: st.score + pts,
      combo,
      lastKillAt: now,
      hitmarker: now,
      hitmarkerKill: true,
      headshots: newHeadshots,
      barrelKills: newBarrelKills,
    });
    if (newKills % 25 === 0) {
      st.set({ airstrikes: st.airstrikes + 1 });
      st.addKillfeed("✈ AIRSTRIKE READY — PRESS X");
    }
    st.unlockAch("firstblood");
    if (opts?.kind === "boss") st.unlockAch("bossslayer");
    if (combo >= 5) st.unlockAch("rampage");
    if (newHeadshots >= 10) st.unlockAch("sharpshooter");
    if (newBarrelKills >= 5) st.unlockAch("demolitionist");
    st.addKillfeed(`${label} +${pts}${mult > 1 ? ` (COMBO x${mult})` : ""}`);
    if (combo === 2) st.addKillfeed("DOUBLE KILL");
    else if (combo === 3) st.addKillfeed("TRIPLE KILL");
    else if (combo === 4) st.addKillfeed("QUAD KILL");
    else if (combo >= 5) st.addKillfeed(`RAMPAGE x${combo}`);
    sfxHit(true);
    if (head) sfxHeadshot();
    // final kill of the wave -> brief slow-mo
    if (st.enemiesLeft <= 1) triggerSlowMo();
  }

  function shoot(dt: number) {
    const s = useGameStore.getState();
    const w = WEAPONS[s.activeWeapon];
    fireCooldown.current -= dt;
    if (reloadT.current > 0) {
      reloadT.current -= dt;
      if (reloadT.current <= 0) {
        const a = { ...s.ammo };
        const cur = a[s.activeWeapon];
        const need = w.mag - cur.mag;
        const take = Math.min(need, cur.reserve);
        cur.mag += take;
        cur.reserve -= take;
        a[s.activeWeapon] = { ...cur };
        s.set({ ammo: a, reloading: false });
      }
      return;
    }
    if (!playerState.firingHeld) return;
    if (fireCooldown.current > 0) return;
    const ammoNow = s.ammo[s.activeWeapon];
    if (ammoNow.mag <= 0) {
      sfxEmpty();
      fireCooldown.current = 0.25;
      startReload();
      return;
    }
    fireCooldown.current = 60 / w.rpm;

    // consume ammo — one shell per trigger pull, even for the shotgun
    const a = { ...s.ammo };
    a[s.activeWeapon] = { mag: ammoNow.mag - 1, reserve: ammoNow.reserve };
    s.set({ ammo: a, shots: s.shots + 1 });

    const origin = new THREE.Vector3().copy(playerState.pos);
    origin.y += s.ads ? 1.55 : 1.6;
    const baseSpread = s.ads ? w.spreadAds : w.spreadHip + (s.sprinting ? 0.02 : 0) + vel.current.length() * 0.0015;

    // recoil + flash + sound, once per pull
    recoil.current = Math.min(0.09, recoil.current + (w.pellets ? 0.05 : s.ads ? 0.012 : 0.02));
    playerState.pitch += w.pellets ? 0.016 : s.ads ? 0.0035 : 0.007;
    muzzleFlash.current = 1;
    sfxShoot(false, s.ads);

    let anyHit = false;
    let hitSoundPlayed = false;
    const pellets = w.pellets ?? 1;

    for (let p = 0; p < pellets; p++) {
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(playerState.pitch, playerState.yaw, 0, "YXZ"));
      dir.x += (Math.random() - 0.5) * baseSpread * 2;
      dir.y += (Math.random() - 0.5) * baseSpread * 2;
      dir.z += (Math.random() - 0.5) * baseSpread * 2;
      dir.normalize();

      // wall distance
      let wallDist = w.range;
      for (const c of colliders) {
        const t = rayVsAABB(origin, dir, c.min, c.max);
        if (t !== null && t < wallDist) wallDist = t;
      }
      const tg = rayVsGround(origin, dir);
      if (tg !== null && tg < wallDist) wallDist = tg;

      // enemy test: body capsule approx as sphere at chest + head sphere
      let bestT = wallDist;
      let bestEnemy: number | null = null;
      let bestHead = false;
      let bestBarrel: BarrelEntry | null = null;
      for (const [id, e] of enemyRegistry) {
        if (!e.alive) continue;
        const prof = hitProfile(e.kind);
        const sphereT = (cy: number, r: number): number | null => {
          const c = new THREE.Vector3(e.pos.x, e.pos.y + cy, e.pos.z);
          const oc = new THREE.Vector3().subVectors(c, origin);
          const tca = oc.dot(dir);
          if (tca < 0) return null;
          const d2 = oc.lengthSq() - tca * tca;
          if (d2 >= r * r) return null;
          const t = tca - Math.sqrt(r * r - d2);
          return t > 0 ? t : null;
        };
        const chestT = sphereT(prof.chestY, prof.chestR);
        const headT = sphereT(prof.headY, prof.headR);
        // head wins ties-ish: a core/head hit counts if it lands within 0.7m of the body hit
        let t: number | null = null;
        let isHead = false;
        if (headT !== null && (chestT === null || headT <= chestT + 0.7)) {
          t = headT;
          isHead = true;
        } else if (chestT !== null) {
          t = chestT;
        }
        if (t !== null && t < bestT) {
          bestT = t;
          bestEnemy = id;
          bestHead = isHead;
          bestBarrel = null;
        }
      }
      // explosive barrels
      for (const b of barrelRegistry.values()) {
        if (!b.alive) continue;
        const oc = new THREE.Vector3().subVectors(b.pos, origin);
        const tca = oc.dot(dir);
        if (tca < 0 || tca > bestT) continue;
        const d2 = oc.lengthSq() - tca * tca;
        if (d2 < b.radius * b.radius) {
          const thc = Math.sqrt(b.radius * b.radius - d2);
          const t = tca - thc;
          if (t > 0 && t < bestT) {
            bestT = t;
            bestBarrel = b;
            bestEnemy = null;
          }
        }
      }

      const end = origin.clone().addScaledVector(dir, bestT);
      const muzzlePos = origin.clone().addScaledVector(dir, 0.7);
      muzzlePos.y -= 0.12;
      pushTracer(muzzlePos, end, false);

      if (bestEnemy !== null) {
        const e = enemyRegistry.get(bestEnemy)!;
        const falloff = Math.max(0.5, 1 - bestT / (w.range * 1.6));
        const dmg = w.damage * falloff * (bestHead ? w.headMult : 1) * s.damageMult * (Date.now() < s.overdriveUntil ? 2 : 1);
        e.health -= dmg;
        anyHit = true;
        pushImpact(end, true);
        if (e.health <= 0 && e.alive) {
          e.alive = false;
          registerKill(bestHead, bestHead ? 150 : 100, bestHead ? "HEADSHOT" : "ELIMINATED", { kind: e.kind });
        } else {
          const st = useGameStore.getState();
          st.set({ hitmarker: Date.now(), hitmarkerKill: false, lastHitDmg: Math.round(dmg), lastHitAt: Date.now() });
          if (bestHead) sfxHeadshot();
          if (!hitSoundPlayed) {
            sfxHit(false);
            hitSoundPlayed = true;
          }
        }
      } else if (bestBarrel) {
        anyHit = true;
        bestBarrel.alive = false;
        const killedList = explodeAt(bestBarrel.pos.clone(), 5.5, 140, 22);
        if (killedList.length === 0) {
          useGameStore.getState().addKillfeed("BARREL DETONATED");
        }
        for (const _k of killedList) registerKill(false, 100, "BARREL KILL", { barrel: true });
      } else if (wallDist < w.range) {
        pushImpact(end, false);
      }
    }

    if (anyHit) {
      const st = useGameStore.getState();
      st.set({ hits: st.hits + 1 });
    }
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05) * timeState.scale;
    const s = useGameStore.getState();
    if (s.phase !== "playing") {
      playerState.firingHeld = false;
      return;
    }

    // timers HUD-ish
    s.set({ timeSurvived: s.timeSurvived + dt });

    // health regen COD style
    const now = state.clock.elapsedTime;
    const perfNow = performance.now() / 1000;
    if (perfNow - lastDamageT.current > 3.5 && s.health < s.maxHealth) {
      s.set({ health: Math.min(s.maxHealth, s.health + dt * 32 * s.regenMult) });
    }

    // movement input
    const fwd = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const wantSprint = keys.has("ShiftLeft") && fwd > 0 && !s.ads;
    const moving = fwd !== 0 || strafe !== 0;
    const hSpeedNow = Math.hypot(vel.current.x, vel.current.z);
    slideCooldown.current = Math.max(0, slideCooldown.current - dt);

    // accel basis (needed for slide steering too)
    tmp.fwd.set(-Math.sin(playerState.yaw), 0, -Math.cos(playerState.yaw));
    tmp.right.set(-tmp.fwd.z, 0, tmp.fwd.x);
    tmp.dir.set(0, 0, 0).addScaledVector(tmp.fwd, fwd).addScaledVector(tmp.right, strafe);
    if (tmp.dir.lengthSq() > 0) tmp.dir.normalize();

    // slide trigger — COD style: needs momentum, not necessarily SHIFT held
    const slidePressed = keys.has("KeyC") || keys.has("ControlLeft");
    if (slidePressed && onGround.current && slideTime.current <= 0 && slideCooldown.current <= 0 && hSpeedNow > 5.2 && !s.ads) {
      slideTime.current = 0.9;
      // boost along current momentum (or look dir if nearly stationary)
      if (hSpeedNow > 1.5) {
        slideDir.current.set(vel.current.x / hSpeedNow, 0, vel.current.z / hSpeedNow);
      } else {
        slideDir.current.set(-Math.sin(playerState.yaw), 0, -Math.cos(playerState.yaw));
      }
      // instant boost — this is what makes slides feel powerful
      vel.current.x = slideDir.current.x * 13.4;
      vel.current.z = slideDir.current.z * 13.4;
      s.set({ sliding: true });
      playerState.sliding = true;
    }

    const ads = s.ads;
    let targetSpeed = ads ? 3.4 : 6.2;
    if (wantSprint) targetSpeed = 8.8;
    targetSpeed *= s.moveMult;

    const sliding = slideTime.current > 0;
    const accel = onGround.current ? 46 : 12;
    if (sliding) {
      slideTime.current -= dt;
      // steering: push momentum toward input dir, capped so you can curve the slide
      if (moving) {
        vel.current.x += tmp.dir.x * 20 * dt;
        vel.current.z += tmp.dir.z * 20 * dt;
        const h = Math.hypot(vel.current.x, vel.current.z);
        if (h > 13.6) {
          vel.current.x *= 13.6 / h;
          vel.current.z *= 13.6 / h;
        }
      }
      // low friction — slide carries far, decays gently (faster decay uphill of input? no, keep it fun)
      const friction = moving && fwd > 0 ? 0.32 : 0.75;
      const f = Math.max(0, 1 - friction * dt);
      vel.current.x *= f;
      vel.current.z *= f;
      // guarantee a minimum slide speed until the timer ends so it never stalls mid-slide
      const h2 = Math.hypot(vel.current.x, vel.current.z);
      if (h2 < 7.5 && slideTime.current > 0.15) {
        const boost = 7.5 / Math.max(h2, 0.01);
        vel.current.x *= boost;
        vel.current.z *= boost;
      }
      if (slideTime.current <= 0) {
        slideCooldown.current = 0.4;
        s.set({ sliding: false });
        playerState.sliding = false;
      }
    } else {
      const target = tmp.dir.clone().multiplyScalar(targetSpeed);
      vel.current.x += (target.x - vel.current.x) * (1 - Math.exp(-accel * 0.28 * dt * 3));
      vel.current.z += (target.z - vel.current.z) * (1 - Math.exp(-accel * 0.28 * dt * 3));
    }

    // jump / gravity — slide-jump preserves momentum for bunny-hop chains
    if (keys.has("Space") && onGround.current) {
      const wasSliding = slideTime.current > 0;
      vel.current.y = wasSliding ? 7.9 : 7.6;
      onGround.current = false;
      if (wasSliding) {
        slideTime.current = 0;
        slideCooldown.current = 0.25;
        s.set({ sliding: false });
        playerState.sliding = false;
      }
    }
    vel.current.y -= 24 * dt;

    playerState.pos.x += vel.current.x * dt;
    playerState.pos.z += vel.current.z * dt;
    playerState.pos.y += vel.current.y * dt;

    // collide
    const res = collideCircle(playerState.pos, 0.45, 1.7);
    const groundY = res.groundedOn !== null ? res.groundedOn : 0;
    if (playerState.pos.y <= groundY) {
      playerState.pos.y = groundY;
      vel.current.y = 0;
      onGround.current = true;
    } else if (res.groundedOn !== null && vel.current.y <= 0) {
      onGround.current = true;
    } else if (playerState.pos.y > groundY + 0.02) {
      onGround.current = playerState.pos.y <= groundY + 0.02;
      if (playerState.pos.y > groundY + 0.02 && res.groundedOn === null) onGround.current = false;
    }
    playerState.grounded = onGround.current;

    // camera — low dip + roll + FOV kick during slide
    const isSliding = slideTime.current > 0;
    const targetH = isSliding ? 0.72 : ads ? 1.5 : 1.65;
    camHeight.current += (targetH - camHeight.current) * (1 - Math.exp(-12 * dt));
    // headbob
    const hSpeed = Math.hypot(vel.current.x, vel.current.z);
    if (onGround.current && hSpeed > 1) {
      bobT.current += dt * (4 + hSpeed * 1.15);
      stepT.current -= dt * hSpeed;
      if (stepT.current <= 0) {
        stepT.current = 3.2;
        sfxStep(wantSprint);
      }
    }
    const bobX = Math.sin(bobT.current) * 0.035 * Math.min(1, hSpeed / 6) * (ads ? 0.3 : 1);
    const bobY = Math.abs(Math.cos(bobT.current)) * 0.04 * Math.min(1, hSpeed / 6) * (ads ? 0.3 : 1);

    // recoil decay
    recoil.current *= Math.exp(-10 * dt);
    const tilt = THREE.MathUtils.clamp(-strafe * 0.012 - vel.current.dot(tmp.right) * 0.0012, -0.03, 0.03);

    camera.position.set(
      playerState.pos.x + Math.cos(playerState.yaw) * bobX * 0.4,
      playerState.pos.y + camHeight.current + bobY,
      playerState.pos.z - Math.sin(playerState.yaw) * bobX * 0.4
    );
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.y = playerState.yaw;
    camera.rotation.x = playerState.pitch + recoil.current;
    camera.rotation.z = tilt;
    // slide feel: strong roll + subtle high-frequency shake
    if (isSliding) camera.rotation.z += 0.17 + Math.sin(now * 31) * 0.006;

    const persp = camera as unknown as THREE.PerspectiveCamera;
    const fovTarget = (ads ? (s.activeWeapon === "sn" ? 24 : 55) : 82) + (isSliding ? 9 : 0);
    persp.fov += (fovTarget - persp.fov) * (1 - Math.exp(-10 * dt));
    persp.updateProjectionMatrix();

    playerState.sprinting = wantSprint && moving;
    playerState.ads = ads;
    if (s.sprinting !== playerState.sprinting) s.set({ sprinting: playerState.sprinting });

    // shooting
    shoot(dt);

    if (muzzleFlash.current > 0) muzzleFlash.current -= dt * 14;
  });

  return (
    <group>
      <pointLight ref={muzzle} position={[0, -10, 0]} intensity={0} distance={9} color="#ffcf7a" />
      <WeaponModel flash={muzzleFlash} />
    </group>
  );
}

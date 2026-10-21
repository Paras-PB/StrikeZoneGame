"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { tracerQueue, impactQueue, explosionQueue, timeState } from "@/lib/game";
import { useGameStore } from "@/lib/store";

interface Tracer {
  mesh: THREE.Mesh;
  life: number;
  max: number;
}
interface Puff {
  mesh: THREE.Mesh;
  life: number;
  max: number;
  vel: THREE.Vector3;
}
interface Blast {
  mesh: THREE.Mesh;
  life: number;
  max: number;
  radius: number;
}

export default function Effects() {
  const group = useRef<THREE.Group>(null);
  const tracers = useRef<Tracer[]>([]);
  const puffs = useRef<Puff[]>([]);
  const blasts = useRef<Blast[]>([]);
  const geoBlast = useMemo(() => new THREE.SphereGeometry(1, 20, 14), []);
  const matBlast = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ff7a26", transparent: true, opacity: 0.55, depthWrite: false }),
    []
  );
  const geoTracer = useMemo(() => new THREE.BoxGeometry(0.02, 0.02, 1), []);
  const geoSpark = useMemo(() => new THREE.IcosahedronGeometry(0.09, 0), []);
  const matTracer = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffe9a3", transparent: true, opacity: 0.95, depthWrite: false }),
    []
  );
  const matEnemy = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ff5a4a", transparent: true, opacity: 0.9, depthWrite: false }),
    []
  );
  const matSpark = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffcf7a", transparent: true, depthWrite: false }), []);
  const matBlood = useMemo(() => new THREE.MeshBasicMaterial({ color: "#a31616", transparent: true, depthWrite: false }), []);

  useFrame((_, rawDt) => {
    if (useGameStore.getState().phase === "paused") return; // V7: FX lifetimes frozen
    const dt = Math.min(rawDt, 0.05) * timeState.scale;
    if (!group.current) return;
    // spawn tracers
    while (tracerQueue.length) {
      const ev = tracerQueue.shift()!;
      const len = ev.from.distanceTo(ev.to);
      if (len < 0.5) continue;
      const m = new THREE.Mesh(geoTracer, (ev.enemy ? matEnemy : matTracer).clone());
      m.position.copy(ev.from).lerp(ev.to, 0.5);
      m.lookAt(ev.to);
      m.scale.set(1, 1, len);
      group.current.add(m);
      tracers.current.push({ mesh: m, life: 0.09, max: 0.09 });
    }
    while (impactQueue.length) {
      const ev = impactQueue.shift()!;
      for (let i = 0; i < (ev.blood ? 5 : 7); i++) {
        const m = new THREE.Mesh(geoSpark, (ev.blood ? matBlood : matSpark).clone());
        m.position.copy(ev.pos);
        m.scale.setScalar(0.6 + Math.random() * 0.9);
        group.current.add(m);
        puffs.current.push({
          mesh: m,
          life: ev.blood ? 0.4 : 0.3,
          max: 0.4,
          vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5),
        });
      }
    }
    while (explosionQueue.length) {
      const ev = explosionQueue.shift()!;
      const m = new THREE.Mesh(geoBlast, matBlast.clone());
      m.position.copy(ev.pos);
      m.scale.setScalar(0.3);
      group.current.add(m);
      blasts.current.push({ mesh: m, life: 0.45, max: 0.45, radius: ev.radius });
      // fireball sparks
      for (let i = 0; i < 26; i++) {
        const sm = new THREE.Mesh(geoSpark, matSpark.clone());
        sm.position.copy(ev.pos);
        sm.scale.setScalar(0.9 + Math.random() * 1.4);
        group.current.add(sm);
        puffs.current.push({
          mesh: sm,
          life: 0.55,
          max: 0.55,
          vel: new THREE.Vector3((Math.random() - 0.5) * 13, Math.random() * 11, (Math.random() - 0.5) * 13),
        });
      }
      // point flash of light via a short-lived bright puff at the core
      const core = new THREE.Mesh(geoBlast, new THREE.MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0.9, depthWrite: false }));
      core.position.copy(ev.pos);
      core.scale.setScalar(0.8);
      group.current.add(core);
      blasts.current.push({ mesh: core, life: 0.18, max: 0.18, radius: ev.radius * 0.45 });
    }
    // update
    for (let i = blasts.current.length - 1; i >= 0; i--) {
      const bl = blasts.current[i];
      bl.life -= dt;
      const k = 1 - Math.max(0, bl.life / bl.max);
      bl.mesh.scale.setScalar(0.3 + k * bl.radius);
      (bl.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - k) * 0.55);
      if (bl.life <= 0) {
        group.current.remove(bl.mesh);
        (bl.mesh.material as THREE.Material).dispose();
        blasts.current.splice(i, 1);
      }
    }
    for (let i = tracers.current.length - 1; i >= 0; i--) {
      const t = tracers.current[i];
      t.life -= dt;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, t.life / t.max);
      if (t.life <= 0) {
        group.current.remove(t.mesh);
        (t.mesh.material as THREE.Material).dispose();
        tracers.current.splice(i, 1);
      }
    }
    for (let i = puffs.current.length - 1; i >= 0; i--) {
      const p = puffs.current[i];
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.05) p.mesh.position.y = 0.05;
      p.mesh.scale.multiplyScalar(1 - dt * 3);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) {
        group.current.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        puffs.current.splice(i, 1);
      }
    }
    if (tracers.current.length > 50) {
      const old = tracers.current.shift()!;
      group.current.remove(old.mesh);
    }
  });

  return <group ref={group} />;
}

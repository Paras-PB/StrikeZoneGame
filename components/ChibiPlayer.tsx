"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useGameStore } from "@/lib/store";
import { playerState } from "@/lib/game";
import type { MutableRefObject } from "react";

// Third-person player character: Chibineko (chibineko.glb).
//
// Model facts, measured from the file (not guessed):
// - glTF 2.0, ~3.03 m tall in its own units, feet at Y ~= 0, faces +Z
//   (jaw at +Z), hands at X ~= +/-0.92 m, Y ~= 1.92 m.
// - No animations and no textures: flat-colour materials only, so idle
//   motion here is a gentle bob, not a walk cycle. That is a known V1
//   limitation — the model will glide in its bind pose while moving.
// - Scaled 0.56x so the character stands ~1.7 m tall, matching the
//   existing player capsule (collideCircle radius 0.45, height 1.7).
//   Gameplay hitboxes, movement and enemy aiming all still use
//   playerState.pos, unchanged.
const MODEL_SCALE = 0.56;

const GUN_ACCENT: Record<string, string> = {
  ar: "#d8452c",
  smg: "#2cc8d8",
  sg: "#e08a1e",
  sn: "#c8a028",
  saw: "#7ac74f",
  stinger: "#ff4040",
};

export default function ChibiPlayer({ flash }: { flash: MutableRefObject<number> }) {
  const { scene } = useGLTF("/chibineko.glb");
  const group = useRef<THREE.Group>(null);
  const flashMesh = useRef<THREE.Mesh>(null);
  const flashLight = useRef<THREE.PointLight>(null);
  const lastPos = useRef(new THREE.Vector3());
  const bobPhase = useRef(0);
  const active = useGameStore((s) => s.activeWeapon);
  const accent = GUN_ACCENT[active] ?? "#d8452c";
  const tmp = useMemo(() => ({ delta: new THREE.Vector3() }), []);

  useEffect(() => {
    // Skinned meshes can pop out of view if Three culls on a stale
    // bounding sphere when the camera gets close behind the character.
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).frustumCulled = false;
        (o as THREE.Mesh).castShadow = true;
      }
    });
  }, [scene]);

  useFrame((state, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const s = useGameStore.getState();

    // Hide in the menu (the menu overlay covers the world anyway) and
    // when scoped with the sniper, so the scope view stays clean like
    // it was in first-person. Every other phase shows the character.
    g.visible = s.phase !== "menu" && !(s.ads && s.activeWeapon === "sn");
    if (!g.visible) return;

    // Movement bob, from actual frame-to-frame displacement.
    tmp.delta.set(
      playerState.pos.x - lastPos.current.x,
      0,
      playerState.pos.z - lastPos.current.z
    );
    const speed = dt > 0 ? tmp.delta.length() / dt : 0;
    lastPos.current.copy(playerState.pos);
    if (playerState.grounded && speed > 1) bobPhase.current += dt * (4 + speed * 1.1);
    const bobY = Math.abs(Math.sin(bobPhase.current)) * 0.04 * Math.min(1, speed / 6);

    g.position.set(playerState.pos.x, playerState.pos.y + bobY, playerState.pos.z);
    // Model faces +Z; game forward at yaw is (-sin yaw, -cos yaw), so
    // rotate by yaw + PI to face the direction of travel/aim.
    g.rotation.set(0, playerState.yaw + Math.PI, 0);
    if (s.sliding) g.rotation.x = -0.25;

    // Muzzle flash at the in-hand gun tip.
    const f = Math.max(0, flash.current);
    if (flashMesh.current) {
      flashMesh.current.visible = f > 0.15;
      flashMesh.current.scale.setScalar(0.6 + Math.random() * 0.7 * f);
      (flashMesh.current.material as THREE.MeshBasicMaterial).opacity = f;
    }
    if (flashLight.current) flashLight.current.intensity = f * 10;
  });

  return (
    <group ref={group} scale={MODEL_SCALE}>
      <primitive object={scene} />
      {/* Simple in-hand gun at the character's right hand (model -X side,
          the side that reads as "right" when the model faces +Z).
          Points along model +Z, i.e. the direction the character faces.
          This is a stand-in for the old first-person viewmodel, which
          was camera-attached and has no meaning in third-person. */}
      <group position={[-0.92, 1.85, 0.35]}>
        {/* receiver */}
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.22, 0.9]} />
          <meshStandardMaterial color="#2f3a44" roughness={0.45} metalness={0.6} />
        </mesh>
        {/* barrel, forward (+Z) */}
        <mesh castShadow position={[0, 0.02, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.55, 10]} />
          <meshStandardMaterial color="#111316" roughness={0.35} metalness={0.8} />
        </mesh>
        {/* mag */}
        <mesh position={[0, -0.2, 0.05]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.12, 0.35, 0.18]} />
          <meshStandardMaterial color={accent} roughness={0.6} />
        </mesh>
        {/* muzzle flash star at the barrel tip */}
        <mesh ref={flashMesh} position={[0, 0.02, 1.05]} visible={false}>
          <octahedronGeometry args={[0.18, 0]} />
          <meshBasicMaterial color="#ffd97a" transparent opacity={1} depthWrite={false} />
        </mesh>
        <pointLight ref={flashLight} position={[0, 0, 1]} intensity={0} distance={8} color="#ffbe5a" />
      </group>
      {/* fill light so the character is never black on the night maps */}
      <pointLight position={[0, 2.5, 1.5]} intensity={0.6} distance={6} color="#ffffff" />
    </group>
  );
}

useGLTF.preload("/chibineko.glb");

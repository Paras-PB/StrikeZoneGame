"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "@/lib/store";
import type { MutableRefObject } from "react";

function Gun({ color, accent, len = 0.9 }: { color: string; accent: string; len?: number }) {
  return (
    <group>
      {/* receiver */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.09, 0.13, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.6} />
      </mesh>
      {/* handguard */}
      <mesh castShadow position={[0, 0.005, -0.42]}>
        <boxGeometry args={[0.08, 0.1, len * 0.6]} />
        <meshStandardMaterial color="#22252a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* barrel */}
      <mesh castShadow position={[0, 0.015, -0.42 - len * 0.32]}>
        <cylinderGeometry args={[0.018, 0.018, len * 0.35, 10]} />
        <meshStandardMaterial color="#111316" roughness={0.35} metalness={0.8} />
      </mesh>
      {/* muzzle */}
      <mesh position={[0, 0.015, -0.42 - len * 0.5]}>
        <boxGeometry args={[0.05, 0.05, 0.09]} />
        <meshStandardMaterial color="#0c0d0f" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* mag */}
      <mesh castShadow position={[0, -0.12, -0.05]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.07, 0.2, 0.1]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      {/* grip + stock */}
      <mesh position={[0, -0.1, 0.18]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.06, 0.14, 0.07]} />
        <meshStandardMaterial color="#1b1e22" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.01, 0.38]}>
        <boxGeometry args={[0.07, 0.11, 0.22]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* sight */}
      <mesh position={[0, 0.1, 0.02]}>
        <boxGeometry args={[0.03, 0.07, 0.12]} />
        <meshStandardMaterial color="#0e1013" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, -0.32]}>
        <boxGeometry args={[0.025, 0.05, 0.025]} />
        <meshStandardMaterial color="#0e1013" />
      </mesh>
      {/* side rails glow */}
      <mesh position={[0.045, 0.02, -0.4]}>
        <boxGeometry args={[0.005, 0.02, 0.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

export default function WeaponModel({ flash }: { flash: MutableRefObject<number> }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const group = useRef<THREE.Group>(null);
  const flashMesh = useRef<THREE.Mesh>(null);
  const flashLight = useRef<THREE.PointLight>(null);
  const active = useGameStore((s) => s.activeWeapon);
  const ads = useGameStore((s) => s.ads);
  const sprinting = useGameStore((s) => s.sprinting);
  const sliding = useGameStore((s) => s.sliding);
  const reloading = useGameStore((s) => s.reloading);

  useEffect(() => {
    // CRITICAL: children of camera only render if camera is in the scene
    scene.add(camera);
    const g = group.current;
    if (g) {
      // disable culling — viewmodel is parented to camera and would otherwise pop out
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false;
      });
      g.scale.setScalar(1.15);
      camera.add(g);
    }
    return () => {
      if (g) camera.remove(g);
    };
  }, [camera, scene]);

  // new meshes mount when switching weapons — keep them unculled too
  useEffect(() => {
    group.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false;
    });
  }, [active]);

  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    // positions
    const hip = new THREE.Vector3(0.28, -0.27, -0.55);
    const adsPos = new THREE.Vector3(0, -0.155, -0.35);
    const target = ads ? adsPos : hip;
    if (sprinting && !ads) {
      target.x += 0.08;
      target.y -= 0.06;
    }
    if (sliding) {
      target.y -= 0.08;
      target.z += 0.1;
    }
    const k = 1 - Math.exp(-(ads ? 18 : 12) * d);
    group.current.position.lerp(target, k);
    // sway / bob
    const bob = Math.sin(t * 9) * 0.006;
    group.current.position.y += bob * d * 10 * 0.1;
    // rotation
    const trx = reloading ? -0.5 : sprinting && !ads ? -0.25 : 0;
    group.current.rotation.x += (trx - group.current.rotation.x) * k;
    group.current.rotation.y += ((ads ? 0 : 0.04) - group.current.rotation.y) * k;
    group.current.rotation.z += ((sliding ? 0.25 : 0) - group.current.rotation.z) * k;
    if (reloading) {
      group.current.rotation.z = Math.sin(t * 10) * 0.15;
    }
    // muzzle flash
    const f = Math.max(0, flash.current);
    if (flashMesh.current) {
      flashMesh.current.visible = f > 0.15;
      flashMesh.current.scale.setScalar(0.6 + Math.random() * 0.7 * f);
      (flashMesh.current.material as THREE.MeshBasicMaterial).opacity = f;
    }
    if (flashLight.current) flashLight.current.intensity = f * 14;
  });

  return (
    <group ref={group} position={[0.28, -0.26, -0.55]}>
      {/* dedicated fill light so the viewmodel is never black */}
      <pointLight position={[0.3, 0.4, 0.4]} intensity={1.2} distance={4} color="#ffffff" />
      {/* hands */}
      {/* hands */}
      <mesh position={[0.02, -0.1, -0.25]}>
        <boxGeometry args={[0.07, 0.07, 0.16]} />
        <meshStandardMaterial color="#c9a07a" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.12, 0.12]}>
        <boxGeometry args={[0.07, 0.07, 0.14]} />
        <meshStandardMaterial color="#c9a07a" roughness={0.8} />
      </mesh>
      {active === "ar" ? (
        <Gun color="#2f3a44" accent="#d8452c" len={0.95} />
      ) : active === "smg" ? (
        <group scale={[0.85, 0.85, 0.7]}>
          <Gun color="#3a2f44" accent="#2cc8d8" len={0.6} />
        </group>
      ) : (
        <group scale={[1.12, 1.05, 0.85]}>
          <Gun color="#44402a" accent="#e08a1e" len={0.8} />
        </group>
      )}
      {/* muzzle flash star */}
      <mesh ref={flashMesh} position={[0, 0.015, -1.05]} visible={false}>
        <octahedronGeometry args={[0.11, 0]} />
        <meshBasicMaterial color="#ffd97a" transparent opacity={1} depthWrite={false} />
      </mesh>
      <pointLight ref={flashLight} position={[0, 0, -1]} intensity={0} distance={10} color="#ffbe5a" />
    </group>
  );
}

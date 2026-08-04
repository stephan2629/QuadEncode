'use client';

import { useRef, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import type { Mesh } from 'three';

// The canvas can only render once mounted on the client - SSR has no WebGL
// context. useSyncExternalStore (rather than a mounted-flag + setState in an
// effect) is React's own recommended way to defer a value until the client
// paints, with no server/client mismatch and no extra render-triggering
// setState call.
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function AnimatedBlob() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={2} position={[2, 0, -2]}>
        <MeshDistortMaterial
          color="#ff4f00"
          attach="material"
          distort={0.3}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
          opacity={0.1}
          transparent
          wireframe={false}
        />
      </Sphere>
      <Sphere args={[1, 32, 32]} scale={1.5} position={[-2, 1, -4]}>
        <MeshDistortMaterial
          color="#ffffff"
          attach="material"
          distort={0.2}
          speed={1}
          roughness={0.5}
          metalness={0.2}
          opacity={0.05}
          transparent
        />
      </Sphere>
    </Float>
  );
}

export function ThreeBackground() {
  const isClient = useIsClient();

  if (!isClient) return null;

  // Use a media query match for prefers-reduced-motion to avoid mounting canvas if motion is reduced
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ff4f00" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#ffffff" />
        <AnimatedBlob />
      </Canvas>
    </div>
  );
}

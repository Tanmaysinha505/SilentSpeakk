import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * SmartBlinds Component
 * Motorized window blinds on the east window wall that smoothly tilt open or closed.
 */
export function SmartBlinds({ position = [4.38, 2.1, 0] }) {
  const blindsOpen = useCommandStore((s) => s.blinds?.open ?? true);
  const slatsGroupRef = useRef();

  const targetRotation = blindsOpen ? 0 : Math.PI / 2.3;
  const currentRotation = useRef(blindsOpen ? 0 : Math.PI / 2.3);

  useFrame((_, delta) => {
    currentRotation.current = THREE.MathUtils.lerp(
      currentRotation.current,
      targetRotation,
      delta * 4
    );

    if (slatsGroupRef.current) {
      slatsGroupRef.current.children.forEach((child) => {
        child.rotation.x = currentRotation.current;
      });
    }
  });

  const numSlats = 16;
  const slatSpacing = 0.12;

  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* Blinds Valance / Top Headrail Box */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.1, 0.12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Slats Array */}
      <group ref={slatsGroupRef} position={[0, 0, 0]}>
        {Array.from({ length: numSlats }).map((_, i) => (
          <mesh
            key={i}
            position={[0, 0.95 - i * slatSpacing, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[2.16, 0.015, 0.14]} />
            <meshStandardMaterial
              color="#e2e8f0"
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Bottom Weighted Rail */}
      <mesh position={[0, 0.95 - numSlats * slatSpacing, 0]} castShadow>
        <boxGeometry args={[2.2, 0.05, 0.12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Sunlight glow through blinds when open */}
      <directionalLight
        position={[2, 1, 0]}
        intensity={blindsOpen ? 0.8 : 0.05}
        color="#e0f2fe"
        target-position={[0, 0, 0]}
      />
    </group>
  );
}

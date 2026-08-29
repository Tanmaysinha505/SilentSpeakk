import React from 'react';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * FloorLamp Component
 * Modern curved arc floor lamp beside the living room sofa with a warm ambient shade.
 */
export function FloorLamp({ position = [-2.4, 0, 1.8] }) {
  const lightOn = useCommandStore((s) => s.light.on);

  return (
    <group position={position}>
      {/* Heavy Marble / Metal Base */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Vertical Lower Stem */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.7, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.15} metalness={0.9} />
      </mesh>

      {/* Upper Curved Arc Arm */}
      <mesh position={[0.35, 1.9, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.8, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.15} metalness={0.9} />
      </mesh>

      {/* Horizontal Extension */}
      <mesh position={[0.7, 2.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.35, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.15} metalness={0.9} />
      </mesh>

      {/* Hanging Bell Shade */}
      <group position={[0.85, 2.0, 0]}>
        <mesh castShadow receiveShadow>
          <coneGeometry args={[0.26, 0.22, 32, 1, true]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.3}
            metalness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Internal Bulb */}
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color="#fff"
            emissive={lightOn ? '#fff4e0' : '#000'}
            emissiveIntensity={lightOn ? 2.5 : 0}
          />
        </mesh>

        {/* Ambient Warm Accent Light */}
        {lightOn && (
          <pointLight
            position={[0, -0.1, 0]}
            intensity={1.2}
            color="#ffe8c2"
            distance={4.0}
            decay={2}
          />
        )}
      </group>
    </group>
  );
}

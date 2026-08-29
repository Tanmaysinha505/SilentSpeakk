import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * SmartDoor Component
 * Architectural door frame with an offset hinge pivot group,
 * allowing smooth realistic swinging animations between open (83°) and closed (0°).
 */
export function SmartDoor({ position = [-4.45, 0, 1.2], rotation = [0, Math.PI / 2, 0] }) {
  const doorState = useCommandStore((s) => s.door);
  const hingeGroupRef = useRef();
  const currentAngle = useRef(0);

  const doorWidth = 1.1;
  const doorHeight = 2.4;
  const doorThickness = 0.08;

  useFrame((_, delta) => {
    const target = doorState.open ? doorState.targetAngle || Math.PI * 0.46 : 0;

    // Smooth critically damped lerp for door swing
    currentAngle.current = THREE.MathUtils.lerp(
      currentAngle.current,
      target,
      delta * 4.5
    );

    if (hingeGroupRef.current) {
      hingeGroupRef.current.rotation.y = -currentAngle.current;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Outer Door Frame (Jambs & Header) */}
      <group position={[doorWidth / 2, doorHeight / 2, 0]}>
        {/* Left Jamb (Hinge side) */}
        <mesh position={[-doorWidth / 2 - 0.04, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.08, doorHeight + 0.1, 0.18]} />
          <meshStandardMaterial color="#1e222d" roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Right Jamb (Latch side) */}
        <mesh position={[doorWidth / 2 + 0.04, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.08, doorHeight + 0.1, 0.18]} />
          <meshStandardMaterial color="#1e222d" roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Top Header */}
        <mesh position={[0, doorHeight / 2 + 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[doorWidth + 0.16, 0.08, 0.18]} />
          <meshStandardMaterial color="#1e222d" roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Threshold Floor Plate */}
        <mesh position={[0, -doorHeight / 2 - 0.01, 0]} receiveShadow>
          <boxGeometry args={[doorWidth + 0.16, 0.02, 0.22]} />
          <meshStandardMaterial color="#2d3748" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Status Indicator LED on Top Frame */}
        <mesh position={[0, doorHeight / 2 + 0.01, 0.095]}>
          <boxGeometry args={[0.25, 0.02, 0.01]} />
          <meshStandardMaterial
            color={doorState.open ? '#10b981' : '#00f3ff'}
            emissive={doorState.open ? '#10b981' : '#00f3ff'}
            emissiveIntensity={1.8}
          />
        </mesh>
      </group>

      {/* --- HINGED DOOR ASSEMBLY --- */}
      {/* The hinge pivot is positioned at the left edge: x = 0 */}
      <group ref={hingeGroupRef} position={[0, 0, 0]}>
        {/* Door Panel offset so its left edge aligns exactly with the hinge */}
        <mesh
          position={[doorWidth / 2, doorHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[doorWidth, doorHeight, doorThickness]} />
          <meshStandardMaterial
            color="#2a303c"
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>

        {/* Inset Decorative Glass/Accent Panel */}
        <mesh
          position={[doorWidth / 2, doorHeight / 2, 0.002]}
          castShadow
        >
          <boxGeometry args={[doorWidth * 0.75, doorHeight * 0.8, 0.084]} />
          <meshStandardMaterial
            color="#1d212a"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>

        {/* Modern Vertical Handle */}
        <group position={[doorWidth - 0.12, 1.05, 0]}>
          {/* Front Handle Bar */}
          <mesh position={[0, 0, 0.08]} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.6, 16]} />
            <meshStandardMaterial color="#d1d5db" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Front Mount Stems */}
          <mesh position={[0, 0.22, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 16]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.22, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 16]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Smart Lock Pad with illuminated key slot */}
          <mesh position={[-0.04, 0.36, 0.045]} castShadow>
            <boxGeometry args={[0.07, 0.14, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[-0.04, 0.36, 0.056]}>
            <circleGeometry args={[0.018, 16]} />
            <meshBasicMaterial color={doorState.open ? '#10b981' : '#ef4444'} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * SmartFan Component
 * Ceiling fan featuring physical acceleration & inertia deceleration,
 * aerodynamic blades, and real-time responsiveness to FAN_ON / FAN_OFF commands.
 */
export function SmartFan({ position = [0, 3.4, -1.2] }) {
  const fanState = useCommandStore((s) => s.fan);
  const partyMode = useCommandStore((s) => s.partyMode);

  const bladesGroupRef = useRef();
  const currentSpeed = useRef(0);

  useFrame((state, delta) => {
    // Determine target angular speed
    let target = 0;
    if (fanState.on) {
      target = partyMode ? 18.0 : fanState.targetSpeed || 10.0;
    }

    // Physical inertia lerping: smoothly accelerate or decelerate
    const lerpRate = fanState.on ? 1.8 : 0.8; // Decelerates gradually like a real mechanical motor
    currentSpeed.current = THREE.MathUtils.lerp(
      currentSpeed.current,
      target,
      delta * lerpRate
    );

    // Rotate blade assembly
    if (bladesGroupRef.current && currentSpeed.current > 0.001) {
      bladesGroupRef.current.rotation.y += currentSpeed.current * delta;
    }
  });

  return (
    <group position={position}>
      {/* Ceiling Mount Canopy */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 32]} />
        <meshStandardMaterial color="#1e222d" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Downrod */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.38, 16]} />
        <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Stationary Motor Housing */}
      <mesh position={[0, -0.42, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.14, 32]} />
        <meshStandardMaterial color="#11141c" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Modern Accent Ring on Motor */}
      <mesh position={[0, -0.42, 0]}>
        <torusGeometry args={[0.29, 0.015, 16, 32]} />
        <meshStandardMaterial
          color={fanState.on ? '#00f3ff' : '#4a5568'}
          emissive={fanState.on ? '#00f3ff' : '#000000'}
          emissiveIntensity={fanState.on ? 0.8 : 0}
          metalness={0.8}
        />
      </mesh>

      {/* --- Rotating Blade Hub Assembly --- */}
      <group ref={bladesGroupRef} position={[0, -0.5, 0]}>
        {/* Central Rotating Cap */}
        <mesh castShadow>
          <sphereGeometry args={[0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#1e2430" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* 3 Aerodynamic Curved Blades at 120-degree intervals */}
        {[0, 1, 2].map((idx) => {
          const angle = (idx * Math.PI * 2) / 3;
          return (
            <group key={idx} rotation={[0, angle, 0]}>
              {/* Blade Bracket Arm */}
              <mesh position={[0.28, 0.02, 0]} castShadow>
                <boxGeometry args={[0.18, 0.015, 0.04]} />
                <meshStandardMaterial color="#718096" metalness={0.9} roughness={0.2} />
              </mesh>

              {/* Sculpted Wood/Carbon Blade */}
              <group position={[0.85, 0.03, 0]} rotation={[0.14, 0, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[1.0, 0.012, 0.22]} />
                  <meshStandardMaterial
                    color="#2c303b"
                    metalness={0.4}
                    roughness={0.3}
                  />
                </mesh>
                {/* Subtle blade edge bevel */}
                <mesh position={[0, 0.007, 0]}>
                  <boxGeometry args={[0.96, 0.005, 0.03]} />
                  <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={fanState.on ? 0.4 : 0} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * CeilingLight Component
 * Implements high-lumen pure white room illumination that washes the entire
 * 3D smart room, walls, and furniture in crisp daylight white when turned on.
 */
export function CeilingLight({ position = [0, 3.4, 0] }) {
  const lightState = useCommandStore((s) => s.light);
  const partyMode = useCommandStore((s) => s.partyMode);

  const pointLightRef = useRef();
  const whiteWashLightRef = useRef();
  const bulbRef = useRef();
  const glowHaloRef = useRef();

  // Pure daylight white color (#ffffff / 5500K crisp lumen)
  const whiteColor = '#ffffff';

  const targetIntensity = lightState.on ? (partyMode ? 3.0 : 4.2) : 0.0;
  const currentIntensity = useRef(lightState.on ? 4.2 : 0.0);
  const currentEmissive = useRef(lightState.on ? 4.5 : 0.0);

  useFrame((state, delta) => {
    // Lerp light intensity smoothly
    currentIntensity.current = THREE.MathUtils.lerp(
      currentIntensity.current,
      targetIntensity,
      delta * 8
    );

    // Lerp emissive glow
    const targetEmissive = lightState.on ? (partyMode ? 5.0 : 4.5) : 0.02;
    currentEmissive.current = THREE.MathUtils.lerp(
      currentEmissive.current,
      targetEmissive,
      delta * 8
    );

    if (pointLightRef.current) {
      pointLightRef.current.intensity = currentIntensity.current;
      if (partyMode) {
        const hue = (state.clock.elapsedTime * 0.4) % 1;
        const partyColor = new THREE.Color().setHSL(hue, 1, 0.6);
        pointLightRef.current.color.lerp(partyColor, 0.1);
        if (bulbRef.current) {
          bulbRef.current.material.emissive.lerp(partyColor, 0.1);
        }
      } else {
        const pureWhite = new THREE.Color(whiteColor);
        pointLightRef.current.color.lerp(pureWhite, 0.15);
        if (bulbRef.current) {
          bulbRef.current.material.emissive.lerp(pureWhite, 0.15);
        }
      }
    }

    if (whiteWashLightRef.current) {
      whiteWashLightRef.current.intensity = lightState.on ? 1.8 : 0.0;
    }

    if (bulbRef.current) {
      bulbRef.current.material.emissiveIntensity = currentEmissive.current;
    }

    if (glowHaloRef.current) {
      glowHaloRef.current.scale.setScalar(
        THREE.MathUtils.lerp(
          glowHaloRef.current.scale.x,
          lightState.on ? 1.1 : 0.001,
          delta * 8
        )
      );
    }
  });

  return (
    <group position={position}>
      {/* Ceiling Mount Plate / Canopy */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 32]} />
        <meshStandardMaterial color="#1a1c23" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Suspension Rod */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.66, 16]} />
        <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Modern Fixture Shade */}
      <group position={[0, -0.7, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
          <coneGeometry args={[0.55, 0.35, 32, 1, true]} />
          <meshStandardMaterial
            color="#181c24"
            roughness={0.3}
            metalness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Brass / Platinum Trim Ring */}
        <mesh position={[0, -0.09, 0]}>
          <torusGeometry args={[0.55, 0.02, 16, 32]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>

        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* --- Glowing Emissive White Bulb --- */}
        <mesh ref={bulbRef} position={[0, -0.06, 0]}>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={lightState.on ? 4.5 : 0.02}
            roughness={0.05}
            metalness={0.05}
          />
        </mesh>

        {/* Atmospheric Glow Halo */}
        <mesh ref={glowHaloRef} position={[0, -0.06, 0]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>

        {/* --- Primary Three.js PointLight (High Lumen Pure White) --- */}
        <pointLight
          ref={pointLightRef}
          position={[0, -0.15, 0]}
          color="#ffffff"
          intensity={lightState.on ? 4.2 : 0.0}
          distance={16}
          decay={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        {/* Secondary Downward White Wash for full room floor/wall illumination */}
        <spotLight
          ref={whiteWashLightRef}
          position={[0, -0.2, 0]}
          angle={Math.PI / 2.2}
          penumbra={0.6}
          intensity={lightState.on ? 1.8 : 0.0}
          color="#ffffff"
          distance={12}
        />
      </group>
    </group>
  );
}

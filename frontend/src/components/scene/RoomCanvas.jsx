import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { MultiRoomHouse } from './MultiRoomHouse';
import { CameraController } from './CameraController';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * RoomCanvas Component
 * Master React Three Fiber Canvas rendering the Multi-Room Smart Home Digital Twin.
 */
export function RoomCanvas() {
  const controlsRef = useRef();
  const light = useCommandStore((s) => s.light || { on: true });
  const partyMode = useCommandStore((s) => s.partyMode);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [-4.0, 5.8, 3.2], fov: 42, near: 0.1, far: 80 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          {/* Ambient Fill Lighting */}
          <ambientLight
            intensity={light.on ? 0.75 : 0.25}
            color={light.on ? '#fffbeb' : '#1e293b'}
          />

          {/* Key Directional Sun / Overhead Lighting */}
          <directionalLight
            position={[10, 16, 8]}
            intensity={light.on ? 1.05 : 0.3}
            color={partyMode ? '#a855f7' : '#ffffff'}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />

          {/* Soft Fill Directional Light */}
          <directionalLight
            position={[-10, 12, -8]}
            intensity={0.4}
            color="#38bdf8"
          />

          {/* Ground Soft Shadows */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.6}
            scale={24}
            blur={1.8}
            far={8}
            resolution={512}
            color="#000000"
          />

          {/* 3D Multi-Room Architectural Digital Twin House */}
          <MultiRoomHouse />

          {/* Smooth Dynamic Camera Controller */}
          <CameraController controlsRef={controlsRef} />

          {/* Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enableDamping={true}
            dampingFactor={0.06}
            minDistance={2.5}
            maxDistance={28.0}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minPolarAngle={0.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

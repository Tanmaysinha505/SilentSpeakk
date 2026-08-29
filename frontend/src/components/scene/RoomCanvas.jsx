import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoomShell } from './RoomShell';
import { CeilingLight } from './CeilingLight';
import { SmartFan } from './SmartFan';
import { SmartDoor } from './SmartDoor';
import { SmartTV } from './SmartTV';
import { SmartBlinds } from './SmartBlinds';
import { SmartAC } from './SmartAC';
import { FloorLamp } from './FloorLamp';
import { RoomFurniture } from './RoomFurniture';
import { CameraController } from './CameraController';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * RoomCanvas Component
 * Master React Three Fiber Canvas with crisp white lighting, window blinds,
 * smart AC unit, floor lamp, physics animations, and orbit controls.
 */
export function RoomCanvas() {
  const controlsRef = useRef();
  const lightOn = useCommandStore((s) => s.light.on);
  const partyMode = useCommandStore((s) => s.partyMode);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [4.6, 3.6, 5.2], fov: 48, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          {/* Soft Ambient Light */}
          <ambientLight
            intensity={lightOn ? 0.65 : 0.12}
            color={lightOn ? '#ffffff' : '#1e293b'}
          />

          {/* Directional Skylight through the Window */}
          <directionalLight
            position={[6, 4, 1]}
            intensity={lightOn ? 0.5 : 0.25}
            color={partyMode ? '#a855f7' : '#ffffff'}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0005}
          />

          {/* Ground contact shadows */}
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.65}
            scale={10}
            blur={1.8}
            far={4}
            resolution={512}
            color="#000000"
          />

          {/* 3D Smart Room Elements */}
          <RoomShell />
          <CeilingLight position={[0, 3.4, 0]} />
          <SmartFan position={[0, 3.4, -1.2]} />
          <SmartDoor position={[-4.45, 0, 1.2]} rotation={[0, Math.PI / 2, 0]} />
          <SmartTV position={[0, 1.85, -4.4]} />

          {/* New 3D Additions */}
          <SmartBlinds position={[4.42, 2.0, 0]} />
          <SmartAC position={[2.2, 2.9, -4.38]} />
          <FloorLamp position={[-2.4, 0, 1.8]} />

          <RoomFurniture />

          {/* Dynamic Camera Presets Controller */}
          <CameraController controlsRef={controlsRef} />

          {/* Interactive Orbit Controls with limits */}
          <OrbitControls
            ref={controlsRef}
            enableDamping={true}
            dampingFactor={0.06}
            minDistance={1.8}
            maxDistance={11.0}
            maxPolarAngle={Math.PI / 2 - 0.02}
            minPolarAngle={0.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

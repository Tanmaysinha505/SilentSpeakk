import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * RoomShell Component
 * Architectural structure: Walls, parquet wood/slate floor, baseboards,
 * window with night cityscape view, and subtle LED cove strip.
 */
export function RoomShell() {
  const lightState = useCommandStore((s) => s.light);
  const partyMode = useCommandStore((s) => s.partyMode);

  const roomWidth = 9.0;
  const roomDepth = 9.0;
  const roomHeight = 3.6;

  // Procedural wood parquet canvas texture for realistic floor
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base warm oak / dark walnut tone
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 512, 512);

    // Parquet planks pattern
    const plankW = 64;
    const plankH = 16;
    ctx.strokeStyle = '#0f0e0d';
    ctx.lineWidth = 1.5;

    for (let y = 0; y < 512; y += plankH) {
      const offsetX = ((y / plankH) % 2) * (plankW / 2);
      for (let x = -plankW; x < 512 + plankW; x += plankW) {
        // Individual plank shade variation
        const shade = Math.floor(24 + Math.random() * 8);
        ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade - 2})`;
        ctx.fillRect(x + offsetX, y, plankW, plankH);
        ctx.strokeRect(x + offsetX, y, plankW, plankH);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group>
      {/* --- FLOOR --- */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>

      {/* --- CEILING --- */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, roomHeight, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          color="#0f141c"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Ceiling Cove Lighting Trim (perimeter glow) */}
      <mesh position={[0, roomHeight - 0.04, 0]}>
        <boxGeometry args={[roomWidth - 0.4, 0.03, roomDepth - 0.4]} />
        <meshStandardMaterial
          color={partyMode ? '#a855f7' : (lightState.on ? '#38bdf8' : '#1e293b')}
          emissive={partyMode ? '#a855f7' : (lightState.on ? '#38bdf8' : '#0f172a')}
          emissiveIntensity={lightState.on ? 0.4 : 0.05}
          wireframe={true}
        />
      </mesh>

      {/* --- NORTH WALL (Back - holds TV & Accent Paneling) --- */}
      <group position={[0, roomHeight / 2, -roomDepth / 2]}>
        {/* Main Wall */}
        <mesh receiveShadow>
          <boxGeometry args={[roomWidth, roomHeight, 0.1]} />
          <meshStandardMaterial color="#131822" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Vertical Acoustic Wood Slats behind TV */}
        <group position={[0, 0, 0.06]}>
          {Array.from({ length: 24 }).map((_, i) => (
            <mesh key={i} position={[(i - 11.5) * 0.16, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.08, roomHeight * 0.82, 0.03]} />
              <meshStandardMaterial color="#1e2430" roughness={0.5} metalness={0.3} />
            </mesh>
          ))}
        </group>

        {/* Ambient Backlight Strip behind TV accent panel */}
        <pointLight
          position={[0, 0, 0.2]}
          color={partyMode ? '#ec4899' : '#00f3ff'}
          intensity={lightState.on ? 0.8 : 0.15}
          distance={4}
        />

        {/* Baseboard */}
        <mesh position={[0, -roomHeight / 2 + 0.08, 0.06]} receiveShadow>
          <boxGeometry args={[roomWidth, 0.16, 0.04]} />
          <meshStandardMaterial color="#0c0e14" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* --- WEST WALL (Left - holds Door) --- */}
      <group position={[-roomWidth / 2, roomHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Left segment of wall */}
        <mesh position={[-2.8, 0, 0]} receiveShadow>
          <boxGeometry args={[3.4, roomHeight, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Right segment of wall */}
        <mesh position={[2.8, 0, 0]} receiveShadow>
          <boxGeometry args={[3.4, roomHeight, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Header segment above door */}
        <mesh position={[1.2, roomHeight / 2 - 0.5, 0]} receiveShadow>
          <boxGeometry args={[1.5, 1.0, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Baseboards */}
        <mesh position={[-2.8, -roomHeight / 2 + 0.08, 0.06]} receiveShadow>
          <boxGeometry args={[3.4, 0.16, 0.04]} />
          <meshStandardMaterial color="#0c0e14" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[2.8, -roomHeight / 2 + 0.08, 0.06]} receiveShadow>
          <boxGeometry args={[3.4, 0.16, 0.04]} />
          <meshStandardMaterial color="#0c0e14" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* --- EAST WALL (Right - with Smart City View Window) --- */}
      <group position={[roomWidth / 2, roomHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Solid wall sections around window */}
        <mesh position={[-2.8, 0, 0]} receiveShadow>
          <boxGeometry args={[3.4, roomHeight, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[2.8, 0, 0]} receiveShadow>
          <boxGeometry args={[3.4, roomHeight, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, -roomHeight / 2 + 0.6, 0]} receiveShadow>
          <boxGeometry args={[2.5, 1.2, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, roomHeight / 2 - 0.4, 0]} receiveShadow>
          <boxGeometry args={[2.5, 0.8, 0.1]} />
          <meshStandardMaterial color="#151b27" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Large Smart Window Pane */}
        <group position={[0, 0.2, 0]}>
          {/* Outer Window Frame */}
          <mesh castShadow>
            <boxGeometry args={[2.4, 1.8, 0.14]} />
            <meshStandardMaterial color="#0d1117" roughness={0.2} metalness={0.9} />
          </mesh>
          {/* Glass Pane with reflective sky */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[2.24, 1.64]} />
            <meshStandardMaterial
              color="#090d16"
              roughness={0.05}
              metalness={0.95}
              transparent
              opacity={0.88}
            />
          </mesh>
          {/* Cityscape Backdrop illuminated at night */}
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry args={[2.24, 1.64]} />
            <meshBasicMaterial color="#050811" />
          </mesh>
          {/* Distant Cyber Skyline Glow lights outside window */}
          <pointLight position={[0, 0, -0.6]} color="#38bdf8" intensity={0.4} distance={3} />
        </group>
      </group>
    </group>
  );
}

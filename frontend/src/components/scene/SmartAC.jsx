import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * SmartAC Component
 * Wall-mounted smart climate control unit with an offline CanvasTexture digital LED display
 * and oscillating airflow louvers.
 */
export function SmartAC({ position = [2.2, 3.0, -4.4] }) {
  const ac = useCommandStore((s) => s.ac || { on: true, temp: 21 });
  const louverRef = useRef();
  const displayMeshRef = useRef();

  // Instant offline CanvasTexture for the digital LED readout (No external font fetch, no Suspense)
  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const context = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, ctx: context, texture: tex };
  }, []);

  useFrame((state) => {
    if (louverRef.current) {
      if (ac.on) {
        louverRef.current.rotation.x = -Math.PI / 4 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      } else {
        louverRef.current.rotation.x = 0;
      }
    }

    // Render digital display texture
    if (ctx && texture) {
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (ac.on) {
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${ac.temp}°C`, canvas.width / 2, canvas.height / 2);
      }
      texture.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* AC Main Sleek White Chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.45, 0.32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* Front Curved Panel Trim */}
      <mesh position={[0, -0.05, 0.165]}>
        <boxGeometry args={[1.46, 0.32, 0.02]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Digital LED Display Screen */}
      <mesh position={[0.42, 0.03, 0.176]} ref={displayMeshRef}>
        <planeGeometry args={[0.36, 0.18]} />
        <meshBasicMaterial map={texture} />
      </mesh>

      {/* Power / Eco Status LED */}
      <mesh position={[-0.55, -0.12, 0.17]}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color={ac.on ? '#10b981' : '#64748b'} />
      </mesh>

      {/* Airflow Exhaust Louver Vent */}
      <group position={[0, -0.2, 0.08]} ref={louverRef}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.4, 0.04, 0.14]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>

      {/* Subtle cool air glow when active */}
      {ac.on && (
        <pointLight
          position={[0, -0.3, 0.2]}
          intensity={0.4}
          color="#38bdf8"
          distance={2.5}
        />
      )}
    </group>
  );
}

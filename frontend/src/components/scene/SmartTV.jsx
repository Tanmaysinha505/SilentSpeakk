import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * SmartTV Component
 * Ultra-thin wall-mounted OLED display featuring an animated canvas texture
 * for dynamic smart home visualizers, channel switching, and screen glow.
 */
export function SmartTV({ position = [0, 1.85, -4.4] }) {
  const tvState = useCommandStore((s) => s.tv);
  const screenMeshRef = useRef();
  const screenLightRef = useRef();

  // Dynamic canvas texture for the TV screen
  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 288;
    const context = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, ctx: context, texture: tex };
  }, []);

  // Update canvas animation frame in useFrame
  useFrame((state) => {
    if (!tvState.on || !ctx) {
      if (screenLightRef.current) screenLightRef.current.intensity = 0;
      return;
    }

    const t = state.clock.elapsedTime;
    const w = canvas.width;
    const h = canvas.height;
    const channelName = tvState.channels[tvState.channelIndex] || 'SMART HOME OS';

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#060a17');
    grad.addColorStop(1, '#0e1838');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Dynamic sine wave / audio spectrum
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < w; x += 6) {
      const y = h / 2 + Math.sin(x * 0.02 + t * 4) * 35 + Math.cos(x * 0.04 + t * 2) * 15;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Second harmonic wave
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x += 8) {
      const y = h / 2 + Math.cos(x * 0.03 - t * 3) * 25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // HUD Header on TV
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`● LIVE // ${channelName}`, 24, 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(`AIROS SMART ROOM CONNECTED  |  VOL: ${tvState.volume}%`, 24, 60);

    // Live Telemetry bar on bottom
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(20, h - 54, w - 40, 36);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.strokeRect(20, h - 54, w - 40, 36);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText('STATUS: SYNCHRONIZED  •  MEDIAPIPE VISION ENGINE ACTIVE', 32, h - 31);

    texture.needsUpdate = true;

    // Pulse screen glow light
    if (screenLightRef.current) {
      screenLightRef.current.intensity = 0.9 + Math.sin(t * 3) * 0.15;
    }
  });

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const tvWidth = 2.4;
  const tvHeight = 1.38;
  const tvDepth = 0.05;

  return (
    <group position={position}>
      {/* Wall Bracket */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.04]} />
        <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Main Outer Bezel Frame */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[tvWidth, tvHeight, tvDepth]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Screen Mesh */}
      <mesh ref={screenMeshRef} position={[0, 0, tvDepth / 2 + 0.002]}>
        <planeGeometry args={[tvWidth - 0.05, tvHeight - 0.05]} />
        {tvState.on ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            color="#05070a"
            roughness={0.1}
            metalness={0.95}
          />
        )}
      </mesh>

      {/* Ambient Screen Light (casts glow forward onto the room when TV is on) */}
      <pointLight
        ref={screenLightRef}
        position={[0, 0, 0.35]}
        color="#38bdf8"
        intensity={tvState.on ? 0.9 : 0}
        distance={4.5}
        decay={2}
      />

      {/* Slim Soundbar underneath TV */}
      <group position={[0, -tvHeight / 2 - 0.14, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[tvWidth * 0.65, 0.09, 0.1]} />
          <meshStandardMaterial color="#1e2433" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Soundbar LED indicator */}
        <mesh position={[0, 0, 0.052]}>
          <circleGeometry args={[0.008, 16]} />
          <meshBasicMaterial color={tvState.on ? '#00f3ff' : '#64748b'} />
        </mesh>
      </group>
    </group>
  );
}

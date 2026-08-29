import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

const CAMERA_PRESETS = {
  DEFAULT: {
    pos: [4.6, 3.6, 5.2],
    target: [0, 1.2, -0.5],
  },
  LIGHT: {
    pos: [0, 2.4, 2.6],
    target: [0, 2.8, 0],
  },
  FAN: {
    pos: [1.2, 2.3, 0.4],
    target: [0, 2.9, -1.2],
  },
  DOOR: {
    pos: [-2.0, 1.6, 2.6],
    target: [-4.4, 1.3, 1.2],
  },
  TV: {
    pos: [0, 1.65, 0.4],
    target: [0, 1.85, -4.4],
  },
  TOP_DOWN: {
    pos: [0.01, 7.6, 0.01],
    target: [0, 0, 0],
  }
};

export function CameraController({ controlsRef }) {
  const cameraPreset = useCommandStore((s) => s.cameraPreset);
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.DEFAULT.pos));
  const targetLookAt = useRef(new THREE.Vector3(...CAMERA_PRESETS.DEFAULT.target));

  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.DEFAULT;
    targetPos.current.set(...preset.pos);
    targetLookAt.current.set(...preset.target);
  }, [cameraPreset]);

  useFrame((_, delta) => {
    // Smoothly lerp camera position
    camera.position.lerp(targetPos.current, delta * 3.5);

    // Smoothly lerp orbit controls target
    if (controlsRef && controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 3.5);
      controlsRef.current.update();
    }
  });

  return null;
}

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '../../store/useCommandStore';

const ROOM_CENTERS = {
  room1: new THREE.Vector3(-4.0, 1.0, -4.0),
  room2: new THREE.Vector3(4.0, 1.0, -4.0),
  room3: new THREE.Vector3(-4.0, 1.0, 4.0),
  room4: new THREE.Vector3(4.0, 1.0, 4.0),
};

const ROOM_CAMERAS = {
  room1: new THREE.Vector3(-4.0, 5.8, 3.2),
  room2: new THREE.Vector3(4.0, 5.8, 3.2),
  room3: new THREE.Vector3(-4.0, 5.8, 11.2),
  room4: new THREE.Vector3(4.0, 5.8, 11.2),
};

export function CameraController({ controlsRef }) {
  const activeRoomId = useCommandStore((s) => s.activeRoomId || 'room1');
  const cameraPreset = useCommandStore((s) => s.cameraPreset);
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3(-4.0, 5.8, 3.2));
  const targetLookAt = useRef(new THREE.Vector3(-4.0, 1.0, -4.0));

  useEffect(() => {
    const center = ROOM_CENTERS[activeRoomId] || ROOM_CENTERS.room1;
    const defaultCam = ROOM_CAMERAS[activeRoomId] || ROOM_CAMERAS.room1;

    switch (cameraPreset) {
      case 'LIGHT':
        targetPos.current.set(center.x, 2.8, center.z + 2.5);
        targetLookAt.current.set(center.x, 3.0, center.z);
        break;
      case 'FAN':
        targetPos.current.set(center.x + 1.5, 2.6, center.z + 1.2);
        targetLookAt.current.set(center.x, 3.1, center.z);
        break;
      case 'DOOR':
        targetPos.current.set(center.x - 1.2, 2.0, center.z + 2.8);
        targetLookAt.current.set(center.x - 3.6, 1.2, center.z + 1.6);
        break;
      case 'TV':
        targetPos.current.set(center.x, 1.8, center.z - 0.5);
        targetLookAt.current.set(center.x, 1.7, center.z - 3.8);
        break;
      case 'TOP_DOWN':
        targetPos.current.set(0.01, 20.0, 0.01);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'DEFAULT':
      default:
        targetPos.current.copy(defaultCam);
        targetLookAt.current.copy(center);
        break;
    }
  }, [activeRoomId, cameraPreset]);

  useFrame((_, delta) => {
    // Smooth lerp camera position
    camera.position.lerp(targetPos.current, delta * 3.8);

    // Smooth lerp orbit controls target
    if (controlsRef && controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 3.8);
      controlsRef.current.update();
    }
  });

  return null;
}

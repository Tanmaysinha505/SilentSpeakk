import React from 'react';
import { CeilingLight } from './CeilingLight';
import { SmartFan } from './SmartFan';
import { SmartDoor } from './SmartDoor';
import { SmartTV } from './SmartTV';
import { SmartBlinds } from './SmartBlinds';
import { SmartAC } from './SmartAC';
import { FloorLamp } from './FloorLamp';
import { useCommandStore } from '../../store/useCommandStore';

/**
 * MultiRoomHouse Component
 * 3D Architectural Digital Twin rendering 4 rooms with their independent device states.
 * Uses stylish low cutaway architectural partitions and open sightlines so all furniture
 * and components are clearly visible from any camera angle without obstruction.
 */
export function MultiRoomHouse() {
  const rooms = useCommandStore((s) => s.rooms);
  const activeRoomId = useCommandStore((s) => s.activeRoomId);

  return (
    <group>
      {/* Foundation Ground Slab */}
      <mesh receiveShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[17.2, 0.25, 17.2]} />
        <meshStandardMaterial color="#080e1a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Modern Sci-Fi Floor Grid */}
      <gridHelper args={[16.0, 32, '#00f3ff', '#1e293b']} position={[0, 0.005, 0]} />

      {/* Architectural Low Cutaway Partition Walls (Height: 1.2m with glowing top trim) */}
      {/* Central Corridor Cross Walls */}
      <group position={[0, 0.6, 0]}>
        {/* North-South Divider */}
        <mesh receiveShadow castShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.16, 1.2, 16.0]} />
          <meshStandardMaterial color="#172235" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Neon top rim */}
        <mesh position={[0, 0.61, 0]}>
          <boxGeometry args={[0.18, 0.02, 16.0]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.6} />
        </mesh>

        {/* East-West Divider */}
        <mesh receiveShadow castShadow position={[0, 0, 0]}>
          <boxGeometry args={[16.0, 1.2, 0.16]} />
          <meshStandardMaterial color="#172235" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Neon top rim */}
        <mesh position={[0, 0.61, 0]}>
          <boxGeometry args={[16.0, 0.02, 0.18]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Outer Back Boundary Walls (Height: 2.2m for TV and AC mounting) */}
      <mesh position={[0, 1.1, -8.0]} receiveShadow castShadow>
        <boxGeometry args={[16.2, 2.2, 0.16]} />
        <meshStandardMaterial color="#131d2e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 8.0]} receiveShadow castShadow>
        <boxGeometry args={[16.2, 2.2, 0.16]} />
        <meshStandardMaterial color="#131d2e" roughness={0.5} />
      </mesh>
      <mesh position={[-8.0, 1.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.16, 2.2, 16.2]} />
        <meshStandardMaterial color="#131d2e" roughness={0.5} />
      </mesh>
      <mesh position={[8.0, 1.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.16, 2.2, 16.2]} />
        <meshStandardMaterial color="#131d2e" roughness={0.5} />
      </mesh>

      {/* ===================================================================
          ROOM 1: MASTER BEDROOM (PHYSICAL ESP32 HARDWARE) — Top-Left [-4, 0, -4]
          =================================================================== */}
      <group position={[-4.0, 0, -4.0]}>
        {/* Active Room Glow Outline */}
        {activeRoomId === 'room1' && <RoomActiveOutline />}

        {/* Interior Ambient Point Light */}
        <pointLight
          position={[0, 2.6, 0]}
          intensity={rooms.room1.light.on ? 1.2 : 0.2}
          color={rooms.room1.light.color || '#fff6e0'}
          distance={8}
          decay={2}
        />

        {/* Room 1 Interactive Devices */}
        <CeilingLight position={[0, 3.2, 0]} on={rooms.room1.light.on} />
        <SmartFan position={[0, 3.2, 0]} on={rooms.room1.fan.on} />
        <SmartDoor position={[-3.8, 0, 1.6]} rotation={[0, Math.PI / 2, 0]} open={rooms.room1.door.open} />
        <SmartTV position={[0, 1.7, -3.85]} on={rooms.room1.tv.on} />
        <SmartAC position={[2.2, 2.6, -3.85]} />
        <SmartBlinds position={[3.85, 1.7, 0]} open={rooms.room1.blinds.open} />
        <FloorLamp position={[3.2, 0, 3.0]} />

        {/* Media Console under TV */}
        <mesh position={[0, 0.35, -3.5]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.45, 0.5]} />
          <meshStandardMaterial color="#1a2333" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* Master Bed Suite */}
        <group position={[-1.4, 0, -0.4]}>
          {/* Bed Base Frame */}
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.4, 2.4]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Plush White Mattress */}
          <mesh position={[0, 0.52, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.22, 2.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          {/* Cyan Quilt Runner */}
          <mesh position={[0, 0.63, 0.4]} castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.04, 1.2]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.6} />
          </mesh>
          {/* Bed Headboard */}
          <mesh position={[0, 0.95, -1.15]} castShadow>
            <boxGeometry args={[2.4, 1.0, 0.14]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* Pillows */}
          <mesh position={[-0.5, 0.68, -0.75]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.65, 0.16, 0.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          <mesh position={[0.5, 0.68, -0.75]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.65, 0.16, 0.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          {/* Left Nightstand */}
          <mesh position={[-1.4, 0.3, -1.0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.45]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* Right Nightstand */}
          <mesh position={[1.4, 0.3, -1.0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.45]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
        </group>

        {/* Workstation Desk & Ergonomic Setup */}
        <group position={[1.8, 0, 0.6]}>
          {/* Desk Top */}
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.06, 0.85]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.4} />
          </mesh>
          {/* Metal Legs */}
          <mesh position={[-0.8, 0.37, 0]} castShadow>
            <boxGeometry args={[0.06, 0.74, 0.75]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          <mesh position={[0.8, 0.37, 0]} castShadow>
            <boxGeometry args={[0.06, 0.74, 0.75]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          {/* Laptop / Monitor */}
          <mesh position={[0, 1.05, -0.1]} castShadow>
            <boxGeometry args={[0.7, 0.45, 0.04]} />
            <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* ESP32 Hardware Telemetry Hub on Wall */}
        <group position={[-3.85, 1.5, -1.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.45, 0.35]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          <mesh position={[0.05, 0, 0]}>
            <planeGeometry args={[0.3, 0.4]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      </group>

      {/* ===================================================================
          ROOM 2: LIVING ROOM (DIGITAL TWIN) — Top-Right [4, 0, -4]
          =================================================================== */}
      <group position={[4.0, 0, -4.0]}>
        {activeRoomId === 'room2' && <RoomActiveOutline />}

        <pointLight
          position={[0, 2.6, 0]}
          intensity={rooms.room2.light.on ? 1.2 : 0.2}
          color={rooms.room2.light.color || '#fff6e0'}
          distance={8}
          decay={2}
        />

        {/* Room 2 Interactive Devices */}
        <CeilingLight position={[0, 3.2, 0]} on={rooms.room2.light.on} />
        <SmartFan position={[0, 3.2, 0]} on={rooms.room2.fan.on} />
        <SmartDoor position={[3.8, 0, 1.6]} rotation={[0, -Math.PI / 2, 0]} open={rooms.room2.door.open} />
        <SmartTV position={[0, 1.7, -3.85]} on={rooms.room2.tv.on} />
        <SmartAC position={[2.2, 2.6, -3.85]} />
        <SmartBlinds position={[-3.85, 1.7, 0]} open={rooms.room2.blinds.open} />

        {/* Modern Living Room L-Sofa */}
        <group position={[0, 0, 0.6]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.2, 0.45, 1.1]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          <mesh position={[-1.05, 0.35, -0.8]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.45, 1.4]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.75, 0.45]} castShadow>
            <boxGeometry args={[3.2, 0.65, 0.25]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
        </group>

        {/* Glass Coffee Table */}
        <mesh position={[0.4, 0.22, -0.7]} castShadow>
          <boxGeometry args={[1.5, 0.3, 0.8]} />
          <meshStandardMaterial color="#00f3ff" roughness={0.1} metalness={0.8} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* ===================================================================
          ROOM 3: STUDY ROOM (DIGITAL TWIN) — Bottom-Left [-4, 0, 4]
          =================================================================== */}
      <group position={[-4.0, 0, 4.0]}>
        {activeRoomId === 'room3' && <RoomActiveOutline />}

        <pointLight
          position={[0, 2.6, 0]}
          intensity={rooms.room3.light.on ? 1.2 : 0.2}
          color={rooms.room3.light.color || '#fff6e0'}
          distance={8}
          decay={2}
        />

        {/* Room 3 Interactive Devices */}
        <CeilingLight position={[0, 3.2, 0]} on={rooms.room3.light.on} />
        <SmartFan position={[0, 3.2, 0]} on={rooms.room3.fan.on} />
        <SmartDoor position={[-3.8, 0, -1.6]} rotation={[0, Math.PI / 2, 0]} open={rooms.room3.door.open} />
        <SmartTV position={[0, 1.7, 3.85]} on={rooms.room3.tv.on} />
        <SmartAC position={[2.2, 2.6, 3.85]} />
        <SmartBlinds position={[3.85, 1.7, 0]} open={rooms.room3.blinds.open} />

        {/* Executive Study Desk & Chair */}
        <group position={[0, 0, -0.2]}>
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.08, 1.2]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[-1.0, 0.37, 0]} castShadow>
            <boxGeometry args={[0.08, 0.74, 1.1]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[1.0, 0.37, 0]} castShadow>
            <boxGeometry args={[0.08, 0.74, 1.1]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Dual Screen Workstation Monitors */}
          <mesh position={[-0.4, 1.15, -0.2]} castShadow>
            <boxGeometry args={[0.7, 0.45, 0.04]} />
            <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0.4, 1.15, -0.2]} castShadow>
            <boxGeometry args={[0.7, 0.45, 0.04]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </group>

      {/* ===================================================================
          ROOM 4: GUEST BEDROOM (DIGITAL TWIN) — Bottom-Right [4, 0, 4]
          =================================================================== */}
      <group position={[4.0, 0, 4.0]}>
        {activeRoomId === 'room4' && <RoomActiveOutline />}

        <pointLight
          position={[0, 2.6, 0]}
          intensity={rooms.room4.light.on ? 1.2 : 0.2}
          color={rooms.room4.light.color || '#fff6e0'}
          distance={8}
          decay={2}
        />

        {/* Room 4 Interactive Devices */}
        <CeilingLight position={[0, 3.2, 0]} on={rooms.room4.light.on} />
        <SmartFan position={[0, 3.2, 0]} on={rooms.room4.fan.on} />
        <SmartDoor position={[3.8, 0, -1.6]} rotation={[0, -Math.PI / 2, 0]} open={rooms.room4.door.open} />
        <SmartTV position={[0, 1.7, 3.85]} on={rooms.room4.tv.on} />
        <SmartAC position={[2.2, 2.6, 3.85]} />
        <SmartBlinds position={[-3.85, 1.7, 0]} open={rooms.room4.blinds.open} />

        {/* Guest Queen Bed */}
        <group position={[1.2, 0, -0.4]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.45, 2.4]} />
            <meshStandardMaterial color="#0f172a" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.55, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.22, 2.1]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
          </mesh>
        </group>

        {/* Wardrobe Storage Unit */}
        <mesh position={[-2.4, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 2.4, 1.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Neon Cyan Room Active Floor Highlight
 */
function RoomActiveOutline() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[7.6, 7.6]} />
      <meshBasicMaterial color="#00f3ff" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  );
}

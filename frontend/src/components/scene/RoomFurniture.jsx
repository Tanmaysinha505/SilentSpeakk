import React from 'react';

/**
 * RoomFurniture Component
 * Enhances architectural depth and realistic scale with modern furniture:
 * Media console beneath TV, sofa lounge, coffee table, area rug, and indoor plant.
 */
export function RoomFurniture() {
  return (
    <group>
      {/* --- MEDIA CONSOLE (Under TV on North wall) --- */}
      <group position={[0, 0.35, -4.0]}>
        {/* Main Cabinet */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.55, 0.6]} />
          <meshStandardMaterial color="#1a1e29" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Wood Veneer Top Strip */}
        <mesh position={[0, 0.285, 0]} castShadow>
          <boxGeometry args={[3.22, 0.02, 0.62]} />
          <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Console Slender Metal Legs */}
        {[-1.4, 1.4].map((x, i) => (
          <group key={i} position={[x, -0.28, 0]}>
            <mesh position={[0, -0.04, -0.22]} castShadow>
              <cylinderGeometry args={[0.018, 0.014, 0.15, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.04, 0.22]} castShadow>
              <cylinderGeometry args={[0.018, 0.014, 0.15, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Small Smart Home Speaker Hub on Console */}
        <mesh position={[1.1, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.12, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Glowing ring on smart speaker */}
        <mesh position={[1.1, 0.405, 0]}>
          <ringGeometry args={[0.05, 0.07, 24]} rotation={[-Math.PI / 2, 0, 0]} />
          <meshBasicMaterial color="#00f3ff" />
        </mesh>
      </group>

      {/* --- AREA RUG --- */}
      <mesh position={[0, 0.005, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial
          color="#1e2433"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* --- MODERN MINIMALIST SOFA --- */}
      <group position={[0, 0, 1.4]} rotation={[0, Math.PI, 0]}>
        {/* Sofa Base / Cushion */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.4, 1.0]} />
          <meshStandardMaterial color="#2d3748" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Sofa Backrest */}
        <mesh position={[0, 0.85, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.55, 0.22]} />
          <meshStandardMaterial color="#242c3d" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Left Armrest */}
        <mesh position={[-1.45, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.45, 1.0]} />
          <meshStandardMaterial color="#242c3d" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Right Armrest */}
        <mesh position={[1.45, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.45, 1.0]} />
          <meshStandardMaterial color="#242c3d" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Throw Pillows */}
        <mesh position={[-1.0, 0.72, -0.22]} rotation={[0.2, 0.15, 0]} castShadow>
          <boxGeometry args={[0.42, 0.38, 0.14]} />
          <meshStandardMaterial color="#00f3ff" roughness={0.8} />
        </mesh>
        <mesh position={[1.0, 0.72, -0.22]} rotation={[0.2, -0.15, 0]} castShadow>
          <boxGeometry args={[0.42, 0.38, 0.14]} />
          <meshStandardMaterial color="#a855f7" roughness={0.8} />
        </mesh>
      </group>

      {/* --- COFFEE TABLE --- */}
      <group position={[0, 0.22, -0.4]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.65, 0.65, 0.04, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[0, -0.12, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.22, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.21, 0]} receiveShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.02, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* --- INDOOR SMART PLANT (Corner near window) --- */}
      <group position={[3.6, 0, -3.6]}>
        {/* Ceramic Planter Pot */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.2, 0.7, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Soil */}
        <mesh position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.04, 24]} />
          <meshStandardMaterial color="#1c1917" roughness={0.9} />
        </mesh>
        {/* Architectural Foliage / Leaves */}
        {[0, 1, 2, 3, 4].map((i) => {
          const rotY = (i * Math.PI * 2) / 5;
          const tilt = 0.3 + (i % 2) * 0.15;
          const h = 0.7 + i * 0.12;
          return (
            <group key={i} position={[0, h, 0]} rotation={[tilt, rotY, 0]}>
              <mesh position={[0, 0.25, 0.2]} rotation={[0.4, 0, 0]} castShadow>
                <boxGeometry args={[0.2, 0.45, 0.012]} />
                <meshStandardMaterial
                  color="#15803d"
                  roughness={0.4}
                  metalness={0.1}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

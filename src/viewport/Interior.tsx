import type { BodyDef } from "../domain/bodies";

type Props = { body: BodyDef };

/** Left-hand drive. +X is the nose, +Z is the passenger side. */
export function Interior({ body }: Props) {
  const xAt = (u: number) => -body.length / 2 + u * body.length;
  const roofFrontX = xAt(body.roofFrontU);
  const roofRearX = xAt(body.roofRearU);
  const driverZ = -Math.min(0.36, body.width * 0.19);
  const dashDepth = Math.min(0.36, (roofFrontX - roofRearX) * 0.38);
  const dashRearX = roofFrontX - 0.04;
  const dashCenterX = dashRearX + dashDepth * 0.45;
  const dashTop = Math.min(body.beltY - 0.04, body.roofY - 0.25);
  const wheelX = dashRearX - 0.04;
  const wheelY = dashTop - 0.02;
  const wheelR = Math.min(0.175, Math.max(0.14, (body.roofY - wheelY) * 0.34));
  const seatX = Math.min(wheelX - 0.46, (roofFrontX + roofRearX) * 0.5);
  const leather = "#2c261f";
  const dash = "#23262c";

  return (
    <group>
      <mesh position={[(roofFrontX + roofRearX) / 2, 0.34, 0]}>
        <boxGeometry args={[Math.max(0.8, roofFrontX - roofRearX - 0.15), 0.05, body.width * 0.5]} />
        <meshStandardMaterial color="#121418" roughness={0.95} />
      </mesh>

      <group position={[dashCenterX, dashTop - 0.11, 0]} rotation={[0, 0, -0.16]}>
        <mesh>
          <boxGeometry args={[dashDepth, 0.2, body.width * 0.58]} />
          <meshStandardMaterial color={dash} roughness={0.62} metalness={0.08} />
        </mesh>
        <mesh position={[0.04, 0.11, 0]}>
          <boxGeometry args={[dashDepth * 0.72, 0.035, body.width * 0.52]} />
          <meshStandardMaterial color="#2e3238" roughness={0.4} metalness={0.15} />
        </mesh>
        <mesh position={[0.02, 0.02, driverZ]}>
          <boxGeometry args={[0.16, 0.1, 0.28]} />
          <meshStandardMaterial color="#16181c" roughness={0.45} />
        </mesh>
        <mesh position={[0.1, 0.02, driverZ]}>
          <boxGeometry args={[0.012, 0.07, 0.2]} />
          <meshStandardMaterial color="#0e1a14" roughness={0.3} emissive="#143024" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.08, -0.01, body.width * 0.06]}>
          <boxGeometry args={[0.02, 0.09, 0.2]} />
          <meshStandardMaterial color="#10141a" roughness={0.25} metalness={0.2} />
        </mesh>
      </group>

      <group position={[wheelX, wheelY, driverZ]} rotation={[0, 0, -0.5]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[wheelR, 0.014, 12, 28]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.42} metalness={0.45} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[wheelR * 0.96, 0.004, 8, 28]} />
          <meshStandardMaterial color="#c5c9d0" roughness={0.28} metalness={0.85} />
        </mesh>
        <mesh position={[0, -wheelR * 0.42, 0]}>
          <boxGeometry args={[0.016, wheelR * 0.62, 0.02]} />
          <meshStandardMaterial color="#2a2d32" metalness={0.7} roughness={0.32} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position={[0, wheelR * 0.12, side * wheelR * 0.38]} rotation={[side * 0.55, 0, 0]}>
            <boxGeometry args={[0.016, 0.02, wheelR * 0.55]} />
            <meshStandardMaterial color="#2a2d32" metalness={0.7} roughness={0.32} />
          </mesh>
        ))}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.042, 0.048, 0.045, 16]} />
          <meshStandardMaterial color="#3a3e44" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0.09, -0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.02, 0.2, 10]} />
          <meshStandardMaterial color="#1c1e22" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>

      <Seat position={[seatX, 0.38, driverZ]} leather={leather} />
      <Seat position={[seatX, 0.38, -driverZ]} leather={leather} />

      <mesh position={[xAt((body.roofFrontU + body.roofRearU) / 2 + 0.02), body.roofY - 0.12, 0]}>
        <boxGeometry args={[0.08, 0.05, 0.22]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Seat({ position, leather }: { position: [number, number, number]; leather: string }) {
  return (
    <group position={position}>
      <mesh position={[0.04, 0.05, 0]}>
        <boxGeometry args={[0.46, 0.09, 0.44]} />
        <meshStandardMaterial color={leather} roughness={0.88} />
      </mesh>
      <mesh position={[-0.15, 0.3, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.09, 0.46, 0.42]} />
        <meshStandardMaterial color={leather} roughness={0.88} />
      </mesh>
      <mesh position={[-0.2, 0.56, 0]}>
        <boxGeometry args={[0.07, 0.08, 0.2]} />
        <meshStandardMaterial color={leather} roughness={0.88} />
      </mesh>
    </group>
  );
}

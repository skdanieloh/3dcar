import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildCar } from "../domain/buildBody";
import type { CarLayout } from "../domain/buildBody";
import { lerp, planPull, sampleStation } from "../domain/sample";
import type { Station } from "../domain/sample";
import type { Vehicle } from "../domain/types";
import { glassArgs, paintArgs } from "./materials";

type Props = { vehicle: Vehicle };

export function CarModel({ vehicle }: Props) {
  const { design, performance, engine } = vehicle;
  const built = useMemo(
    () => buildCar(vehicle),
    [design.bodyType, design.angularity, design.rimInches, design.tireWidthMm, design.tireAspect],
  );
  useEffect(() => {
    return () => {
      built.paint.dispose();
      built.glass.dispose();
    };
  }, [built]);

  const { layout } = built;
  const { body, tire } = layout;
  const angularity = design.angularity;
  const stationAt = (u: number) => sampleStation(body, u, angularity, tire);
  const place = (u: number, zFraction: number) => {
    const station = stationAt(u);
    const z = station.halfW * zFraction;
    return {
      station,
      z,
      x: station.x + planPull(u, z, station.halfW, angularity),
    };
  };

  const paint = paintArgs(design.color, design.finish);
  const glass = glassArgs(design.tint);
  const twoDoor = body.type === "coupe" || body.type === "sports";
  const axleX = (u: number) => -body.length / 2 + u * body.length;
  const frontX = axleX(body.frontAxleU);
  const rearX = axleX(body.rearAxleU);
  const archR = tire.radius + body.archGap;
  const skirtStart = rearX + archR + 0.05;
  const skirtEnd = frontX - archR - 0.05;
  const skirtSpan = Math.max(0.2, skirtEnd - skirtStart);
  const skirtMid = (skirtStart + skirtEnd) / 2;
  const lamp = place(0.962, 0.56);
  const tail = place(0.02, 0.58);
  const nose = place(0.992, 0);
  const grilleY = lerp(nose.station.lower, nose.station.center, body.type === "suv" ? 0.52 : 0.46);
  const grilleW = Math.min(1.35, nose.station.halfW * (design.grilleShape === "shield" ? 1.55 : 1.28));
  const grilleH = Math.max(0.16, (nose.station.center - nose.station.lower) * (design.grilleShape === "shield" ? 0.5 : 0.38));
  const mirror = place(body.cowlU - 0.03, 1);
  const hp = performance.horsepower;
  const vents = hp >= 430 && engine.aspiration !== "electric";
  const diffuser = hp >= 300 && engine.aspiration !== "electric";
  const wing = (body.type === "sports" || body.type === "coupe") && performance.topSpeed >= 245;
  const lip = body.type === "sedan" && performance.topSpeed >= 275;
  const hatchSpoiler = body.type === "suv" || body.type === "hatchback" || body.type === "wagon";
  const exhausts = exhaustLayout(vehicle);
  const handleUs = twoDoor
    ? [(body.frontAxleU + body.rearAxleU) / 2 + 0.03]
    : [body.frontAxleU - 0.09, (body.frontAxleU + body.rearAxleU) / 2 - 0.01];
  const cabinMidU = (body.roofRearU + body.roofFrontU) / 2;
  const cabin = stationAt(cabinMidU);
  const roof = stationAt((body.roofRearU + body.roofFrontU) / 2);
  const spoke = spokeStyle(body.type);

  return (
    <group>
      <mesh geometry={built.paint} castShadow>
        <meshPhysicalMaterial {...paint} />
      </mesh>
      {built.glass.getIndex() && built.glass.getIndex()!.count > 0 && (
        <mesh geometry={built.glass}>
          <meshPhysicalMaterial {...glass} side={THREE.DoubleSide} />
        </mesh>
      )}

      {[1, -1].map((side) => (
        <group key={side}>
          <Wheel
            position={[frontX, tire.radius, side * layout.frontTrack]}
            rotationY={side === 1 ? 0 : Math.PI}
            tire={tire}
            spoke={spoke}
            horsepower={hp}
          />
          <Wheel
            position={[rearX, tire.radius, side * layout.rearTrack]}
            rotationY={side === 1 ? 0 : Math.PI}
            tire={tire}
            spoke={spoke}
            horsepower={hp}
          />
          <Headlamp
            shape={design.lightShape}
            position={[lamp.x, lerp(lamp.station.lower, lamp.station.shoulder, 0.62), side * lamp.z]}
            side={side as 1 | -1}
          />
          <TailLamp
            shape={design.lightShape}
            position={[tail.x, lerp(tail.station.lower, tail.station.shoulder, 0.62), side * Math.min(tail.z, tail.station.halfW * 0.62)]}
            side={side as 1 | -1}
          />
          <Mirror position={[mirror.x, mirror.station.shoulder + 0.05, side * (mirror.station.halfW + 0.02)]} side={side as 1 | -1} color={design.color} finish={design.finish} />
          {handleUs.map((u) => {
            const spot = place(u, 1);
            return (
              <mesh key={`${side}-${u}`} position={[spot.x, spot.station.shoulder - 0.08, side * (spot.station.halfW + 0.01)]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.011, 0.07, 4, 8]} />
                <meshStandardMaterial color="#d7dbe2" metalness={0.9} roughness={0.25} />
              </mesh>
            );
          })}
        </group>
      ))}

      <Grille
        shape={design.grilleShape}
        color={design.color}
        position={[nose.x + 0.01, grilleY, 0]}
        width={grilleW}
        height={grilleH}
      />

      {exhausts.map((z, index) => (
        <Exhaust key={index} x={layout.tailX + 0.02} y={0.32} z={z} radius={0.034 + Math.min(0.02, hp / 18000)} />
      ))}

      {diffuser && <Diffuser x={layout.tailX + 0.08} />}
      {vents && <HoodVents place={place} />}
      {wing && <Wing place={place} />}
      {lip && <Lip place={place} color={design.color} finish={design.finish} />}
      {hatchSpoiler && <HatchSpoiler place={place} color={design.color} finish={design.finish} />}
      {body.type === "suv" && <RoofRails roof={roof} bodyLength={body.length} roofRearU={body.roofRearU} roofFrontU={body.roofFrontU} />}
      {body.type === "suv" && skirtSpan > 0.3 &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[skirtMid, 0.34, side * (body.width * 0.46)]}>
            <boxGeometry args={[skirtSpan, 0.18, 0.07]} />
            <meshStandardMaterial color="#1c1e22" roughness={0.88} metalness={0.05} />
          </mesh>
        ))}
      {(body.type === "sports" || body.type === "coupe") && skirtSpan > 0.3 &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[skirtMid, 0.2, side * (cabin.halfW * 0.96)]}>
            <boxGeometry args={[skirtSpan, 0.06, 0.08]} />
            <meshStandardMaterial color="#121316" roughness={0.55} metalness={0.4} />
          </mesh>
        ))}
      {body.type === "sports" && (
        <mesh position={[layout.noseX - 0.05, 0.18, 0]}>
          <boxGeometry args={[0.12, 0.03, grilleW * 0.92]} />
          <meshStandardMaterial color="#0e0f12" roughness={0.45} metalness={0.5} />
        </mesh>
      )}

      <mesh position={[layout.tailX + 0.02, lerp(tail.station.lower, tail.station.shoulder, 0.28), 0]}>
        <boxGeometry args={[0.015, 0.12, 0.36]} />
        <meshStandardMaterial color="#eceae4" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[place(body.roofRearU + 0.01, 0).x, body.roofY - 0.01, 0]}>
        <boxGeometry args={[0.02, 0.012, body.width * body.roofWidth * 0.55]} />
        <meshBasicMaterial color="#ff2d2d" />
      </mesh>
      {body.type !== "sports" && body.type !== "coupe" && (
        <mesh position={[roof.x, body.roofY + 0.035, 0]} rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.035, 0.09, 4]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.4} metalness={0.3} />
        </mesh>
      )}
      {engine.aspiration !== "electric" && (
        <FuelFlap place={place} u={body.rearAxleU - 0.04} />
      )}
    </group>
  );
}

function exhaustLayout(vehicle: Vehicle) {
  if (vehicle.engine.aspiration === "electric") return [];
  const hp = vehicle.performance.horsepower;
  const sporty = vehicle.design.bodyType === "sports" || vehicle.design.bodyType === "coupe";
  if (hp >= 540 && sporty) return [-0.38, -0.24, 0.24, 0.38];
  if (hp >= 260 || vehicle.engine.cylinders >= 6) return [-0.32, 0.32];
  return [0.28];
}

function spokeStyle(type: Vehicle["design"]["bodyType"]): "thin" | "split" | "broad" {
  if (type === "suv" || type === "hatchback") return "split";
  if (type === "sports") return "broad";
  return "thin";
}

function Wheel({
  position,
  rotationY,
  tire,
  spoke,
  horsepower,
}: {
  position: [number, number, number];
  rotationY: number;
  tire: CarLayout["tire"];
  spoke: "thin" | "split" | "broad";
  horsepower: number;
}) {
  const { radius, width, rimRadius } = tire;
  const count = spoke === "thin" ? 12 : 5;
  const faceZ = width * 0.46;
  const caliper = horsepower >= 480 ? "#8d1d22" : "#4a4e55";
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.992, radius * 0.992, width * 0.62, 48]} />
        <meshStandardMaterial color="#16171a" roughness={0.72} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`wall-${side}`} position={[0, 0, side * width * 0.22]}>
          <ringGeometry args={[rimRadius * 1.01, radius * 0.97, 48]} />
          <meshStandardMaterial color="#121316" roughness={0.86} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0, faceZ]}>
        <torusGeometry args={[rimRadius * 0.99, 0.012, 8, 40]} />
        <meshStandardMaterial color="#f2f4f7" metalness={1} roughness={0.16} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius * 0.97, rimRadius * 0.97, width * 0.36, 32, 1, true]} />
        <meshStandardMaterial color="#0c0d10" side={THREE.DoubleSide} roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[rimRadius * 0.45, rimRadius * 0.78, 40]} />
        <meshStandardMaterial color="#8d929a" metalness={0.85} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        const thick = spoke === "broad" ? 0.055 : spoke === "split" ? 0.028 : 0.02;
        if (spoke === "split") {
          return (
            <group key={index} rotation={[0, 0, angle]} position={[0, 0, faceZ]}>
              {[0.18, -0.18].map((tilt) => (
                <mesh key={tilt} position={[rimRadius * 0.48, 0, 0]} rotation={[0, 0, tilt]}>
                  <boxGeometry args={[rimRadius * 0.86, thick, 0.028]} />
                  <meshStandardMaterial color="#d5d8de" metalness={0.95} roughness={0.22} />
                </mesh>
              ))}
            </group>
          );
        }
        return (
          <mesh key={index} rotation={[0, 0, angle]} position={[rimRadius * 0.46, 0, faceZ]}>
            <boxGeometry args={[rimRadius * 0.84, thick, 0.03]} />
            <meshStandardMaterial color="#e4e7ee" metalness={1} roughness={0.18} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, faceZ + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius * 0.16, rimRadius * 0.18, 0.03, 20]} />
        <meshStandardMaterial color="#c8ccd3" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[rimRadius * 0.55, -0.02, 0.02]}>
        <boxGeometry args={[0.09, 0.16 + Math.min(0.06, horsepower / 9000), 0.05]} />
        <meshStandardMaterial color={caliper} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Headlamp({
  shape,
  position,
  side,
}: {
  shape: Vehicle["design"]["lightShape"];
  position: [number, number, number];
  side: 1 | -1;
}) {
  return (
    <group position={position} scale={[1, 1, side]}>
      <Housing shape={shape} />
      <LampShape shape={shape} />
    </group>
  );
}

function Housing({ shape }: { shape: Vehicle["design"]["lightShape"] }) {
  const size = housingSize(shape);
  return (
    <mesh position={[-0.02, 0, 0]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#07080a" roughness={0.35} metalness={0.4} />
    </mesh>
  );
}

function housingSize(shape: Vehicle["design"]["lightShape"]): [number, number, number] {
  if (shape === "vertical") return [0.08, 0.16, 0.1];
  if (shape === "round") return [0.08, 0.14, 0.32];
  if (shape === "twin") return [0.08, 0.1, 0.36];
  if (shape === "claw") return [0.07, 0.12, 0.34];
  return [0.07, 0.07, 0.42];
}

function LampShape({ shape }: { shape: Vehicle["design"]["lightShape"] }) {
  if (shape === "round") {
    return (
      <group position={[0.02, 0, 0]}>
        {[0.07, -0.07].map((z) => (
          <group key={z} position={[0, 0, z]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
              <meshPhysicalMaterial color="#d5e4f2" transmission={0.7} roughness={0.05} thickness={0.05} transparent opacity={0.8} />
            </mesh>
            <mesh position={[0.014, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <circleGeometry args={[0.028, 20]} />
              <meshBasicMaterial color="#f7fbff" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  if (shape === "twin") {
    return (
      <group>
        {[0.08, -0.08].map((z) => (
          <group key={z} position={[0.025, 0, z]}>
            <mesh>
              <boxGeometry args={[0.02, 0.055, 0.11]} />
              <meshPhysicalMaterial color="#d7e6f5" transmission={0.65} roughness={0.06} transparent opacity={0.75} />
            </mesh>
            <mesh position={[0.012, 0, 0]}>
              <boxGeometry args={[0.004, 0.012, 0.08]} />
              <meshBasicMaterial color="#f4f8ff" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  if (shape === "vertical") {
    return (
      <group position={[0.03, 0, 0.02]}>
        <mesh>
          <boxGeometry args={[0.025, 0.13, 0.045]} />
          <meshPhysicalMaterial color="#d5e2f0" transmission={0.6} roughness={0.05} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.014, 0, 0]}>
          <boxGeometry args={[0.004, 0.1, 0.012]} />
          <meshBasicMaterial color="#f5f9ff" />
        </mesh>
      </group>
    );
  }
  if (shape === "claw") {
    return (
      <group position={[0.03, 0, 0]}>
        <mesh position={[0, 0.02, 0.02]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.012, 0.016, 0.24]} />
          <meshBasicMaterial color="#f4f8ff" />
        </mesh>
        <mesh position={[0, -0.025, 0.08]} rotation={[0.7, 0, 0]}>
          <boxGeometry args={[0.01, 0.014, 0.12]} />
          <meshBasicMaterial color="#f4f8ff" />
        </mesh>
        <mesh position={[-0.008, 0, 0]}>
          <boxGeometry args={[0.02, 0.08, 0.28]} />
          <meshPhysicalMaterial color="#c9d7e6" transmission={0.55} roughness={0.08} transparent opacity={0.55} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[0.028, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.018, 0.032, 0.36]} />
        <meshPhysicalMaterial color="#d5e3f2" transmission={0.62} roughness={0.05} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0.01, 0, 0]}>
        <boxGeometry args={[0.004, 0.008, 0.3]} />
        <meshBasicMaterial color="#f7fbff" />
      </mesh>
    </group>
  );
}

function TailLamp({
  shape,
  position,
  side,
}: {
  shape: Vehicle["design"]["lightShape"];
  position: [number, number, number];
  side: 1 | -1;
}) {
  const tall = shape === "vertical";
  const round = shape === "round";
  return (
    <group position={position} scale={[1, 1, side]}>
      {round ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 20]} />
          <meshBasicMaterial color="#ff2a2a" />
        </mesh>
      ) : (
        <mesh>
          <boxGeometry args={[0.03, tall ? 0.12 : 0.045, tall ? 0.06 : 0.28]} />
          <meshStandardMaterial color="#3a0c10" roughness={0.3} metalness={0.2} />
        </mesh>
      )}
      {!round && (
        <mesh position={[-0.012, 0, 0]}>
          <boxGeometry args={[0.008, tall ? 0.09 : 0.016, tall ? 0.02 : 0.22]} />
          <meshBasicMaterial color="#ff2e2e" />
        </mesh>
      )}
    </group>
  );
}

function Mirror({
  position,
  side,
  color,
  finish,
}: {
  position: [number, number, number];
  side: 1 | -1;
  color: string;
  finish: Vehicle["design"]["finish"];
}) {
  return (
    <group position={position} scale={[1, 1, side]}>
      <mesh position={[0, 0, 0.07]} scale={[1.3, 0.7, 1]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshPhysicalMaterial {...paintArgs(color, finish)} />
      </mesh>
      <mesh position={[0.03, 0, 0.12]}>
        <boxGeometry args={[0.09, 0.05, 0.012]} />
        <meshStandardMaterial color="#1c242c" roughness={0.05} metalness={0.8} />
      </mesh>
    </group>
  );
}

function Grille({
  shape,
  color,
  position,
  width,
  height,
}: {
  shape: Vehicle["design"]["grilleShape"];
  color: string;
  position: [number, number, number];
  width: number;
  height: number;
}) {
  const slats = shape === "vertical" ? 7 : 6;
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.035, height, width]} />
        <meshStandardMaterial color="#0a0b0d" metalness={0.7} roughness={0.35} />
      </mesh>
      {shape === "closed" ? (
        <mesh position={[0.012, 0, 0]}>
          <boxGeometry args={[0.02, height * 0.82, width * 0.86]} />
          <meshPhysicalMaterial {...paintArgs(color, "gloss")} />
        </mesh>
      ) : (
        <mesh position={[0.004, 0, 0]}>
          <boxGeometry args={[0.02, height * 0.86, width * 0.9]} />
          <meshStandardMaterial color="#050506" roughness={0.7} />
        </mesh>
      )}
      {shape === "closed" && (
        <mesh position={[0.026, height * 0.28, 0]}>
          <boxGeometry args={[0.006, 0.012, width * 0.7]} />
          <meshBasicMaterial color="#e7f0ff" />
        </mesh>
      )}
      {(shape === "slats" || shape === "shield") &&
        Array.from({ length: slats }, (_, index) => (
          <mesh key={index} position={[0.02, (index - (slats - 1) / 2) * height * 0.12, 0]}>
            <boxGeometry args={[0.008, 0.008, width * 0.78]} />
            <meshStandardMaterial color="#c5c9d1" metalness={0.95} roughness={0.25} />
          </mesh>
        ))}
      {shape === "vertical" &&
        Array.from({ length: 9 }, (_, index) => (
          <mesh key={index} position={[0.02, 0, (index - 4) * width * 0.08]}>
            <boxGeometry args={[0.008, height * 0.72, 0.01]} />
            <meshStandardMaterial color="#d0d4dc" metalness={1} roughness={0.22} />
          </mesh>
        ))}
      {shape === "mesh" &&
        Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => (
            <mesh key={`${row}-${col}`} position={[0.02, (row - 2) * height * 0.16, (col - 3.5) * width * 0.09]}>
              <boxGeometry args={[0.006, 0.008, 0.008]} />
              <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
            </mesh>
          )),
        )}
      {shape === "diamond" &&
        Array.from({ length: 4 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => (
            <mesh key={`${row}-${col}`} position={[0.02, (row - 1.5) * height * 0.2, (col - 2.5) * width * 0.12]} rotation={[Math.PI / 4, 0, 0]}>
              <boxGeometry args={[0.008, height * 0.1, height * 0.1]} />
              <meshStandardMaterial color="#0b0c0e" metalness={0.6} roughness={0.4} />
            </mesh>
          )),
        )}
    </group>
  );
}

function Exhaust({ x, y, z, radius }: { x: number; y: number; z: number; radius: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.08, 20]} />
        <meshStandardMaterial color="#e7ebf1" metalness={1} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.62, radius * 0.62, 0.05, 16]} />
        <meshStandardMaterial color="#070708" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Diffuser({ x }: { x: number }) {
  return (
    <group position={[x, 0.22, 0]}>
      <mesh>
        <boxGeometry args={[0.22, 0.08, 0.86]} />
        <meshStandardMaterial color="#14161a" roughness={0.55} metalness={0.35} />
      </mesh>
      {[-0.24, -0.08, 0.08, 0.24].map((z) => (
        <mesh key={z} position={[-0.02, 0, z]}>
          <boxGeometry args={[0.16, 0.1, 0.012]} />
          <meshStandardMaterial color="#0c0d10" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function HoodVents({ place }: { place: (u: number, z: number) => { station: Station; z: number; x: number } }) {
  return (
    <group>
      {[0.16, -0.16].map((fraction) => {
        const spot = place(0.86, fraction);
        return (
          <mesh key={fraction} position={[spot.x, spot.station.center + 0.02, spot.z]} rotation={[0, fraction > 0 ? -0.4 : 0.4, 0]}>
            <boxGeometry args={[0.18, 0.012, 0.07]} />
            <meshStandardMaterial color="#070808" roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function Wing({ place }: { place: (u: number, z: number) => { station: Station; z: number; x: number } }) {
  const mount = place(0.08, 0);
  return (
    <group position={[mount.x, mount.station.center + 0.12, 0]}>
      <mesh>
        <boxGeometry args={[0.16, 0.012, 0.92]} />
        <meshStandardMaterial color="#14161a" metalness={0.6} roughness={0.3} />
      </mesh>
      {[-0.28, 0.28].map((z) => (
        <mesh key={z} position={[0.01, -0.05, z]}>
          <boxGeometry args={[0.08, 0.08, 0.012]} />
          <meshStandardMaterial color="#101114" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Lip({
  place,
  color,
  finish,
}: {
  place: (u: number, z: number) => { station: Station; z: number; x: number };
  color: string;
  finish: Vehicle["design"]["finish"];
}) {
  const spot = place(0.1, 0);
  return (
    <mesh position={[spot.x, spot.station.center + 0.03, 0]} rotation={[0.4, 0, 0]}>
      <boxGeometry args={[0.08, 0.012, spot.station.halfW * 1.3]} />
      <meshPhysicalMaterial {...paintArgs(color, finish)} />
    </mesh>
  );
}

function HatchSpoiler({
  place,
  color,
  finish,
}: {
  place: (u: number, z: number) => { station: Station; z: number; x: number };
  color: string;
  finish: Vehicle["design"]["finish"];
}) {
  const spot = place(0.12, 0);
  return (
    <mesh position={[spot.x, spot.station.center + 0.02, 0]}>
      <boxGeometry args={[0.1, 0.025, spot.station.halfW * 1.5]} />
      <meshPhysicalMaterial {...paintArgs(color, finish)} />
    </mesh>
  );
}

function RoofRails({
  roof,
  bodyLength,
  roofRearU,
  roofFrontU,
}: {
  roof: Station;
  bodyLength: number;
  roofRearU: number;
  roofFrontU: number;
}) {
  const length = (roofFrontU - roofRearU) * bodyLength * 0.8;
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[roof.x, roof.center + 0.04, side * roof.halfW * 0.55]}>
          <boxGeometry args={[length, 0.02, 0.025]} />
          <meshStandardMaterial color="#1a1c20" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function FuelFlap({ place, u }: { place: (u: number, z: number) => { station: Station; z: number; x: number }; u: number }) {
  const spot = place(u, 1);
  return (
    <mesh position={[spot.x, spot.station.shoulder - 0.12, spot.station.halfW + 0.008]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.055, 0.055, 0.01, 20]} />
      <meshStandardMaterial color="#1c1e22" metalness={0.4} roughness={0.45} />
    </mesh>
  );
}

import * as THREE from "three";
import type { BodyDef } from "./bodies";
import { bodyFor, planPull, sampleStation, tireMetrics } from "./sample";
import type { Station, TireMetrics } from "./sample";
import { lerp } from "./sample";
import type { Vehicle } from "./types";

type Vec2 = { y: number; z: number };

const U_STEPS = 96;

export type CarLayout = {
  body: BodyDef;
  tire: TireMetrics;
  frontTrack: number;
  rearTrack: number;
  noseX: number;
  tailX: number;
};

export type BuiltCar = {
  paint: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  layout: CarLayout;
};

function fillet(points: Vec2[], handle: number, steps: number) {
  if (points.length < 3) return points;
  const out: Vec2[] = [points[0]];
  const push = (point: Vec2) => {
    const last = out[out.length - 1];
    if (Math.hypot(point.y - last.y, point.z - last.z) > 1e-4) out.push(point);
  };
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inDir = { y: cur.y - prev.y, z: cur.z - prev.z };
    const outDir = { y: next.y - cur.y, z: next.z - cur.z };
    const inLen = Math.hypot(inDir.y, inDir.z);
    const outLen = Math.hypot(outDir.y, outDir.z);
    if (inLen < 1e-5 || outLen < 1e-5) {
      push(cur);
      continue;
    }
    const reach = Math.min(handle, inLen * 0.46, outLen * 0.46);
    const start = { y: cur.y - (inDir.y / inLen) * reach, z: cur.z - (inDir.z / inLen) * reach };
    const end = { y: cur.y + (outDir.y / outLen) * reach, z: cur.z + (outDir.z / outLen) * reach };
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const u = 1 - t;
      push({
        y: u * u * start.y + 2 * u * t * cur.y + t * t * end.y,
        z: u * u * start.z + 2 * u * t * cur.z + t * t * end.z,
      });
    }
  }
  push(points[points.length - 1]);
  return out;
}

function resample(points: Vec2[], count: number) {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(points[i].y - points[i - 1].y, points[i].z - points[i - 1].z);
    lengths.push(length);
    total += length;
  }
  if (total < 1e-5) return Array.from({ length: count }, () => ({ ...points[0] }));
  const out: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const target = (i / (count - 1)) * total;
    let walked = 0;
    let placed = false;
    for (let segment = 0; segment < lengths.length; segment += 1) {
      const span = lengths[segment];
      if (walked + span >= target || segment === lengths.length - 1) {
        const t = span < 1e-6 ? 0 : (target - walked) / span;
        const a = points[segment];
        const b = points[segment + 1];
        out.push({ y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });
        placed = true;
        break;
      }
      walked += span;
    }
    if (!placed) out.push({ ...points[points.length - 1] });
  }
  return out;
}

const LOWER_STEPS = 8;
const UPPER_STEPS = 7;

type RingPt = Vec2 & { glass: boolean };

function tuckForArch(point: Vec2, station: Station, body: BodyDef, tire: TireMetrics) {
  const archTop = tire.radius * 2 + body.archGap;
  if (point.y > archTop - 0.01) return point.z;
  let z = point.z;
  const archR = tire.radius + body.archGap + 0.015;
  for (const axle of [body.frontAxleU, body.rearAxleU]) {
    const dx = Math.abs(station.u - axle) * body.length;
    const dy = point.y - tire.radius;
    if (Math.hypot(dx, dy) < archR) z = Math.min(z, station.halfW - tire.width * 0.85);
  }
  return z;
}

function section(station: Station, body: BodyDef, angularity: number, tire: TireMetrics): RingPt[] {
  const { lower, shoulder, center, halfW } = station;
  const slab = clamp01(angularity);
  const greenhouse =
    station.u > body.rearGlassU + 0.012 &&
    station.u < body.cowlU - 0.008 &&
    center > shoulder + 0.07;
  const handle = lerp(0.05, 0.007, slab);
  const belt = { y: shoulder, z: halfW };
  const door = resample(
    fillet(
      [
        { y: lower, z: halfW * lerp(0.72, 0.84, slab) },
        { y: lerp(lower, shoulder, 0.2), z: halfW * lerp(0.9, 0.99, slab) },
        { y: lerp(lower, shoulder, 0.55), z: halfW * lerp(0.96, 1, slab) },
        belt,
      ],
      handle,
      2,
    ),
    LOWER_STEPS,
  );
  door[door.length - 1] = { ...belt };
  for (const point of door) point.z = tuckForArch(point, station, body, tire);

  const rail = halfW * body.roofWidth;
  let upperRaw: Vec2[];
  if (greenhouse) {
    const tuck = lerp(0.9, 0.96, slab) - body.tumble * 0.05;
    upperRaw = [
      belt,
      { y: shoulder + 0.018, z: halfW * tuck },
      { y: lerp(shoulder, center, 0.42), z: Math.min(halfW * 0.9, rail + halfW * 0.16) },
      { y: lerp(shoulder, center, 0.8), z: rail },
      { y: center, z: rail * 0.22 },
      { y: center + 0.003, z: 0 },
    ];
  } else if (shoulder > center + 0.015) {
    upperRaw = [
      belt,
      { y: shoulder - 0.004, z: halfW * 0.58 },
      { y: lerp(shoulder, center, 0.75), z: halfW * 0.22 },
      { y: center + 0.005, z: 0 },
    ];
  } else {
    const top = Math.max(shoulder, center);
    upperRaw = [
      belt,
      { y: lerp(shoulder, top, 0.45), z: halfW * 0.5 },
      { y: top, z: halfW * 0.16 },
      { y: top + 0.003, z: 0 },
    ];
  }
  const upper = resample(fillet(upperRaw, handle, 2), UPPER_STEPS);
  upper[0] = { ...belt };
  upper[upper.length - 1] = { y: upper[upper.length - 1].y, z: 0 };

  const half: RingPt[] = door.slice(0, -1).map((point) => ({ ...point, glass: false }));
  half.push({ ...belt, glass: false });
  half.push({ ...belt, glass: false });
  for (let i = 1; i < upper.length; i += 1) half.push({ ...upper[i], glass: false });
  if (greenhouse) markGlass(half, station, body, rail);
  return half;
}

function markGlass(half: RingPt[], station: Station, body: BodyDef, rail: number) {
  const { u, shoulder, center, halfW } = station;
  const side = u > body.roofRearU + 0.025 && u < body.roofFrontU - 0.02;
  const windshield = u >= body.roofFrontU - 0.02 && u < body.cowlU - 0.01;
  const backlight = u > body.rearGlassU + 0.012 && u <= body.roofRearU + 0.025;
  for (const point of half) {
    if (point.y < shoulder + 0.028) continue;
    if (windshield) {
      const pillar = Math.abs(point.z) > halfW * 0.8 && point.y < shoulder + 0.1;
      point.glass = !pillar;
      continue;
    }
    if (backlight) {
      const crown = point.y > center - 0.012 && Math.abs(point.z) < rail * 0.4;
      point.glass = !crown;
      continue;
    }
    if (side) {
      const belowRoof = point.y < center - 0.03;
      const outboard = Math.abs(point.z) > Math.max(0.14, rail * 0.42);
      point.glass = belowRoof && outboard;
    }
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function ringPoint(half: RingPt[], k: number): RingPt {
  const count = half.length;
  if (k < count) return half[k];
  const mirror = 2 * (count - 1) - k;
  const point = half[mirror];
  return { y: point.y, z: -point.z, glass: point.glass };
}

export function buildCar(vehicle: Vehicle): BuiltCar {
  const body = bodyFor(vehicle.design);
  const tire = tireMetrics(vehicle.design);
  const angularity = vehicle.design.angularity;
  const stations: Station[] = [];
  const halves: RingPt[][] = [];
  for (let i = 0; i <= U_STEPS; i += 1) {
    const u = i / U_STEPS;
    const station = sampleStation(body, u, angularity, tire);
    stations.push(station);
    halves.push(section(station, body, angularity, tire));
  }

  const columns = halves[0].length;
  const row = columns * 2 - 1;
  const positions: number[] = [];
  const glassAt: boolean[] = [];
  for (let i = 0; i <= U_STEPS; i += 1) {
    const station = stations[i];
    const half = halves[i];
    for (let k = 0; k < row; k += 1) {
      const point = ringPoint(half, k);
      const pull = planPull(station.u, point.z, station.halfW, angularity);
      positions.push(station.x + pull, point.y, point.z);
      glassAt.push(point.glass);
    }
  }

  const paintIndex: number[] = [];
  const glassIndex: number[] = [];
  const idx = (i: number, k: number) => i * row + k;
  const span = (a: number, b: number) => {
    const dx = positions[a * 3] - positions[b * 3];
    const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
    const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
    return Math.hypot(dx, dy, dz);
  };
  for (let i = 0; i < U_STEPS; i += 1) {
    for (let k = 0; k < row - 1; k += 1) {
      const a = idx(i, k);
      const b = idx(i + 1, k);
      const c = idx(i + 1, k + 1);
      const d = idx(i, k + 1);
      if (span(a, d) < 1e-4 && span(b, c) < 1e-4) continue;
      const target = glassAt[a] && glassAt[b] && glassAt[c] && glassAt[d] ? glassIndex : paintIndex;
      target.push(a, b, c, a, c, d);
    }
  }
  capEnd(0, -1, positions, paintIndex, row);
  capEnd(U_STEPS, 1, positions, paintIndex, row);

  const paint = new THREE.BufferGeometry();
  paint.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  paint.setIndex(paintIndex);
  paint.computeVertexNormals();
  orientOutward(paint);

  const glass = new THREE.BufferGeometry();
  glass.setAttribute("position", new THREE.Float32BufferAttribute(positions.slice(), 3));
  glass.setIndex(glassIndex);
  if (glassIndex.length > 0) {
    glass.computeVertexNormals();
    orientOutward(glass);
  }

  const front = sampleStation(body, body.frontAxleU, angularity, tire);
  const rear = sampleStation(body, body.rearAxleU, angularity, tire);
  const track = (station: Station) => Math.max(0.42, station.halfW - tire.width / 2 - 0.025);

  return {
    paint,
    glass,
    layout: {
      body,
      tire,
      frontTrack: track(front),
      rearTrack: track(rear),
      noseX: body.length / 2,
      tailX: -body.length / 2,
    },
  };
}

function capEnd(i: number, outwardX: number, positions: number[], paintIndex: number[], row: number) {
  let cx = 0;
  let cy = 0;
  let cz = 0;
  const base = i * row;
  for (let k = 0; k < row; k += 1) {
    cx += positions[(base + k) * 3];
    cy += positions[(base + k) * 3 + 1];
    cz += positions[(base + k) * 3 + 2];
  }
  cx /= row;
  cy /= row;
  cz /= row;
  const center = positions.length / 3;
  positions.push(cx, cy, cz);
  for (let k = 0; k < row - 1; k += 1) {
    const a = base + k;
    const b = base + k + 1;
    const ay = positions[a * 3 + 1];
    const az = positions[a * 3 + 2];
    const by = positions[b * 3 + 1];
    const bz = positions[b * 3 + 2];
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    if (nx * outwardX >= 0) paintIndex.push(a, b, center);
    else paintIndex.push(a, center, b);
  }
}

function orientOutward(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  let shouldFlip = false;
  let found = false;
  for (let i = 0; i < position.count; i += 1) {
    const nz = normal.getZ(i);
    if (Math.abs(nz) < 0.25) continue;
    if (position.getZ(i) > 0.45 && position.getY(i) > 0.45 && position.getY(i) < 1.2) {
      shouldFlip = nz < 0;
      found = true;
      break;
    }
  }
  if (!found || !shouldFlip) return;
  const index = geometry.getIndex();
  if (!index) return;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  geometry.computeVertexNormals();
}

import * as THREE from "three";
import type { BodyDef } from "./bodies";
import { bodyFor, lerp, planPull, sampleStation, smoothstep, tireMetrics } from "./sample";
import type { Station, TireMetrics } from "./sample";
import type { DesignSpec, Vehicle } from "./types";

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
  frame: THREE.BufferGeometry;
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
    const skin = halfW * lerp(0.94, 0.99, slab);
    upperRaw = [
      belt,
      { y: shoulder + 0.02, z: skin },
      { y: shoulder + 0.055, z: skin * (0.96 - body.tumble * 0.02) },
      { y: lerp(shoulder, center, 0.62), z: Math.min(skin * 0.9, rail + 0.04) },
      { y: lerp(shoulder, center, 0.9), z: rail },
      { y: center, z: rail * 0.28 },
      { y: center + 0.002, z: 0 },
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
  const upperHandle = greenhouse ? Math.min(handle, 0.008) : handle;
  const upper = resample(fillet(upperRaw, upperHandle, 2), UPPER_STEPS);
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
  const rise = center - shoulder;
  if (rise < 0.08) return;
  const onRoof = u >= body.roofRearU - 0.01 && u <= body.roofFrontU + 0.01;
  const header = onRoof ? center - Math.max(0.08, rise * 0.16) : center - 0.012;
  const sill = shoulder + 0.008;
  if (header - sill < 0.06) return;
  const pillar = body.type === "coupe" || body.type === "sports";
  const mid = (body.roofRearU + body.roofFrontU) / 2;
  const frontDoor = u > mid + (pillar ? 0 : 0.018) && u < body.roofFrontU - 0.03;
  const rearDoor = u > body.roofRearU + 0.035 && u < mid - (pillar ? 0 : 0.018);
  const side = pillar ? u > body.roofRearU + 0.03 && u < body.roofFrontU - 0.028 : frontDoor || rearDoor;
  const windshield = u > body.roofFrontU - 0.01 && u < body.cowlU - 0.012;
  const backlight = u > body.rearGlassU + 0.03 && u < body.roofRearU - 0.018;
  for (const point of half) {
    if (point.y <= sill || point.y >= header) continue;
    const absZ = Math.abs(point.z);
    if (windshield && absZ < halfW * 0.68) point.glass = true;
    else if (backlight && absZ < halfW * 0.62) point.glass = true;
    else if (side && absZ > Math.max(rail * 0.55, halfW * 0.34) && absZ < halfW * 0.97) point.glass = true;
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export type FasciaSpec = {
  grilleY: number;
  grilleW: number;
  grilleH: number;
  grilleDepth: number;
  lampY: number;
  lampZ: number;
  lampSpread: number;
  lampH: number;
  lampDepth: number;
};

export function fasciaSpec(design: DesignSpec, nose: Station): FasciaSpec {
  const span = Math.max(0.16, nose.center - nose.lower);
  const grille = {
    slats: { w: 0.64, h: 0.38, depth: 0.042 },
    mesh: { w: 0.72, h: 0.42, depth: 0.05 },
    vertical: { w: 0.46, h: 0.5, depth: 0.046 },
    shield: { w: 0.8, h: 0.54, depth: 0.058 },
    closed: { w: 0.5, h: 0.18, depth: 0.012 },
    diamond: { w: 0.42, h: 0.36, depth: 0.04 },
  }[design.grilleShape];
  const lamp = {
    blade: { z: 0.56, spread: 0.22, h: 0.28, depth: 0.032 },
    twin: { z: 0.5, spread: 0.18, h: 0.36, depth: 0.038 },
    round: { z: 0.52, spread: 0.14, h: 0.46, depth: 0.04 },
    vertical: { z: 0.72, spread: 0.06, h: 0.7, depth: 0.044 },
    claw: { z: 0.5, spread: 0.18, h: 0.48, depth: 0.036 },
  }[design.lightShape];
  return {
    grilleY: nose.lower + span * (design.bodyType === "suv" ? 0.52 : 0.46),
    grilleW: Math.min(nose.halfW * 1.7, nose.halfW * grille.w * 2),
    grilleH: Math.max(0.1, span * grille.h),
    grilleDepth: grille.depth,
    lampY: lerp(nose.lower, nose.shoulder, 0.62),
    lampZ: nose.halfW * lamp.z,
    lampSpread: Math.max(0.045, nose.halfW * lamp.spread),
    lampH: Math.max(0.05, span * lamp.h),
    lampDepth: lamp.depth,
  };
}

function fasciaRecess(u: number, y: number, z: number, fascia: FasciaSpec) {
  const nose = smoothstep(0.9, 0.985, u);
  if (nose <= 0) return 0;
  const pocket = (dy: number, dz: number, depth: number) => {
    const inside = 1 - smoothstep(0.62, 1, Math.max(dy, dz));
    return inside * depth;
  };
  const grille = pocket(
    Math.abs(y - fascia.grilleY) / Math.max(0.04, fascia.grilleH * 0.5),
    Math.abs(z) / Math.max(0.04, fascia.grilleW * 0.5),
    fascia.grilleDepth,
  );
  const lamp = pocket(
    Math.abs(y - fascia.lampY) / Math.max(0.03, fascia.lampH * 0.5),
    Math.abs(Math.abs(z) - fascia.lampZ) / Math.max(0.03, fascia.lampSpread),
    fascia.lampDepth,
  );
  return nose * Math.max(grille, lamp);
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
  const fascia = fasciaSpec(vehicle.design, stations[Math.round(0.98 * U_STEPS)]);
  const positions: number[] = [];
  const glassAt: boolean[] = [];
  for (let i = 0; i <= U_STEPS; i += 1) {
    const station = stations[i];
    const half = halves[i];
    for (let k = 0; k < row; k += 1) {
      const point = ringPoint(half, k);
      const pull = planPull(station.u, point.z, station.halfW, angularity);
      const recess = fasciaRecess(station.u, point.y, point.z, fascia);
      positions.push(station.x + pull - recess, point.y, point.z);
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
      const flagged = [glassAt[a], glassAt[b], glassAt[c], glassAt[d]].filter(Boolean).length;
      const topY = Math.max(positions[a * 3 + 1], positions[b * 3 + 1], positions[c * 3 + 1], positions[d * 3 + 1]);
      const crown = Math.max(stations[i].center, stations[i + 1].center);
      if (flagged >= 3 && topY < crown - 0.045) glassIndex.push(a, b, c, a, c, d);
      else paintIndex.push(a, b, c, a, c, d);
    }
  }
  capEnd(0, -1, positions, paintIndex, row);
  capEnd(U_STEPS, 1, positions, paintIndex, row);

  const paint = new THREE.BufferGeometry();
  paint.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  paint.setIndex(paintIndex);
  paint.computeVertexNormals();
  orientOutward(paint);

  const glassPositions = positions.slice();
  for (let vertex = 0; vertex < glassAt.length; vertex += 1) {
    if (!glassAt[vertex]) continue;
    const z = glassPositions[vertex * 3 + 2];
    const side = Math.sign(z) || 1;
    glassPositions[vertex * 3 + 2] = z - side * 0.006;
    glassPositions[vertex * 3 + 1] -= 0.004;
  }
  const glass = new THREE.BufferGeometry();
  glass.setAttribute("position", new THREE.Float32BufferAttribute(glassPositions, 3));
  glass.setIndex(glassIndex);
  if (glassIndex.length > 0) {
    glass.computeVertexNormals();
    orientOutward(glass);
  }

  const front = sampleStation(body, body.frontAxleU, angularity, tire);
  const rear = sampleStation(body, body.rearAxleU, angularity, tire);
  const track = (station: Station) => Math.max(0.42, station.halfW - tire.width / 2 - 0.025);

  const frame = buildFrame(vehicle, stations, halves);

  return {
    paint,
    glass,
    frame,
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

function roofLimit(half: RingPt[], zAbs: number, shoulder: number) {
  const upper = half.filter((point) => point.y >= shoulder - 0.01).sort((a, b) => a.z - b.z);
  if (upper.length < 2) return shoulder;
  const probe = zAbs + 0.025;
  let y = upper[upper.length - 1].y;
  for (let i = 1; i < upper.length; i += 1) {
    const a = upper[i - 1];
    const b = upper[i];
    if (probe <= b.z) {
      const t = (probe - a.z) / Math.max(1e-4, b.z - a.z);
      return lerp(a.y, b.y, clamp01(t));
    }
    y = b.y;
  }
  return y;
}

function sideLimit(half: RingPt[], y: number) {
  let best = 0;
  let found = false;
  for (const point of half) {
    if (Math.abs(point.y - y) <= 0.14) {
      best = Math.max(best, point.z);
      found = true;
    }
  }
  if (!found) {
    for (const point of half) best = Math.max(best, point.z);
  }
  return best;
}

function buildFrame(vehicle: Vehicle, stations: Station[], halves: RingPt[][]) {
  const { design } = vehicle;
  const body = bodyFor(design);
  const positions: number[] = [];
  const indices: number[] = [];
  const at = (u: number) => Math.round(clamp01(u) * U_STEPS);
  const buried = (u: number, zSigned: number, yWanted: number) => {
    const index = at(u);
    const station = stations[index];
    const half = halves[index];
    const sign = Math.sign(zSigned) || 1;
    let zAbs = Math.min(Math.abs(zSigned), station.halfW * 0.42);
    const yRoof = roofLimit(half, zAbs, station.shoulder);
    let y = Math.min(yWanted, yRoof - 0.08);
    y = Math.max(station.lower + 0.055, y);
    zAbs = Math.min(zAbs, Math.max(0.05, sideLimit(half, y) - 0.055));
    y = Math.min(y, roofLimit(half, zAbs, station.shoulder) - 0.08);
    y = Math.max(station.lower + 0.055, y);
    const pull = planPull(station.u, sign * zAbs, station.halfW, design.angularity);
    const skinX = station.x + pull;
    const inward = skinX >= 0 ? 1 : -1;
    let inset = 0.03;
    if (station.u > 0.88) inset += 0.08;
    if (station.u < 0.14) inset += 0.05;
    return [skinX - inward * inset, y, sign * zAbs];
  };
  const link = (points: number[][]) => {
    for (let i = 1; i < points.length; i += 1) addBoxBeam(positions, indices, points[i - 1], points[i]);
  };
  const along = (u0: number, u1: number, zFrac: number, yOf: (station: Station) => number, samples = 6) => {
    const points: number[][] = [];
    for (let step = 0; step <= samples; step += 1) {
      const u = lerp(u0, u1, step / samples);
      const station = stations[at(u)];
      points.push(buried(u, station.halfW * zFrac, yOf(station)));
    }
    return points;
  };

  for (const side of [1, -1]) {
    link(along(0.08, 0.94, side * 0.34, (station) => station.lower + 0.045, 8));
    link(along(body.roofRearU, body.roofFrontU, side * body.roofWidth * 0.28, (station) => station.center - 0.02, 5));
    link([
      buried(body.cowlU - 0.02, side * stations[at(body.cowlU)].halfW * 0.3, stations[at(body.cowlU)].shoulder + 0.04),
      buried(body.roofFrontU, side * stations[at(body.roofFrontU)].halfW * body.roofWidth * 0.26, stations[at(body.roofFrontU)].center - 0.02),
    ]);
    link([
      buried(body.rearGlassU + 0.02, side * stations[at(body.rearGlassU)].halfW * 0.3, stations[at(body.rearGlassU)].shoulder + 0.05),
      buried(body.roofRearU, side * stations[at(body.roofRearU)].halfW * body.roofWidth * 0.26, stations[at(body.roofRearU)].center - 0.02),
    ]);
    if (body.type !== "coupe" && body.type !== "sports") {
      const u = (body.roofRearU + body.roofFrontU) / 2;
      const station = stations[at(u)];
      link([
        buried(u, side * station.halfW * 0.3, station.lower + 0.08),
        buried(u, side * station.halfW * body.roofWidth * 0.26, station.center - 0.02),
      ]);
    }
  }

  for (const u of [body.roofRearU, (body.roofRearU + body.roofFrontU) / 2, body.roofFrontU]) {
    const station = stations[at(u)];
    const z = station.halfW * body.roofWidth * 0.22;
    const y = station.center - 0.02;
    link([buried(u, -z, y), buried(u, z, y)]);
  }

  const nose = stations[at(0.98)];
  const fascia = fasciaSpec(design, nose);
  const headerU = 0.94;
  link([
    buried(headerU, -fascia.grilleW * 0.46, fascia.grilleY - fascia.grilleH * 0.46),
    buried(headerU, fascia.grilleW * 0.46, fascia.grilleY - fascia.grilleH * 0.46),
  ]);
  link([
    buried(headerU, -fascia.grilleW * 0.46, fascia.grilleY + fascia.grilleH * 0.46),
    buried(headerU, fascia.grilleW * 0.46, fascia.grilleY + fascia.grilleH * 0.46),
  ]);
  link([
    buried(headerU, -fascia.grilleW * 0.46, fascia.grilleY - fascia.grilleH * 0.46),
    buried(headerU, -fascia.grilleW * 0.46, fascia.grilleY + fascia.grilleH * 0.46),
  ]);
  link([
    buried(headerU, fascia.grilleW * 0.46, fascia.grilleY - fascia.grilleH * 0.46),
    buried(headerU, fascia.grilleW * 0.46, fascia.grilleY + fascia.grilleH * 0.46),
  ]);

  for (const side of [1, -1]) {
    link([
      buried(0.93, side * (fascia.lampZ - fascia.lampSpread), fascia.lampY - fascia.lampH * 0.35),
      buried(0.93, side * (fascia.lampZ + fascia.lampSpread * 0.35), fascia.lampY + fascia.lampH * 0.35),
    ]);
  }

  const tire = tireMetrics(design);
  for (const axleU of [body.rearAxleU, body.frontAxleU]) {
    const station = stations[at(axleU)];
    const yBeam = Math.max(station.lower + 0.07, tire.radius * 0.38);
    const z = station.halfW * 0.26;
    link([buried(axleU, -z, yBeam), buried(axleU, z, yBeam)]);
    for (const side of [1, -1]) {
      link([
        buried(axleU, side * station.halfW * 0.22, yBeam),
        buried(axleU, side * station.halfW * 0.22, tire.radius + 0.05),
      ]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addBoxBeam(positions: number[], indices: number[], a: number[], b: number[]) {
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const direction = end.clone().sub(start);
  if (direction.lengthSq() < 0.002) return;
  direction.normalize();
  const helper = Math.abs(direction.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(direction, helper).normalize();
  const up = new THREE.Vector3().crossVectors(side, direction).normalize();
  const hx = 0.008;
  const hz = 0.006;
  const base = positions.length / 3;
  for (const endPoint of [start, end]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const point = endPoint.clone().addScaledVector(side, sy * hx).addScaledVector(up, sz * hz);
        positions.push(point.x, point.y, point.z);
      }
    }
  }
  const faces = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
  ];
  for (const face of faces) indices.push(base + face[0], base + face[1], base + face[2], base + face[0], base + face[2], base + face[3]);
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

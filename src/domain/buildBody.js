import * as THREE from "three";
import { bodyFor, planPull, sampleStation, tireMetrics } from "./sample";
import { lerp } from "./sample";
const U_STEPS = 104;
const PROFILE_STEPS = 15;
function fillet(points, handle, steps) {
    if (points.length < 3)
        return points;
    const out = [points[0]];
    const push = (point) => {
        const last = out[out.length - 1];
        if (Math.hypot(point.y - last.y, point.z - last.z) > 1e-4)
            out.push(point);
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
function resample(points, count) {
    const lengths = [];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
        const length = Math.hypot(points[i].y - points[i - 1].y, points[i].z - points[i - 1].z);
        lengths.push(length);
        total += length;
    }
    if (total < 1e-5)
        return Array.from({ length: count }, () => ({ ...points[0] }));
    const out = [];
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
        if (!placed)
            out.push({ ...points[points.length - 1] });
    }
    return out;
}
function profile(station, body, angularity) {
    const { lower, shoulder, center, halfW } = station;
    const crease = 0.006 + angularity * 0.016;
    const greenhouse = center > shoulder + 0.1;
    const fender = shoulder > center + 0.02;
    let raw;
    if (greenhouse) {
        const rail = halfW * body.roofWidth;
        const glassZ = halfW * (body.roofWidth + (1 - body.roofWidth) * (1 - body.tumble) * 0.55);
        raw = [
            { y: lower + 0.012, z: Math.max(0.04, halfW * 0.72) },
            { y: lower, z: halfW * 0.8 },
            { y: lerp(lower, shoulder, 0.38), z: halfW * 0.94 },
            { y: lerp(lower, shoulder, 0.72), z: halfW * 0.99 },
            { y: lerp(lower, shoulder, 0.9), z: halfW + crease },
            { y: shoulder, z: halfW },
            { y: shoulder + 0.028, z: halfW * (0.9 - body.tumble * 0.08) },
            { y: lerp(shoulder, center, 0.4), z: glassZ },
            { y: lerp(shoulder, center, 0.72), z: rail },
            { y: lerp(shoulder, center, 0.9), z: rail * 0.42 },
            { y: center, z: 0 },
        ];
    }
    else if (fender) {
        raw = [
            { y: lower + 0.01, z: Math.max(0.04, halfW * 0.74) },
            { y: lower, z: halfW * 0.82 },
            { y: lerp(lower, shoulder, 0.42), z: halfW * 0.95 },
            { y: lerp(lower, shoulder, 0.78), z: halfW + crease * 0.6 },
            { y: shoulder, z: halfW },
            { y: lerp(shoulder, center, 0.4), z: halfW * 0.58 },
            { y: lerp(shoulder, center, 0.78), z: halfW * 0.24 },
            { y: center + 0.012, z: 0 },
        ];
    }
    else {
        raw = [
            { y: lower + 0.01, z: Math.max(0.04, halfW * 0.76) },
            { y: lower, z: halfW * 0.84 },
            { y: lerp(lower, shoulder, 0.55), z: halfW * 0.97 },
            { y: shoulder, z: halfW + crease * 0.3 },
            { y: lerp(shoulder, center, 0.55), z: halfW * 0.4 },
            { y: center + 0.01, z: 0 },
        ];
    }
    const handle = lerp(0.13, 0.01, angularity);
    return resample(fillet(raw, handle, 3), PROFILE_STEPS);
}
function isGlass(body, u, y, z, halfW) {
    const az = Math.abs(z);
    const sideMid = (body.roofRearU + body.roofFrontU) / 2;
    const sideWindow = u > body.roofRearU + 0.028 &&
        u < body.roofFrontU - 0.02 &&
        Math.abs(u - sideMid) > 0.016 &&
        y > body.beltY + 0.04 &&
        y < body.roofY - 0.05 &&
        az > halfW * 0.3 &&
        az < halfW * 1.02;
    if (sideWindow)
        return true;
    const windshield = u > body.roofFrontU + 0.01 &&
        u < body.cowlU - 0.006 &&
        y > body.cowlY + 0.05 &&
        y < body.roofY - 0.035 &&
        az > 0.05 &&
        az < halfW * 0.74;
    if (windshield)
        return true;
    const rear = u > body.rearGlassU + 0.01 &&
        u < body.roofRearU - 0.01 &&
        y > body.trunkY + 0.07 &&
        y < body.roofY - 0.045 &&
        az > 0.04 &&
        az < halfW * 0.64;
    return rear;
}
function ringPoint(half, k) {
    const count = half.length;
    if (k < count - 1)
        return half[k];
    if (k === count - 1)
        return half[count - 1];
    const mirror = 2 * (count - 1) - k;
    return { y: half[mirror].y, z: -half[mirror].z };
}
export function buildCar(vehicle) {
    const body = bodyFor(vehicle.design);
    const tire = tireMetrics(vehicle.design);
    const angularity = vehicle.design.angularity;
    const stations = [];
    const halves = [];
    for (let i = 0; i <= U_STEPS; i += 1) {
        const u = i / U_STEPS;
        const station = sampleStation(body, u, angularity, tire);
        stations.push(station);
        halves.push(profile(station, body, angularity));
    }
    const columns = PROFILE_STEPS;
    const row = columns * 2 - 1;
    const positions = [];
    for (let i = 0; i <= U_STEPS; i += 1) {
        const station = stations[i];
        const half = halves[i];
        for (let k = 0; k < row; k += 1) {
            const point = ringPoint(half, k);
            const pull = planPull(station.u, point.z, station.halfW, angularity);
            positions.push(station.x + pull, point.y, point.z);
        }
    }
    const paintIndex = [];
    const glassIndex = [];
    const glassVertices = new Set();
    const idx = (i, k) => i * row + k;
    for (let i = 0; i < U_STEPS; i += 1) {
        for (let k = 0; k < row - 1; k += 1) {
            const a = idx(i, k);
            const b = idx(i + 1, k);
            const c = idx(i + 1, k + 1);
            const d = idx(i, k + 1);
            const y = (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1] + positions[d * 3 + 1]) / 4;
            const z = (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2] + positions[d * 3 + 2]) / 4;
            const u = (stations[i].u + stations[i + 1].u) / 2;
            const halfW = (stations[i].halfW + stations[i + 1].halfW) / 2;
            const target = isGlass(body, u, y, z, halfW) ? glassIndex : paintIndex;
            if (target === glassIndex) {
                glassVertices.add(a);
                glassVertices.add(b);
                glassVertices.add(c);
                glassVertices.add(d);
            }
            target.push(a, b, c, a, c, d);
        }
    }
    const paint = new THREE.BufferGeometry();
    paint.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    paint.setIndex(paintIndex);
    paint.computeVertexNormals();
    orientOutward(paint);
    const glassPositions = positions.slice();
    for (const vertex of glassVertices) {
        const x = glassPositions[vertex * 3];
        const y = glassPositions[vertex * 3 + 1];
        const z = glassPositions[vertex * 3 + 2];
        const u = stations[Math.min(U_STEPS, Math.floor(vertex / row))].u;
        const halfW = stations[Math.min(U_STEPS, Math.floor(vertex / row))].halfW;
        const side = u > body.roofRearU && u < body.roofFrontU && Math.abs(z) > halfW * 0.25 && y > body.beltY;
        if (side) {
            glassPositions[vertex * 3 + 2] = z - Math.sign(z || 1) * 0.016;
            continue;
        }
        if (u >= body.roofFrontU && u <= body.cowlU && y > body.cowlY) {
            glassPositions[vertex * 3] = x - 0.014;
            glassPositions[vertex * 3 + 1] = y - 0.006;
            continue;
        }
        if (u <= body.roofRearU && u >= body.rearGlassU) {
            glassPositions[vertex * 3] = x + 0.012;
            glassPositions[vertex * 3 + 1] = y - 0.004;
        }
    }
    const glass = new THREE.BufferGeometry();
    glass.setAttribute("position", new THREE.Float32BufferAttribute(glassPositions, 3));
    glass.setIndex(glassIndex);
    glass.computeVertexNormals();
    orientOutward(glass);
    const front = sampleStation(body, body.frontAxleU, angularity, tire);
    const rear = sampleStation(body, body.rearAxleU, angularity, tire);
    const track = (station) => station.halfW - tire.width / 2 - 0.02;
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
function orientOutward(geometry) {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    let shouldFlip = false;
    let found = false;
    for (let i = 0; i < position.count; i += 1) {
        const nz = normal.getZ(i);
        if (Math.abs(nz) < 0.25)
            continue;
        if (position.getZ(i) > 0.45 && position.getY(i) > 0.45 && position.getY(i) < 1.2) {
            shouldFlip = nz < 0;
            found = true;
            break;
        }
    }
    if (!found || !shouldFlip)
        return;
    const index = geometry.getIndex();
    if (!index)
        return;
    for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, b);
    }
    geometry.computeVertexNormals();
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildCar } from "../domain/buildBody";
import { lerp, planPull, sampleStation } from "../domain/sample";
import { glassArgs, paintArgs } from "./materials";
export function CarModel({ vehicle }) {
    const { design, performance, engine } = vehicle;
    const built = useMemo(() => buildCar(vehicle), [design.bodyType, design.angularity, design.rimInches, design.tireWidthMm, design.tireAspect]);
    useEffect(() => {
        return () => {
            built.paint.dispose();
            built.glass.dispose();
        };
    }, [built]);
    const { layout } = built;
    const { body, tire } = layout;
    const angularity = design.angularity;
    const stationAt = (u) => sampleStation(body, u, angularity, tire);
    const place = (u, zFraction) => {
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
    const axleX = (u) => -body.length / 2 + u * body.length;
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
    const seamUs = twoDoor
        ? [body.cowlU - 0.04, body.rearAxleU + 0.06]
        : [body.cowlU - 0.03, (body.frontAxleU + body.rearAxleU) / 2, body.rearAxleU + 0.055];
    const cabinMidU = (body.roofRearU + body.roofFrontU) / 2;
    const cabin = stationAt(cabinMidU);
    const roof = stationAt((body.roofRearU + body.roofFrontU) / 2);
    const spoke = spokeStyle(body.type);
    return (_jsxs("group", { children: [_jsx("mesh", { geometry: built.paint, castShadow: true, children: _jsx("meshPhysicalMaterial", { ...paint }) }), built.glass.getIndex() && built.glass.getIndex().count > 0 && (_jsx("mesh", { geometry: built.glass, children: _jsx("meshPhysicalMaterial", { ...glass }) })), _jsx(Underbody, { layout: layout }), _jsx(Cabin, { body: body }), _jsx(Pillars, { body: body, place: place }), _jsx(BeltTrim, { body: body, tire: tire, angularity: angularity }), [1, -1].map((side) => (_jsxs("group", { children: [_jsx(Wheel, { position: [frontX, tire.radius, side * layout.frontTrack], rotationY: side === 1 ? 0 : Math.PI, tire: tire, spoke: spoke, horsepower: hp }), _jsx(Wheel, { position: [rearX, tire.radius, side * layout.rearTrack], rotationY: side === 1 ? 0 : Math.PI, tire: tire, spoke: spoke, horsepower: hp }), _jsx(Well, { x: frontX, y: tire.radius, z: side * layout.frontTrack, radius: tire.radius * 0.92 }), _jsx(Well, { x: rearX, y: tire.radius, z: side * layout.rearTrack, radius: tire.radius * 0.92 }), _jsx(Headlamp, { shape: design.lightShape, position: [lamp.x, lerp(lamp.station.lower, lamp.station.shoulder, 0.62), side * lamp.z], side: side }), _jsx(TailLamp, { shape: design.lightShape, position: [tail.x, lerp(tail.station.lower, tail.station.shoulder, 0.62), side * Math.min(tail.z, tail.station.halfW * 0.62)], side: side }), _jsx(Mirror, { position: [mirror.x, mirror.station.shoulder + 0.05, side * (mirror.station.halfW + 0.02)], side: side, color: design.color, finish: design.finish }), handleUs.map((u) => {
                        const spot = place(u, 1);
                        return (_jsxs("mesh", { position: [spot.x, spot.station.shoulder - 0.08, side * (spot.station.halfW + 0.01)], rotation: [0, 0, Math.PI / 2], children: [_jsx("capsuleGeometry", { args: [0.011, 0.07, 4, 8] }), _jsx("meshStandardMaterial", { color: "#d7dbe2", metalness: 0.9, roughness: 0.25 })] }, `${side}-${u}`));
                    })] }, side))), seamUs.map((u) => {
                const spot = place(u, 1);
                if (spot.station.lower > tire.radius * 1.15)
                    return null;
                const height = Math.max(0.2, spot.station.shoulder - spot.station.lower - 0.08);
                const y = (spot.station.shoulder + spot.station.lower) / 2;
                return [-1, 1].map((side) => (_jsxs("mesh", { position: [spot.x, y, side * (spot.station.halfW + 0.006)], children: [_jsx("boxGeometry", { args: [0.01, height, 0.006] }), _jsx("meshStandardMaterial", { color: "#141518", roughness: 0.6, metalness: 0.2 })] }, `${u}-${side}`)));
            }), _jsx(Grille, { shape: design.grilleShape, color: design.color, position: [nose.x + 0.01, grilleY, 0], width: grilleW, height: grilleH }), exhausts.map((z, index) => (_jsx(Exhaust, { x: layout.tailX + 0.02, y: 0.32, z: z, radius: 0.034 + Math.min(0.02, hp / 18000) }, index))), diffuser && _jsx(Diffuser, { x: layout.tailX + 0.08 }), vents && _jsx(HoodVents, { place: place }), wing && _jsx(Wing, { place: place }), lip && _jsx(Lip, { place: place, color: design.color, finish: design.finish }), hatchSpoiler && _jsx(HatchSpoiler, { place: place, color: design.color, finish: design.finish }), body.type === "suv" && _jsx(RoofRails, { roof: roof, bodyLength: body.length, roofRearU: body.roofRearU, roofFrontU: body.roofFrontU }), body.type === "suv" && skirtSpan > 0.3 &&
                [-1, 1].map((side) => (_jsxs("mesh", { position: [skirtMid, 0.34, side * (body.width * 0.46)], children: [_jsx("boxGeometry", { args: [skirtSpan, 0.18, 0.07] }), _jsx("meshStandardMaterial", { color: "#1c1e22", roughness: 0.88, metalness: 0.05 })] }, side))), (body.type === "sports" || body.type === "coupe") && skirtSpan > 0.3 &&
                [-1, 1].map((side) => (_jsxs("mesh", { position: [skirtMid, 0.2, side * (cabin.halfW * 0.96)], children: [_jsx("boxGeometry", { args: [skirtSpan, 0.06, 0.08] }), _jsx("meshStandardMaterial", { color: "#121316", roughness: 0.55, metalness: 0.4 })] }, side))), body.type === "sports" && (_jsxs("mesh", { position: [layout.noseX - 0.05, 0.18, 0], children: [_jsx("boxGeometry", { args: [0.12, 0.03, grilleW * 0.92] }), _jsx("meshStandardMaterial", { color: "#0e0f12", roughness: 0.45, metalness: 0.5 })] })), _jsxs("mesh", { position: [layout.tailX + 0.02, lerp(tail.station.lower, tail.station.shoulder, 0.28), 0], children: [_jsx("boxGeometry", { args: [0.015, 0.12, 0.36] }), _jsx("meshStandardMaterial", { color: "#eceae4", roughness: 0.45, metalness: 0.05 })] }), _jsxs("mesh", { position: [place(body.roofRearU + 0.01).x, body.roofY - 0.01, 0], children: [_jsx("boxGeometry", { args: [0.02, 0.012, body.width * body.roofWidth * 0.55] }), _jsx("meshBasicMaterial", { color: "#ff2d2d" })] }), body.type !== "sports" && body.type !== "coupe" && (_jsxs("mesh", { position: [roof.x, body.roofY + 0.035, 0], rotation: [0.5, 0, 0], children: [_jsx("coneGeometry", { args: [0.035, 0.09, 4] }), _jsx("meshStandardMaterial", { color: "#1a1c20", roughness: 0.4, metalness: 0.3 })] })), engine.aspiration !== "electric" && (_jsx(FuelFlap, { place: place, u: body.rearAxleU - 0.04 }))] }));
}
function exhaustLayout(vehicle) {
    if (vehicle.engine.aspiration === "electric")
        return [];
    const hp = vehicle.performance.horsepower;
    const sporty = vehicle.design.bodyType === "sports" || vehicle.design.bodyType === "coupe";
    if (hp >= 540 && sporty)
        return [-0.38, -0.24, 0.24, 0.38];
    if (hp >= 260 || vehicle.engine.cylinders >= 6)
        return [-0.32, 0.32];
    return [0.28];
}
function spokeStyle(type) {
    if (type === "suv" || type === "hatchback")
        return "split";
    if (type === "sports")
        return "broad";
    return "thin";
}
function Underbody({ layout }) {
    return (_jsxs("mesh", { position: [0, 0.16, 0], children: [_jsx("boxGeometry", { args: [layout.body.length * 0.78, 0.06, layout.body.width * 0.62] }), _jsx("meshStandardMaterial", { color: "#121316", roughness: 0.95 })] }));
}
function Cabin({ body }) {
    const midU = (body.roofRearU + body.roofFrontU) / 2;
    const x = -body.length / 2 + midU * body.length - 0.05;
    const seatY = body.beltY - 0.08;
    const dashU = body.cowlU - 0.04;
    const dashX = -body.length / 2 + dashU * body.length;
    return (_jsxs("group", { children: [_jsxs("mesh", { position: [x, (body.beltY + body.roofY) / 2, 0], children: [_jsx("boxGeometry", { args: [(body.roofFrontU - body.roofRearU) * body.length * 0.88, (body.roofY - body.beltY) * 0.78, body.width * 0.58] }), _jsx("meshStandardMaterial", { color: "#07080b", roughness: 1 })] }), [-0.34, 0.34].map((z) => (_jsxs("group", { position: [x - 0.05, seatY, z], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.46, 0.22, 0.4] }), _jsx("meshStandardMaterial", { color: "#1a1614", roughness: 0.8 })] }), _jsxs("mesh", { position: [-0.16, 0.22, 0], children: [_jsx("boxGeometry", { args: [0.1, 0.28, 0.36] }), _jsx("meshStandardMaterial", { color: "#1a1614", roughness: 0.8 })] })] }, z))), _jsxs("mesh", { position: [dashX, body.beltY + 0.02, 0], rotation: [-0.45, 0, 0], children: [_jsx("boxGeometry", { args: [0.28, 0.16, body.width * 0.46] }), _jsx("meshStandardMaterial", { color: "#121418", roughness: 0.6 })] }), _jsxs("mesh", { position: [dashX - 0.12, body.beltY + 0.08, -0.34], rotation: [0.35, 0.15, 0], children: [_jsx("torusGeometry", { args: [0.15, 0.014, 8, 18] }), _jsx("meshStandardMaterial", { color: "#2a2d32", metalness: 0.7, roughness: 0.35 })] })] }));
}
function Pillars({ body, place, }) {
    const aLow = place(body.cowlU - 0.01, 0.86);
    const aHigh = place(body.roofFrontU + 0.005, body.roofWidth + 0.02);
    const midU = (body.roofRearU + body.roofFrontU) / 2;
    const bLow = place(midU, 0.9);
    const bHigh = place(midU, body.roofWidth);
    const cLow = place(body.roofRearU - 0.01, 0.78);
    const cHigh = place(body.roofRearU + 0.01, body.roofWidth);
    const pairs = [
        [aLow, aHigh, body.beltY + 0.04, body.roofY - 0.03],
        [bLow, bHigh, body.beltY + 0.02, body.roofY - 0.02],
        [cLow, cHigh, body.beltY + 0.02, body.roofY - 0.03],
    ];
    return (_jsx("group", { children: pairs.flatMap(([low, high, y0, y1], index) => [1, -1].map((side) => (_jsx(Beam, { a: [low.x, y0, side * low.z], b: [high.x, y1, side * high.z], radius: index === 1 ? 0.028 : 0.034, color: "#0c0d10" }, `${index}-${side}`)))) }));
}
function BeltTrim({ body, tire, angularity, }) {
    const geometry = useMemo(() => {
        const points = [];
        for (let i = 0; i <= 28; i += 1) {
            const u = lerp(body.rearGlassU + 0.02, body.cowlU - 0.01, i / 28);
            const station = sampleStation(body, u, angularity, tire);
            const z = station.halfW + 0.006;
            points.push(new THREE.Vector3(station.x + planPull(u, z, station.halfW, angularity), station.shoulder + 0.004, z));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.005, 5, false);
    }, [body, tire, angularity]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    const mirror = useMemo(() => geometry.clone().scale(1, 1, -1), [geometry]);
    useEffect(() => () => mirror.dispose(), [mirror]);
    return (_jsxs("group", { children: [_jsx("mesh", { geometry: geometry, children: _jsx("meshStandardMaterial", { color: "#e6e8ee", metalness: 1, roughness: 0.18 }) }), _jsx("mesh", { geometry: mirror, children: _jsx("meshStandardMaterial", { color: "#e6e8ee", metalness: 1, roughness: 0.18 }) })] }));
}
function Beam({ a, b, radius, color }) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const position = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const quaternion = useMemo(() => {
        const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
        if (dir.lengthSq() < 1e-6)
            return new THREE.Quaternion();
        return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }, [a, b]);
    return (_jsxs("mesh", { position: position, quaternion: quaternion, children: [_jsx("cylinderGeometry", { args: [radius, radius, Math.max(length, 0.02), 8] }), _jsx("meshStandardMaterial", { color: color, roughness: 0.45, metalness: 0.25 })] }));
}
function Well({ x, y, z, radius }) {
    return (_jsxs("mesh", { position: [x, y, z], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [radius, radius, 0.28, 24] }), _jsx("meshStandardMaterial", { color: "#050506", roughness: 0.95 })] }));
}
function Wheel({ position, rotationY, tire, spoke, horsepower, }) {
    const { radius, width, rimRadius } = tire;
    const count = spoke === "thin" ? 12 : 5;
    const faceZ = width * 0.22;
    const caliper = horsepower >= 480 ? "#8d1d22" : "#4a4e55";
    return (_jsxs("group", { position: position, rotation: [0, rotationY, 0], children: [_jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [radius * 0.992, radius * 0.992, width * 0.55, 48] }), _jsx("meshStandardMaterial", { color: "#16171a", roughness: 0.72 })] }), [-1, 1].map((side) => (_jsxs("mesh", { position: [0, 0, side * width * 0.3], children: [_jsx("torusGeometry", { args: [radius - tire.sidewall * 0.35, tire.sidewall * 0.42, 10, 36] }), _jsx("meshStandardMaterial", { color: "#1a1b1e", roughness: 0.8 })] }, side))), [-1, 1].map((side) => (_jsxs("mesh", { position: [0, 0, side * width * 0.34], children: [_jsx("ringGeometry", { args: [rimRadius * 1.01, radius * 0.97, 48] }), _jsx("meshStandardMaterial", { color: "#121316", roughness: 0.86, side: THREE.DoubleSide })] }, `wall-${side}`))), _jsxs("mesh", { position: [0, 0, faceZ], children: [_jsx("torusGeometry", { args: [rimRadius * 0.99, 0.012, 8, 40] }), _jsx("meshStandardMaterial", { color: "#f2f4f7", metalness: 1, roughness: 0.16 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [rimRadius * 0.97, rimRadius * 0.97, width * 0.36, 32, 1, true] }), _jsx("meshStandardMaterial", { color: "#0c0d10", side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 })] }), _jsxs("mesh", { position: [0, 0, 0.01], children: [_jsx("ringGeometry", { args: [rimRadius * 0.45, rimRadius * 0.78, 40] }), _jsx("meshStandardMaterial", { color: "#8d929a", metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide })] }), Array.from({ length: count }, (_, index) => {
                const angle = (index / count) * Math.PI * 2;
                if (spoke === "split") {
                    return (_jsx("group", { rotation: [0, 0, angle], position: [0, 0, faceZ - 0.01], children: [0.16, -0.16].map((tilt) => (_jsxs("mesh", { position: [rimRadius * 0.46, 0, 0], rotation: [0, 0, tilt], children: [_jsx("boxGeometry", { args: [rimRadius * 0.78, 0.016, 0.02] }), _jsx("meshStandardMaterial", { color: "#d5d8de", metalness: 0.95, roughness: 0.22 })] }, tilt))) }, index));
                }
                return (_jsxs("mesh", { rotation: [0, 0, angle], position: [rimRadius * 0.42, 0, faceZ - 0.008], children: [_jsx("boxGeometry", { args: [rimRadius * 0.72, spoke === "broad" ? 0.034 : 0.012, 0.022] }), _jsx("meshStandardMaterial", { color: "#e4e7ee", metalness: 1, roughness: 0.18 })] }, index));
            }), _jsxs("mesh", { position: [0, 0, faceZ + 0.01], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [rimRadius * 0.16, rimRadius * 0.18, 0.03, 20] }), _jsx("meshStandardMaterial", { color: "#c8ccd3", metalness: 0.9, roughness: 0.25 })] }), _jsxs("mesh", { position: [rimRadius * 0.55, -0.02, 0.02], children: [_jsx("boxGeometry", { args: [0.09, 0.16 + Math.min(0.06, horsepower / 9000), 0.05] }), _jsx("meshStandardMaterial", { color: caliper, roughness: 0.4, metalness: 0.5 })] })] }));
}
function Headlamp({ shape, position, side, }) {
    return (_jsxs("group", { position: position, scale: [1, 1, side], children: [_jsx(Housing, { shape: shape }), _jsx(LampShape, { shape: shape })] }));
}
function Housing({ shape }) {
    const size = housingSize(shape);
    return (_jsxs("mesh", { position: [-0.02, 0, 0], children: [_jsx("boxGeometry", { args: size }), _jsx("meshStandardMaterial", { color: "#07080a", roughness: 0.35, metalness: 0.4 })] }));
}
function housingSize(shape) {
    if (shape === "vertical")
        return [0.08, 0.16, 0.1];
    if (shape === "round")
        return [0.08, 0.14, 0.32];
    if (shape === "twin")
        return [0.08, 0.1, 0.36];
    if (shape === "claw")
        return [0.07, 0.12, 0.34];
    return [0.07, 0.07, 0.42];
}
function LampShape({ shape }) {
    if (shape === "round") {
        return (_jsx("group", { position: [0.02, 0, 0], children: [0.07, -0.07].map((z) => (_jsxs("group", { position: [0, 0, z], children: [_jsxs("mesh", { rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.045, 0.045, 0.02, 24] }), _jsx("meshPhysicalMaterial", { color: "#d5e4f2", transmission: 0.7, roughness: 0.05, thickness: 0.05, transparent: true, opacity: 0.8 })] }), _jsxs("mesh", { position: [0.014, 0, 0], rotation: [0, Math.PI / 2, 0], children: [_jsx("circleGeometry", { args: [0.028, 20] }), _jsx("meshBasicMaterial", { color: "#f7fbff" })] })] }, z))) }));
    }
    if (shape === "twin") {
        return (_jsx("group", { children: [0.08, -0.08].map((z) => (_jsxs("group", { position: [0.025, 0, z], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.02, 0.055, 0.11] }), _jsx("meshPhysicalMaterial", { color: "#d7e6f5", transmission: 0.65, roughness: 0.06, transparent: true, opacity: 0.75 })] }), _jsxs("mesh", { position: [0.012, 0, 0], children: [_jsx("boxGeometry", { args: [0.004, 0.012, 0.08] }), _jsx("meshBasicMaterial", { color: "#f4f8ff" })] })] }, z))) }));
    }
    if (shape === "vertical") {
        return (_jsxs("group", { position: [0.03, 0, 0.02], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.025, 0.13, 0.045] }), _jsx("meshPhysicalMaterial", { color: "#d5e2f0", transmission: 0.6, roughness: 0.05, transparent: true, opacity: 0.8 })] }), _jsxs("mesh", { position: [0.014, 0, 0], children: [_jsx("boxGeometry", { args: [0.004, 0.1, 0.012] }), _jsx("meshBasicMaterial", { color: "#f5f9ff" })] })] }));
    }
    if (shape === "claw") {
        return (_jsxs("group", { position: [0.03, 0, 0], children: [_jsxs("mesh", { position: [0, 0.02, 0.02], rotation: [0.15, 0, 0], children: [_jsx("boxGeometry", { args: [0.012, 0.016, 0.24] }), _jsx("meshBasicMaterial", { color: "#f4f8ff" })] }), _jsxs("mesh", { position: [0, -0.025, 0.08], rotation: [0.7, 0, 0], children: [_jsx("boxGeometry", { args: [0.01, 0.014, 0.12] }), _jsx("meshBasicMaterial", { color: "#f4f8ff" })] }), _jsxs("mesh", { position: [-0.008, 0, 0], children: [_jsx("boxGeometry", { args: [0.02, 0.08, 0.28] }), _jsx("meshPhysicalMaterial", { color: "#c9d7e6", transmission: 0.55, roughness: 0.08, transparent: true, opacity: 0.55 })] })] }));
    }
    return (_jsxs("group", { position: [0.028, 0, 0], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.018, 0.032, 0.36] }), _jsx("meshPhysicalMaterial", { color: "#d5e3f2", transmission: 0.62, roughness: 0.05, transparent: true, opacity: 0.72 })] }), _jsxs("mesh", { position: [0.01, 0, 0], children: [_jsx("boxGeometry", { args: [0.004, 0.008, 0.3] }), _jsx("meshBasicMaterial", { color: "#f7fbff" })] })] }));
}
function TailLamp({ shape, position, side, }) {
    const tall = shape === "vertical";
    const round = shape === "round";
    return (_jsxs("group", { position: position, scale: [1, 1, side], children: [round ? (_jsxs("mesh", { rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.05, 0.05, 0.03, 20] }), _jsx("meshBasicMaterial", { color: "#ff2a2a" })] })) : (_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.03, tall ? 0.12 : 0.045, tall ? 0.06 : 0.28] }), _jsx("meshStandardMaterial", { color: "#3a0c10", roughness: 0.3, metalness: 0.2 })] })), !round && (_jsxs("mesh", { position: [-0.012, 0, 0], children: [_jsx("boxGeometry", { args: [0.008, tall ? 0.09 : 0.016, tall ? 0.02 : 0.22] }), _jsx("meshBasicMaterial", { color: "#ff2e2e" })] }))] }));
}
function Mirror({ position, side, color, finish, }) {
    return (_jsxs("group", { position: position, scale: [1, 1, side], children: [_jsxs("mesh", { position: [0, 0, 0.07], scale: [1.3, 0.7, 1], children: [_jsx("sphereGeometry", { args: [0.07, 16, 12] }), _jsx("meshPhysicalMaterial", { ...paintArgs(color, finish) })] }), _jsxs("mesh", { position: [0.03, 0, 0.12], children: [_jsx("boxGeometry", { args: [0.09, 0.05, 0.012] }), _jsx("meshStandardMaterial", { color: "#1c242c", roughness: 0.05, metalness: 0.8 })] })] }));
}
function Grille({ shape, color, position, width, height, }) {
    const slats = shape === "vertical" ? 7 : 6;
    return (_jsxs("group", { position: position, children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.035, height, width] }), _jsx("meshStandardMaterial", { color: "#0a0b0d", metalness: 0.7, roughness: 0.35 })] }), shape === "closed" ? (_jsxs("mesh", { position: [0.012, 0, 0], children: [_jsx("boxGeometry", { args: [0.02, height * 0.82, width * 0.86] }), _jsx("meshPhysicalMaterial", { ...paintArgs(color, "gloss") })] })) : (_jsxs("mesh", { position: [0.004, 0, 0], children: [_jsx("boxGeometry", { args: [0.02, height * 0.86, width * 0.9] }), _jsx("meshStandardMaterial", { color: "#050506", roughness: 0.7 })] })), shape === "closed" && (_jsxs("mesh", { position: [0.026, height * 0.28, 0], children: [_jsx("boxGeometry", { args: [0.006, 0.012, width * 0.7] }), _jsx("meshBasicMaterial", { color: "#e7f0ff" })] })), (shape === "slats" || shape === "shield") &&
                Array.from({ length: slats }, (_, index) => (_jsxs("mesh", { position: [0.02, (index - (slats - 1) / 2) * height * 0.12, 0], children: [_jsx("boxGeometry", { args: [0.008, 0.008, width * 0.78] }), _jsx("meshStandardMaterial", { color: "#c5c9d1", metalness: 0.95, roughness: 0.25 })] }, index))), shape === "vertical" &&
                Array.from({ length: 9 }, (_, index) => (_jsxs("mesh", { position: [0.02, 0, (index - 4) * width * 0.08], children: [_jsx("boxGeometry", { args: [0.008, height * 0.72, 0.01] }), _jsx("meshStandardMaterial", { color: "#d0d4dc", metalness: 1, roughness: 0.22 })] }, index))), shape === "mesh" &&
                Array.from({ length: 5 }, (_, row) => Array.from({ length: 8 }, (_, col) => (_jsxs("mesh", { position: [0.02, (row - 2) * height * 0.16, (col - 3.5) * width * 0.09], children: [_jsx("boxGeometry", { args: [0.006, 0.008, 0.008] }), _jsx("meshStandardMaterial", { color: "#9aa0a8", metalness: 0.8, roughness: 0.3 })] }, `${row}-${col}`)))), shape === "diamond" &&
                Array.from({ length: 4 }, (_, row) => Array.from({ length: 6 }, (_, col) => (_jsxs("mesh", { position: [0.02, (row - 1.5) * height * 0.2, (col - 2.5) * width * 0.12], rotation: [Math.PI / 4, 0, 0], children: [_jsx("boxGeometry", { args: [0.008, height * 0.1, height * 0.1] }), _jsx("meshStandardMaterial", { color: "#0b0c0e", metalness: 0.6, roughness: 0.4 })] }, `${row}-${col}`))))] }));
}
function Exhaust({ x, y, z, radius }) {
    return (_jsxs("group", { position: [x, y, z], rotation: [0, 0, Math.PI / 2], children: [_jsxs("mesh", { children: [_jsx("cylinderGeometry", { args: [radius, radius, 0.08, 20] }), _jsx("meshStandardMaterial", { color: "#e7ebf1", metalness: 1, roughness: 0.18 })] }), _jsxs("mesh", { position: [0, 0.02, 0], children: [_jsx("cylinderGeometry", { args: [radius * 0.62, radius * 0.62, 0.05, 16] }), _jsx("meshStandardMaterial", { color: "#070708", roughness: 0.5 })] })] }));
}
function Diffuser({ x }) {
    return (_jsxs("group", { position: [x, 0.22, 0], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.22, 0.08, 0.86] }), _jsx("meshStandardMaterial", { color: "#14161a", roughness: 0.55, metalness: 0.35 })] }), [-0.24, -0.08, 0.08, 0.24].map((z) => (_jsxs("mesh", { position: [-0.02, 0, z], children: [_jsx("boxGeometry", { args: [0.16, 0.1, 0.012] }), _jsx("meshStandardMaterial", { color: "#0c0d10", metalness: 0.5, roughness: 0.4 })] }, z)))] }));
}
function HoodVents({ place }) {
    return (_jsx("group", { children: [0.16, -0.16].map((fraction) => {
            const spot = place(0.86, fraction);
            return (_jsxs("mesh", { position: [spot.x, spot.station.center + 0.02, spot.z], rotation: [0, fraction > 0 ? -0.4 : 0.4, 0], children: [_jsx("boxGeometry", { args: [0.18, 0.012, 0.07] }), _jsx("meshStandardMaterial", { color: "#070808", roughness: 0.5 })] }, fraction));
        }) }));
}
function Wing({ place }) {
    const mount = place(0.08, 0);
    return (_jsxs("group", { position: [mount.x, mount.station.center + 0.12, 0], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.16, 0.012, 0.92] }), _jsx("meshStandardMaterial", { color: "#14161a", metalness: 0.6, roughness: 0.3 })] }), [-0.28, 0.28].map((z) => (_jsxs("mesh", { position: [0.01, -0.05, z], children: [_jsx("boxGeometry", { args: [0.08, 0.08, 0.012] }), _jsx("meshStandardMaterial", { color: "#101114", metalness: 0.5, roughness: 0.35 })] }, z)))] }));
}
function Lip({ place, color, finish, }) {
    const spot = place(0.1, 0);
    return (_jsxs("mesh", { position: [spot.x, spot.station.center + 0.03, 0], rotation: [0.4, 0, 0], children: [_jsx("boxGeometry", { args: [0.08, 0.012, spot.station.halfW * 1.3] }), _jsx("meshPhysicalMaterial", { ...paintArgs(color, finish) })] }));
}
function HatchSpoiler({ place, color, finish, }) {
    const spot = place(0.12, 0);
    return (_jsxs("mesh", { position: [spot.x, spot.station.center + 0.02, 0], children: [_jsx("boxGeometry", { args: [0.1, 0.025, spot.station.halfW * 1.5] }), _jsx("meshPhysicalMaterial", { ...paintArgs(color, finish) })] }));
}
function RoofRails({ roof, bodyLength, roofRearU, roofFrontU, }) {
    const length = (roofFrontU - roofRearU) * bodyLength * 0.8;
    return (_jsx("group", { children: [-1, 1].map((side) => (_jsxs("mesh", { position: [roof.x, roof.center + 0.04, side * roof.halfW * 0.55], children: [_jsx("boxGeometry", { args: [length, 0.02, 0.025] }), _jsx("meshStandardMaterial", { color: "#1a1c20", metalness: 0.7, roughness: 0.35 })] }, side))) }));
}
function FuelFlap({ place, u }) {
    const spot = place(u, 1);
    return (_jsxs("mesh", { position: [spot.x, spot.station.shoulder - 0.12, spot.station.halfW + 0.008], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.055, 0.055, 0.01, 20] }), _jsx("meshStandardMaterial", { color: "#1c1e22", metalness: 0.4, roughness: 0.45 })] }));
}

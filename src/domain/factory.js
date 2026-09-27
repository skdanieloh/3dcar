import { BODIES } from "./bodies";
import { horsepowerFromCurve, templateCurve } from "./power";
export function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
export function baseDesign() {
    const sedan = BODIES.sedan.recommend;
    return {
        bodyType: "sedan",
        color: "#c5c8ce",
        finish: "metallic",
        angularity: sedan.angularity,
        tint: 0.42,
        rimInches: sedan.rimInches,
        tireWidthMm: sedan.tireWidthMm,
        tireAspect: sedan.tireAspect,
        lightShape: sedan.lightShape,
        grilleShape: sedan.grilleShape,
    };
}
export function baseEngine() {
    const torqueNm = 400;
    const redline = 6500;
    const torqueCurve = templateCurve("turbo", torqueNm, redline);
    return {
        code: "A20T",
        displacement: 2,
        cylinders: 4,
        aspiration: "turbo",
        torqueNm,
        redline,
        drivetrain: "RWD",
        transmission: "8AT",
        batteryKwh: 0,
        torqueCurve,
    };
}
export function createBaseVehicle(name = "베이스 섀시") {
    const now = Date.now();
    const engine = baseEngine();
    return {
        id: uid(),
        name,
        createdAt: now,
        updatedAt: now,
        design: baseDesign(),
        performance: {
            topSpeed: 250,
            horsepower: Math.max(250, horsepowerFromCurve(engine.torqueCurve)),
        },
        engine,
    };
}
export function cloneVehicle(vehicle, name) {
    const now = Date.now();
    const copy = structuredClone(vehicle);
    copy.id = uid();
    copy.name = name;
    copy.createdAt = now;
    copy.updatedAt = now;
    return copy;
}
export function applyBodyType(design, type) {
    const recommend = BODIES[type].recommend;
    return {
        ...design,
        bodyType: type,
        angularity: recommend.angularity,
        rimInches: recommend.rimInches,
        tireWidthMm: recommend.tireWidthMm,
        tireAspect: recommend.tireAspect,
        lightShape: recommend.lightShape,
        grilleShape: recommend.grilleShape,
    };
}
export function engineForAspiration(engine, aspiration) {
    if (aspiration === "electric") {
        const torqueNm = 620;
        const redline = 16000;
        return {
            ...engine,
            aspiration,
            displacement: 0,
            cylinders: 0,
            torqueNm,
            redline,
            transmission: "direct",
            batteryKwh: engine.batteryKwh > 0 ? engine.batteryKwh : 84,
            torqueCurve: templateCurve(aspiration, torqueNm, redline),
        };
    }
    const torqueNm = aspiration === "na" ? 280 : aspiration === "twinTurbo" || aspiration === "supercharged" ? 560 : 400;
    const redline = aspiration === "na" ? 7200 : 6500;
    const cylinders = engine.cylinders > 0 ? engine.cylinders : 4;
    return {
        ...engine,
        aspiration,
        displacement: engine.displacement > 0 ? engine.displacement : 2,
        cylinders,
        torqueNm,
        redline,
        transmission: engine.transmission === "direct" ? "8AT" : engine.transmission,
        batteryKwh: aspiration === "hybrid" ? Math.max(engine.batteryKwh, 18) : 0,
        torqueCurve: templateCurve(aspiration, torqueNm, redline),
    };
}
export function withCurve(engine, torqueCurve) {
    const peak = Math.max(...torqueCurve.map((point) => point.torque), 0);
    return { ...engine, torqueCurve, torqueNm: Math.round(peak) };
}

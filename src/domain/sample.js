import { BODIES } from "./bodies";
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
export function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}
function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return (0.5 *
        (2 * p1 +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
}
function sampleField(keys, u, field, angularity) {
    const n = keys.length;
    let index = 0;
    while (index < n - 2 && keys[index + 1].u < u)
        index += 1;
    const k0 = keys[Math.max(0, index - 1)];
    const k1 = keys[index];
    const k2 = keys[Math.min(n - 1, index + 1)];
    const k3 = keys[Math.min(n - 1, index + 2)];
    const span = k2.u - k1.u;
    const t = span <= 1e-5 ? 0 : clamp((u - k1.u) / span, 0, 1);
    const curved = catmull(k0[field], k1[field], k2[field], k3[field], t);
    const linear = lerp(k1[field], k2[field], t);
    return lerp(curved, linear, clamp(angularity, 0, 1) * 0.9);
}
export function tireMetrics(design) {
    const rimRadius = (design.rimInches * 0.0254) / 2;
    const width = design.tireWidthMm / 1000;
    const sidewall = width * (design.tireAspect / 100);
    return { rimRadius, sidewall, radius: rimRadius + sidewall, width };
}
function archLower(base, u, body, tire) {
    const wheelCenter = tire.radius;
    const archR = tire.radius + body.archGap;
    const at = (axleU) => {
        const dx = Math.abs(u - axleU) * body.length;
        if (dx >= archR * 1.28)
            return base;
        if (dx >= archR) {
            const t = (dx - archR) / (archR * 0.28);
            return lerp(wheelCenter, base, smoothstep(0, 1, t));
        }
        return wheelCenter + Math.sqrt(Math.max(0, archR * archR - dx * dx));
    };
    return Math.max(at(body.frontAxleU), at(body.rearAxleU));
}
export function sampleStation(body, u, angularity, tire) {
    const uu = clamp(u, 0, 1);
    const center = clamp(sampleField(body.keys, uu, "center", angularity), 0.12, 2.3);
    const shoulder = clamp(sampleField(body.keys, uu, "shoulder", angularity), 0.12, 2.2);
    const rocker = clamp(sampleField(body.keys, uu, "lower", angularity), 0.08, 1.2);
    let halfW = sampleField(body.keys, uu, "halfW", angularity);
    const tireExtra = Math.max(0, tire.width - 0.235) * 0.28;
    const flare = (axle, amount) => {
        const du = Math.abs(uu - axle);
        const width = 0.06;
        if (du > width)
            return 0;
        return amount * Math.cos((du / width) * Math.PI * 0.5);
    };
    halfW += flare(body.frontAxleU, 0.018 + tireExtra) + flare(body.rearAxleU, 0.028 + tireExtra);
    halfW = clamp(halfW, 0.08, 1.25);
    const lifted = archLower(rocker, uu, body, tire);
    const lower = clamp(Math.min(lifted, Math.min(shoulder, center) - 0.04), 0.08, 1.6);
    return {
        u: uu,
        x: -body.length / 2 + uu * body.length,
        center,
        shoulder: Math.max(shoulder, lower + 0.04),
        lower,
        halfW,
    };
}
/** Pulls bumper corners rearward so the nose center stays flat and the plan view reads as a real fascia. */
export function planPull(u, z, halfW, angularity) {
    const zn = Math.min(1.2, Math.abs(z) / Math.max(0.08, halfW));
    const sharp = clamp(angularity, 0, 1);
    const corner = sharp > 0.58 ? smoothstep(0.58, 1, zn) : Math.pow(zn, lerp(1.25, 2.2, sharp));
    const nose = smoothstep(0.86, 1, u);
    const tail = smoothstep(0.14, 0, u);
    const amount = lerp(0.3, 0.18, sharp);
    return -nose * corner * amount + tail * corner * amount * 0.72;
}
export function bodyFor(design) {
    return BODIES[design.bodyType];
}

import { clamp, lerp } from "../domain/sample";
export function paintArgs(color, finish) {
    const shared = {
        color,
        envMapIntensity: 1.35,
    };
    if (finish === "metallic") {
        return { ...shared, metalness: 0.9, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.07 };
    }
    if (finish === "satin") {
        return { ...shared, metalness: 0.38, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.38 };
    }
    if (finish === "matte") {
        return { ...shared, metalness: 0.08, roughness: 0.82, clearcoat: 0.04, clearcoatRoughness: 0.7 };
    }
    return { ...shared, metalness: 0.45, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.045 };
}
export function glassArgs(tint) {
    const t = clamp(tint, 0, 1);
    return {
        color: mixHex("#c5d0da", "#07090c", t),
        roughness: lerp(0.02, 0.16, t),
        metalness: 0,
        transmission: lerp(0.94, 0.22, t),
        thickness: 0.15,
        ior: 1.5,
        transparent: true,
        opacity: lerp(0.38, 0.96, t),
        envMapIntensity: 1.6,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        attenuationColor: mixHex("#9eb0c0", "#050608", t),
        attenuationDistance: lerp(1.4, 0.1, t),
    };
}
function mixHex(from, to, t) {
    const a = hex(from);
    const b = hex(to);
    const c = a.map((channel, index) => Math.round(lerp(channel, b[index], t)));
    return `#${c.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
function hex(value) {
    const n = value.replace("#", "");
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel } from "./CarModel";
const VIEWS = {
    threeq: [6.15, 1.68, 4.7],
    side: [0.2, 1.22, 8.15],
    rear: [-6.4, 1.55, 3.35],
    top: [0.35, 8.6, 0.35],
};
export function Studio({ vehicle, view, viewToken, spin }) {
    return (_jsxs(Canvas, { dpr: [1, 1.75], camera: { position: VIEWS.threeq, fov: 30, near: 0.08, far: 80 }, gl: { antialias: true, powerPreference: "high-performance" }, onCreated: ({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
        }, children: [_jsx("color", { attach: "background", args: ["#1b1e26"] }), _jsx(CameraRig, { view: view, token: viewToken }), _jsx("ambientLight", { intensity: 0.35 }), _jsx("directionalLight", { position: [6, 7, 4], intensity: 2.4 }), _jsx("directionalLight", { position: [-5, 3.5, -2], intensity: 0.9, color: "#d5def0" }), _jsxs(Environment, { resolution: 256, frames: 1, children: [_jsx(Lightformer, { form: "rect", intensity: 2, color: "#ffffff", position: [0, 3.4, 0], scale: [12, 8, 1], rotation: [-Math.PI / 2, 0, 0] }), _jsx(Lightformer, { form: "rect", intensity: 4.5, color: "#f3f7ff", position: [5.2, 1.8, 2], scale: [7, 3.2, 1], rotation: [0, Math.PI / 2, 0] }), _jsx(Lightformer, { form: "rect", intensity: 3.2, color: "#fff3e6", position: [-5, 1.5, -1.2], scale: [7, 2.6, 1], rotation: [0, -Math.PI / 2, 0] }), _jsx(Lightformer, { form: "rect", intensity: 1.8, color: "#ffffff", position: [0, 1.4, 5.2], scale: [9, 2.2, 1] }), _jsx(Lightformer, { form: "rect", intensity: 1.3, color: "#d9e3f5", position: [0, 2.2, -5.4], scale: [8, 2.4, 1], rotation: [0, Math.PI, 0] })] }), _jsx(CarModel, { vehicle: vehicle }), _jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0], children: [_jsx("circleGeometry", { args: [8.5, 72] }), _jsx(MeshReflectorMaterial, { resolution: 512, blur: [280, 90], mixBlur: 1, mixStrength: 1.15, roughness: 0.86, mirror: 0.28, metalness: 0.42, color: "#171a20", depthScale: 0.7, minDepthThreshold: 0.25, maxDepthThreshold: 1.25 })] }), _jsx(ContactShadows, { position: [0, 0.012, 0], opacity: 0.42, scale: 14, blur: 2.5, far: 4.2, resolution: 512, color: "#000000" }), _jsx(OrbitControls, { makeDefault: true, target: [0, 0.64, 0], enablePan: true, autoRotate: spin, autoRotateSpeed: 0.65, enableDamping: true, dampingFactor: 0.08, minDistance: 3.4, maxDistance: 14, maxPolarAngle: Math.PI / 2.04 })] }));
}
function CameraRig({ view, token }) {
    const camera = useThree((state) => state.camera);
    const controls = useThree((state) => state.controls);
    useEffect(() => {
        const preset = VIEWS[view];
        camera.position.set(preset[0], preset[1], preset[2]);
        if (controls) {
            controls.target.set(0, 0.64, 0);
            controls.update();
        }
    }, [view, token, camera, controls]);
    return null;
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { BODIES, BODY_ORDER } from "../domain/bodies";
import { cloneVehicle, withCurve } from "../domain/factory";
import { estimateZeroToHundred, horsepowerFromCurve, scaleCurveToHorsepower, scaleCurveToPeak } from "../domain/power";
import { isVehicle, useGarage } from "../state/GarageProvider";
import { Studio } from "../viewport/Studio";
import { TorqueCurve } from "./TorqueCurve";
const SWATCHES = ["#f4f1ea", "#c5c8ce", "#6e7278", "#3a3d42", "#121418", "#14233c", "#1c3a2e", "#7a1c22", "#c4b09a", "#8a4b32"];
const LIGHTS = [
    { id: "blade", label: "블레이드" },
    { id: "twin", label: "트윈" },
    { id: "round", label: "라운드" },
    { id: "vertical", label: "버티컬" },
    { id: "claw", label: "클로" },
];
const GRILLES = [
    { id: "slats", label: "가로 슬랫" },
    { id: "vertical", label: "세로 핀" },
    { id: "mesh", label: "메시" },
    { id: "shield", label: "실드" },
    { id: "diamond", label: "다이아" },
    { id: "closed", label: "폐쇄형" },
];
const FINISHES = [
    { id: "gloss", label: "유광" },
    { id: "metallic", label: "메탈릭" },
    { id: "satin", label: "새틴" },
    { id: "matte", label: "무광" },
];
const ASPIRATIONS = [
    { id: "na", label: "자연흡기" },
    { id: "turbo", label: "터보" },
    { id: "twinTurbo", label: "트윈터보" },
    { id: "supercharged", label: "슈퍼차저" },
    { id: "hybrid", label: "하이브리드" },
    { id: "electric", label: "전기" },
];
const DRIVES = [
    { id: "FWD", label: "전륜" },
    { id: "RWD", label: "후륜" },
    { id: "AWD", label: "사륜" },
];
const GEARS = [
    { id: "6MT", label: "6단 수동" },
    { id: "8AT", label: "8단 자동" },
    { id: "DCT", label: "DCT" },
    { id: "CVT", label: "CVT" },
    { id: "direct", label: "감속기어" },
];
const VIEWS = [
    { id: "threeq", label: "3/4" },
    { id: "side", label: "측면" },
    { id: "rear", label: "후면" },
    { id: "top", label: "상면" },
];
export function Editor() {
    const garage = useGarage();
    const { selected } = garage;
    const [view, setView] = useState("threeq");
    const [viewToken, setViewToken] = useState(0);
    const [spin, setSpin] = useState(false);
    const body = BODIES[selected.design.bodyType];
    const curveHp = horsepowerFromCurve(selected.engine.torqueCurve);
    const zero = estimateZeroToHundred(body.mass, selected.performance.horsepower, selected.engine.drivetrain, selected.engine.aspiration);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "brand", children: [_jsx("span", { className: "mark", "aria-hidden": true }), _jsxs("div", { children: [_jsx("strong", { children: "FORMA" }), _jsx("small", { children: "\uCC28\uCCB4 \uC2A4\uD29C\uB514\uC624" })] })] }), _jsx("input", { className: "name", "aria-label": "\uCC28\uB7C9 \uC774\uB984", value: selected.name, spellCheck: false, onChange: (event) => garage.rename(event.target.value) }), _jsxs("div", { className: "top-spec num", children: [_jsxs("span", { children: [selected.performance.horsepower, " hp"] }), _jsxs("span", { children: [selected.performance.topSpeed, " km/h"] }), _jsxs("span", { children: [zero.toFixed(1), " s"] })] })] }), _jsxs("div", { className: "workspace", children: [_jsx(Library, {}), _jsxs("section", { className: "stage", children: [_jsx("div", { className: "stage-canvas", children: _jsx(Studio, { vehicle: selected, view: view, viewToken: viewToken, spin: spin }) }), _jsxs("div", { className: "hud hud-top", children: [_jsx("p", { children: engineLine(selected.engine) }), _jsxs("p", { className: "muted", children: [body.length.toFixed(2), " m \u00B7 \uD3ED ", body.width.toFixed(2), " m \u00B7 \uB192\uC774 ", body.height.toFixed(2), " m \u00B7 \uD720\uBCA0\uC774\uC2A4 ", body.wheelbase.toFixed(2), " m"] })] }), _jsxs("div", { className: "hud hud-bottom", children: [_jsxs("div", { className: "view-row", children: [VIEWS.map((item) => (_jsx("button", { type: "button", className: view === item.id ? "on" : "", onClick: () => {
                                                    setView(item.id);
                                                    setViewToken((token) => token + 1);
                                                }, children: item.label }, item.id))), _jsx("button", { type: "button", className: spin ? "on" : "", onClick: () => setSpin((value) => !value), children: "\uD68C\uC804" })] }), _jsxs("p", { className: "muted num", children: [selected.design.tireWidthMm, "/", selected.design.tireAspect, " R", selected.design.rimInches] })] })] }), _jsx(Inspector, { curveHp: curveHp, zero: zero })] })] }));
}
function Library() {
    const garage = useGarage();
    const fileRef = useRef(null);
    const exportGarage = () => {
        const blob = new Blob([JSON.stringify({ version: 1, vehicles: garage.vehicles }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "forma-garage.json";
        link.click();
        URL.revokeObjectURL(url);
    };
    const importFile = async (file) => {
        try {
            const data = JSON.parse(await file.text());
            const list = Array.isArray(data) ? data : data && typeof data === "object" && "vehicles" in data ? data.vehicles : [data];
            const vehicles = (Array.isArray(list) ? list : []).filter(isVehicle).map((vehicle) => cloneVehicle(vehicle, vehicle.name));
            if (!vehicles.length) {
                window.alert("읽을 수 있는 차량 데이터가 없습니다.");
                return;
            }
            garage.importVehicles(vehicles);
        }
        catch {
            window.alert("JSON 파일을 읽지 못했습니다.");
        }
    };
    return (_jsxs("aside", { className: "library", children: [_jsxs("div", { className: "panel-head", children: [_jsx("h2", { children: "\uCC28\uACE0" }), _jsx("span", { className: "num", children: garage.vehicles.length })] }), _jsx("button", { type: "button", className: "primary", onClick: garage.createNew, children: "\uC0C8 \uCC28\uB7C9" }), _jsx("p", { className: "hint", children: "\uC0C8 \uCC28\uB7C9\uC740 \uBCA0\uC774\uC2A4 \uC100\uC2DC\uC5D0\uC11C \uC2DC\uC791\uD569\uB2C8\uB2E4. \uC0C9, \uC2E4\uB8E8\uC5E3, \uC131\uB2A5, \uC5D4\uC9C4\uC740 \uAC01\uAC01 \uB530\uB85C \uC800\uC7A5\uB429\uB2C8\uB2E4." }), _jsx("div", { className: "cards", children: garage.vehicles.map((vehicle) => {
                    const body = BODIES[vehicle.design.bodyType];
                    const active = vehicle.id === garage.selected.id;
                    return (_jsxs("button", { type: "button", className: active ? "card on" : "card", onClick: () => garage.select(vehicle.id), children: [_jsx("span", { className: "chip", style: { background: vehicle.design.color } }), _jsxs("span", { children: [_jsx("strong", { children: vehicle.name }), _jsxs("small", { children: [body.label, " \u00B7 ", vehicle.performance.horsepower, " hp \u00B7 ", vehicle.performance.topSpeed, " km/h"] })] })] }, vehicle.id));
                }) }), _jsxs("div", { className: "library-actions", children: [_jsx("button", { type: "button", onClick: garage.duplicate, children: "\uBCF5\uC81C" }), _jsx("button", { type: "button", disabled: garage.vehicles.length <= 1, onClick: () => {
                            if (window.confirm(`"${garage.selected.name}" 차량을 차고에서 삭제할까요?`))
                                garage.remove();
                        }, children: "\uC0AD\uC81C" }), _jsx("button", { type: "button", onClick: exportGarage, children: "\uB0B4\uBCF4\uB0B4\uAE30" }), _jsx("button", { type: "button", onClick: () => fileRef.current?.click(), children: "\uAC00\uC838\uC624\uAE30" }), _jsx("input", { ref: fileRef, hidden: true, type: "file", accept: "application/json", onChange: (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file)
                                void importFile(file);
                        } })] })] }));
}
function Inspector({ curveHp, zero }) {
    const garage = useGarage();
    const { design, performance, engine } = garage.selected;
    const body = BODIES[design.bodyType];
    const electric = engine.aspiration === "electric";
    return (_jsxs("aside", { className: "inspector", children: [_jsx(Section, { title: "\uCC28\uC885", hint: "\uCC28\uC885\uC744 \uBC14\uAFB8\uBA74 \uD720, \uB77C\uC774\uD2B8, \uADF8\uB9B4, \uC2E4\uB8E8\uC5E3\uC774 \uADF8 \uD328\uD0A4\uC9C0\uC758 \uAE30\uBCF8\uAC12\uC73C\uB85C \uB9DE\uCDB0\uC9D1\uB2C8\uB2E4.", children: _jsx("div", { className: "type-grid", children: BODY_ORDER.map((type) => (_jsxs("button", { type: "button", className: design.bodyType === type ? "choice on" : "choice", onClick: () => garage.setBodyType(type), children: [_jsx("strong", { children: BODIES[type].label }), _jsx("small", { children: BODIES[type].blurb })] }, type))) }) }), _jsxs(Section, { title: "\uC2E4\uB8E8\uC5E3", children: [_jsx(Slider, { label: "\uACE1\uC120\uC5D0\uC11C \uAC01\uC9D0", min: 0, max: 1, step: 0.01, value: design.angularity, format: (value) => `${Math.round(value * 100)}`, onChange: (angularity) => garage.patchDesign({ angularity }) }), _jsxs("div", { className: "ends", children: [_jsx("span", { children: "\uACE1\uC120" }), _jsx("span", { children: "\uAC01\uC9C4" })] })] }), _jsxs(Section, { title: "\uB3C4\uC7A5", children: [_jsxs("div", { className: "swatches", children: [SWATCHES.map((color) => (_jsx("button", { type: "button", className: design.color.toLowerCase() === color ? "swatch on" : "swatch", style: { background: color }, "aria-label": color, onClick: () => garage.patchDesign({ color }) }, color))), _jsx("label", { className: "swatch custom", children: _jsx("input", { type: "color", value: toColorInput(design.color), "aria-label": "\uC9C1\uC811 \uC0C9\uC0C1", onChange: (event) => garage.patchDesign({ color: event.target.value }) }) })] }), _jsx("div", { className: "chips", children: FINISHES.map((finish) => (_jsx("button", { type: "button", className: design.finish === finish.id ? "chip-btn on" : "chip-btn", onClick: () => garage.patchDesign({ finish: finish.id }), children: finish.label }, finish.id))) })] }), _jsx(Section, { title: "\uC720\uB9AC", children: _jsx(Slider, { label: "\uC36C\uD305", min: 0, max: 1, step: 0.01, value: design.tint, format: (value) => `${Math.round(value * 100)}%`, onChange: (tint) => garage.patchDesign({ tint }) }) }), _jsxs(Section, { title: "\uD0C0\uC774\uC5B4", children: [_jsx(Slider, { label: "\uB9BC", min: 17, max: 23, step: 1, value: design.rimInches, format: (value) => `${value} in`, onChange: (rimInches) => garage.patchDesign({ rimInches }) }), _jsx(Slider, { label: "\uD3ED", min: 195, max: 355, step: 5, value: design.tireWidthMm, format: (value) => `${value} mm`, onChange: (tireWidthMm) => garage.patchDesign({ tireWidthMm }) }), _jsx(Slider, { label: "\uD3B8\uD3C9\uBE44", min: 25, max: 70, step: 5, value: design.tireAspect, format: (value) => `${value}`, onChange: (tireAspect) => garage.patchDesign({ tireAspect }) }), _jsxs("p", { className: "readout num", children: [design.tireWidthMm, "/", design.tireAspect, " R", design.rimInches] })] }), _jsx(Section, { title: "\uB77C\uC774\uD2B8", children: _jsx("div", { className: "chips", children: LIGHTS.map((light) => (_jsx("button", { type: "button", className: design.lightShape === light.id ? "chip-btn on" : "chip-btn", onClick: () => garage.patchDesign({ lightShape: light.id }), children: light.label }, light.id))) }) }), _jsx(Section, { title: "\uADF8\uB9B4", children: _jsx("div", { className: "chips", children: GRILLES.map((grille) => (_jsx("button", { type: "button", className: design.grilleShape === grille.id ? "chip-btn on" : "chip-btn", onClick: () => garage.patchDesign({ grilleShape: grille.id }), children: grille.label }, grille.id))) }) }), _jsxs(Section, { title: "\uC131\uB2A5", hint: "\uB9C8\uB825\uACFC \uCD5C\uACE0\uC18D\uB3C4\uB294 \uC9C1\uC811 \uC9C0\uC815\uD569\uB2C8\uB2E4. \uCD9C\uB825\uC740 \uBE0C\uB808\uC774\uD06C, \uBC30\uAE30, \uD6C4\uB4DC \uBCA4\uD2B8\uC5D0 \uBC18\uC601\uB418\uACE0 \uCD5C\uACE0\uC18D\uB3C4\uB294 \uB9AC\uC5B4 \uC2A4\uD3EC\uC77C\uB7EC\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.", children: [_jsxs("div", { className: "stat-row num", children: [_jsxs("div", { children: [_jsx("b", { children: performance.horsepower }), _jsx("small", { children: "hp" })] }), _jsxs("div", { children: [_jsx("b", { children: performance.topSpeed }), _jsx("small", { children: "km/h" })] }), _jsxs("div", { children: [_jsx("b", { children: zero.toFixed(1) }), _jsx("small", { children: "0-100 \uCD94\uC815" })] })] }), _jsx(NumberField, { label: "\uB9C8\uB825", value: performance.horsepower, min: 40, max: 1600, suffix: "hp", onChange: (horsepower) => garage.patchPerformance({ horsepower }) }), _jsx(NumberField, { label: "\uCD5C\uACE0\uC18D\uB3C4", value: performance.topSpeed, min: 80, max: 450, suffix: "km/h", onChange: (topSpeed) => garage.patchPerformance({ topSpeed }) }), _jsxs("p", { className: "readout", children: ["\uACF5\uCC28 ", body.mass.toLocaleString(), " kg \u00B7 ", (performance.horsepower / (body.mass / 1000)).toFixed(0), " hp/t \u00B7 \uCEE4\uBE0C \uAE30\uC900 ", curveHp, " hp"] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { type: "button", onClick: () => garage.patchPerformance({ horsepower: curveHp }), children: "\uB9C8\uB825\uC744 \uCEE4\uBE0C\uC5D0 \uB9DE\uCD94\uAE30" }), _jsx("button", { type: "button", onClick: () => garage.setEngine((current) => withCurve(current, scaleCurveToHorsepower(current.torqueCurve, performance.horsepower))), children: "\uCEE4\uBE0C\uB97C \uB9C8\uB825\uC5D0 \uB9DE\uCD94\uAE30" })] })] }), _jsxs(Section, { title: "\uC5D4\uC9C4", hint: "\uD761\uAE30 \uBC29\uC2DD\uC744 \uBC14\uAFB8\uBA74 \uD1A0\uD06C \uCEE4\uBE0C \uD504\uB9AC\uC14B\uC774 \uB2E4\uC2DC \uC801\uC6A9\uB429\uB2C8\uB2E4. \uC810\uC740 \uB4DC\uB798\uADF8\uD574\uC11C \uACE0\uCE69\uB2C8\uB2E4.", children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC5D4\uC9C4 \uCF54\uB4DC" }), _jsx("span", { className: "field-box", children: _jsx("input", { value: engine.code, spellCheck: false, onChange: (event) => garage.setEngine((current) => ({ ...current, code: event.target.value })) }) })] }), _jsx("div", { className: "chips", children: ASPIRATIONS.map((item) => (_jsx("button", { type: "button", className: engine.aspiration === item.id ? "chip-btn on" : "chip-btn", onClick: () => garage.setAspiration(item.id), children: item.label }, item.id))) }), electric ? (_jsx(NumberField, { label: "\uBC30\uD130\uB9AC", value: engine.batteryKwh, min: 20, max: 200, suffix: "kWh", onChange: (batteryKwh) => garage.setEngine((current) => ({ ...current, batteryKwh })) })) : (_jsxs("div", { className: "split", children: [_jsx(NumberField, { label: "\uBC30\uAE30\uB7C9", value: engine.displacement, min: 0.6, max: 8, suffix: "L", onChange: (displacement) => garage.setEngine((current) => ({ ...current, displacement: Math.round(displacement * 10) / 10 })) }), _jsxs("div", { className: "field", children: [_jsx("span", { children: "\uAE30\uD1B5" }), _jsx("div", { className: "chips tight", children: [3, 4, 6, 8, 10, 12].map((count) => (_jsx("button", { type: "button", className: engine.cylinders === count ? "chip-btn on" : "chip-btn", onClick: () => garage.setEngine((current) => ({ ...current, cylinders: count })), children: count }, count))) })] })] })), _jsx(NumberField, { label: "\uCD5C\uB300 \uD1A0\uD06C", value: engine.torqueNm, min: 50, max: 1600, suffix: "Nm", onChange: (torqueNm) => garage.setEngine((current) => ({ ...current, torqueNm, torqueCurve: scaleCurveToPeak(current.torqueCurve, torqueNm) })) }), _jsx(NumberField, { label: "\uB808\uB4DC\uB77C\uC778", value: engine.redline, min: 3000, max: 20000, suffix: "rpm", onChange: (redline) => garage.setEngine((current) => ({
                            ...current,
                            redline,
                            torqueCurve: current.torqueCurve.map((point, index) => ({
                                ...point,
                                rpm: index === current.torqueCurve.length - 1 ? redline : Math.min(point.rpm, redline - 100),
                            })),
                        })) }), _jsx(TorqueCurve, { curve: engine.torqueCurve, redline: engine.redline, onChange: (torqueCurve) => garage.setEngine((current) => withCurve(current, torqueCurve)) }), _jsxs("div", { className: "field", children: [_jsx("span", { children: "\uAD6C\uB3D9" }), _jsx("div", { className: "chips", children: DRIVES.map((item) => (_jsx("button", { type: "button", className: engine.drivetrain === item.id ? "chip-btn on" : "chip-btn", onClick: () => garage.setEngine((current) => ({ ...current, drivetrain: item.id })), children: item.label }, item.id))) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBCC0\uC18D" }), _jsx("span", { className: "field-box", children: _jsx("select", { value: engine.transmission, onChange: (event) => garage.setEngine((current) => ({ ...current, transmission: event.target.value })), children: GEARS.map((gear) => (_jsx("option", { value: gear.id, children: gear.label }, gear.id))) }) })] })] })] }));
}
function Section({ title, hint, children }) {
    return (_jsxs("section", { className: "section", children: [_jsxs("header", { children: [_jsx("h2", { children: title }), hint && _jsx("p", { children: hint })] }), children] }));
}
function Slider({ label, value, min, max, step, format, onChange, }) {
    const pct = ((value - min) / (max - min)) * 100;
    return (_jsxs("label", { className: "slider", children: [_jsxs("span", { className: "slider-top", children: [_jsx("span", { children: label }), _jsx("span", { className: "num", children: format(value) })] }), _jsx("input", { type: "range", min: min, max: max, step: step, value: value, onChange: (event) => onChange(Number(event.target.value)), style: { background: `linear-gradient(90deg, #e4d2b0 ${pct}%, #2c3038 ${pct}%)` } })] }));
}
function NumberField({ label, value, min, max, suffix, onChange, }) {
    const [text, setText] = useState(String(value));
    useEffect(() => setText(String(value)), [value]);
    const commit = () => {
        const next = Number(text);
        if (!Number.isFinite(next)) {
            setText(String(value));
            return;
        }
        onChange(Math.min(max, Math.max(min, next)));
    };
    return (_jsxs("label", { className: "field", children: [_jsx("span", { children: label }), _jsxs("span", { className: "field-box", children: [_jsx("input", { className: "num", value: text, inputMode: "decimal", onChange: (event) => setText(event.target.value), onBlur: commit, onKeyDown: (event) => {
                            if (event.key === "Enter")
                                event.currentTarget.blur();
                        } }), _jsx("em", { children: suffix })] })] }));
}
function engineLine(engine) {
    const drive = DRIVES.find((item) => item.id === engine.drivetrain)?.label ?? engine.drivetrain;
    const gear = GEARS.find((item) => item.id === engine.transmission)?.label ?? engine.transmission;
    const aspiration = ASPIRATIONS.find((item) => item.id === engine.aspiration)?.label ?? engine.aspiration;
    if (engine.aspiration === "electric")
        return `${engine.code} · ${engine.batteryKwh} kWh · ${drive} · ${gear}`;
    return `${engine.code} · ${engine.displacement.toFixed(1)}L ${engine.cylinders}기통 ${aspiration} · ${drive} · ${gear}`;
}
function toColorInput(color) {
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#c5c8ce";
}

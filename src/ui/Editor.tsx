import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BODIES, BODY_ORDER } from "../domain/bodies";
import { cloneVehicle, withCurve } from "../domain/factory";
import { estimateZeroToHundred, horsepowerFromCurve, scaleCurveToHorsepower, scaleCurveToPeak } from "../domain/power";
import type { Aspiration, Drivetrain, EngineSpec, GrilleShape, LightShape, PaintFinish, Transmission } from "../domain/types";
import { isVehicle, useGarage } from "../state/GarageProvider";
import { Studio } from "../viewport/Studio";
import type { StudioView } from "../viewport/Studio";
import { TorqueCurve } from "./TorqueCurve";

const SWATCHES = ["#f4f1ea", "#c5c8ce", "#6e7278", "#3a3d42", "#121418", "#14233c", "#1c3a2e", "#7a1c22", "#c4b09a", "#8a4b32"];

const LIGHTS: { id: LightShape; label: string }[] = [
  { id: "blade", label: "블레이드" },
  { id: "twin", label: "트윈" },
  { id: "round", label: "라운드" },
  { id: "vertical", label: "버티컬" },
  { id: "claw", label: "클로" },
];

const GRILLES: { id: GrilleShape; label: string }[] = [
  { id: "slats", label: "가로 슬랫" },
  { id: "vertical", label: "세로 핀" },
  { id: "mesh", label: "메시" },
  { id: "shield", label: "실드" },
  { id: "diamond", label: "다이아" },
  { id: "closed", label: "폐쇄형" },
];

const FINISHES: { id: PaintFinish; label: string }[] = [
  { id: "gloss", label: "유광" },
  { id: "metallic", label: "메탈릭" },
  { id: "satin", label: "새틴" },
  { id: "matte", label: "무광" },
];

const ASPIRATIONS: { id: Aspiration; label: string }[] = [
  { id: "na", label: "자연흡기" },
  { id: "turbo", label: "터보" },
  { id: "twinTurbo", label: "트윈터보" },
  { id: "supercharged", label: "슈퍼차저" },
  { id: "hybrid", label: "하이브리드" },
  { id: "electric", label: "전기" },
];

const DRIVES: { id: Drivetrain; label: string }[] = [
  { id: "FWD", label: "전륜" },
  { id: "RWD", label: "후륜" },
  { id: "AWD", label: "사륜" },
];

const GEARS: { id: Transmission; label: string }[] = [
  { id: "6MT", label: "6단 수동" },
  { id: "8AT", label: "8단 자동" },
  { id: "DCT", label: "DCT" },
  { id: "CVT", label: "CVT" },
  { id: "direct", label: "감속기어" },
];

const VIEWS: { id: StudioView; label: string }[] = [
  { id: "threeq", label: "3/4" },
  { id: "side", label: "측면" },
  { id: "rear", label: "후면" },
  { id: "top", label: "상면" },
];

export function Editor() {
  const garage = useGarage();
  const { selected } = garage;
  const [view, setView] = useState<StudioView>("threeq");
  const [viewToken, setViewToken] = useState(0);
  const [spin, setSpin] = useState(false);
  const body = BODIES[selected.design.bodyType];
  const curveHp = horsepowerFromCurve(selected.engine.torqueCurve);
  const zero = estimateZeroToHundred(body.mass, selected.performance.horsepower, selected.engine.drivetrain, selected.engine.aspiration);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden />
          <div>
            <strong>FORMA</strong>
            <small>차체 스튜디오</small>
          </div>
        </div>
        <input
          className="name"
          aria-label="차량 이름"
          value={selected.name}
          spellCheck={false}
          onChange={(event) => garage.rename(event.target.value)}
        />
        <div className="top-spec num">
          <span>{selected.performance.horsepower} hp</span>
          <span>{selected.performance.topSpeed} km/h</span>
          <span>{zero.toFixed(1)} s</span>
        </div>
      </header>
      <div className="workspace">
        <Library />
        <section className="stage">
          <div className="stage-canvas">
            <Studio vehicle={selected} view={view} viewToken={viewToken} spin={spin} />
          </div>
          <div className="hud hud-top">
            <p>{engineLine(selected.engine)}</p>
            <p className="muted">
              {body.length.toFixed(2)} m · 폭 {body.width.toFixed(2)} m · 높이 {body.height.toFixed(2)} m · 휠베이스 {body.wheelbase.toFixed(2)} m
            </p>
          </div>
          <div className="hud hud-bottom">
            <div className="view-row">
              {VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={view === item.id ? "on" : ""}
                  onClick={() => {
                    setView(item.id);
                    setViewToken((token) => token + 1);
                  }}
                >
                  {item.label}
                </button>
              ))}
              <button type="button" className={spin ? "on" : ""} onClick={() => setSpin((value) => !value)}>
                회전
              </button>
            </div>
            <p className="muted num">
              {selected.design.tireWidthMm}/{selected.design.tireAspect} R{selected.design.rimInches}
            </p>
          </div>
        </section>
        <Inspector curveHp={curveHp} zero={zero} />
      </div>
    </div>
  );
}

function Library() {
  const garage = useGarage();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportGarage = () => {
    const blob = new Blob([JSON.stringify({ version: 1, vehicles: garage.vehicles }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "forma-garage.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as unknown;
      const list = Array.isArray(data) ? data : data && typeof data === "object" && "vehicles" in data ? (data as { vehicles: unknown }).vehicles : [data];
      const vehicles = (Array.isArray(list) ? list : []).filter(isVehicle).map((vehicle) => cloneVehicle(vehicle, vehicle.name));
      if (!vehicles.length) {
        window.alert("읽을 수 있는 차량 데이터가 없습니다.");
        return;
      }
      garage.importVehicles(vehicles);
    } catch {
      window.alert("JSON 파일을 읽지 못했습니다.");
    }
  };

  return (
    <aside className="library">
      <div className="panel-head">
        <h2>차고</h2>
        <span className="num">{garage.vehicles.length}</span>
      </div>
      <button type="button" className="primary" onClick={garage.createNew}>
        새 차량
      </button>
      <p className="hint">새 차량은 베이스 섀시에서 시작합니다. 색, 실루엣, 성능, 엔진은 각각 따로 저장됩니다.</p>
      <div className="cards">
        {garage.vehicles.map((vehicle) => {
          const body = BODIES[vehicle.design.bodyType];
          const active = vehicle.id === garage.selected.id;
          return (
            <button key={vehicle.id} type="button" className={active ? "card on" : "card"} onClick={() => garage.select(vehicle.id)}>
              <span className="chip" style={{ background: vehicle.design.color }} />
              <span>
                <strong>{vehicle.name}</strong>
                <small>
                  {body.label} · {vehicle.performance.horsepower} hp · {vehicle.performance.topSpeed} km/h
                </small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="library-actions">
        <button type="button" onClick={garage.duplicate}>
          복제
        </button>
        <button
          type="button"
          disabled={garage.vehicles.length <= 1}
          onClick={() => {
            if (window.confirm(`"${garage.selected.name}" 차량을 차고에서 삭제할까요?`)) garage.remove();
          }}
        >
          삭제
        </button>
        <button type="button" onClick={exportGarage}>
          내보내기
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          가져오기
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
      </div>
    </aside>
  );
}

function Inspector({ curveHp, zero }: { curveHp: number; zero: number }) {
  const garage = useGarage();
  const { design, performance, engine } = garage.selected;
  const body = BODIES[design.bodyType];
  const electric = engine.aspiration === "electric";

  return (
    <aside className="inspector">
      <Section title="차종" hint="차종을 바꾸면 휠, 라이트, 그릴, 실루엣이 그 패키지의 기본값으로 맞춰집니다.">
        <div className="type-grid">
          {BODY_ORDER.map((type) => (
            <button key={type} type="button" className={design.bodyType === type ? "choice on" : "choice"} onClick={() => garage.setBodyType(type)}>
              <strong>{BODIES[type].label}</strong>
              <small>{BODIES[type].blurb}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section title="실루엣">
        <Slider
          label="곡선에서 각짐"
          min={0}
          max={1}
          step={0.01}
          value={design.angularity}
          format={(value) => `${Math.round(value * 100)}`}
          onChange={(angularity) => garage.patchDesign({ angularity })}
        />
        <div className="ends">
          <span>곡선</span>
          <span>각진</span>
        </div>
      </Section>

      <Section title="도장">
        <div className="swatches">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className={design.color.toLowerCase() === color ? "swatch on" : "swatch"}
              style={{ background: color }}
              aria-label={color}
              onClick={() => garage.patchDesign({ color })}
            />
          ))}
          <label className="swatch custom">
            <input
              type="color"
              value={toColorInput(design.color)}
              aria-label="직접 색상"
              onChange={(event) => garage.patchDesign({ color: event.target.value })}
            />
          </label>
        </div>
        <div className="chips">
          {FINISHES.map((finish) => (
            <button
              key={finish.id}
              type="button"
              className={design.finish === finish.id ? "chip-btn on" : "chip-btn"}
              onClick={() => garage.patchDesign({ finish: finish.id })}
            >
              {finish.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="유리">
        <Slider
          label="썬팅"
          min={0}
          max={1}
          step={0.01}
          value={design.tint}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(tint) => garage.patchDesign({ tint })}
        />
      </Section>

      <Section title="타이어">
        <Slider label="림" min={17} max={23} step={1} value={design.rimInches} format={(value) => `${value} in`} onChange={(rimInches) => garage.patchDesign({ rimInches })} />
        <Slider
          label="폭"
          min={195}
          max={355}
          step={5}
          value={design.tireWidthMm}
          format={(value) => `${value} mm`}
          onChange={(tireWidthMm) => garage.patchDesign({ tireWidthMm })}
        />
        <Slider
          label="편평비"
          min={25}
          max={70}
          step={5}
          value={design.tireAspect}
          format={(value) => `${value}`}
          onChange={(tireAspect) => garage.patchDesign({ tireAspect })}
        />
        <p className="readout num">
          {design.tireWidthMm}/{design.tireAspect} R{design.rimInches}
        </p>
      </Section>

      <Section title="라이트">
        <div className="chips">
          {LIGHTS.map((light) => (
            <button
              key={light.id}
              type="button"
              className={design.lightShape === light.id ? "chip-btn on" : "chip-btn"}
              onClick={() => garage.patchDesign({ lightShape: light.id })}
            >
              {light.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="그릴">
        <div className="chips">
          {GRILLES.map((grille) => (
            <button
              key={grille.id}
              type="button"
              className={design.grilleShape === grille.id ? "chip-btn on" : "chip-btn"}
              onClick={() => garage.patchDesign({ grilleShape: grille.id })}
            >
              {grille.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="성능" hint="마력과 최고속도는 직접 지정합니다. 출력은 브레이크, 배기, 후드 벤트에 반영되고 최고속도는 리어 스포일러에 반영됩니다.">
        <div className="stat-row num">
          <div>
            <b>{performance.horsepower}</b>
            <small>hp</small>
          </div>
          <div>
            <b>{performance.topSpeed}</b>
            <small>km/h</small>
          </div>
          <div>
            <b>{zero.toFixed(1)}</b>
            <small>0-100 추정</small>
          </div>
        </div>
        <NumberField label="마력" value={performance.horsepower} min={40} max={1600} suffix="hp" onChange={(horsepower) => garage.patchPerformance({ horsepower })} />
        <NumberField label="최고속도" value={performance.topSpeed} min={80} max={450} suffix="km/h" onChange={(topSpeed) => garage.patchPerformance({ topSpeed })} />
        <p className="readout">
          공차 {body.mass.toLocaleString()} kg · {(performance.horsepower / (body.mass / 1000)).toFixed(0)} hp/t · 커브 기준 {curveHp} hp
        </p>
        <div className="inline-actions">
          <button type="button" onClick={() => garage.patchPerformance({ horsepower: curveHp })}>
            마력을 커브에 맞추기
          </button>
          <button
            type="button"
            onClick={() =>
              garage.setEngine((current) => withCurve(current, scaleCurveToHorsepower(current.torqueCurve, performance.horsepower)))
            }
          >
            커브를 마력에 맞추기
          </button>
        </div>
      </Section>

      <Section title="엔진" hint="흡기 방식을 바꾸면 토크 커브 프리셋이 다시 적용됩니다. 점은 드래그해서 고칩니다.">
        <label className="field">
          <span>엔진 코드</span>
          <span className="field-box">
            <input value={engine.code} spellCheck={false} onChange={(event) => garage.setEngine((current) => ({ ...current, code: event.target.value }))} />
          </span>
        </label>
        <div className="chips">
          {ASPIRATIONS.map((item) => (
            <button key={item.id} type="button" className={engine.aspiration === item.id ? "chip-btn on" : "chip-btn"} onClick={() => garage.setAspiration(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {electric ? (
          <NumberField
            label="배터리"
            value={engine.batteryKwh}
            min={20}
            max={200}
            suffix="kWh"
            onChange={(batteryKwh) => garage.setEngine((current) => ({ ...current, batteryKwh }))}
          />
        ) : (
          <div className="split">
            <NumberField
              label="배기량"
              value={engine.displacement}
              min={0.6}
              max={8}
              suffix="L"
              onChange={(displacement) => garage.setEngine((current) => ({ ...current, displacement: Math.round(displacement * 10) / 10 }))}
            />
            <div className="field">
              <span>기통</span>
              <div className="chips tight">
                {[3, 4, 6, 8, 10, 12].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={engine.cylinders === count ? "chip-btn on" : "chip-btn"}
                    onClick={() => garage.setEngine((current) => ({ ...current, cylinders: count }))}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <NumberField
          label="최대 토크"
          value={engine.torqueNm}
          min={50}
          max={1600}
          suffix="Nm"
          onChange={(torqueNm) => garage.setEngine((current) => ({ ...current, torqueNm, torqueCurve: scaleCurveToPeak(current.torqueCurve, torqueNm) }))}
        />
        <NumberField
          label="레드라인"
          value={engine.redline}
          min={3000}
          max={20000}
          suffix="rpm"
          onChange={(redline) =>
            garage.setEngine((current) => ({
              ...current,
              redline,
              torqueCurve: current.torqueCurve.map((point, index) => ({
                ...point,
                rpm: index === current.torqueCurve.length - 1 ? redline : Math.min(point.rpm, redline - 100),
              })),
            }))
          }
        />
        <TorqueCurve curve={engine.torqueCurve} redline={engine.redline} onChange={(torqueCurve) => garage.setEngine((current) => withCurve(current, torqueCurve))} />
        <div className="field">
          <span>구동</span>
          <div className="chips">
            {DRIVES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={engine.drivetrain === item.id ? "chip-btn on" : "chip-btn"}
                onClick={() => garage.setEngine((current) => ({ ...current, drivetrain: item.id }))}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>변속</span>
          <span className="field-box">
            <select
              value={engine.transmission}
              onChange={(event) => garage.setEngine((current) => ({ ...current, transmission: event.target.value as Transmission }))}
            >
              {GEARS.map((gear) => (
                <option key={gear.id} value={gear.id}>
                  {gear.label}
                </option>
              ))}
            </select>
          </span>
        </label>
      </Section>
    </aside>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="section">
      <header>
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span className="slider-top">
        <span>{label}</span>
        <span className="num">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ background: `linear-gradient(90deg, #e4d2b0 ${pct}%, #2c3038 ${pct}%)` }}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
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
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-box">
        <input
          className="num"
          value={text}
          inputMode="decimal"
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <em>{suffix}</em>
      </span>
    </label>
  );
}

function engineLine(engine: EngineSpec) {
  const drive = DRIVES.find((item) => item.id === engine.drivetrain)?.label ?? engine.drivetrain;
  const gear = GEARS.find((item) => item.id === engine.transmission)?.label ?? engine.transmission;
  const aspiration = ASPIRATIONS.find((item) => item.id === engine.aspiration)?.label ?? engine.aspiration;
  if (engine.aspiration === "electric") return `${engine.code} · ${engine.batteryKwh} kWh · ${drive} · ${gear}`;
  return `${engine.code} · ${engine.displacement.toFixed(1)}L ${engine.cylinders}기통 ${aspiration} · ${drive} · ${gear}`;
}

function toColorInput(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#c5c8ce";
}

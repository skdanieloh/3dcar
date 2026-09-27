import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TorquePoint } from "../domain/types";

type Props = {
  curve: TorquePoint[];
  redline: number;
  onChange: (curve: TorquePoint[]) => void;
};

const WIDTH = 320;
const HEIGHT = 168;
const LEFT = 36;
const RIGHT = 12;
const TOP = 14;
const BOTTOM = 26;

export function TorqueCurve({ curve, redline, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const peak = Math.max(80, ...curve.map((point) => point.torque));
  const maxTorque = peak * 1.18;
  const limit = Math.max(redline, 1000);

  const xOf = (rpm: number) => LEFT + (rpm / limit) * (WIDTH - LEFT - RIGHT);
  const yOf = (torque: number) => TOP + (1 - torque / maxTorque) * (HEIGHT - TOP - BOTTOM);
  const points = curve.map((point) => ({ ...point, x: xOf(point.rpm), y: yOf(point.torque) }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${LEFT},${HEIGHT - BOTTOM} ${line} ${WIDTH - RIGHT},${HEIGHT - BOTTOM}`;

  const updateAt = (index: number, clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const mapped = svg.createSVGPoint();
    mapped.x = clientX;
    mapped.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = mapped.matrixTransform(ctm.inverse());
    const rpmSpan = WIDTH - LEFT - RIGHT;
    const torqueSpan = HEIGHT - TOP - BOTTOM;
    let rpm = ((local.x - LEFT) / rpmSpan) * limit;
    let torque = (1 - (local.y - TOP) / torqueSpan) * maxTorque;
    const prev = curve[index - 1]?.rpm ?? 0;
    const next = curve[index + 1]?.rpm ?? limit;
    if (index === 0) rpm = Math.max(0, Math.min(rpm, next - 80));
    else if (index === curve.length - 1) rpm = limit;
    else rpm = Math.max(prev + 80, Math.min(rpm, next - 80));
    torque = Math.max(0, Math.min(maxTorque, torque));
    const nextCurve = curve.map((point, pointIndex) =>
      pointIndex === index ? { rpm: Math.round(rpm), torque: Math.round(torque) } : point,
    );
    onChange(nextCurve);
  };

  const onPointerDown = (index: number) => (event: ReactPointerEvent<SVGCircleElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(index);
    updateAt(index, event.clientX, event.clientY);
  };
  const onPointerMove = (index: number) => (event: ReactPointerEvent<SVGCircleElement>) => {
    if (active !== index) return;
    updateAt(index, event.clientX, event.clientY);
  };

  return (
    <svg
      ref={svgRef}
      className="curve"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="토크 커브"
    >
      {[0.25, 0.5, 0.75, 1].map((mark) => (
        <line
          key={mark}
          x1={LEFT}
          x2={WIDTH - RIGHT}
          y1={TOP + (1 - mark) * (HEIGHT - TOP - BOTTOM)}
          y2={TOP + (1 - mark) * (HEIGHT - TOP - BOTTOM)}
          className="curve-grid"
        />
      ))}
      <polygon points={area} className="curve-area" />
      <polyline points={line} className="curve-line" />
      {points.map((point, index) => (
        <circle
          key={`${point.rpm}-${index}`}
          cx={point.x}
          cy={point.y}
          r={active === index ? 6 : 4.5}
          className="curve-point"
          onPointerDown={onPointerDown(index)}
          onPointerMove={onPointerMove(index)}
          onPointerUp={() => setActive(null)}
        />
      ))}
      <text x={LEFT} y={HEIGHT - 8} className="curve-label">
        0
      </text>
      <text x={WIDTH - RIGHT} y={HEIGHT - 8} textAnchor="end" className="curve-label">
        {limit.toLocaleString()} rpm
      </text>
    </svg>
  );
}

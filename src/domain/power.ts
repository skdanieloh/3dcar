import type { Aspiration, TorquePoint } from "./types";

export function templateCurve(aspiration: Aspiration, torque: number, redline: number): TorquePoint[] {
  const peak = Math.max(40, torque);
  const limit = Math.max(1000, redline);
  if (aspiration === "electric") {
    return [
      { rpm: 0, torque: peak },
      { rpm: Math.round(limit * 0.22), torque: peak },
      { rpm: Math.round(limit * 0.5), torque: Math.round(peak * 0.7) },
      { rpm: Math.round(limit * 0.78), torque: Math.round(peak * 0.38) },
      { rpm: limit, torque: Math.round(peak * 0.2) },
    ];
  }
  if (aspiration === "na") {
    return [
      { rpm: 1000, torque: Math.round(peak * 0.42) },
      { rpm: Math.round(limit * 0.35), torque: Math.round(peak * 0.7) },
      { rpm: Math.round(limit * 0.55), torque: Math.round(peak * 0.9) },
      { rpm: Math.round(limit * 0.78), torque: peak },
      { rpm: Math.round(limit * 0.9), torque: Math.round(peak * 0.96) },
      { rpm: limit, torque: Math.round(peak * 0.88) },
    ];
  }
  return [
    { rpm: 1000, torque: Math.round(peak * 0.4) },
    { rpm: Math.min(1800, Math.round(limit * 0.28)), torque: Math.round(peak * 0.86) },
    { rpm: Math.round(limit * 0.45), torque: peak },
    { rpm: Math.round(limit * 0.68), torque: Math.round(peak * 0.94) },
    { rpm: Math.round(limit * 0.84), torque: Math.round(peak * 0.78) },
    { rpm: limit, torque: Math.round(peak * 0.62) },
  ];
}

/** Mechanical horsepower from Nm and rpm. */
export function horsepowerFromCurve(curve: TorquePoint[]) {
  let max = 0;
  for (const point of curve) {
    const hp = (point.torque * point.rpm) / 7121;
    if (hp > max) max = hp;
  }
  return Math.round(max);
}

export function scaleCurveToPeak(curve: TorquePoint[], peak: number) {
  const current = Math.max(...curve.map((point) => point.torque), 1);
  const gain = peak / current;
  return curve.map((point) => ({ ...point, torque: Math.max(0, Math.round(point.torque * gain)) }));
}

export function scaleCurveToHorsepower(curve: TorquePoint[], horsepower: number) {
  const current = Math.max(horsepowerFromCurve(curve), 1);
  const gain = horsepower / current;
  return curve.map((point) => ({ ...point, torque: Math.max(0, Math.round(point.torque * gain)) }));
}

export function estimateZeroToHundred(mass: number, horsepower: number, drivetrain: string, aspiration: Aspiration) {
  let seconds = (mass / Math.max(50, horsepower)) * 0.84;
  if (drivetrain === "AWD") seconds *= 0.92;
  if (drivetrain === "FWD") seconds *= 1.05;
  if (aspiration === "electric") seconds *= 0.82;
  return Math.max(2.2, seconds);
}

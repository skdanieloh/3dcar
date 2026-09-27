import type { BodyType, GrilleShape, LightShape } from "./types";

export type Keyframe = {
  u: number;
  center: number;
  shoulder: number;
  lower: number;
  halfW: number;
};

export type BodyDef = {
  type: BodyType;
  label: string;
  blurb: string;
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  frontAxleU: number;
  rearAxleU: number;
  beltY: number;
  roofY: number;
  cowlY: number;
  trunkY: number;
  hoodY: number;
  roofRearU: number;
  roofFrontU: number;
  cowlU: number;
  rearGlassU: number;
  /** How far the glass tucks in from the shoulder. */
  tumble: number;
  /** Roof half-width as a fraction of the local half-width. */
  roofWidth: number;
  archGap: number;
  mass: number;
  keys: Keyframe[];
  recommend: {
    angularity: number;
    rimInches: number;
    tireWidthMm: number;
    tireAspect: number;
    lightShape: LightShape;
    grilleShape: GrilleShape;
  };
};

/**
 * Proportions follow production-car packages, not a single blob scaled per type.
 * u = 0 at the rear bumper face and 1 at the nose. Y is up. Dimensions are meters.
 * Shoulder above the hood center is intentional: fenders stand proud of the bonnet.
 */
export const BODIES: Record<BodyType, BodyDef> = {
  sedan: {
    type: "sedan",
    label: "세단",
    blurb: "긴 휠베이스와 노치백",
    length: 4.96,
    width: 1.88,
    height: 1.46,
    wheelbase: 2.94,
    frontAxleU: 0.815,
    rearAxleU: 0.222,
    beltY: 0.96,
    roofY: 1.45,
    cowlY: 1.02,
    trunkY: 0.88,
    hoodY: 0.8,
    roofRearU: 0.42,
    roofFrontU: 0.61,
    cowlU: 0.72,
    rearGlassU: 0.32,
    tumble: 0.55,
    roofWidth: 0.52,
    archGap: 0.03,
    mass: 1740,
    recommend: {
      angularity: 0.32,
      rimInches: 19,
      tireWidthMm: 245,
      tireAspect: 40,
      lightShape: "blade",
      grilleShape: "slats",
    },
    keys: [
      { u: 0, center: 0.5, shoulder: 0.48, lower: 0.3, halfW: 0.72 },
      { u: 0.05, center: 0.74, shoulder: 0.68, lower: 0.26, halfW: 0.84 },
      { u: 0.12, center: 0.88, shoulder: 0.84, lower: 0.22, halfW: 0.9 },
      { u: 0.22, center: 0.9, shoulder: 0.88, lower: 0.2, halfW: 0.95 },
      { u: 0.3, center: 0.9, shoulder: 0.94, lower: 0.2, halfW: 0.92 },
      { u: 0.35, center: 1.16, shoulder: 0.96, lower: 0.2, halfW: 0.91 },
      { u: 0.42, center: 1.44, shoulder: 0.97, lower: 0.2, halfW: 0.9 },
      { u: 0.52, center: 1.46, shoulder: 0.98, lower: 0.2, halfW: 0.89 },
      { u: 0.61, center: 1.44, shoulder: 0.99, lower: 0.2, halfW: 0.9 },
      { u: 0.66, center: 1.18, shoulder: 0.99, lower: 0.2, halfW: 0.91 },
      { u: 0.72, center: 0.96, shoulder: 1.0, lower: 0.2, halfW: 0.92 },
      { u: 0.82, center: 0.82, shoulder: 0.96, lower: 0.21, halfW: 0.96 },
      { u: 0.93, center: 0.74, shoulder: 0.82, lower: 0.28, halfW: 0.92 },
      { u: 1, center: 0.52, shoulder: 0.56, lower: 0.3, halfW: 0.88 },
    ],
  },
  suv: {
    type: "suv",
    label: "SUV",
    blurb: "높은 벨트, 곧은 필러",
    length: 4.94,
    width: 1.98,
    height: 1.78,
    wheelbase: 2.96,
    frontAxleU: 0.818,
    rearAxleU: 0.219,
    beltY: 1.16,
    roofY: 1.76,
    cowlY: 1.2,
    trunkY: 1.12,
    hoodY: 1.0,
    roofRearU: 0.3,
    roofFrontU: 0.7,
    cowlU: 0.77,
    rearGlassU: 0.16,
    tumble: 0.28,
    roofWidth: 0.7,
    archGap: 0.05,
    mass: 2180,
    recommend: {
      angularity: 0.74,
      rimInches: 20,
      tireWidthMm: 275,
      tireAspect: 50,
      lightShape: "vertical",
      grilleShape: "shield",
    },
    keys: [
      { u: 0, center: 0.66, shoulder: 0.62, lower: 0.38, halfW: 0.8 },
      { u: 0.06, center: 1.02, shoulder: 0.94, lower: 0.34, halfW: 0.94 },
      { u: 0.14, center: 1.16, shoulder: 1.08, lower: 0.32, halfW: 0.98 },
      { u: 0.22, center: 1.22, shoulder: 1.14, lower: 0.3, halfW: 1.01 },
      { u: 0.32, center: 1.7, shoulder: 1.16, lower: 0.3, halfW: 0.98 },
      { u: 0.5, center: 1.78, shoulder: 1.17, lower: 0.3, halfW: 0.97 },
      { u: 0.7, center: 1.76, shoulder: 1.18, lower: 0.3, halfW: 0.98 },
      { u: 0.77, center: 1.2, shoulder: 1.16, lower: 0.31, halfW: 1.0 },
      { u: 0.86, center: 1.02, shoulder: 1.1, lower: 0.34, halfW: 1.02 },
      { u: 0.94, center: 0.94, shoulder: 0.98, lower: 0.36, halfW: 0.98 },
      { u: 1, center: 0.64, shoulder: 0.68, lower: 0.38, halfW: 0.94 },
    ],
  },
  coupe: {
    type: "coupe",
    label: "쿠페",
    blurb: "낮은 루프, 긴 패스트백",
    length: 4.78,
    width: 1.9,
    height: 1.38,
    wheelbase: 2.82,
    frontAxleU: 0.799,
    rearAxleU: 0.209,
    beltY: 0.9,
    roofY: 1.37,
    cowlY: 0.98,
    trunkY: 0.8,
    hoodY: 0.72,
    roofRearU: 0.46,
    roofFrontU: 0.6,
    cowlU: 0.69,
    rearGlassU: 0.18,
    tumble: 0.7,
    roofWidth: 0.46,
    archGap: 0.026,
    mass: 1680,
    recommend: {
      angularity: 0.26,
      rimInches: 20,
      tireWidthMm: 265,
      tireAspect: 35,
      lightShape: "claw",
      grilleShape: "mesh",
    },
    keys: [
      { u: 0, center: 0.44, shoulder: 0.42, lower: 0.24, halfW: 0.7 },
      { u: 0.06, center: 0.7, shoulder: 0.64, lower: 0.19, halfW: 0.86 },
      { u: 0.16, center: 0.82, shoulder: 0.8, lower: 0.17, halfW: 0.94 },
      { u: 0.24, center: 0.9, shoulder: 0.88, lower: 0.16, halfW: 0.98 },
      { u: 0.36, center: 1.16, shoulder: 0.92, lower: 0.16, halfW: 0.94 },
      { u: 0.5, center: 1.38, shoulder: 0.93, lower: 0.16, halfW: 0.92 },
      { u: 0.6, center: 1.36, shoulder: 0.95, lower: 0.16, halfW: 0.93 },
      { u: 0.69, center: 0.98, shoulder: 0.96, lower: 0.17, halfW: 0.95 },
      { u: 0.8, center: 0.74, shoulder: 0.9, lower: 0.18, halfW: 0.98 },
      { u: 0.92, center: 0.66, shoulder: 0.74, lower: 0.24, halfW: 0.92 },
      { u: 1, center: 0.44, shoulder: 0.48, lower: 0.26, halfW: 0.86 },
    ],
  },
  hatchback: {
    type: "hatchback",
    label: "해치백",
    blurb: "짧은 오버행, 높은 해치",
    length: 4.32,
    width: 1.8,
    height: 1.48,
    wheelbase: 2.62,
    frontAxleU: 0.806,
    rearAxleU: 0.199,
    beltY: 1.0,
    roofY: 1.47,
    cowlY: 1.04,
    trunkY: 0.96,
    hoodY: 0.82,
    roofRearU: 0.34,
    roofFrontU: 0.58,
    cowlU: 0.67,
    rearGlassU: 0.14,
    tumble: 0.4,
    roofWidth: 0.58,
    archGap: 0.032,
    mass: 1390,
    recommend: {
      angularity: 0.42,
      rimInches: 18,
      tireWidthMm: 225,
      tireAspect: 45,
      lightShape: "twin",
      grilleShape: "diamond",
    },
    keys: [
      { u: 0, center: 0.58, shoulder: 0.52, lower: 0.28, halfW: 0.68 },
      { u: 0.08, center: 0.96, shoulder: 0.86, lower: 0.22, halfW: 0.84 },
      { u: 0.16, center: 1.14, shoulder: 0.98, lower: 0.2, halfW: 0.89 },
      { u: 0.28, center: 1.4, shoulder: 1.01, lower: 0.2, halfW: 0.87 },
      { u: 0.46, center: 1.48, shoulder: 1.02, lower: 0.2, halfW: 0.86 },
      { u: 0.58, center: 1.46, shoulder: 1.02, lower: 0.2, halfW: 0.87 },
      { u: 0.67, center: 1.04, shoulder: 1.02, lower: 0.2, halfW: 0.89 },
      { u: 0.8, center: 0.82, shoulder: 0.92, lower: 0.22, halfW: 0.91 },
      { u: 0.92, center: 0.72, shoulder: 0.78, lower: 0.26, halfW: 0.86 },
      { u: 1, center: 0.48, shoulder: 0.5, lower: 0.28, halfW: 0.8 },
    ],
  },
  wagon: {
    type: "wagon",
    label: "왜건",
    blurb: "세단 앞모습, 연장된 루프",
    length: 4.98,
    width: 1.88,
    height: 1.5,
    wheelbase: 2.96,
    frontAxleU: 0.815,
    rearAxleU: 0.221,
    beltY: 0.98,
    roofY: 1.49,
    cowlY: 1.04,
    trunkY: 1.08,
    hoodY: 0.8,
    roofRearU: 0.18,
    roofFrontU: 0.62,
    cowlU: 0.71,
    rearGlassU: 0.07,
    tumble: 0.42,
    roofWidth: 0.6,
    archGap: 0.03,
    mass: 1820,
    recommend: {
      angularity: 0.36,
      rimInches: 19,
      tireWidthMm: 245,
      tireAspect: 45,
      lightShape: "blade",
      grilleShape: "slats",
    },
    keys: [
      { u: 0, center: 0.62, shoulder: 0.56, lower: 0.28, halfW: 0.74 },
      { u: 0.06, center: 1.05, shoulder: 0.9, lower: 0.24, halfW: 0.88 },
      { u: 0.14, center: 1.42, shoulder: 0.98, lower: 0.21, halfW: 0.92 },
      { u: 0.22, center: 1.48, shoulder: 1.0, lower: 0.2, halfW: 0.95 },
      { u: 0.4, center: 1.5, shoulder: 1.0, lower: 0.2, halfW: 0.9 },
      { u: 0.62, center: 1.48, shoulder: 1.01, lower: 0.2, halfW: 0.91 },
      { u: 0.71, center: 1.04, shoulder: 1.02, lower: 0.2, halfW: 0.93 },
      { u: 0.82, center: 0.82, shoulder: 0.96, lower: 0.21, halfW: 0.96 },
      { u: 0.93, center: 0.74, shoulder: 0.82, lower: 0.28, halfW: 0.92 },
      { u: 1, center: 0.52, shoulder: 0.56, lower: 0.3, halfW: 0.88 },
    ],
  },
  sports: {
    type: "sports",
    label: "스포츠",
    blurb: "넓은 펜더, 낮은 후드",
    length: 4.56,
    width: 1.98,
    height: 1.24,
    wheelbase: 2.62,
    frontAxleU: 0.776,
    rearAxleU: 0.202,
    beltY: 0.82,
    roofY: 1.24,
    cowlY: 0.8,
    trunkY: 0.74,
    hoodY: 0.64,
    roofRearU: 0.42,
    roofFrontU: 0.54,
    cowlU: 0.63,
    rearGlassU: 0.16,
    tumble: 0.62,
    roofWidth: 0.42,
    archGap: 0.02,
    mass: 1540,
    recommend: {
      angularity: 0.5,
      rimInches: 21,
      tireWidthMm: 305,
      tireAspect: 30,
      lightShape: "claw",
      grilleShape: "mesh",
    },
    keys: [
      { u: 0, center: 0.4, shoulder: 0.38, lower: 0.2, halfW: 0.72 },
      { u: 0.06, center: 0.64, shoulder: 0.6, lower: 0.15, halfW: 0.9 },
      { u: 0.14, center: 0.74, shoulder: 0.78, lower: 0.14, halfW: 1.0 },
      { u: 0.22, center: 0.8, shoulder: 0.9, lower: 0.14, halfW: 1.04 },
      { u: 0.34, center: 1.08, shoulder: 0.86, lower: 0.14, halfW: 0.98 },
      { u: 0.46, center: 1.24, shoulder: 0.84, lower: 0.14, halfW: 0.95 },
      { u: 0.54, center: 1.22, shoulder: 0.86, lower: 0.14, halfW: 0.96 },
      { u: 0.64, center: 0.76, shoulder: 0.9, lower: 0.14, halfW: 1.0 },
      { u: 0.78, center: 0.64, shoulder: 0.88, lower: 0.15, halfW: 1.02 },
      { u: 0.9, center: 0.56, shoulder: 0.7, lower: 0.2, halfW: 0.96 },
      { u: 1, center: 0.38, shoulder: 0.42, lower: 0.22, halfW: 0.88 },
    ],
  },
};

export const BODY_ORDER: BodyType[] = ["sedan", "suv", "coupe", "hatchback", "wagon", "sports"];

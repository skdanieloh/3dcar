export type BodyType = "sedan" | "suv" | "coupe" | "hatchback" | "wagon" | "sports";

export type LightShape = "blade" | "twin" | "round" | "vertical" | "claw";

export type GrilleShape = "slats" | "mesh" | "vertical" | "shield" | "closed" | "diamond";

export type PaintFinish = "gloss" | "metallic" | "satin" | "matte";

export type Aspiration = "na" | "turbo" | "twinTurbo" | "supercharged" | "hybrid" | "electric";

export type Drivetrain = "FWD" | "RWD" | "AWD";

export type Transmission = "6MT" | "8AT" | "DCT" | "CVT" | "direct";

export type TorquePoint = {
  rpm: number;
  torque: number;
};

export type DesignSpec = {
  bodyType: BodyType;
  color: string;
  finish: PaintFinish;
  /** 0 is fully curved, 1 is creased and flat-faced. */
  angularity: number;
  /** 0 is clear glass, 1 is limo tint. */
  tint: number;
  rimInches: number;
  tireWidthMm: number;
  tireAspect: number;
  lightShape: LightShape;
  grilleShape: GrilleShape;
};

export type PerformanceSpec = {
  topSpeed: number;
  horsepower: number;
};

export type EngineSpec = {
  code: string;
  displacement: number;
  cylinders: number;
  aspiration: Aspiration;
  torqueNm: number;
  redline: number;
  drivetrain: Drivetrain;
  transmission: Transmission;
  batteryKwh: number;
  torqueCurve: TorquePoint[];
};

export type Vehicle = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  design: DesignSpec;
  performance: PerformanceSpec;
  engine: EngineSpec;
};

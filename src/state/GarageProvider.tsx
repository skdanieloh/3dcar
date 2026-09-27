import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BODIES } from "../domain/bodies";
import { applyBodyType, cloneVehicle, createBaseVehicle, engineForAspiration } from "../domain/factory";
import type { Aspiration, DesignSpec, EngineSpec, PerformanceSpec, Vehicle } from "../domain/types";

const STORAGE_KEY = "forma.garage.v1";

type Garage = {
  vehicles: Vehicle[];
  selected: Vehicle;
  select: (id: string) => void;
  rename: (name: string) => void;
  createNew: () => void;
  duplicate: () => void;
  remove: () => void;
  importVehicles: (vehicles: Vehicle[]) => void;
  patchDesign: (patch: Partial<DesignSpec>) => void;
  setBodyType: (type: DesignSpec["bodyType"]) => void;
  patchPerformance: (patch: Partial<PerformanceSpec>) => void;
  setAspiration: (aspiration: Aspiration) => void;
  setEngine: (recipe: (engine: EngineSpec) => EngineSpec) => void;
};

const GarageContext = createContext<Garage | null>(null);

export function GarageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadGarage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, selectedId: state.selectedId, vehicles: state.vehicles }));
  }, [state]);

  const api = useMemo<Garage>(() => {
    const selected = state.vehicles.find((vehicle) => vehicle.id === state.selectedId) ?? state.vehicles[0];
    const update = (recipe: (vehicle: Vehicle) => Vehicle) => {
      setState((current) => ({
        ...current,
        vehicles: current.vehicles.map((vehicle) =>
          vehicle.id === current.selectedId ? { ...recipe(vehicle), updatedAt: Date.now() } : vehicle,
        ),
      }));
    };
    return {
      vehicles: state.vehicles,
      selected,
      select: (id) => setState((current) => ({ ...current, selectedId: id })),
      rename: (name) => update((vehicle) => ({ ...vehicle, name })),
      createNew: () => {
        const vehicle = createBaseVehicle(`차량 ${state.vehicles.length + 1}`);
        setState((current) => ({ vehicles: [...current.vehicles, vehicle], selectedId: vehicle.id }));
      },
      duplicate: () => {
        const vehicle = cloneVehicle(selected, `${selected.name} 사본`);
        setState((current) => ({ vehicles: [...current.vehicles, vehicle], selectedId: vehicle.id }));
      },
      remove: () => {
        setState((current) => {
          if (current.vehicles.length <= 1) return current;
          const vehicles = current.vehicles.filter((vehicle) => vehicle.id !== current.selectedId);
          return { vehicles, selectedId: vehicles[0].id };
        });
      },
      importVehicles: (vehicles) => {
        if (!vehicles.length) return;
        setState((current) => ({
          vehicles: [...current.vehicles, ...vehicles],
          selectedId: vehicles[0].id,
        }));
      },
      patchDesign: (patch) => update((vehicle) => ({ ...vehicle, design: { ...vehicle.design, ...patch } })),
      setBodyType: (type) => update((vehicle) => ({ ...vehicle, design: applyBodyType(vehicle.design, type) })),
      patchPerformance: (patch) =>
        update((vehicle) => ({ ...vehicle, performance: { ...vehicle.performance, ...patch } })),
      setAspiration: (aspiration) =>
        update((vehicle) => ({ ...vehicle, engine: engineForAspiration(vehicle.engine, aspiration) })),
      setEngine: (recipe) => update((vehicle) => ({ ...vehicle, engine: recipe(vehicle.engine) })),
    };
  }, [state, selectedIdOf(state)]);

  return <GarageContext.Provider value={api}>{children}</GarageContext.Provider>;
}

function selectedIdOf(state: { selectedId: string; vehicles: Vehicle[] }) {
  return `${state.selectedId}:${state.vehicles.map((vehicle) => vehicle.updatedAt).join(",")}`;
}

export function useGarage() {
  const garage = useContext(GarageContext);
  if (!garage) throw new Error("GarageProvider가 필요합니다.");
  return garage;
}

function loadGarage() {
  const fresh = () => {
    const base = createBaseVehicle();
    return { vehicles: [base], selectedId: base.id };
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as { version?: number; vehicles?: unknown; selectedId?: string };
    if (data.version !== 1 || !Array.isArray(data.vehicles)) return fresh();
    const vehicles = data.vehicles.filter(isVehicle);
    if (!vehicles.length) return fresh();
    const selectedId = vehicles.some((vehicle) => vehicle.id === data.selectedId) ? data.selectedId! : vehicles[0].id;
    return { vehicles, selectedId };
  } catch {
    return fresh();
  }
}

export function isVehicle(value: unknown): value is Vehicle {
  if (!value || typeof value !== "object") return false;
  const vehicle = value as Vehicle;
  return (
    typeof vehicle.id === "string" &&
    typeof vehicle.name === "string" &&
    !!vehicle.design &&
    vehicle.design.bodyType in BODIES &&
    typeof vehicle.design.color === "string" &&
    !!vehicle.performance &&
    typeof vehicle.performance.horsepower === "number" &&
    typeof vehicle.performance.topSpeed === "number" &&
    !!vehicle.engine &&
    Array.isArray(vehicle.engine.torqueCurve)
  );
}

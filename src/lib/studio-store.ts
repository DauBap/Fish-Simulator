import { create } from "zustand";

export type Category = "rocks" | "wood" | "plants" | "fish" | "equipment";
export type ObjectKind = "rock" | "wood" | "plant" | "fish" | "equipment";
export type CabinetStyle = "modern" | "frame" | "glass";
export type Finish = "oak" | "walnut" | "black" | "white";
export type LightMode = "bar" | "pendant";
export type TransformMode = "translate" | "rotate" | "scale";

export type CatalogItem = {
  id: string;
  name: string;
  category: Category;
  kind: ObjectKind;
  color: string;
  count: number;
  price: number;
  detail: string;
};

export type PlacedObject = {
  id: string;
  itemId: string;
  name: string;
  kind: ObjectKind;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
};

export type StudioState = {
  tank: { length: number; width: number; height: number };
  cabinet: { style: CabinetStyle; height: number; finish: Finish };
  lightMode: LightMode;
  showGuides: boolean;
  category: Category;
  search: string;
  inventory: CatalogItem[];
  shopOpen: boolean;
  selectedId: string | null;
  transformMode: TransformMode;
  objects: PlacedObject[];
  toast: string | null;
  setCategory: (category: Category) => void;
  setSearch: (search: string) => void;
  setTank: (tank: Partial<StudioState["tank"]>) => void;
  setCabinet: (cabinet: Partial<StudioState["cabinet"]>) => void;
  setLightMode: (mode: LightMode) => void;
  setShowGuides: (show: boolean) => void;
  setShopOpen: (open: boolean) => void;
  setSelected: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  placeItem: (item: CatalogItem) => void;
  purchaseItem: (item: CatalogItem) => void;
  updateObject: (id: string, update: Partial<PlacedObject>) => void;
  clearToast: () => void;
};

const starterInventory: CatalogItem[] = [
  { id: "seiryu", name: "Seiryu Stone", category: "rocks", kind: "rock", color: "#817d70", count: 8, price: 12, detail: "M · 12–18 cm" },
  { id: "lava-rock", name: "Lava Rock", category: "rocks", kind: "rock", color: "#474a3d", count: 5, price: 8, detail: "S · porous basalt" },
  { id: "river-stone", name: "River Pebble", category: "rocks", kind: "rock", color: "#9a8b72", count: 12, price: 5, detail: "S · smooth texture" },
  { id: "spiderwood", name: "Spider Wood", category: "wood", kind: "wood", color: "#987253", count: 3, price: 18, detail: "M · 20–30 cm" },
  { id: "mangrove", name: "Mopani Branch", category: "wood", kind: "wood", color: "#654b38", count: 2, price: 22, detail: "M · branching form" },
  { id: "anubias", name: "Anubias Nana", category: "plants", kind: "plant", color: "#58774b", count: 8, price: 9, detail: "Foreground · low light" },
  { id: "monte-carlo", name: "Monte Carlo", category: "plants", kind: "plant", color: "#82a35d", count: 6, price: 11, detail: "Carpet · medium light" },
  { id: "rotala", name: "Rotala H'ra", category: "plants", kind: "plant", color: "#a46250", count: 5, price: 10, detail: "Stem · background" },
  { id: "ember-tetra", name: "Ember Tetra", category: "fish", kind: "fish", color: "#d88a50", count: 12, price: 6, detail: "School · peaceful" },
  { id: "rasbora", name: "Harlequin Rasbora", category: "fish", kind: "fish", color: "#d9a75f", count: 8, price: 8, detail: "School · mid-water" },
  { id: "bar-light", name: "Luma LED Bar", category: "equipment", kind: "equipment", color: "#d9c787", count: 1, price: 44, detail: "600 mm · 6500K" },
  { id: "canister", name: "Flow 300 Filter", category: "equipment", kind: "equipment", color: "#73927c", count: 1, price: 56, detail: "Canister · 300 L/h" },
];

let toastTimer: ReturnType<typeof setTimeout> | undefined;
const keepInRange = (value: number, min: number, max: number) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value));

export function constrainObjectToTank(object: PlacedObject, tank: StudioState["tank"]): PlacedObject {
  const dimensions = {
    rock: { x: 0.17, y: 0.12, z: 0.14, anchored: false, nestedScale: true },
    wood: { x: 0.24, y: 0.42, z: 0.08, anchored: true, nestedScale: true },
    plant: { x: 0.12, y: 0.42, z: 0.12, anchored: true, nestedScale: true },
    fish: { x: 0.2, y: 0.1, z: 0.15, anchored: false, nestedScale: false },
    equipment: { x: 0.08, y: 0.025, z: 0.025, anchored: false, nestedScale: false },
  }[object.kind];
  const halfLength = tank.length / 200;
  const halfWidth = tank.width / 200;
  const halfHeight = tank.height / 200;
  const scalePower = dimensions.nestedScale ? 2 : 1;
  const fitScale = (extent: number, available: number) => Math.pow(Math.max(0.01, available / extent), 1 / scalePower);
  const scale = Math.min(
    object.scale,
    fitScale(dimensions.x, halfLength - 0.008),
    fitScale(dimensions.z, halfWidth - 0.008),
    fitScale(dimensions.y, tank.height / 100 - 0.08),
  );
  const size = Math.pow(scale, scalePower);
  const xLimit = Math.max(0, halfLength - dimensions.x * size);
  const zLimit = Math.max(0, halfWidth - dimensions.z * size);
  const yMin = dimensions.anchored ? -halfHeight + 0.075 : -halfHeight + dimensions.y * size + (object.kind === "rock" ? 0.075 : 0);
  const yMax = halfHeight - dimensions.y * size;

  return {
    ...object,
    scale,
    position: [
      keepInRange(object.position[0], -xLimit, xLimit),
      keepInRange(object.position[1], yMin, yMax),
      keepInRange(object.position[2], -zLimit, zLimit),
    ],
  };
}

const withToast = (message: string, set: (partial: Partial<StudioState>) => void) => {
  set({ toast: message });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toast: null }), 2200);
};

export const useStudioStore = create<StudioState>((set, get) => ({
  tank: { length: 60, width: 30, height: 30 },
  cabinet: { style: "modern", height: 76, finish: "oak" },
  lightMode: "bar",
  showGuides: false,
  category: "rocks",
  search: "",
  inventory: starterInventory,
  shopOpen: false,
  selectedId: null,
  transformMode: "translate",
  objects: [],
  toast: null,
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
  setTank: (tank) => set((state) => {
    const nextTank = { ...state.tank, ...tank };
    return { tank: nextTank, objects: state.objects.map((object) => constrainObjectToTank(object, nextTank)) };
  }),
  setCabinet: (cabinet) => set((state) => ({ cabinet: { ...state.cabinet, ...cabinet } })),
  setLightMode: (lightMode) => set({ lightMode }),
  setShowGuides: (showGuides) => set({ showGuides }),
  setShopOpen: (shopOpen) => set({ shopOpen }),
  setSelected: (selectedId) => set({ selectedId }),
  setTransformMode: (transformMode) => set({ transformMode }),
  placeItem: (item) => {
    const stock = get().inventory.find((entry) => entry.id === item.id);
    if (!stock || stock.count < 1) {
      withToast("Out of stock. Visit the store to restock.", set);
      return;
    }
    const id = `${item.id}-${Date.now()}-${Math.floor(Math.random() * 999)}`;
    const { length, height } = get().tank;
    const nextObject = constrainObjectToTank({
      id,
      itemId: item.id,
      name: item.name,
      kind: item.kind,
      position: [(Math.random() - 0.5) * length / 100 * 0.48, item.kind === "fish" ? 0 : -height / 200 + 0.12, (Math.random() - 0.5) * get().tank.width / 100 * 0.48],
      rotation: [0, Math.random() * Math.PI * 2, 0],
      scale: item.kind === "fish" ? 0.22 : item.kind === "rock" ? 0.7 + Math.random() * 0.35 : 0.75,
      color: item.color,
    }, get().tank);
    set((state) => ({
      objects: [...state.objects, nextObject],
      inventory: state.inventory.map((entry) => entry.id === item.id ? { ...entry, count: entry.count - 1 } : entry),
      selectedId: id,
    }));
    withToast(`${item.name} added to the aquascape`, set);
  },
  purchaseItem: (item) => {
    const exists = get().inventory.some((entry) => entry.id === item.id);
    set((state) => ({
      inventory: exists
        ? state.inventory.map((entry) => entry.id === item.id ? { ...entry, count: entry.count + 1 } : entry)
        : [...state.inventory, { ...item, count: 1 }],
    }));
    withToast(`${item.name} added to your inventory`, set);
  },
  updateObject: (id, update) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? constrainObjectToTank({ ...object, ...update }, state.tank) : object) })),
  clearToast: () => set({ toast: null }),
}));

export const shopItems: CatalogItem[] = [
  { id: "dragon-stone", name: "Dragon Stone", category: "rocks", kind: "rock", color: "#9a8668", count: 0, price: 16, detail: "M · sculpted ridges" },
  { id: "bonsai-wood", name: "Bonsai Driftwood", category: "wood", kind: "wood", color: "#916a45", count: 0, price: 34, detail: "L · branching canopy" },
  { id: "bucephalandra", name: "Bucephalandra Green", category: "plants", kind: "plant", color: "#547c62", count: 0, price: 14, detail: "Rhizome · slow grower" },
  { id: "chili-rasbora", name: "Chili Rasbora", category: "fish", kind: "fish", color: "#cf6450", count: 0, price: 10, detail: "School · nano fish" },
  { id: "pendant-light", name: "Halo Pendant", category: "equipment", kind: "equipment", color: "#d8c58e", count: 0, price: 72, detail: "Spotlight · dimmable" },
  { id: "black-sand", name: "Volcanic Sand", category: "rocks", kind: "rock", color: "#3d4240", count: 0, price: 19, detail: "2 kg · fine grain" },
];

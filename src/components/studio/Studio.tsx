"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Aperture, ArrowDownToLine, Box, Check, CircleHelp, Cuboid, Fish,
  Frame, LampDesk, Leaf, Move3D, Plus, Rotate3D, Ruler, Search,
  ShoppingBag, SlidersHorizontal, Sparkles, Sprout, X, ZoomIn,
} from "lucide-react";
import { Category, CatalogItem, Finish, PlacedObject, shopItems, TransformMode, useStudioStore } from "@/lib/studio-store";

const Scene = dynamic(() => import("@/components/studio/Scene"), { ssr: false });

const categoryInfo: { key: Category; label: string; icon: typeof Box }[] = [
  { key: "rocks", label: "Đá", icon: Cuboid },
  { key: "wood", label: "Lũa", icon: Frame },
  { key: "plants", label: "Cây", icon: Sprout },
  { key: "fish", label: "Cá", icon: Fish },
  { key: "equipment", label: "Thiết bị", icon: LampDesk },
];
const itemGlyph: Record<string, typeof Box> = { rocks: Cuboid, wood: Frame, plants: Leaf, fish: Fish, equipment: LampDesk };
const finishOptions: { key: Finish; label: string; color: string }[] = [
  { key: "oak", label: "Sồi", color: "#9c7951" },
  { key: "walnut", label: "Óc chó", color: "#503a2d" },
  { key: "black", label: "Đen mờ", color: "#282d2a" },
  { key: "white", label: "Trắng", color: "#d6d6c9" },
];

function Header() {
  const [panel, setPanel] = useState<"object" | "tank" | "cabinet">("object");
  const setShopOpen = useStudioStore((state) => state.setShopOpen);
  const clearToast = useStudioStore((state) => state.clearToast);
  const selectedId = useStudioStore((state) => state.selectedId);
  const setSelected = useStudioStore((state) => state.setSelected);
  const toast = useStudioStore((state) => state.toast);
  const [saveMessage, setSaveMessage] = useState(false);

  const setView = (view: "object" | "tank" | "cabinet") => {
    setPanel(view);
    if (view !== "object") setSelected(null);
  };
  const saveDesign = () => {
    setSaveMessage(true);
    window.setTimeout(() => setSaveMessage(false), 1800);
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Aperture size={16} strokeWidth={2.2} /></div>
          <div><div className="brand-name">AQUASCAPE STUDIO <span style={{ color: "var(--moss)" }}>3D</span></div><div className="brand-caption">LIVING LANDSCAPE DESIGN</div></div>
        </div>
        <nav className="top-center" aria-label="Studio configuration">
          <button className={`top-button ${panel === "tank" ? "active" : ""}`} onClick={() => setView("tank")}><Cuboid size={13} /> Tank</button>
          <button className={`top-button ${panel === "cabinet" ? "active" : ""}`} onClick={() => setView("cabinet")}><Frame size={13} /> Cabinet</button>
          <button className={`top-button ${panel === "object" ? "active" : ""}`} onClick={() => setView("object")}><SlidersHorizontal size={13} /> Inspector</button>
        </nav>
        <div className="top-actions">
          <div className="status-pill"><span className="status-dot" /> All changes saved</div>
          <button className="save-button" onClick={saveDesign}><ArrowDownToLine size={13} /> {saveMessage ? "Saved" : "Save design"}</button>
          <button className="shop-button" onClick={() => setShopOpen(true)}><ShoppingBag size={14} /> Store</button>
        </div>
      </header>
      <main className="workspace">
        <InventoryPanel />
        <Viewport />
        <Inspector panel={panel} onPanelChange={setView} selectedId={selectedId} />
      </main>
      <StoreModal />
      {toast && <div role="status" className="toast" onClick={clearToast}>{toast}</div>}
    </>
  );
}

function InventoryPanel() {
  const category = useStudioStore((state) => state.category);
  const setCategory = useStudioStore((state) => state.setCategory);
  const search = useStudioStore((state) => state.search);
  const setSearch = useStudioStore((state) => state.setSearch);
  const inventory = useStudioStore((state) => state.inventory);
  const filtered = inventory.filter((item) => item.category === category && item.name.toLowerCase().includes(search.toLowerCase()));
  const totalCount = inventory.reduce((total, item) => total + item.count, 0);

  return (
    <aside className="left-panel">
      <div className="panel-head"><div><div className="eyebrow">Your workshop</div><h2 className="panel-title">Catalog</h2></div><span className="count-badge">{totalCount} items</span></div>
      <div className="search-wrap"><label className="search-box"><Search size={13} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your inventory" /></label></div>
      <div className="category-tabs" role="tablist" aria-label="Catalog categories">
        {categoryInfo.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={category === key} className={`category-tab ${category === key ? "active" : ""}`} onClick={() => setCategory(key)}><Icon /><span>{label}</span></button>
        ))}
      </div>
      <div className="inventory-label"><span>In your inventory</span><span>{filtered.length} types</span></div>
      <div className="inventory-list">
        {filtered.map((item) => <InventoryItem key={item.id} item={item} />)}
        {filtered.length === 0 && <div style={{ padding: "18px 10px", color: "var(--muted)", fontSize: 10 }}>No items match this search.</div>}
      </div>
      <div style={{ margin: "0 12px 16px", borderTop: "1px solid var(--line)", paddingTop: 12, color: "var(--muted)", fontSize: 9, display: "flex", justifyContent: "space-between" }}><span>Click an item to add it</span><CircleHelp size={13} /></div>
    </aside>
  );
}

function InventoryItem({ item }: { item: CatalogItem }) {
  const placeItem = useStudioStore((state) => state.placeItem);
  const Icon = itemGlyph[item.category];
  return (
    <button className="inventory-item" onClick={() => placeItem(item)} disabled={item.count < 1} style={{ opacity: item.count < 1 ? 0.48 : 1 }} title={item.count < 1 ? "Out of stock" : `Add ${item.name} to the tank`}>
      <span className="item-thumb" style={{ "--thumb": item.color } as React.CSSProperties}><Icon size={18} /></span>
      <span><span className="item-name" style={{ display: "block" }}>{item.name}</span><span className="item-meta">{item.detail}</span></span>
      <span className="item-qty">×{item.count}</span>
    </button>
  );
}

function Viewport() {
  const mode = useStudioStore((state) => state.transformMode);
  const setMode = useStudioStore((state) => state.setTransformMode);
  const lightMode = useStudioStore((state) => state.lightMode);
  const setLightMode = useStudioStore((state) => state.setLightMode);
  const setShowGuides = useStudioStore((state) => state.setShowGuides);
  const showGuides = useStudioStore((state) => state.showGuides);
  const tank = useStudioStore((state) => state.tank);
  const objects = useStudioStore((state) => state.objects);
  const selectedId = useStudioStore((state) => state.selectedId);
  const activeObject = objects.find((object) => object.id === selectedId);
  const modes: { key: TransformMode; icon: typeof Move3D; title: string }[] = [
    { key: "translate", icon: Move3D, title: "Move" },
    { key: "rotate", icon: Rotate3D, title: "Rotate" },
    { key: "scale", icon: ZoomIn, title: "Scale" },
  ];

  return (
    <section className="viewport" aria-label="3D aquascape viewport">
      <div className="canvas-host"><Scene /></div>
      <div className="viewport-header"><span className="scene-title">Untitled aquascape</span><span className="scene-separator" /><span className="scene-subtitle">{tank.length} × {tank.width} × {tank.height} cm</span></div>
      <div className="viewport-tools" aria-label="Viewport tools">
        {modes.map(({ key, icon: Icon, title }) => <button key={key} className={`tool-button ${activeObject && mode === key ? "selected" : ""}`} onClick={() => setMode(key)} title={title} aria-label={title}><Icon size={15} /></button>)}
        <span style={{ width: 1, background: "#ffffff2e", margin: "4px 2px" }} />
        <button className={`tool-button ${lightMode === "bar" ? "selected" : ""}`} onClick={() => setLightMode("bar")} title="Linear bar light" aria-label="Linear bar light"><LampDesk size={15} /></button>
        <button className={`tool-button ${lightMode === "pendant" ? "selected" : ""}`} onClick={() => setLightMode("pendant")} title="Pendant spotlight" aria-label="Pendant spotlight"><Sparkles size={15} /></button>
        <button className={`tool-button ${showGuides ? "selected" : ""}`} onClick={() => setShowGuides(!showGuides)} title={showGuides ? "Hide guide grid" : "Show guide grid"} aria-label="Toggle guide grid"><Ruler size={15} /></button>
      </div>
      <div className="viewport-footer">
        <div className="scene-hint"><Move3D size={12} /> Drag to orbit <span style={{ opacity: 0.5 }}>·</span> Scroll to zoom</div>
        <div className="scene-readout"><span><span className="readout-led" /> 6,500 K</span><span>{objects.length} objects</span><span>Perspective</span></div>
      </div>
    </section>
  );
}

function Inspector({ panel, onPanelChange, selectedId }: { panel: "object" | "tank" | "cabinet"; onPanelChange: (panel: "object" | "tank" | "cabinet") => void; selectedId: string | null }) {
  const objects = useStudioStore((state) => state.objects);
  const tank = useStudioStore((state) => state.tank);
  const cabinet = useStudioStore((state) => state.cabinet);
  const selected = objects.find((object) => object.id === selectedId);
  const inventory = useStudioStore((state) => state.inventory);
  const byId = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory]);
  const bom = [...objects.reduce((result, object) => result.set(object.itemId, (result.get(object.itemId) ?? 0) + 1), new Map<string, number>())];
  const total = bom.reduce((sum, [id, count]) => sum + (byId.get(id)?.price ?? 0) * count, 0);

  return (
    <aside className="right-panel">
      <section className="right-section">
        <div className="right-title-row"><span className="right-title">{panel === "tank" ? "Tank configuration" : panel === "cabinet" ? "Cabinet configuration" : "Inspector"}</span><button className="subtle-action" onClick={() => onPanelChange(panel === "object" ? "tank" : "object")}>{panel === "object" ? "Configure tank" : "Done"}</button></div>
        {panel === "tank" ? <TankControls /> : panel === "cabinet" ? <CabinetControls /> : selected ? <ObjectControls object={selected} /> : <div className="selection-card"><div className="selection-icon"><Box size={17} /></div><div><div className="selection-title">Nothing selected</div><div className="selection-type">Choose an object in the scene</div></div></div>}
      </section>
      <section className="right-section">
        <div className="right-title-row"><span className="right-title">Material list</span><button className="subtle-action" onClick={() => onPanelChange("tank")}>Edit tank</button></div>
        <div className="bom-list">
          <div className="bom-row"><span className="bom-name"><span className="bom-dot" style={{ background: "#899f77" }} /> Glass aquarium · {tank.length} cm</span><span className="bom-qty">1</span></div>
          <div className="bom-row"><span className="bom-name"><span className="bom-dot" style={{ background: "#aa805c" }} /> {cabinet.style === "frame" ? "Steel stand" : "Cabinet"} · {cabinet.height} cm</span><span className="bom-qty">1</span></div>
          <div className="bom-row"><span className="bom-name"><span className="bom-dot" style={{ background: "#736a53" }} /> Aquasoil substrate</span><span className="bom-qty">{Math.ceil(tank.length * tank.width / 1800)} kg</span></div>
          {bom.map(([id, count]) => <div className="bom-row" key={id}><span className="bom-name"><span className="bom-dot" style={{ background: byId.get(id)?.color ?? "var(--moss)" }} /> {byId.get(id)?.name ?? id}</span><span className="bom-qty">×{count}</span></div>)}
        </div>
        <div className="bom-total"><span>Hardscape & livestock</span><strong>${total.toFixed(2)}</strong></div>
      </section>
    </aside>
  );
}

function TankControls() {
  const tank = useStudioStore((state) => state.tank);
  const setTank = useStudioStore((state) => state.setTank);
  const setCategory = useStudioStore((state) => state.setCategory);
  const presets = [
    { name: "Cube 30", values: { length: 30, width: 30, height: 30 } },
    { name: "Standard 60", values: { length: 60, width: 30, height: 30 } },
    { name: "Standard 90", values: { length: 90, width: 45, height: 45 } },
  ];
  const setDimension = (key: "length" | "width" | "height", value: number) => setTank({ [key]: Math.max(20, Math.min(120, value)) });
  return (
    <>
      <div className="preset-row">{presets.map((preset) => <button key={preset.name} className={`preset-button ${Object.entries(preset.values).every(([key, value]) => tank[key as keyof typeof tank] === value) ? "active" : ""}`} onClick={() => setTank(preset.values)}>{preset.name}</button>)}</div>
      <div className="field-row">
        {(["length", "width", "height"] as const).map((key) => <label key={key}><span className="field-label">{key === "length" ? "Length" : key === "width" ? "Width" : "Height"}</span><span className="number-field"><input type="number" min={20} max={120} value={tank[key]} onChange={(event) => setDimension(key, Number(event.target.value))} /><span>cm</span></span></label>)}
      </div>
      <div className="material-row"><span>Glass</span><strong>Opti-white · 8 mm</strong></div>
      <div className="material-row"><span>Substrate depth</span><strong>7 cm · auto-fit</strong></div>
      <button className="secondary-wide" onClick={() => { setCategory("rocks"); }}><Cuboid size={13} /> Add hardscape</button>
    </>
  );
}

function CabinetControls() {
  const cabinet = useStudioStore((state) => state.cabinet);
  const setCabinet = useStudioStore((state) => state.setCabinet);
  return (
    <>
      <span className="field-label">Cabinet style</span>
      <div className="style-options">
        {([{ key: "modern", label: "Modern wood", Icon: Frame }, { key: "frame", label: "Steel frame", Icon: Box }, { key: "glass", label: "Lit glass", Icon: Aperture }] as const).map(({ key, label, Icon }) => <button key={key} className={`style-option ${cabinet.style === key ? "active" : ""}`} onClick={() => setCabinet({ style: key })}><Icon size={15} /><span>{label}</span></button>)}
      </div>
      <div className="slider-heading"><span className="field-label">Height</span><strong>{cabinet.height} cm</strong></div>
      <input className="range-input" type="range" min={70} max={90} value={cabinet.height} onChange={(event) => setCabinet({ height: Number(event.target.value) })} aria-label="Cabinet height" />
      <span className="field-label" style={{ marginTop: 14 }}>Finish</span>
      <div className="finish-options">{finishOptions.map((finish) => <button key={finish.key} className={`finish-option ${cabinet.finish === finish.key ? "active" : ""}`} onClick={() => setCabinet({ finish: finish.key })} aria-label={finish.label} title={finish.label}><span className="finish-swatch" style={{ background: finish.color }} />{cabinet.finish === finish.key && <Check size={11} />}</button>)}</div>
      <div className="material-row"><span>Width / depth</span><strong>Synced to tank</strong></div>
    </>
  );
}

function ObjectControls({ object }: { object: PlacedObject }) {
  const setMode = useStudioStore((state) => state.setTransformMode);
  const updateObject = useStudioStore((state) => state.updateObject);
  const modes: { key: TransformMode; icon: typeof Move3D; title: string }[] = [
    { key: "translate", icon: Move3D, title: "Move" },
    { key: "rotate", icon: Rotate3D, title: "Rotate" },
    { key: "scale", icon: ZoomIn, title: "Scale" },
  ];
  const currentMode = useStudioStore((state) => state.transformMode);
  return (
    <>
      <div className="selection-card"><div className="selection-icon">{(() => { const Icon = itemGlyph[object.kind === "rock" ? "rocks" : object.kind === "wood" ? "wood" : object.kind === "plant" ? "plants" : object.kind === "fish" ? "fish" : "equipment"]; return <Icon size={17} />; })()}</div><div><div className="selection-title">{object.name}</div><div className="selection-type">{object.kind} · in aquarium</div></div></div>
      <div className="transform-modes">{modes.map(({ key, icon: Icon, title }) => <button key={key} className={`mode-button ${currentMode === key ? "active" : ""}`} title={title} onClick={() => setMode(key)}><Icon size={13} /></button>)}</div>
      <div style={{ marginTop: 12 }} className="field-row">
        {(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis}><span className="field-label">Position {axis}</span><span className="number-field"><input type="number" step={0.01} value={object.position[index].toFixed(2)} onChange={(event) => { const position: [number, number, number] = [...object.position]; position[index] = Number(event.target.value); updateObject(object.id, { position }); }} /></span></label>)}
      </div>
      <div className="material-row"><span>Uniform scale</span><strong>{object.scale.toFixed(2)}×</strong></div>
    </>
  );
}

function StoreModal() {
  const open = useStudioStore((state) => state.shopOpen);
  const setOpen = useStudioStore((state) => state.setShopOpen);
  const purchaseItem = useStudioStore((state) => state.purchaseItem);
  const inventory = useStudioStore((state) => state.inventory);
  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="store-title">
        <div className="modal-header"><div><div className="eyebrow">Curated aquascape supplies</div><div id="store-title" className="modal-heading">The field store</div><div className="modal-description">A considered collection for your next composition.</div></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close store"><X size={16} /></button></div>
        <div className="shop-content"><div className="shop-grid">
          {shopItems.map((item) => {
            const owned = inventory.find((entry) => entry.id === item.id)?.count ?? 0;
            const Icon = itemGlyph[item.category];
            return <article key={item.id} className="shop-card"><div className="shop-art" style={{ color: item.color }}><Icon size={31} strokeWidth={1.2} /></div><div className="shop-card-body"><div className="shop-item-name">{item.name}</div><div className="shop-item-info">{item.detail}{owned ? ` · owned ${owned}` : ""}</div><div className="shop-buy-row"><span className="shop-price">${item.price}.00</span><button className="buy-button" onClick={() => purchaseItem(item)}><Plus size={11} style={{ verticalAlign: "-2px", marginRight: 3 }} /> Add to inventory</button></div></div></article>;
          })}
        </div></div>
      </section>
    </div>
  );
}

export default function Studio() {
  return <div className="studio"><Header /></div>;
}

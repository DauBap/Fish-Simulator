# Fish-Simulator

## Aquascape Studio 3D

An interactive aquascaping workbench built with Next.js App Router, React Three Fiber, Three.js, Tailwind CSS, and Zustand.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000` after the development server starts.

## Included

- Orbitable 3D room, aquarium glass, substrate, cabinet, and adjustable lighting
- 6 mm ultra-clear glass with edge tint/silicone seams, refractive water, animated surface normals, and restrained bloom
- Tank presets and custom dimensions; cabinet style, height, and finish controls
- Inventory categories, click-to-place hardscape/plants/fish, and a store modal
- Object selection, translate/rotate/scale gizmos, bounded transforms, and material list
- Procedural low-poly assets and fish wandering/schooling behavior

The store, save button, and inventory are local prototype interactions; there is no account, payment, or persistence backend yet.

The room environment is the CC0 `studio_small_08` HDRI from Poly Haven. Cabinet PBR maps are the CC0 `WoodFloor042` set from ambientCG.

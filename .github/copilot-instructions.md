# Aquascape Studio 3D Instructions

- Use Next.js App Router with TypeScript, React Three Fiber, Three.js, Tailwind CSS, and Zustand.
- Keep aquarium configuration and placed-object state in `src/lib/studio-store.ts`.
- Keep 3D scene construction and spatial constraints in `src/components/studio/Scene.tsx`.
- Keep studio panels and controls in `src/components/studio/Studio.tsx`; preserve responsive behavior in `src/app/globals.css`.
- Keep tank dimensions in centimeters in state and convert to Three.js meters at the scene boundary.
- Ensure placed objects and fish remain inside the tank bounds when dimensions change or transforms are applied.

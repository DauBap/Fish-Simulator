"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, ThreeEvent, useFrame, useLoader } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, TransformControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { constrainObjectToTank, PlacedObject, useStudioStore } from "@/lib/studio-store";

const woodTextureUrls = ["/assets/oak_color.jpg", "/assets/oak_normal.jpg", "/assets/oak_roughness.jpg"];

function makeWoodTextureSet(sources: THREE.Texture[], repeatX: number, repeatY: number) {
  const [color, normal, roughness] = sources.map((source) => {
    const texture = source.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.needsUpdate = true;
    return texture;
  });
  color.colorSpace = THREE.SRGBColorSpace;
  return { color, normal, roughness };
}

function makeWallNoise(base: number, spread: number) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let index = 0; index < size * size; index++) {
    const noise = Math.sin(index * 12.9898) * 43758.5453;
    const value = Math.max(0, Math.min(255, base + (noise - Math.floor(noise) - 0.5) * spread));
    const offset = index * 4;
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 8);
  texture.needsUpdate = true;
  return texture;
}

function makeWaterNormalMap() {
  const size = 96;
  const pixels = new Uint8Array(size * size * 4);
  const heightAt = (u: number, v: number) => {
    const x = u * Math.PI * 12;
    const y = v * Math.PI * 8;
    return Math.sin(x + Math.sin(y * 0.5)) * 0.55 + Math.cos(y - x * 0.28) * 0.3;
  };
  const epsilon = 1 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = (heightAt(u + epsilon, v) - heightAt(u - epsilon, v)) * 0.5;
      const dy = (heightAt(u, v + epsilon) - heightAt(u, v - epsilon)) * 0.5;
      const normal = new THREE.Vector3(-dx * 1.8, -dy * 1.8, 1).normalize();
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((normal.x * 0.5 + 0.5) * 255);
      pixels[offset + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      pixels[offset + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      pixels[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function WaterVolume({ length, width, height }: { length: number; width: number; height: number }) {
  const normalMap = useMemo(() => makeWaterNormalMap(), []);
  const waterHeight = Math.max(0.05, (height - 0.07) * 0.9);
  const waterBase = -height / 2 + 0.07;
  const waterCenter = waterBase + waterHeight / 2;
  const waterLength = Math.max(0.01, length - 0.02);
  const waterWidth = Math.max(0.01, width - 0.02);
  const innerHalfLength = waterLength / 2 - 0.0015;
  const innerHalfWidth = waterWidth / 2 - 0.0015;

  useFrame((_, delta) => {
    normalMap.offset.x = (normalMap.offset.x + delta * 0.009) % 1;
    normalMap.offset.y = (normalMap.offset.y + delta * 0.006) % 1;
  });

  return (
    <group position={[0, waterCenter, 0]}>
      <mesh receiveShadow renderOrder={2}>
        <boxGeometry args={[waterLength, waterHeight, waterWidth]} />
        <meshPhysicalMaterial color="#d4f1f9" transparent opacity={0.6} roughness={0.1} metalness={0} transmission={0.85} thickness={0.18} ior={1.333} attenuationColor="#c7edf1" attenuationDistance={1.4} envMapIntensity={0.58} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, waterHeight / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[waterLength, waterWidth, 1, 1]} />
        <meshPhysicalMaterial color="#e0f7fa" transparent opacity={0.68} roughness={0.07} metalness={0} transmission={0.9} thickness={0.1} ior={1.333} attenuationColor="#c7edf1" attenuationDistance={1.4} envMapIntensity={0.72} normalMap={normalMap} normalScale={new THREE.Vector2(0.085, 0.085)} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group position={[0, waterHeight / 2 + 0.0015, 0]} renderOrder={4}>
        <mesh position={[0, 0, -innerHalfWidth]}>
          <boxGeometry args={[innerHalfLength * 2, 0.003, 0.0015]} />
          <meshBasicMaterial color="#f5ffff" transparent opacity={0.96} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, innerHalfWidth]}>
          <boxGeometry args={[innerHalfLength * 2, 0.003, 0.0015]} />
          <meshBasicMaterial color="#f5ffff" transparent opacity={0.96} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[-innerHalfLength, 0, 0]}>
          <boxGeometry args={[0.0015, 0.003, innerHalfWidth * 2]} />
          <meshBasicMaterial color="#f5ffff" transparent opacity={0.96} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[innerHalfLength, 0, 0]}>
          <boxGeometry args={[0.0015, 0.003, innerHalfWidth * 2]} />
          <meshBasicMaterial color="#f5ffff" transparent opacity={0.96} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Cabinet() {
  const cabinet = useStudioStore((state) => state.cabinet);
  const tank = useStudioStore((state) => state.tank);
  const length = tank.length / 100;
  const width = tank.width / 100;
  const height = cabinet.height / 100;
  const finishColors = { oak: "#9c7951", walnut: "#503a2d", black: "#252a27", white: "#d6d6c9" };
  const color = finishColors[cabinet.finish];
  const woodSources = useLoader(THREE.TextureLoader, woodTextureUrls);
  const verticalWood = useMemo(() => makeWoodTextureSet(woodSources, Math.max(1, length * 3), Math.max(1, height * 1.5)), [woodSources, length, height]);
  const horizontalWood = useMemo(() => makeWoodTextureSet(woodSources, Math.max(1, length * 3), Math.max(1, width * 3)), [woodSources, length, width]);

  return (
    <group position={[0, height / 2, 0]}>
      {cabinet.style === "frame" ? (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[length + 0.06, 0.055, width + 0.06]} />
            <meshStandardMaterial color="#292e2a" metalness={0.68} roughness={0.32} />
          </mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
            <mesh key={`${x}-${z}`} castShadow position={[x * (length / 2 - 0.04), -height / 2, z * (width / 2 - 0.035)]}>
              <boxGeometry args={[0.045, height, 0.045]} />
              <meshStandardMaterial color="#353b37" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh castShadow position={[0, -height / 2 + 0.12, 0]}>
            <boxGeometry args={[length - 0.12, 0.03, width - 0.08]} />
            <meshStandardMaterial color="#303632" metalness={0.55} roughness={0.4} />
          </mesh>
        </>
      ) : (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[length + 0.04, height, width + 0.04]} />
            <meshStandardMaterial color={cabinet.style === "glass" ? "#333d39" : cabinet.finish === "oak" ? "#ffffff" : color} map={cabinet.style === "glass" ? null : verticalWood.color} normalMap={cabinet.style === "glass" ? null : verticalWood.normal} roughnessMap={cabinet.style === "glass" ? null : verticalWood.roughness} roughness={cabinet.style === "glass" ? 0.2 : 0.78} metalness={cabinet.style === "glass" ? 0.22 : 0.02} transparent={cabinet.style === "glass"} opacity={cabinet.style === "glass" ? 0.82 : 1} />
          </mesh>
          <mesh position={[0, 0, width / 2 + 0.002]}>
            <boxGeometry args={[length - 0.04, height - 0.035, 0.012]} />
            <meshStandardMaterial color={cabinet.style === "glass" ? "#202824" : cabinet.finish === "oak" ? "#ffffff" : color} map={cabinet.style === "glass" ? null : verticalWood.color} normalMap={cabinet.style === "glass" ? null : verticalWood.normal} roughnessMap={cabinet.style === "glass" ? null : verticalWood.roughness} roughness={0.58} emissive={cabinet.style === "glass" ? "#22332a" : "#000000"} emissiveIntensity={cabinet.style === "glass" ? 0.65 : 0} />
          </mesh>
          {cabinet.style !== "glass" && [0, 1].map((index) => (
            <group key={index} position={[(index - 0.5) * (length / 2 - 0.025), 0, width / 2 + 0.01]}>
              <mesh>
                <boxGeometry args={[length / 2 - 0.03, height - 0.035, 0.018]} />
                <meshStandardMaterial color={cabinet.finish === "oak" ? "#ffffff" : color} map={verticalWood.color} normalMap={verticalWood.normal} roughnessMap={verticalWood.roughness} roughness={0.62} />
              </mesh>
              <mesh position={[index === 0 ? length / 4 - 0.045 : -length / 4 + 0.045, 0, 0.012]}>
                <sphereGeometry args={[0.012, 12, 12]} />
                <meshStandardMaterial color="#c1a779" metalness={0.7} roughness={0.24} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, height / 2 + 0.013, 0]} castShadow receiveShadow>
            <boxGeometry args={[length + 0.09, 0.026, width + 0.09]} />
            <meshStandardMaterial color={cabinet.style === "glass" ? "#303b35" : cabinet.finish === "oak" ? "#ffffff" : color} map={cabinet.style === "glass" ? null : horizontalWood.color} normalMap={cabinet.style === "glass" ? null : horizontalWood.normal} roughnessMap={cabinet.style === "glass" ? null : horizontalWood.roughness} roughness={0.68} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Room() {
  const wallRoughness = useMemo(() => makeWallNoise(190, 22), []);
  const wallBump = useMemo(() => makeWallNoise(178, 40), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#827b6a" roughness={0.88} />
      </mesh>
      <mesh position={[0, 2.1, -1.45]} receiveShadow>
        <planeGeometry args={[12, 4.2]} />
        <meshStandardMaterial color="#777e72" roughnessMap={wallRoughness} bumpMap={wallBump} bumpScale={0.008} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.55, -1.425]}>
        <boxGeometry args={[12, 0.035, 0.035]} />
        <meshStandardMaterial color="#a3947c" roughness={0.65} />
      </mesh>
      {[-2.2, -1.8, 1.8, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.15, -1.414]}>
          <boxGeometry args={[0.018, 2.2, 0.008]} />
          <meshStandardMaterial color="#6b7468" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-2.2, 0.72, -0.45]} castShadow>
        <boxGeometry args={[0.52, 1.35, 0.22]} />
        <meshStandardMaterial color="#343b35" roughness={0.82} />
      </mesh>
      {[-2.36, -2.2, -2.04].map((x, index) => (
        <mesh key={x} position={[x, 1.58 + (index % 2) * 0.08, -0.45]} rotation={[0, 0, (index - 1) * 0.3]}>
          <dodecahedronGeometry args={[0.16 + index * 0.025, 0]} />
          <meshStandardMaterial color={index === 1 ? "#657854" : "#798868"} roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[2.35, 1.1, -0.58]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.42, 18]} />
        <meshStandardMaterial color="#9a7156" roughness={0.84} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[2.25 + (index % 2) * 0.18, 1.38 + Math.floor(index / 2) * 0.12, -0.58]} rotation={[0, index, (index - 1) * 0.2]}>
          <coneGeometry args={[0.18, 0.45, 7]} />
          <meshStandardMaterial color={index % 2 ? "#586e4c" : "#74865a"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Rock({ color, scale }: { color: string; scale: number }) {
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  return (
    <mesh geometry={geometry} scale={[0.17 * scale, 0.12 * scale, 0.14 * scale]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  );
}

function Driftwood({ color, scale }: { color: string; scale: number }) {
  return (
    <group scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.045, 0.42, 7]} />
        <meshStandardMaterial color={color} roughness={0.91} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[0, 0, side * 0.65]} position={[side * 0.12, 0.28, 0.01]} castShadow>
          <cylinderGeometry args={[0.012, 0.025, 0.3, 6]} />
          <meshStandardMaterial color={color} roughness={0.91} />
        </mesh>
      ))}
    </group>
  );
}

function AquaticPlant({ color, scale }: { color: string; scale: number }) {
  const leaves = useMemo(() => Array.from({ length: 9 }, (_, index) => ({
    angle: index * 2.399,
    height: 0.16 + (index % 4) * 0.045,
    lean: (index % 3 - 1) * 0.09,
  })), []);
  return (
    <group scale={scale}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.08, 8]} />
        <meshStandardMaterial color="#544b39" roughness={1} />
      </mesh>
      {leaves.map((leaf, index) => (
        <mesh key={index} position={[Math.cos(leaf.angle) * 0.06, leaf.height / 2 + 0.07, Math.sin(leaf.angle) * 0.06]} rotation={[leaf.lean, leaf.angle, -0.22]} castShadow>
          <capsuleGeometry args={[0.025, leaf.height, 3, 6]} />
          <meshStandardMaterial color={color} roughness={0.82} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Fish({ selected, color }: { selected: boolean; color: string }) {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, -0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.065, 0.12, 5]} />
        <meshStandardMaterial color={color} roughness={0.42} />
      </mesh>
      <mesh position={[0.032, 0.035, 0.025]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshBasicMaterial color="#10130f" />
      </mesh>
      {selected && <mesh scale={[0.15, 0.12, 0.24]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color="#a6c776" transparent opacity={0.12} depthWrite={false} />
      </mesh>}
    </group>
  );
}

function SceneObject({ object }: { object: PlacedObject }) {
  const group = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.2, Math.random() - 0.5).normalize().multiplyScalar(0.09));
  const lastFishSync = useRef(0);
  const selectedId = useStudioStore((state) => state.selectedId);
  const selected = selectedId === object.id;
  const mode = useStudioStore((state) => state.transformMode);
  const setSelected = useStudioStore((state) => state.setSelected);
  const updateObject = useStudioStore((state) => state.updateObject);
  const tank = useStudioStore((state) => state.tank);
  const length = tank.length / 100;
  const width = tank.width / 100;
  const height = tank.height / 100;

  useFrame((state, delta) => {
    if (object.kind !== "fish" || !group.current || selected) return;
    const position = group.current.position;
    const peers = useStudioStore.getState().objects.filter((entry) => entry.kind === "fish" && entry.id !== object.id);
    const center = new THREE.Vector3();
    const separation = new THREE.Vector3();
    let neighbors = 0;
    peers.forEach((peer) => {
      const peerPosition = new THREE.Vector3(...peer.position);
      const distance = position.distanceTo(peerPosition);
      if (distance < 0.55) {
        center.add(peerPosition);
        neighbors++;
        if (distance < 0.16 && distance > 0.001) separation.add(peerPosition.sub(position).negate().normalize().multiplyScalar(0.07 / distance));
      }
    });
    const steer = new THREE.Vector3((Math.random() - 0.5) * 0.018, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.018);
    if (neighbors) steer.add(center.divideScalar(neighbors).sub(position).multiplyScalar(0.035)).add(separation);
    const halfLength = Math.max(0.05, length / 2 - 0.08);
    const halfWidth = Math.max(0.05, width / 2 - 0.08);
    if (Math.abs(position.x) > halfLength) steer.x -= Math.sign(position.x) * 0.12;
    if (Math.abs(position.z) > halfWidth) steer.z -= Math.sign(position.z) * 0.12;
    if (position.y < -height / 2 + 0.1) steer.y += 0.08;
    if (position.y > height / 2 - 0.1) steer.y -= 0.08;
    velocity.current.add(steer).clampLength(0, 0.18);
    if (velocity.current.length() < 0.045) velocity.current.setLength(0.045);
    position.addScaledVector(velocity.current, delta);
    position.x = THREE.MathUtils.clamp(position.x, -halfLength, halfLength);
    position.y = THREE.MathUtils.clamp(position.y, -height / 2 + 0.08, height / 2 - 0.07);
    position.z = THREE.MathUtils.clamp(position.z, -halfWidth, halfWidth);
    group.current.rotation.y = Math.atan2(velocity.current.x, velocity.current.z);
    group.current.rotation.z = -velocity.current.y * 0.4;
    if (state.clock.elapsedTime - lastFishSync.current > 0.4) {
      lastFishSync.current = state.clock.elapsedTime;
      updateObject(object.id, { position: [position.x, position.y, position.z] });
    }
  });

  const onTransform = () => {
    if (!group.current) return;
    const constrained = constrainObjectToTank({
      ...object,
      position: [group.current.position.x, group.current.position.y, group.current.position.z],
      rotation: [group.current.rotation.x, group.current.rotation.y, group.current.rotation.z],
      scale: Math.max(0.25, Math.min(2.2, group.current.scale.x)),
    }, tank);
    group.current.position.set(...constrained.position);
    group.current.scale.setScalar(constrained.scale);
    updateObject(object.id, constrained);
  };
  const stop = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setSelected(object.id);
  };
  const content = object.kind === "rock"
    ? <Rock color={object.color} scale={object.scale} />
    : object.kind === "wood"
      ? <Driftwood color={object.color} scale={object.scale} />
      : object.kind === "plant"
        ? <AquaticPlant color={object.color} scale={object.scale} />
        : object.kind === "fish"
          ? <Fish selected={selected} color={object.color} />
          : <mesh><boxGeometry args={[0.16, 0.05, 0.05]} /><meshStandardMaterial color={object.color} emissive={object.color} emissiveIntensity={0.35} /></mesh>;

  const node = (
    <group
      ref={group}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onClick={stop}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {content}
    </group>
  );

  return selected ? (
    <TransformControls mode={mode} onObjectChange={onTransform} onMouseUp={onTransform}>
      {node}
    </TransformControls>
  ) : node;
}

function Tank() {
  const tank = useStudioStore((state) => state.tank);
  const cabinet = useStudioStore((state) => state.cabinet);
  const lightMode = useStudioStore((state) => state.lightMode);
  const showGuides = useStudioStore((state) => state.showGuides);
  const objects = useStudioStore((state) => state.objects);
  const setSelected = useStudioStore((state) => state.setSelected);
  const length = tank.length / 100;
  const width = tank.width / 100;
  const height = tank.height / 100;
  const cabinetHeight = cabinet.height / 100;
  const bottom = cabinetHeight + 0.055;
  const centerY = bottom + height / 2;
  const lighting = lightMode === "bar";
  const paneMaterial = <meshPhysicalMaterial color="#f2fffc" metalness={0} roughness={0.025} transmission={0.97} thickness={0.006} ior={1.5} attenuationColor="#e0f7fa" attenuationDistance={0.5} envMapIntensity={1.25} clearcoat={1} clearcoatRoughness={0.015} side={THREE.DoubleSide} />;
  const lightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, centerY, 0);
    return target;
  }, [centerY]);

  return (
    <group>
      <group position={[0, centerY, 0]}>
        <mesh position={[0, -height / 2 + 0.003, 0]} castShadow onClick={(event) => { event.stopPropagation(); setSelected(null); }}>
          <boxGeometry args={[length, 0.006, width]} />
          {paneMaterial}
        </mesh>
        <mesh position={[0, 0, -width / 2 + 0.003]} castShadow onClick={(event) => { event.stopPropagation(); setSelected(null); }}>
          <boxGeometry args={[length, height, 0.006]} />
          {paneMaterial}
        </mesh>
        <mesh position={[0, 0, width / 2 - 0.003]} castShadow onClick={(event) => { event.stopPropagation(); setSelected(null); }}>
          <boxGeometry args={[length, height, 0.006]} />
          {paneMaterial}
        </mesh>
        <mesh position={[-length / 2 + 0.003, 0, 0]} castShadow onClick={(event) => { event.stopPropagation(); setSelected(null); }}>
          <boxGeometry args={[0.006, height, width - 0.012]} />
          {paneMaterial}
        </mesh>
        <mesh position={[length / 2 - 0.003, 0, 0]} castShadow onClick={(event) => { event.stopPropagation(); setSelected(null); }}>
          <boxGeometry args={[0.006, height, width - 0.012]} />
          {paneMaterial}
        </mesh>
        <group>
          <mesh position={[-length / 2 + 0.003, 0, -width / 2 + 0.003]}>
            <boxGeometry args={[0.003, height, 0.003]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.62} roughness={0.2} metalness={0.08} />
          </mesh>
          <mesh position={[length / 2 - 0.003, 0, -width / 2 + 0.003]}>
            <boxGeometry args={[0.003, height, 0.003]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.62} roughness={0.2} metalness={0.08} />
          </mesh>
          <mesh position={[-length / 2 + 0.003, 0, width / 2 - 0.003]}>
            <boxGeometry args={[0.003, height, 0.003]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.62} roughness={0.2} metalness={0.08} />
          </mesh>
          <mesh position={[length / 2 - 0.003, 0, width / 2 - 0.003]}>
            <boxGeometry args={[0.003, height, 0.003]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.62} roughness={0.2} metalness={0.08} />
          </mesh>
          <mesh position={[0, height / 2 - 0.003, -width / 2 + 0.003]}>
            <boxGeometry args={[length, 0.003, 0.003]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.55} roughness={0.2} />
          </mesh>
          <mesh position={[0, height / 2 - 0.003, width / 2 - 0.003]}>
            <boxGeometry args={[length, 0.003, 0.003]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.55} roughness={0.2} />
          </mesh>
          <mesh position={[-length / 2 + 0.003, height / 2 - 0.003, 0]}>
            <boxGeometry args={[0.003, 0.003, width]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.55} roughness={0.2} />
          </mesh>
          <mesh position={[length / 2 - 0.003, height / 2 - 0.003, 0]}>
            <boxGeometry args={[0.003, 0.003, width]} />
            <meshStandardMaterial color="#9bd0c5" transparent opacity={0.55} roughness={0.2} />
          </mesh>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => (
            <mesh key={`silicone-${x}-${z}`} position={[x * (length / 2 - 0.0045), 0, z * (width / 2 - 0.0045)]}>
              <boxGeometry args={[0.0015, height - 0.012, 0.0015]} />
              <meshStandardMaterial color="#34463f" roughness={0.52} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, -height / 2 + 0.035, 0]} receiveShadow castShadow>
          <boxGeometry args={[length * 0.965, 0.07, width * 0.94]} />
          <meshStandardMaterial color="#514b3b" roughness={1} />
        </mesh>
        <mesh position={[0, -height / 2 + 0.071, 0]}>
          <boxGeometry args={[length * 0.965, 0.008, width * 0.94]} />
          <meshStandardMaterial color="#6d634a" roughness={0.96} />
        </mesh>
        <WaterVolume length={length} width={width} height={height} />
        {showGuides && <gridHelper args={[length, Math.max(6, Math.round(tank.length / 5)), "#8a9d79", "#8a9d79"]} position={[0, -height / 2 + 0.08, 0]} scale={[1, 1, width / length]} />}
        {objects.map((object) => (
          <SceneObject key={object.id} object={object} />
        ))}
        {lighting ? (
          <mesh position={[0, height / 2 + 0.045, 0]}>
            <boxGeometry args={[length * 0.82, 0.014, 0.065]} />
            <meshStandardMaterial color="#c9c5b2" emissive="#e2d8b5" emissiveIntensity={0.34} roughness={0.35} />
          </mesh>
        ) : null}
      </group>
      <Suspense fallback={null}>
        <Cabinet />
      </Suspense>
      <primitive object={lightTarget} />
      <mesh position={[0, bottom + height + 0.15, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.04]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {lighting ? (
        [-0.3, 0, 0.3].map((offset, index) => <spotLight key={index} position={[offset * length, bottom + height + 0.7, 0.12]} target={lightTarget} angle={0.42} penumbra={0.9} intensity={2.2} distance={2.2} color="#f0e8c9" castShadow={index === 1} shadow-mapSize={[512, 512]} />)
      ) : (
        <spotLight position={[0, bottom + height + 0.65, 0.16]} target={lightTarget} angle={0.38} penumbra={0.55} intensity={5.5} distance={2.4} color="#f4e7c2" castShadow />
      )}
    </group>
  );
}

function StudioScene() {
  const setSelected = useStudioStore((state) => state.setSelected);
  return (
    <>
      <color attach="background" args={["#69756d"]} />
      <fog attach="fog" args={["#69756d", 4.5, 10]} />
      <ambientLight intensity={0.88} color="#dbe1d2" />
      <directionalLight position={[-3, 4.5, 3]} intensity={2.1} color="#fff0d5" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[3, 2.8, -2]} intensity={0.8} color="#b9d7d1" />
      <Suspense fallback={null}>
        <Environment files="/assets/studio_small_08_1k.hdr" environmentIntensity={0.55} />
      </Suspense>
      <Room />
      <Tank />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={6} blur={2.2} far={1.6} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.08} luminanceThreshold={0.96} luminanceSmoothing={0.22} mipmapBlur />
      </EffectComposer>
      <OrbitControls makeDefault target={[0, 0.98, 0]} minDistance={0.72} maxDistance={5.4} minPolarAngle={0.18} maxPolarAngle={Math.PI / 2 - 0.05} enableDamping dampingFactor={0.07} />
      <mesh onClick={() => setSelected(null)} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [1.55, 1.55, 3.25], fov: 38 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }}>
      <StudioScene />
    </Canvas>
  );
}

"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Home } from "@/lib/engine";

import { ROOM_COLORS } from "./rooms";
type Room = { kind: string; x: number; z: number; w: number; d: number; small?: boolean };
const FLOOR_H = 0.85, WALL_H = 0.42, WALL_T = 0.06;

export function planFloors(h: Home) {
  const perFloor = h.sqft / h.floors;
  const side = Math.sqrt(perFloor) / 13; // 1800 sq ft single floor is about 3.3 units
  const W = side * 1.25, D = side / 1.25;
  const lists: { kind: string; small?: boolean }[][] = Array.from({ length: h.floors }, () => []);
  lists[0].push({ kind: "living" }, { kind: "kitchen" });
  for (let f = 0; f < h.floors; f++) lists[f].push({ kind: "hall" });
  const fullBaths = Math.floor(h.bathrooms), half = h.bathrooms % 1 !== 0;
  for (let i = 0; i < h.bedrooms; i++) lists[h.floors === 1 ? 0 : 1 + (i % (h.floors - 1))].push({ kind: "bedroom" });
  for (let i = 0; i < fullBaths; i++) lists[i % h.floors].push({ kind: "bathroom" });
  if (half) lists[0].push({ kind: "bathroom", small: true });
  const order: Record<string, number> = { hall: 0, bathroom: 1, kitchen: 2, bedroom: 3, living: 4 };
  return lists.map((raw) => {
    const items = [...raw].sort((a, b) => order[a.kind] - order[b.kind] || (a.small ? -1 : 0));
    const n = items.length, cols = Math.ceil(Math.sqrt(n * 1.3)), rows = Math.ceil(n / cols);
    const rooms: Room[] = items.map((it, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const w = W / inRow, d = D / rows;
      return { kind: it.kind, small: it.small, x: -W / 2 + w * (c + 0.5), z: -D / 2 + d * (r + 0.5), w, d };
    });
    return { W, D, rooms };
  });
}

function Smooth({ target, children }: { target: [number, number, number]; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    const k = 1 - Math.exp(-dt * 8);
    g.position.lerp(new THREE.Vector3(...target), k);
    const s = g.scale.x + (1 - g.scale.x) * k; g.scale.setScalar(s);
  });
  return <group ref={ref} position={[target[0], target[1] - 0.6, target[2]]} scale={0.6}>{children}</group>;
}

function Floor({ data, y, top }: { data: ReturnType<typeof planFloors>[number]; y: number; top: boolean }) {
  return (
    <Smooth target={[0, y, 0]}>
      <RoundedBox args={[data.W + 0.12, 0.1, data.D + 0.12]} radius={0.03} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#2A2C30" roughness={0.8} />
      </RoundedBox>
      {data.rooms.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]}>
          <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[r.w - WALL_T, r.d - WALL_T]} />
            <meshStandardMaterial color={ROOM_COLORS[r.kind]} roughness={0.6} opacity={r.small ? 0.6 : 1} transparent={!!r.small} />
          </mesh>
          {/* back and left walls only: cutaway */}
          <mesh position={[0, WALL_H / 2, -r.d / 2]}><boxGeometry args={[r.w, WALL_H, WALL_T]} /><meshStandardMaterial color="#E9E4DA" roughness={0.9} /></mesh>
          <mesh position={[-r.w / 2, WALL_H / 2, 0]}><boxGeometry args={[WALL_T, WALL_H, r.d]} /><meshStandardMaterial color="#DCD6CB" roughness={0.9} /></mesh>
          {r.kind === "bedroom" && <mesh position={[0, 0.09, -r.d * 0.15]}><boxGeometry args={[r.w * 0.45, 0.16, r.d * 0.5]} /><meshStandardMaterial color="#F2EFE8" /></mesh>}
          {r.kind === "living" && <mesh position={[0, 0.1, -r.d * 0.3]}><boxGeometry args={[r.w * 0.6, 0.2, r.d * 0.18]} /><meshStandardMaterial color="#3B3A38" /></mesh>}
          {r.kind === "kitchen" && <mesh position={[0, 0.2, -r.d / 2 + 0.12]}><boxGeometry args={[r.w * 0.8, 0.4, 0.2]} /><meshStandardMaterial color="#F2EFE8" /></mesh>}
          {r.kind === "bathroom" && <mesh position={[0, 0.08, -r.d * 0.2]}><cylinderGeometry args={[Math.min(r.w, r.d) * 0.14, Math.min(r.w, r.d) * 0.14, 0.16, 20]} /><meshStandardMaterial color="#F7F7F5" /></mesh>}
          {r.kind === "hall" && top === false && <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.6]}><boxGeometry args={[r.w * 0.5, 0.05, r.d * 0.4]} /><meshStandardMaterial color="#B5AFA6" /></mesh>}
        </group>
      ))}
    </Smooth>
  );
}

function Roof({ W, D, y }: { W: number; D: number; y: number }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.0001, 1, 1, 4, 1); g.rotateY(Math.PI / 4); return g;
  }, []);
  return (
    <Smooth target={[0, y + 0.45, 0]}>
      <mesh geometry={geo} scale={[W * 0.78, 0.9, D * 0.78]}><meshStandardMaterial color="#4A4640" roughness={0.7} flatShading /></mesh>
    </Smooth>
  );
}

export default function House({ home, openFloors, roof }: { home: Home; openFloors: boolean; roof: boolean }) {
  const floors = useMemo(() => planFloors(home), [home]);
  const gap = openFloors ? FLOOR_H + 0.9 : FLOOR_H;
  const total = (home.floors - 1) * gap;
  const fit = Math.min(1.7, 4.6 / Math.max(floors[0].W, floors[0].D * 1.3, total + 1.2));
  return (
    <Canvas camera={{ position: [6, 5, 7], fov: 34 }} dpr={[1, 2]} shadows={false} aria-label="3D model of your home">
      <color attach="background" args={["#121316"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 9, 4]} intensity={1.4} />
      <directionalLight position={[-6, 4, -3]} intensity={0.35} />
      <FitGroup scale={fit}><group position={[0, -total / 2 - 0.2, 0]}>
        {floors.map((f, i) => <Floor key={i} data={f} y={i * gap} top={i === floors.length - 1} />)}
        {roof && <Roof W={floors[0].W} D={floors[0].D} y={(home.floors - 1) * gap + WALL_H} />}
        <ContactShadows position={[0, -0.12, 0]} opacity={0.5} scale={14} blur={2.5} far={4} />
      </group></FitGroup>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} minPolarAngle={0.5} maxPolarAngle={1.35} />
    </Canvas>
  );
}

function FitGroup({ scale, children }: { scale: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { const g = ref.current; if (!g) return; const s = g.scale.x + (scale - g.scale.x) * (1 - Math.exp(-dt * 6)); g.scale.setScalar(s); });
  return <group ref={ref} scale={scale}>{children}</group>;
}

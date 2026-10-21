"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Edges } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Home } from "@/lib/engine";
import { ROOM_COLORS } from "./rooms";

type Kind = "living" | "kitchen" | "bedroom" | "bathroom" | "hall" | "maid" | "majlis";
const TONE: Record<Kind, string> = { ...ROOM_COLORS, maid: ROOM_COLORS.bedroom, majlis: ROOM_COLORS.living } as Record<Kind, string>;
export type Focus = { kind: string; n: number };
type Room = { id: string; kind: Kind; x: number; z: number; w: number; d: number };
type FloorPlan = { W: number; D: number; hw: number; rooms: Room[] };

const SLAB = 0.1, WALL_H = 0.6, BLOCK = 0.16, GAP = 0.06, OPEN_GAP = 0.7;
const WEIGHT: Record<Kind, number> = { living: 3.2, kitchen: 2, bedroom: 2.2, bathroom: 1, hall: 1, maid: 1.2, majlis: 2.6 };

/** Lay out rooms per floor: a hall strip (with stairs) on the left, then two rows of rooms sized by weight. */
export function planFloors(h: Home): FloorPlan[] {
  const perFloor = h.sqft / h.floors;
  const side = Math.sqrt(perFloor) / 12;
  const W = Math.max(2.1, side * 1.18), D = Math.max(1.7, side / 1.18);
  const lists: { kind: Kind; half?: boolean }[][] = Array.from({ length: h.floors }, () => []);
  lists[0].push({ kind: "living" }, { kind: "kitchen" });
  if (h.rooms?.includes("majlis")) lists[0].push({ kind: "majlis" });
  if (h.rooms?.includes("maid")) lists[0].push({ kind: "maid" });
  const up = h.floors > 1 ? h.floors - 1 : 0;
  for (let i = 0; i < h.bedrooms; i++) lists[up ? 1 + (i % up) : 0].push({ kind: "bedroom" });
  const full = Math.floor(h.bathrooms), half = h.bathrooms % 1 !== 0;
  for (let i = 0; i < full; i++) lists[h.floors === 1 ? 0 : (h.floors - 1 - (i % h.floors))].push({ kind: "bathroom" });
  if (half) lists[0].push({ kind: "bathroom", half: true });
  for (let f = 1; f < h.floors; f++) if (!lists[f].some((r) => r.kind !== "bathroom")) lists[f].unshift({ kind: "living" });
  return lists.map((items, f) => {
    const hw = Math.min(0.75, W * 0.2);
    const RW = W - hw;
    const rows: typeof items[] = items.length <= 2 ? [items] : [[], []];
    if (rows.length === 2) {
      const sum = [0, 0];
      [...items].sort((a, b) => WEIGHT[b.kind] - WEIGHT[a.kind]).forEach((it) => { const r = sum[0] <= sum[1] ? 0 : 1; rows[r].push(it); sum[r] += WEIGHT[it.kind] * (it.half ? 0.6 : 1); });
    }
    const rooms: Room[] = [{ id: `${f}-hall`, kind: "hall", x: -W / 2 + hw / 2, z: 0, w: hw, d: D }];
    const count: Record<string, number> = {};
    rows.forEach((row, ri) => {
      const d = D / rows.length, z = -D / 2 + d * (ri + 0.5);
      const tot = row.reduce((s, it) => s + WEIGHT[it.kind] * (it.half ? 0.6 : 1), 0);
      let x = -W / 2 + hw;
      row.forEach((it) => {
        const w = (RW * WEIGHT[it.kind] * (it.half ? 0.6 : 1)) / tot;
        count[it.kind] = (count[it.kind] ?? 0) + 1;
        rooms.push({ id: `${f}-${it.kind}-${count[it.kind]}`, kind: it.kind, x: x + w / 2, z, w, d });
        x += w;
      });
    });
    return { W, D, hw, rooms };
  });
}

/** Critically damped spring towards a target, used for every moving part. */
function useSpring(target: number, init: number, stiff = 120, damp = 16) {
  const s = useRef({ x: init, v: 0 });
  return (dt: number) => {
    const st = s.current, t = Math.min(dt, 1 / 30);
    st.v += ((target - st.x) * stiff - st.v * damp) * t; st.x += st.v * t; return st.x;
  };
}

function Block({ r, focus, extras, type }: { r: Room; focus: Focus | null; extras: string[]; type: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef(0);
  const hit = focus && (focus.kind === r.kind || focus.kind === "all" || (focus.kind === "bedroom" && r.kind === "maid")) ? focus.n : -1;
  const last = useRef(hit);
  if (hit !== last.current) { last.current = hit; if (hit >= 0) glow.current = 1; }
  const ref = useRef<THREE.Group>(null);
  const sc = useSpring(1, 0.001, 170, 13);
  const px = useSpring(r.x, r.x), pz = useSpring(r.z, r.z), sw = useSpring(r.w, r.w), sd = useSpring(r.d, r.d);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    const s = Math.max(0.001, sc(dt));
    g.position.set(px(dt), 0, pz(dt));
    g.scale.set(Math.max(0.01, sw(dt) - GAP) * s, s, Math.max(0.01, sd(dt) - GAP) * s);
    glow.current = Math.max(0, glow.current - dt * 0.9);
    if (mat.current) mat.current.emissiveIntensity = glow.current * 0.9 + (type === "deep" ? 0.14 : 0);
  });
  const marks: [number, number, number, number, number, number][] = [];
  if (type === "moveout") extras = []; // empty home: no furniture // x z w h d y, in unit room space
  if (r.kind === "living" && extras.includes("sofa")) marks.push([0, -0.3, 0.55, 0.9, 0.16, 0]);
  if (r.kind === "living" && extras.includes("carpet")) marks.push([0, 0.12, 0.6, 0.12, 0.45, 0]);
  if (r.kind === "kitchen" && extras.includes("oven")) marks.push([-0.22, -0.32, 0.18, 1.1, 0.18, 0]);
  if (r.kind === "kitchen" && extras.includes("fridge")) marks.push([0.22, -0.32, 0.16, 2.4, 0.16, 0]);
  return (
    <group ref={ref}>
      <mesh position={[0, BLOCK / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, BLOCK, 1]} />
        <meshStandardMaterial ref={mat} color={TONE[r.kind]} emissive="#FFFFFF" emissiveIntensity={0} roughness={0.85} metalness={0} transparent={type === "moveout"} opacity={type === "moveout" ? 0.28 : 1} depthWrite={type !== "moveout"} />
        <Edges color={type === "deep" ? "#FFFFFF" : type === "moveout" ? "#BDBDBD" : "#0E0E0E"} />
      </mesh>
      {marks.map(([x, z, w, hh, d], i) => (
        <mesh key={i} position={[x, BLOCK + (BLOCK * hh) / 2, z]} scale={[w, BLOCK * hh, d]}>
          <boxGeometry />
          <meshStandardMaterial color="#F2F2F2" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Stairs({ x, d, rise, run }: { x: number; d: number; rise: number; run: number }) {
  const n = 9, w = run * 0.62, depth = (d * 0.8) / n;
  return (
    <group position={[x, 0, -d * 0.4]}>
      {Array.from({ length: n }, (_, i) => {
        const hgt = (rise * (i + 1)) / n;
        return (
          <mesh key={i} position={[0, hgt / 2, depth * (i + 0.5)]}>
            <boxGeometry args={[w, hgt, depth * 0.96]} />
            <meshStandardMaterial color="#3A3A3A" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Floor({ plan, y, top, rise, focus, extras, balcony, windows, type }: { type: string; plan: FloorPlan; y: number; top: boolean; rise: number; focus: Focus | null; extras: string[]; balcony: boolean; windows: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const py = useSpring(y, y + 1.4, 90, 15);
  const fade = useRef(0);
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  const sw = useSpring(plan.W, plan.W, 140, 18), sd = useSpring(plan.D, plan.D, 140, 18);
  const slab = useRef<THREE.Mesh>(null), box = useRef<THREE.Mesh>(null), bal = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.y = py(dt);
    const w = sw(dt), d = sd(dt);
    slab.current?.scale.set(w + 0.14, 1, d + 0.14); box.current?.scale.set(w, 1, d);
    if (bal.current) bal.current.position.set(w * 0.12, 0, d / 2 + 0.32);
    fade.current = Math.min(1, fade.current + dt * 2.2);
    if (glass.current) glass.current.opacity = 0.1 * fade.current;
  });
  const { W, D } = plan;
  return (
    <group ref={ref}>
      <mesh ref={slab} position={[0, -SLAB / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, SLAB, 1]} />
        <meshStandardMaterial color="#2C2C2C" roughness={0.9} />
        <Edges color="#5A5A5A" />
      </mesh>
      {plan.rooms.map((r) => <Block key={r.id} r={r} focus={focus} extras={extras} type={type} />)}
      {balcony && (
        <group ref={bal}>
          <mesh position={[0, -SLAB / 2, 0]}><boxGeometry args={[W * 0.5, SLAB, 0.5]} /><meshStandardMaterial color="#2C2C2C" /><Edges color="#5A5A5A" /></mesh>
          <mesh position={[0, 0.14, 0]}><boxGeometry args={[W * 0.5, 0.28, 0.5]} /><meshStandardMaterial color="#9AA3AD" transparent opacity={0.06} depthWrite={false} /><Edges color="#CFCFCF" /></mesh>
        </group>
      )}
      {windows && [-0.25, 0.25].map((f) => (
        <mesh key={f} position={[W * f, WALL_H * 0.55, D / 2 + 0.002]}><planeGeometry args={[W * 0.22, WALL_H * 0.4]} /><meshStandardMaterial color="#FFFFFF" transparent opacity={0.22} side={THREE.DoubleSide} /><Edges color="#FFFFFF" /></mesh>
      ))}
      {!top && <Stairs x={-W / 2 + plan.hw / 2} d={D} rise={rise} run={plan.hw} />}
      <mesh ref={box} position={[0, WALL_H / 2, 0]} renderOrder={2}>
        <boxGeometry args={[1, WALL_H, 1]} />
        <meshStandardMaterial ref={glass} color="#9AA3AD" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} roughness={0.1} metalness={0.1} />
        <Edges color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function Roof({ W, D, y, show, ghost }: { W: number; D: number; y: number; show: boolean; ghost: boolean }) {
  const rm = useRef<THREE.MeshStandardMaterial>(null);
  const op = useSpring(ghost ? 0.35 : 1, 1, 80, 16);
  const ref = useRef<THREE.Group>(null);
  const py = useSpring(y, y + 1, 90, 15), sc = useSpring(show ? 1 : 0, 0.001, 140, 16);
  const geo = useMemo(() => {
    const hw = D / 2 + 0.06, h = D * 0.3;
    const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: W + 0.12, bevelEnabled: false });
    g.translate(0, 0, -(W + 0.12) / 2); g.rotateY(Math.PI / 2); return g;
  }, [W, D]);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    const s = Math.max(0.001, sc(dt)); g.position.y = py(dt); if (rm.current) { const o = op(dt); rm.current.opacity = o; rm.current.depthWrite = o > 0.95; } g.scale.setScalar(s); g.visible = s > 0.02;
  });
  return (
    <group ref={ref}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial ref={rm} color="#4A4A4A" roughness={0.75} flatShading transparent />
        <Edges color="#8A8A8A" />
      </mesh>
    </group>
  );
}

function Fit({ scale, y, spin, glide, children }: { scale: number; y: number; spin: boolean; glide: { y: number; n: number } | null; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const until = useRef(0), seen = useRef(-1);
  useEffect(() => { if (glide && glide.n !== seen.current) { seen.current = glide.n; until.current = performance.now() + 1800; } }, [glide]);
  const s = useSpring(scale, scale, 60, 14);
  const sRef = useRef({ x: y, v: 0 });
  useFrame((_, dt) => { const g = ref.current; if (!g) return; g.scale.setScalar(s(dt));
    const t = glide && performance.now() < until.current ? 0.15 - glide.y : y;
    const st = sRef.current, k = Math.min(dt, 1 / 30); st.v += ((t - st.x) * 40 - st.v * 12) * k; st.x += st.v * k; g.position.y = st.x; if (spin) g.rotation.y += dt * 0.08; });
  return <group ref={ref}>{children}</group>;
}

export default function House({ home, openFloors, roof, focus = null }: { home: Home; openFloors: boolean; roof: boolean; focus?: Focus | null }) {
  const extras = home.extras ?? [];
  const floors = useMemo(() => planFloors(home), [home]);
  const [reduce, setReduce] = useState(false);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)"); setReduce(m.matches);
    const f = () => setReduce(m.matches); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  const step = WALL_H + SLAB + (openFloors ? OPEN_GAP : 0);
  const prevFloors = useRef(home.floors), glideN = useRef(0);
  const glideFloor = useMemo(() => {
    let f = -1;
    if (home.floors !== prevFloors.current) { f = home.floors - 1; prevFloors.current = home.floors; }
    else if (focus) {
      const k = focus.kind;
      f = k === "bedroom" ? (home.floors > 1 ? 1 : 0) : k === "bathroom" ? home.floors - 1 : ["kitchen", "living", "majlis", "maid"].includes(k) ? 0 : -1;
    }
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home.floors, focus?.n]);
  const topY = (home.floors - 1) * step + WALL_H;
  const roofY = topY + (home.floors === 1 ? 1.15 : openFloors ? 0.95 : 0.02);
  const height = roofY + (roof ? floors[0].D * 0.3 : 0);
  const size = Math.max(floors[0].W * 1.05, floors[0].D, height * 0.95);
  const fit = Math.min(1.3, 2.7 * Math.pow(size, -0.8));
  // camera glide: move the changed floor's centre to the view centre for a moment (off with reduced motion or one floor)
  const glide = useMemo(() => (glideFloor < 0 || reduce || home.floors === 1 ? null : { y: (glideFloor * step + WALL_H / 2) * fit, n: ++glideN.current }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [glideFloor, focus?.n, home.floors, reduce]);
  return (
    <Canvas
      onPointerDown={() => setHeld(true)}
      camera={{ position: [7.6, 5.6, 7.6], fov: 30 }}
      dpr={[1, 1.75]} shadows gl={{ antialias: true, alpha: true }}
      aria-label="3D model of your home">
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#FFFFFF", "#1A1A1A", 0.5]} />
      <directionalLight position={[3, 10, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -4]} intensity={0.3} />
      <Fit scale={fit} y={-(height * fit) / 2 + 0.15} spin={!reduce && !held} glide={glide}>
        {floors.map((p, i) => <Floor key={i} plan={p} y={i * step} top={i === floors.length - 1} rise={step} focus={focus} extras={extras} balcony={!!home.rooms?.includes("balcony") && i === floors.length - 1 && floors.length > 1 || (!!home.rooms?.includes("balcony") && floors.length === 1)} windows={extras.includes("windows")} type={home.type} />)}
        <Roof W={floors[0].W} D={floors[0].D} y={roofY} show={roof} ghost={home.floors === 1} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -SLAB - 0.005, 0]} receiveShadow>
          <circleGeometry args={[4.2, 64]} />
          <meshStandardMaterial color="#141414" roughness={1} />
        </mesh>
        <ContactShadows position={[0, -SLAB, 0]} opacity={0.6} scale={8} blur={2.6} far={3} />
      </Fit>
      <OrbitControls makeDefault enablePan={false} enableZoom minDistance={7} maxDistance={16} minPolarAngle={0.55} maxPolarAngle={1.2} enableDamping />
    </Canvas>
  );
}

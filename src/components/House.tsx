"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Home } from "@/lib/engine";
import { ROOM_COLORS } from "./rooms";

type Kind = "living" | "kitchen" | "bedroom" | "bathroom" | "hall" | "maid" | "majlis";
export type Focus = { kind: string; n: number };
type Room = { id: string; kind: Kind; x: number; w: number };
type FloorPlan = { W: number; D: number; rooms: Room[] };

// Matte dollhouse cutaway in one grey family (Nick's Mossline look): opaque floor, back and side walls, open front and top.
const SLAB = 0.12, WALL_H = 0.95, WALL_T = 0.06, OPEN_GAP = 0.75;
const G = { slab: "#5E5E5E", wall: "#585858", part: "#626262", furn: "#7A7A7A", soft: "#E8E8E8", stair: "#7C7C7C", roof: "#8C8C8C" };
const FLOOR_TONE: Record<Kind, string> = { ...ROOM_COLORS, maid: ROOM_COLORS.bedroom, majlis: ROOM_COLORS.living } as Record<Kind, string>;
const WEIGHT: Record<Kind, number> = { living: 3, kitchen: 2, bedroom: 2.2, bathroom: 1.1, hall: 1, maid: 1.2, majlis: 2.4 };

export function planFloors(h: Home): FloorPlan[] {
  const side = Math.sqrt(h.sqft / h.floors) / 12;
  const W = Math.max(2.4, side * 1.45), D = Math.max(1.25, side / 1.45);
  const lists: Kind[][] = Array.from({ length: h.floors }, () => []);
  lists[0].push("living", "kitchen");
  if (h.rooms?.includes("majlis")) lists[0].push("majlis");
  if (h.rooms?.includes("maid")) lists[0].push("maid");
  const up = h.floors - 1;
  for (let i = 0; i < h.bedrooms; i++) lists[up ? 1 + (i % up) : 0].push("bedroom");
  const full = Math.floor(h.bathrooms) + (h.bathrooms % 1 ? 1 : 0);
  for (let i = 0; i < full; i++) lists[h.floors - 1 - (i % h.floors)].push("bathroom");
  for (let f = 1; f < h.floors; f++) if (!lists[f].some((k) => k !== "bathroom")) lists[f].unshift("living");
  return lists.map((items, f) => {
    const all: Kind[] = [...items, "hall"]; // hall with stairs at the right end
    const tot = all.reduce((s, k) => s + WEIGHT[k], 0);
    let x = -W / 2; const cnt: Record<string, number> = {};
    const rooms = all.map((k) => { const w = (W * WEIGHT[k]) / tot; cnt[k] = (cnt[k] ?? 0) + 1; const r = { id: `${f}-${k}-${cnt[k]}`, kind: k, x: x + w / 2, w }; x += w; return r; });
    return { W, D, rooms };
  });
}

function useSpring(target: number, init: number, stiff = 120, damp = 16) {
  const s = useRef({ x: init, v: 0 });
  return (dt: number) => { const st = s.current, t = Math.min(dt, 1 / 30); st.v += ((target - st.x) * stiff - st.v * damp) * t; st.x += st.v * t; return st.x; };
}

const M = ({ c, e = 0 }: { c: string; e?: number }) => <meshStandardMaterial color={c} roughness={0.95} metalness={0} emissive="#FFFFFF" emissiveIntensity={e} />;
function B({ p, s, c, e }: { p: [number, number, number]; s: [number, number, number]; c: string; e?: number }) {
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s} /><M c={c} e={e} /></mesh>;
}

function Furniture({ kind, w, d, extras, empty, top }: { kind: Kind; w: number; d: number; extras: string[]; empty: boolean; top: boolean }) {
  if (kind === "hall") {
    if (top) return null;
    const n = 8, run = Math.min(0.42, w * 0.7), rise = WALL_H + SLAB, depth = (d * 0.85) / n;
    return <group position={[w / 2 - run / 2 - WALL_T, 0, d * 0.42]}>{Array.from({ length: n }, (_, i) => {
      const hh = (rise * (i + 1)) / n; return <B key={i} p={[0, hh / 2, -depth * (i + 0.5)]} s={[run, hh, depth * 0.98]} c={G.stair} />;
    })}</group>;
  }
  if (empty) return null;
  const k: React.ReactNode[] = [];
  const bz = -d / 2 + WALL_T;
  if (kind === "bedroom" || kind === "maid") {
    const bw = Math.min(w * 0.6, kind === "maid" ? 0.32 : 0.5), bl = Math.min(d * 0.55, 0.62);
    k.push(<B key="bed" p={[0, 0.07, bz + bl / 2 + 0.04]} s={[bw, 0.14, bl]} c={G.soft} />,
      <B key="pil" p={[0, 0.17, bz + 0.1]} s={[bw * 0.85, 0.06, 0.1]} c="#FFFFFF" />,
      <B key="hb" p={[0, 0.16, bz + 0.02]} s={[bw, 0.32, 0.04]} c={G.furn} />);
  }
  if (kind === "living" || kind === "majlis") {
    const sw = Math.min(w * 0.7, 1.1);
    k.push(<B key="sofa" p={[0, 0.08, bz + 0.16]} s={[sw, 0.16, 0.26]} c={extras.includes("sofa") ? G.soft : G.furn} />,
      <B key="back" p={[0, 0.2, bz + 0.05]} s={[sw, 0.24, 0.07]} c={extras.includes("sofa") ? G.soft : G.furn} />,
      <B key="tbl" p={[0, 0.06, bz + 0.6]} s={[sw * 0.4, 0.12, 0.2]} c={G.furn} />);
    if (extras.includes("carpet")) k.push(<B key="rug" p={[0, 0.006, bz + 0.55]} s={[sw * 0.75, 0.012, 0.5]} c="#D0D0D0" />);
    if (kind === "majlis") k.push(<B key="side" p={[-w / 2 + 0.16, 0.08, 0]} s={[0.24, 0.16, d * 0.6]} c={G.furn} />);
  }
  if (kind === "kitchen") {
    k.push(<B key="ctr" p={[0, 0.2, bz + 0.13]} s={[w * 0.85, 0.4, 0.24]} c={G.furn} />,
      <B key="isl" p={[0, 0.17, bz + 0.62]} s={[w * 0.45, 0.34, 0.24]} c={G.furn} />);
    if (extras.includes("oven")) k.push(<B key="ov" p={[-w * 0.15, 0.17, bz + 0.26]} s={[0.2, 0.26, 0.02]} c="#FFFFFF" />);
    if (extras.includes("fridge")) k.push(<B key="fr" p={[w * 0.32, 0.38, bz + 0.15]} s={[0.22, 0.76, 0.26]} c="#F2F2F2" />);
  }
  if (kind === "bathroom") {
    k.push(<B key="tub" p={[0, 0.1, bz + 0.17]} s={[Math.min(w * 0.7, 0.55), 0.2, 0.28]} c="#F0F0F0" />,
      <B key="sink" p={[w * 0.25, 0.2, d * 0.15]} s={[0.14, 0.4, 0.14]} c={G.furn} />);
  }
  return <>{k}</>;
}

function RoomView({ r, D, focus, extras, type, top }: { r: Room; D: number; focus: Focus | null; extras: string[]; type: string; top: boolean }) {
  const ref = useRef<THREE.Group>(null), mat = useRef<THREE.MeshStandardMaterial>(null), glow = useRef(0), last = useRef(-1);
  const hit = focus && (focus.kind === r.kind || focus.kind === "all" || (focus.kind === "bedroom" && r.kind === "maid")) ? focus.n : -1;
  useEffect(() => { if (hit >= 0 && hit !== last.current) { glow.current = 1; } last.current = hit; }, [hit]);
  const pop = useSpring(1, 0.001, 170, 13), px = useSpring(r.x, r.x), sw = useSpring(r.w, r.w);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return; const s = Math.max(0.001, pop(dt));
    g.position.x = px(dt); g.scale.set(s * (sw(dt) / r.w), s, s);
    glow.current = Math.max(0, glow.current - dt * 0.8);
    if (mat.current) mat.current.emissiveIntensity = glow.current * 0.55 + (type === "deep" ? 0.12 : 0);
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[r.w - 0.03, D - 0.03]} />
        <meshStandardMaterial ref={mat} color={FLOOR_TONE[r.kind]} roughness={1} emissive="#FFFFFF" emissiveIntensity={0} />
      </mesh>
      {/* partition wall on the left side of every room except the first */}
      <B p={[-r.w / 2, WALL_H * 0.4, 0]} s={[0.035, WALL_H * 0.8, D - 0.1]} c={G.part} />
      <Furniture kind={r.kind} w={r.w} d={D} extras={extras} empty={type === "moveout"} top={top} />
    </group>
  );
}

function Floor({ plan, y, top, focus, extras, balcony, windows, type }: { plan: FloorPlan; y: number; top: boolean; focus: Focus | null; extras: string[]; balcony: boolean; windows: boolean; type: string }) {
  const ref = useRef<THREE.Group>(null);
  const py = useSpring(y, y + 1.4, 90, 15), sw = useSpring(plan.W, plan.W, 140, 18), sd = useSpring(plan.D, plan.D, 140, 18);
  const slab = useRef<THREE.Mesh>(null), back = useRef<THREE.Mesh>(null), lw = useRef<THREE.Mesh>(null), rw = useRef<THREE.Mesh>(null), inner = useRef<THREE.Group>(null), bal = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.y = py(dt);
    const w = sw(dt), d = sd(dt), sx = w / plan.W, sz = d / plan.D;
    slab.current?.scale.set(w, 1, d); back.current?.scale.set(w, 1, 1); back.current?.position.setZ(-d / 2 + WALL_T / 2);
    lw.current?.scale.set(1, 1, d); lw.current?.position.setX(-w / 2 + WALL_T / 2); rw.current?.scale.set(1, 1, d); rw.current?.position.setX(w / 2 - WALL_T / 2);
    inner.current?.scale.set(sx, 1, sz);
    bal.current?.position.set(-w * 0.1, -SLAB / 2, d / 2 + 0.25);
  });
  const { W, D } = plan;
  return (
    <group ref={ref}>
      <mesh ref={slab} position={[0, -SLAB / 2, 0]} receiveShadow castShadow><boxGeometry args={[1, SLAB, 1]} /><M c={G.slab} /></mesh>
      <mesh ref={back} position={[0, WALL_H / 2, -D / 2]} castShadow receiveShadow><boxGeometry args={[1, WALL_H, WALL_T]} /><M c={G.wall} /></mesh>
      <mesh ref={lw} position={[-W / 2, WALL_H / 2, 0]} castShadow receiveShadow><boxGeometry args={[WALL_T, WALL_H, 1]} /><M c={G.wall} /></mesh>
      <mesh ref={rw} position={[W / 2, WALL_H / 2, 0]} castShadow receiveShadow><boxGeometry args={[WALL_T, WALL_H, 1]} /><M c={G.wall} /></mesh>
      <group ref={inner}>
        {plan.rooms.map((r, i) => i === 0 ? <group key={r.id}><RoomView r={r} D={D} focus={focus} extras={extras} type={type} top={top} /></group> : <RoomView key={r.id} r={r} D={D} focus={focus} extras={extras} type={type} top={top} />)}
        {windows && [-0.3, 0.05].map((f) => <B key={f} p={[W * f, WALL_H * 0.55, -D / 2 + WALL_T + 0.005]} s={[W * 0.16, WALL_H * 0.38, 0.01]} c="#BDBDBD" />)}
      </group>
      {balcony && <group ref={bal}><B p={[0, 0, 0]} s={[W * 0.4, SLAB, 0.5]} c={G.slab} /><B p={[0, 0.14, 0.23]} s={[W * 0.4, 0.22, 0.03]} c={G.wall} /></group>}
    </group>
  );
}

function hipRoof(W: number, D: number, h: number) {
  const r = Math.max(0, W / 2 - D / 2), x = W / 2, z = D / 2;
  const v = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-r, h, 0], [r, h, 0]];
  const f = [[3, 2, 5], [3, 5, 4], [1, 0, 4], [1, 4, 5], [2, 1, 5], [0, 3, 4], [0, 1, 2], [0, 2, 3]];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(f.flatMap((t) => t.flatMap((i) => v[i])), 3));
  g.computeVertexNormals(); return g;
}

function Roof({ W, D, y, show, ghost }: { W: number; D: number; y: number; show: boolean; ghost: boolean }) {
  const ref = useRef<THREE.Group>(null), rm = useRef<THREE.MeshStandardMaterial>(null);
  const py = useSpring(y, y + 1, 90, 15), sc = useSpring(show ? 1 : 0, 0.001, 140, 16), op = useSpring(ghost ? 0.3 : 1, 1, 80, 16);
  const geo = useMemo(() => hipRoof(W + 0.2, D + 0.2, D * 0.5), [W, D]);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return; const s = Math.max(0.001, sc(dt));
    g.position.y = py(dt); g.scale.setScalar(s); g.visible = s > 0.02;
    if (rm.current) { const o = op(dt); rm.current.opacity = o; rm.current.depthWrite = o > 0.95; }
  });
  return <group ref={ref}><mesh geometry={geo} castShadow><meshStandardMaterial ref={rm} color={G.roof} roughness={0.9} flatShading transparent side={THREE.DoubleSide} /></mesh></group>;
}

function Fit({ scale, y, spin, glide, children }: { scale: number; y: number; spin: boolean; glide: { y: number; n: number } | null; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null), until = useRef(0), seen = useRef(-1), st = useRef({ x: y, v: 0 });
  useEffect(() => { if (glide && glide.n !== seen.current) { seen.current = glide.n; until.current = performance.now() + 1800; } }, [glide]);
  const s = useSpring(scale, scale, 60, 14), rot = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return; g.scale.setScalar(s(dt));
    const t = glide && performance.now() < until.current ? -glide.y : y;
    const k = Math.min(dt, 1 / 30), p = st.current; p.v += ((t - p.x) * 40 - p.v * 12) * k; p.x += p.v * k; g.position.y = p.x;
    if (spin) { rot.current += dt * 0.25; g.rotation.y = Math.sin(rot.current) * 0.35; }
  });
  return <group ref={ref}>{children}</group>;
}

export default function House({ home, openFloors, roof, focus = null }: { home: Home; openFloors: boolean; roof: boolean; focus?: Focus | null }) {
  const extras = home.extras ?? [];
  const floors = useMemo(() => planFloors(home), [home]);
  const [reduce, setReduce] = useState(false), [held, setHeld] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)"); setReduce(m.matches);
    const f = () => setReduce(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f);
  }, []);
  const step = WALL_H + SLAB + (openFloors ? OPEN_GAP : 0);
  const prevFloors = useRef(home.floors), glideN = useRef(0);
  const glideFloor = useMemo(() => {
    let f = -1;
    if (home.floors !== prevFloors.current) { f = home.floors - 1; prevFloors.current = home.floors; }
    else if (focus) { const k = focus.kind; f = k === "bedroom" ? (home.floors > 1 ? 1 : 0) : k === "bathroom" ? home.floors - 1 : ["kitchen", "living", "majlis", "maid"].includes(k) ? 0 : -1; }
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home.floors, focus?.n]);
  const topY = (home.floors - 1) * step + WALL_H;
  const roofY = topY + (home.floors === 1 ? 0.9 : openFloors ? 0.55 : 0.02);
  const height = roofY + (roof ? floors[0].D * 0.5 : 0);
  const size = Math.max(floors[0].W * 0.9, height * 0.95);
  const fit = Math.min(0.75, 1.7 * Math.pow(size, -0.8));
  const glide = useMemo(() => (glideFloor < 0 || reduce || home.floors === 1 ? null : { y: (glideFloor * step + WALL_H / 2) * fit - 0.2, n: ++glideN.current }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [glideFloor, focus?.n, home.floors, reduce]);
  const R = Math.max(floors[0].W, floors[0].D) * 0.85 + 0.6;
  return (
    <Canvas onPointerDown={() => setHeld(true)} camera={{ position: [2.2, 2.4, 9.2], fov: 30 }} dpr={[1, 1.75]} shadows gl={{ antialias: true, alpha: true }} aria-label="3D model of your home">
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#FFFFFF", "#3A3A3A", 0.6]} />
      <directionalLight position={[3, 9, 7]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <directionalLight position={[-5, 3, 6]} intensity={0.35} />
      <Fit scale={fit} y={-(height * fit) / 2 + 0.35} spin={!reduce && !held} glide={glide}>
        {floors.map((p, i) => <Floor key={i} plan={p} y={i * step} top={i === floors.length - 1} focus={focus} extras={extras}
          balcony={!!home.rooms?.includes("balcony") && i === floors.length - 1} windows={extras.includes("windows")} type={home.type} />)}
        <Roof W={floors[0].W} D={floors[0].D} y={roofY} show={roof} ghost={home.floors === 1} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -SLAB - 0.01, 0]} scale={[1.5, 1, 1]} receiveShadow>
          <circleGeometry args={[R, 72]} /><meshStandardMaterial color="#4A4A4A" roughness={1} />
        </mesh>
        <ContactShadows position={[0, -SLAB, 0]} opacity={0.45} scale={R * 3} blur={2.4} far={2} />
      </Fit>
      <OrbitControls makeDefault enablePan={false} enableZoom minDistance={6.5} maxDistance={14} minPolarAngle={0.9} maxPolarAngle={1.5} minAzimuthAngle={-1.1} maxAzimuthAngle={1.1} enableDamping />
    </Canvas>
  );
}

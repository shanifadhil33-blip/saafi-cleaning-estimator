'use client';
/**
 * House.tsx
 * Matte grey dollhouse cutaway for react-three-fiber. Rebuilds live from
 * (sqft, floors, bedrooms, bathrooms) using houseLayout.ts.
 *
 * Every piece has a stable key, so when inputs change pieces spring to their new
 * place, new ones pop in with a small stagger and removed ones shrink away.
 * The camera refits smoothly so the whole house stays inside the visible area.
 *
 * Usage (Next.js App Router, client only):
 *   const HouseCanvas = dynamic(() => import('@/components/House'), { ssr: false });
 *   <HouseCanvas sqft={2200} floors={2} bedrooms={3} bathrooms={2}
 *     insets={{ top: 96, bottom: 170 }} />   // px covered by your title and price card
 *
 * For a phone bottom sheet, pass a function so the house recentres every frame
 * while the sheet moves:  insets={() => ({ top: 110, bottom: innerHeight - sheetTop })}
 *
 * Tested against three 0.170 and @react-three/fiber 9.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { computeLayout, wedgePositions, writeRoof, ROOF_VERTS } from '@/lib/houseLayout';
import type { HouseInput, HouseLayout, Motion, Shape, Tone } from '@/lib/houseLayout';

export const TONES: Record<Tone, string> = {
  slab: '#a2a2a2',
  wall: '#b3b3b3',
  f1: '#e3e3e3',
  f2: '#c2c2c2',
  f3: '#7c7c7c',
  soft: '#f2f2f2',
  stair: '#bcbcbc',
  rail: '#8a8a8a',
};
const ROOF_TONE = '#8a8a8a';

/** Camera framing. Azimuth and elevation are in radians; 0 azimuth looks straight at the open front. */
const VIEW = { az: 0.42, el: 0.37, sway: 0.26, swaySpeed: 0.2, fov: 30 };

export type Insets = { top: number; bottom: number };

export interface HouseCanvasProps extends HouseInput {
  /** Pixels at the top and bottom of the canvas covered by UI. A function is read every frame. */
  insets?: Insets | (() => Insets);
  /** Slow idle sway around the front three quarter view. */
  autoRotate?: boolean;
  /** Scale on top of the automatic fit. Above 1 brings the house closer. */
  zoom?: number;
  className?: string;
  style?: CSSProperties;
}

type Spring = [number, number];
const spring = (x: number, v: number, t: number, k: number, c: number, dt: number): Spring => {
  const nv = v + (k * (t - x) - c * v) * dt;
  return [x + nv * dt, nv];
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function useReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    ref.current = mq.matches;
    const on = () => {
      ref.current = mq.matches;
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ref;
}

/* ------------------------------------------------------------------ */
/* House: diffed, keyed meshes                                          */
/* ------------------------------------------------------------------ */

interface Live {
  mesh: THREE.Mesh;
  m: Motion;
  cur: number[];
  vel: number[];
  tgt: number[];
  a: number;
  av: number;
  aT: 0 | 1;
  delay: number;
}

export function House({ layout }: { layout: HouseLayout }) {
  const group = useRef<THREE.Group>(null);
  const roofMesh = useRef<THREE.Mesh>(null);
  const live = useRef(new Map<string, Live>());
  const first = useRef(true);
  const lastFloors = useRef(0);
  const reduced = useReducedMotion();
  const roof = useRef({ cur: null as number[] | null, vel: [0, 0, 0, 0], a: 0, av: 0, delay: 0, key: '' });

  const shared = useMemo(() => {
    const wedge = new THREE.BufferGeometry();
    wedge.setAttribute('position', new THREE.Float32BufferAttribute(wedgePositions(), 3));
    wedge.computeVertexNormals();
    const geos: Record<Shape, THREE.BufferGeometry> = {
      box: new THREE.BoxGeometry(1, 1, 1),
      wedge,
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 28),
      sph: new THREE.SphereGeometry(0.5, 24, 16),
    };
    const mats = {} as Record<Tone, THREE.MeshStandardMaterial>;
    (Object.keys(TONES) as Tone[]).forEach((k) => {
      mats[k] = new THREE.MeshStandardMaterial({ color: TONES[k], roughness: 0.94, metalness: 0 });
    });
    const roofPos = new Float32Array(ROOF_VERTS * 3);
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.BufferAttribute(roofPos, 3));
    const roofMat = new THREE.MeshStandardMaterial({ color: ROOF_TONE, roughness: 0.9, metalness: 0, flatShading: true });
    return { geos, mats, roofPos, roofGeo, roofMat };
  }, []);

  useEffect(
    () => () => {
      Object.values(shared.geos).forEach((g) => g.dispose());
      Object.values(shared.mats).forEach((m) => m.dispose());
      shared.roofGeo.dispose();
      shared.roofMat.dispose();
    },
    [shared],
  );

  // Diff the new layout against what is on screen.
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    const map = live.current;
    const red = reduced.current;
    const seen = new Set<string>();
    const floorsAdded = layout.F > lastFloors.current && !first.current;
    let seq = 0;
    layout.items.forEach((it, idx) => {
      seen.add(it.k);
      const tgt = [it.x, it.y, it.z, it.w, it.h, it.d];
      const o = map.get(it.k);
      if (!o) {
        const mesh = new THREE.Mesh(shared.geos[it.s], shared.mats[it.c]);
        mesh.castShadow = it.c !== 'f3' || it.h > 0.05;
        mesh.receiveShadow = true;
        mesh.visible = false;
        g.add(mesh);
        const delay = first.current
          ? 0.25 + it.f * 0.26 + (it.m === 'pop' ? 0.34 : 0) + idx * 0.0016
          : 0.03 + (it.m === 'pop' ? 0.08 : 0) + (floorsAdded ? Math.max(0, it.f - lastFloors.current + 1) * 0.07 : 0) + Math.min(0.3, seq++ * 0.006);
        map.set(it.k, { mesh, m: it.m, cur: tgt.slice(), vel: [0, 0, 0, 0, 0, 0], tgt, a: red ? 1 : 0, av: 0, aT: 1, delay: red ? 0 : delay });
      } else {
        o.tgt = tgt;
        if (red) {
          o.cur = tgt.slice();
          o.a = 1;
        }
        if (o.aT === 0) {
          o.aT = 1;
          o.delay = 0;
        }
        o.mesh.material = shared.mats[it.c];
        o.mesh.geometry = shared.geos[it.s];
      }
    });
    map.forEach((o, k) => {
      if (seen.has(k)) return;
      if (red) {
        g.remove(o.mesh);
        map.delete(k);
      } else {
        o.aT = 0;
        o.delay = 0;
      }
    });
    const r = layout.roof;
    const R = roof.current;
    if (!R.cur) {
      R.cur = red ? [r.y, r.w, r.d, r.h] : [r.y + 3.2, r.w, r.d, r.h];
      R.a = red ? 1 : 0;
      R.delay = red ? 0 : 0.25 + layout.F * 0.26 + 0.2;
    } else if (red) {
      R.cur = [r.y, r.w, r.d, r.h];
    }
    lastFloors.current = layout.F;
    first.current = false;
  }, [layout, shared, reduced]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const total = Math.min(0.05, delta);
    const steps = total > 0.02 ? 2 : 1;
    const dt = total / steps;
    const map = live.current;
    const R = roof.current;
    const r = layout.roof;
    for (let s = 0; s < steps; s++) {
      map.forEach((o, k) => {
        if (o.delay > 0) {
          o.delay -= dt;
          return;
        }
        for (let i = 0; i < 6; i++) [o.cur[i], o.vel[i]] = spring(o.cur[i], o.vel[i], o.tgt[i], 150, 23, dt);
        if (o.aT === 0) [o.a, o.av] = spring(o.a, o.av, 0, 260, 34, dt);
        else if (o.m === 'pop') [o.a, o.av] = spring(o.a, o.av, 1, 190, 15.5, dt);
        else [o.a, o.av] = spring(o.a, o.av, 1, 120, 22, dt);
        if (o.aT === 0 && o.a < 0.02) {
          g.remove(o.mesh);
          map.delete(k);
        }
      });
      if (R.cur) {
        if (R.delay > 0) R.delay -= dt;
        else {
          const t = [r.y, r.w, r.d, r.h];
          for (let i = 0; i < 4; i++) [R.cur[i], R.vel[i]] = spring(R.cur[i], R.vel[i], t[i], i === 0 ? 90 : 150, i === 0 ? 16 : 23, dt);
          [R.a, R.av] = spring(R.a, R.av, 1, 120, 20, dt);
        }
      }
    }

    map.forEach((o) => {
      const a = Math.max(0, o.a);
      const m = o.mesh;
      if (a < 0.002) {
        m.visible = false;
        return;
      }
      m.visible = true;
      let sx = a;
      let sy = a;
      let sz = a;
      if (o.m === 'rise') {
        sx = sz = 1;
        sy = Math.min(a, 1.02);
      } else if (o.m === 'slab') {
        sx = sz = 0.82 + 0.18 * Math.min(a, 1);
        sy = Math.min(a, 1);
      }
      m.scale.set(Math.max(1e-4, o.cur[3] * sx), Math.max(1e-4, o.cur[4] * sy), Math.max(1e-4, o.cur[5] * sz));
      m.position.set(o.cur[0], o.cur[1] + (o.cur[4] * sy) / 2, o.cur[2]);
    });

    const rm = roofMesh.current;
    if (rm && R.cur) {
      const [ry, rw, rd, rh] = R.cur;
      const long = rw >= rd;
      const key = `${rw.toFixed(3)}|${rd.toFixed(3)}|${rh.toFixed(3)}`;
      if (key !== R.key) {
        writeRoof(shared.roofPos, long ? rw : rd, long ? rd : rw, rh);
        shared.roofGeo.attributes.position.needsUpdate = true;
        shared.roofGeo.computeVertexNormals();
        shared.roofGeo.computeBoundingSphere();
        R.key = key;
      }
      const ra = clamp(R.a, 0, 1.02);
      rm.visible = ra > 0.002;
      rm.rotation.y = long ? 0 : Math.PI / 2;
      rm.position.y = ry;
      rm.scale.setScalar(Math.max(1e-4, 0.85 + 0.15 * ra));
    }
  });

  return (
    <group ref={group}>
      <mesh ref={roofMesh} geometry={shared.roofGeo} material={shared.roofMat} visible={false} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ground: soft grey ellipse plus a shadow catcher                      */
/* ------------------------------------------------------------------ */

export function HouseGround({ layout }: { layout: HouseLayout }) {
  const disc = useRef<THREE.Mesh>(null);
  const catcher = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0.085)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.055)');
    gr.addColorStop(0.85, 'rgba(255,255,255,0.02)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 8);
    const gw = (layout.W + 4) * 1.55;
    const gd = (layout.D + 4) * 1.75;
    if (disc.current) {
      const s = disc.current.scale;
      s.set(s.x + (gw - s.x) * k, s.y + (gd - s.y) * k, 1);
    }
    if (catcher.current) {
      const s = catcher.current.scale;
      s.set(s.x + (gw * 1.3 - s.x) * k, s.y + (gd * 1.3 - s.y) * k, 1);
    }
  });
  return (
    <>
      <mesh ref={disc} rotation-x={-Math.PI / 2} position-y={-0.01} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
      <mesh ref={catcher} rotation-x={-Math.PI / 2} position-y={-0.005} renderOrder={-1} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <shadowMaterial opacity={0.4} depthWrite={false} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Lights: follow the house so shadows stay crisp at every size         */
/* ------------------------------------------------------------------ */

// three r155+ uses physical light units; multiplying by PI keeps the look of the HTML demo.
const PI = Math.PI;

export function HouseLights({ layout, shadowMapSize = 2048 }: { layout: HouseLayout; shadowMapSize?: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const l = sun.current;
    const f = fill.current;
    if (!l || !f) return;
    scene.add(l.target);
    l.position.set(layout.W * 0.4 + 7, layout.height + 22, layout.D * 0.6 + 12);
    l.target.position.set(0, layout.height * 0.35, 0);
    l.target.updateMatrixWorld();
    const s = Math.max(layout.W, layout.D, layout.height) * 0.85 + 3;
    const sc = l.shadow.camera;
    sc.left = -s;
    sc.right = s;
    sc.top = s;
    sc.bottom = -s;
    sc.near = 1;
    sc.far = 120;
    sc.updateProjectionMatrix();
    f.position.set(-layout.W - 10, layout.height * 0.7 + 6, layout.D * 0.4 + 6);
    return () => {
      scene.remove(l.target);
    };
  }, [layout, scene]);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#262626', 0.78 * PI]} />
      <directionalLight
        ref={sun}
        intensity={0.62 * PI}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />
      <directionalLight ref={fill} intensity={0.22 * PI} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Camera: idle sway, drag to orbit, smooth refit inside the insets     */
/* ------------------------------------------------------------------ */

export function CameraRig({ layout, sqft, insets, autoRotate = true, zoom = 1 }: { layout: HouseLayout; sqft: number; insets?: Insets | (() => Insets); autoRotate?: boolean; zoom?: number }) {
  const { camera, gl, size } = useThree();
  const reduced = useReducedMotion();
  const st = useRef({ az: VIEW.az, el: VIEW.el, center: VIEW.az, phase: 0, dist: NaN, dv: 0, ty: NaN, tv: 0, drag: null as null | { id: number; x: number; y: number } });

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    const s = st.current;
    const down = (e: PointerEvent) => {
      s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!s.drag || s.drag.id !== e.pointerId) return;
      s.az -= (e.clientX - s.drag.x) * 0.0068;
      s.el = clamp(s.el + (e.clientY - s.drag.y) * 0.0045, 0.05, 0.95);
      s.drag.x = e.clientX;
      s.drag.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (!s.drag || s.drag.id !== e.pointerId) return;
      s.drag = null;
      s.center = s.az - VIEW.sway * Math.sin(s.phase);
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const s = st.current;
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(0.05, delta);
    const red = reduced.current;
    if (!s.drag && autoRotate && !red) {
      s.phase += dt * VIEW.swaySpeed;
      s.center += (VIEW.az - s.center) * (1 - Math.exp(-dt * 0.1));
      s.az = s.center + VIEW.sway * Math.sin(s.phase);
      s.el += (VIEW.el - s.el) * (1 - Math.exp(-dt * 0.4));
    }

    // Centre the house in the part of the canvas that is not covered by UI.
    const cw = size.width;
    const ch = size.height;
    const ins = typeof insets === 'function' ? insets() : insets ?? { top: 0, bottom: 0 };
    const top = clamp(ins.top, 0, ch);
    let bottom = clamp(ch - ins.bottom, 0, ch);
    if (bottom - top < ch * 0.26) bottom = top + ch * 0.26;
    const yc = (top + bottom) / 2;
    cam.fov = VIEW.fov;
    cam.setViewOffset(cw, ch, 0, ch / 2 - yc, cw, ch);

    // Fit the bounding sphere, leaving a little more air around small homes.
    const half = THREE.MathUtils.degToRad(VIEW.fov / 2);
    const tanV = Math.tan(half) * ((bottom - top) / ch);
    const tanH = Math.tan(half) * ((cw - 32) / ch);
    const ang = Math.atan(Math.min(tanV, tanH));
    const fit0 = (layout as HouseLayout & { fit?: { w: number; d: number } }).fit;
    const rad = 0.5 * Math.hypot(Math.max(layout.roof.w, fit0?.w ?? 0), Math.max(layout.roof.d, fit0?.d ?? 0), layout.height);
    const t = clamp((sqft - 500) / 5500, 0, 1);
    const fit = (1.1 + 0.2 * Math.sqrt(t)) * zoom;
    const targetDist = rad / Math.sin(ang) / fit;
    const targetY = layout.height * 0.47;
    if (Number.isNaN(s.dist) || red) {
      s.dist = targetDist;
      s.ty = targetY;
    } else {
      const n = dt > 0.02 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        [s.dist, s.dv] = spring(s.dist, s.dv, targetDist, 26, 10, dt / n);
        [s.ty, s.tv] = spring(s.ty, s.tv, targetY, 26, 10, dt / n);
      }
    }
    const ce = Math.cos(s.el);
    cam.position.set(Math.sin(s.az) * ce * s.dist, s.ty + Math.sin(s.el) * s.dist, Math.cos(s.az) * ce * s.dist);
    cam.lookAt(0, s.ty, 0);
    cam.updateProjectionMatrix();
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Drop in canvas                                                       */
/* ------------------------------------------------------------------ */

export default function HouseCanvas({ sqft, floors, bedrooms, bathrooms, kind, maid, pool, balcony, insets, autoRotate = true, zoom = 1, className, style }: HouseCanvasProps) {
  const layout = useMemo(() => computeLayout({ sqft, floors, bedrooms, bathrooms, kind, maid, pool, balcony }), [sqft, floors, bedrooms, bathrooms, kind, maid, pool, balcony]);
  return (
    <Canvas
      className={className}
      style={style}
      flat
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: VIEW.fov, near: 0.5, far: 600, position: [20, 14, 40] }}
    >
      <HouseLights layout={layout} />
      <HouseGround layout={layout} />
      <House layout={layout} />
      <CameraRig layout={layout} sqft={sqft} insets={insets} autoRotate={autoRotate} zoom={zoom} />
    </Canvas>
  );
}

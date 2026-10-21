/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* Ported from Claude's houseLayout.ts (engine verbatim), plus home kinds. */
/**
    * houseLayout.ts
    * Pure, framework free layout engine for the dollhouse cutaway.
    * Input: sqft, floors, bedrooms, bathrooms. Output: a flat list of keyed
    * primitives (boxes, wedges, cylinders, spheres) plus a roof spec.
    * Keys are stable per room ("bed2.base", "f1.sl.a"), so a renderer can diff
    * two layouts and spring every piece to its new place instead of rebuilding.
    * Units are metres. Front of the house faces +z and is open.
    */


export type Shape = 'box' | 'wedge' | 'cyl' | 'sph';
export type Tone = 'slab' | 'wall' | 'f1' | 'f2' | 'f3' | 'soft' | 'stair' | 'rail';
/** How a piece enters. */
export type Motion = 'pop' | 'rise' | 'slab';


export interface LayoutItem {
    k: string; // stable key
    s: Shape;
    c: Tone;
    m: Motion;
    f: number; // floor index, used for stagger
    x: number; // centre x
    y: number; // bottom y
    z: number; // centre z
    w: number; // size x
    h: number; // size y
    d: number; // size z
}


export interface RoofSpec { y: number; w: number; d: number; h: number }


export interface HouseLayout {
    W: number;
    D: number;
    F: number;
    height: number;
    roof: RoofSpec;
    items: LayoutItem[];
}


export type HomeKind = "studio" | "apartment" | "townhouse" | "villa" | "penthouse";
export interface HouseInput { sqft: number; floors: number; bedrooms: number; bathrooms: number; kind?: HomeKind; maid?: boolean; pool?: boolean; balcony?: boolean }



  export const HC = {
    SLAB: 0.24,
    WALL: 2.55,
    GAP: 0.8,
    /** extra lift so the roof floats clear of the top floor */
    ROOF_LIFT: 1.15,
    T: 0.14,
    LANE: 1.25,
    STEPS: 12,
    RUN: 0.27,
    /** front height of a tapered wall as a fraction of its back height (shared by the wedge geometry) */
    TAPER: 0.36,
    /** height of interior partitions, cut low like an architect's section model */
    LOW: 0.82,
    /** depth of the full height wall return where a partition meets the back wall */
    STUB: 0.55,
    OVERHANG: 0.32,
    FASCIA: 0.14
  };
  export const PITCH = HC.SLAB + HC.WALL + HC.GAP;
  const ROOM = {
    living: { w: 1.75, min: 3.6 },
    kitchen: { w: 1.35, min: 3 },
    bed: { w: 1, min: 2.9 },
    bath: { w: 0.62, min: 1.9 },
    lounge: { w: 1.1, min: 3 },
    study: { w: 0.8, min: 2.4 }
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  function distribute(n, k) {
    const out = new Array(k).fill(Math.floor(n / k));
    for (let i = 0; i < n % k; i++) out[i]++;
    return out;
  }
  function interleave(a, b) {
    const out = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i < a.length) out.push(a[i]);
      if (i < b.length) out.push(b[i]);
    }
    return out;
  }
  export function assignRooms(F, beds, baths) {
    const bedR = Array.from({ length: beds }, (_, i) => ({ id: `bed${i + 1}`, type: "bed" }));
    const bathR = Array.from({ length: baths }, (_, i) => ({ id: `bath${i + 1}`, type: "bath" }));
    const kitchen2 = { id: "kitchen", type: "kitchen" };
    const living2 = { id: "living", type: "living" };
    if (F === 1) return [[kitchen2, ...interleave(bedR, bathR), living2]];
    const floors = Array.from({ length: F }, () => []);
    let bi = 0;
    let ba = 0;
    floors[0].push(kitchen2);
    if (baths >= 2) floors[0].push(bathR[ba++]);
    if (F === 2 && beds >= 5 || F === 3 && beds >= 6) floors[0].push(bedR[bi++]);
    floors[0].push(living2);
    const upBeds = distribute(beds - bi, F - 1);
    const upBaths = distribute(baths - ba, F - 1);
    for (let f = 1; f < F; f++) {
      const b = bedR.slice(bi, bi + upBeds[f - 1]);
      bi += upBeds[f - 1];
      const t = bathR.slice(ba, ba + upBaths[f - 1]);
      ba += upBaths[f - 1];
      const list = interleave(b, t);
      if (list.length < 2) list.push({ id: `lounge${f}`, type: "lounge" });
      if (list.length < 2) list.push({ id: `study${f}`, type: "study" });
      floors[f] = list;
    }
    return floors;
  }
  function splitRows(list) {
    const ws = list.map((r) => ROOM[r.type].w);
    const half = sum(ws) / 2;
    const back = [];
    const front = [];
    let acc = 0;
    list.forEach((r, i) => {
      if (front.length === 0 && (back.length === 0 || acc + ws[i] / 2 <= half)) {
        back.push(r);
        acc += ws[i];
      } else front.push(r);
    });
    if (!front.length && back.length > 1) front.push(back.pop());
    return [back, front];
  }
  function rowNeed(rooms) {
    return sum(rooms.map((r) => ROOM[r.type].min)) + HC.T * Math.max(0, rooms.length - 1);
  }
  function fitWidths(rooms, avail) {
    const n = rooms.length;
    const w = rooms.map((r) => ROOM[r.type].w);
    const mins = rooms.map((r) => ROOM[r.type].min);
    const fixed = new Array(n).fill(false);
    let out = mins.slice();
    for (let iter = 0; iter <= n; iter++) {
      const freeW = sum(w.filter((_, i) => !fixed[i]));
      const freeAvail = avail - sum(mins.filter((_, i) => fixed[i]));
      out = rooms.map((_, i) => fixed[i] ? mins[i] : w[i] / freeW * freeAvail);
      let changed = false;
      out.forEach((v, i) => {
        if (!fixed[i] && v < mins[i]) {
          fixed[i] = true;
          changed = true;
        }
      });
      if (!changed) return out;
    }
    return out;
  }
  class Builder {
    constructor() {
      this.items = [];
      this.f = 0;
    }
    add(k, c, x0, x1, y, h, z0, z1, s = "box", m = "pop") {
      const w = x1 - x0;
      const d = z1 - z0;
      if (w < 5e-3 || d < 5e-3 || h < 3e-3) return;
      this.items.push({ k, s, c, m, f: this.f, x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, w, h, d });
    }
    /** centred helper: cx, cz, size w, d */
    at(k, c, cx, cz, w, d, y, h, s = "box") {
      this.add(k, c, cx - w / 2, cx + w / 2, y, h, cz - d / 2, cz + d / 2, s);
    }
  }
  function bedroom(b, id, r, y0, master) {
    const rw = r.x1 - r.x0;
    const rd = r.z1 - r.z0;
    const dbl = rw >= 3.05;
    const bw = dbl ? 1.6 : 1;
    const bl = Math.min(2.05, rd - 0.9);
    const cx = (r.x0 + r.x1) / 2;
    const zb = r.z0 + 0.03;
    b.add(`${id}.rug`, "f3", cx - bw / 2 - 0.5, cx + bw / 2 + 0.5, y0, 0.014, zb + bl - 0.7, Math.min(r.z1 - 0.15, zb + bl + 0.85));
    b.add(`${id}.head`, "f2", cx - bw / 2 - 0.06, cx + bw / 2 + 0.06, y0, 1.05, zb, zb + 0.09);
    b.add(`${id}.base`, "f2", cx - bw / 2, cx + bw / 2, y0, 0.3, zb + 0.09, zb + bl);
    b.add(`${id}.mat`, "soft", cx - bw / 2 + 0.03, cx + bw / 2 - 0.03, y0 + 0.3, 0.2, zb + 0.11, zb + bl - 0.02);
    b.add(`${id}.duvet`, "f1", cx - bw / 2 - 0.02, cx + bw / 2 + 0.02, y0 + 0.28, 0.25, zb + 0.78, zb + bl + 0.02);
    if (dbl) {
      b.at(`${id}.p1`, "soft", cx - 0.4, zb + 0.34, 0.62, 0.36, y0 + 0.5, 0.13);
      b.at(`${id}.p2`, "soft", cx + 0.4, zb + 0.34, 0.62, 0.36, y0 + 0.5, 0.13);
    } else {
      b.at(`${id}.p1`, "soft", cx, zb + 0.34, 0.66, 0.36, y0 + 0.5, 0.13);
    }
    if (rw >= bw + 1.25) {
      for (const [side, sx] of [["l", -1], ["r", 1]]) {
        const nx = cx + sx * (bw / 2 + 0.33);
        b.at(`${id}.ns${side}`, "f2", nx, zb + 0.24, 0.46, 0.42, y0, 0.5);
        b.at(`${id}.lamp${side}`, "soft", nx, zb + 0.24, 0.2, 0.2, y0 + 0.5, 0.3, "cyl");
      }
    }
    if (rd >= bl + 1.75) {
      b.add(`${id}.dresser`, "f2", r.x1 - 0.52, r.x1 - 0.05, y0, 0.82, zb + bl + 0.35, Math.min(r.z1 - 0.12, zb + bl + 1.5));
    }
    if (master && dbl && rd >= bl + 0.9) {
      b.add(`${id}.bench`, "f2", cx - bw * 0.38, cx + bw * 0.38, y0, 0.42, zb + bl + 0.14, zb + bl + 0.52);
    }
  }
  function bathroom(b, id, r, y0) {
    const rw = r.x1 - r.x0;
    const rd = r.z1 - r.z0;
    const tubL = Math.min(1.65, rw - 0.14);
    const tx0 = r.x0 + 0.06;
    b.add(`${id}.tub`, "f1", tx0, tx0 + tubL, y0, 0.56, r.z0 + 0.02, r.z0 + 0.78);
    b.add(`${id}.basin`, "f3", tx0 + 0.1, tx0 + tubL - 0.1, y0 + 0.4, 0.168, r.z0 + 0.12, r.z0 + 0.68);
    const zt = Math.min(r.z0 + 1.25, r.z1 - 0.35);
    b.add(`${id}.tank`, "f1", r.x1 - 0.22, r.x1 - 0.04, y0, 0.78, zt - 0.2, zt + 0.2);
    b.add(`${id}.bowl`, "f1", r.x1 - 0.72, r.x1 - 0.22, y0, 0.42, zt - 0.19, zt + 0.19);
    if (rd >= 2.2) {
      const zv = Math.min(r.z0 + 1.65, r.z1 - 0.55);
      b.add(`${id}.vanity`, "f2", r.x0 + 0.04, r.x0 + 0.56, y0, 0.86, zv - 0.45, zv + 0.45);
      b.add(`${id}.sink`, "f3", r.x0 + 0.12, r.x0 + 0.48, y0 + 0.86, 0.035, zv - 0.24, zv + 0.24);
    }
    b.at(`${id}.mat`, "f3", (r.x0 + r.x1) / 2, r.z0 + 1.08, Math.min(0.8, rw - 1.1), 0.5, y0, 0.014);
  }
  function sofa(b, id, cx, z0, sw, y0) {
    b.add(`${id}.sback`, "f1", cx - sw / 2, cx + sw / 2, y0, 0.84, z0 + 0.04, z0 + 0.27);
    b.add(`${id}.seat`, "f1", cx - sw / 2 + 0.2, cx + sw / 2 - 0.2, y0, 0.42, z0 + 0.27, z0 + 0.98);
    b.add(`${id}.armL`, "f1", cx - sw / 2, cx - sw / 2 + 0.2, y0, 0.62, z0 + 0.04, z0 + 0.98);
    b.add(`${id}.armR`, "f1", cx + sw / 2 - 0.2, cx + sw / 2, y0, 0.62, z0 + 0.04, z0 + 0.98);
    const inner = sw - 0.44;
    b.add(`${id}.c1`, "soft", cx - inner / 2, cx - 0.02, y0 + 0.42, 0.11, z0 + 0.3, z0 + 0.94);
    b.add(`${id}.c2`, "soft", cx + 0.02, cx + inner / 2, y0 + 0.42, 0.11, z0 + 0.3, z0 + 0.94);
  }
  function plant(b, key, cx, cz, y0, scale = 1) {
    b.at(`${key}.pot`, "f2", cx, cz, 0.36 * scale, 0.36 * scale, y0, 0.42 * scale, "cyl");
    b.at(`${key}.leaf`, "f1", cx, cz, 0.72 * scale, 0.72 * scale, y0 + 0.36 * scale, 0.78 * scale, "sph");
  }
  function living(b, id, r, y0) {
    const rw = r.x1 - r.x0;
    const rd = r.z1 - r.z0;
    const cx = (r.x0 + r.x1) / 2;
    const sw = clamp(rw - 1.5, 1.5, 2.5);
    b.add(`${id}.rug`, "f3", Math.max(r.x0 + 0.25, cx - 1.7), Math.min(r.x1 - 0.25, cx + 1.7), y0, 0.014, r.z0 + 0.75, Math.min(r.z1 - 0.25, r.z0 + 3.2));
    sofa(b, id, cx, r.z0, sw, y0);
    b.at(`${id}.table`, "f2", cx, r.z0 + 1.75, 1.15, 0.62, y0, 0.38);
    if (rw >= 3.9 && rd >= 3) {
      for (const [side, sx] of [["l", -1], ["r", 1]]) {
        const ax = cx + sx * 1.42;
        b.at(`${id}.ch${side}`, "f1", ax, r.z0 + 1.75, 0.78, 0.8, y0, 0.42);
        b.at(`${id}.chb${side}`, "f1", ax + sx * 0.3, r.z0 + 1.75, 0.18, 0.8, y0, 0.8);
      }
    }
    if (cx - sw / 2 - 0.55 > r.x0 + 0.1) {
      b.at(`${id}.pole`, "f3", r.x0 + 0.34, r.z0 + 0.36, 0.05, 0.05, y0, 1.45, "cyl");
      b.at(`${id}.shade`, "soft", r.x0 + 0.34, r.z0 + 0.36, 0.42, 0.42, y0 + 1.42, 0.3, "cyl");
      plant(b, `${id}.pl`, r.x1 - 0.42, r.z0 + 0.44, y0);
    }
  }
  function kitchen(b, id, r, y0) {
    const rw = r.x1 - r.x0;
    const rd = r.z1 - r.z0;
    const cx = (r.x0 + r.x1) / 2;
    const fridge = rw >= 3 ? 0.86 : 0;
    const cx0 = r.x0 + 0.04;
    const cx1 = r.x1 - 0.04 - (fridge ? fridge + 0.04 : 0);
    b.add(`${id}.base`, "f2", cx0, cx1, y0, 0.86, r.z0 + 0.02, r.z0 + 0.64);
    b.add(`${id}.top`, "soft", cx0, cx1, y0 + 0.86, 0.05, r.z0 + 0.02, r.z0 + 0.68);
    const len = cx1 - cx0;
    b.at(`${id}.sink`, "f3", cx0 + len * 0.3, r.z0 + 0.36, Math.min(0.62, len * 0.25), 0.4, y0 + 0.91, 0.012);
    b.at(`${id}.hob`, "f3", cx0 + len * 0.72, r.z0 + 0.36, Math.min(0.6, len * 0.25), 0.44, y0 + 0.91, 0.012);
    if (fridge) b.add(`${id}.fridge`, "f1", r.x1 - 0.04 - fridge, r.x1 - 0.04, y0, 1.95, r.z0 + 0.02, r.z0 + 0.74);
    if (r.row === 0) b.add(`${id}.upper`, "f1", cx0, cx1, y0 + 1.5, 0.7, r.z0 + 0.02, r.z0 + 0.38);
    if (rd >= 3.4 && rw >= 2.8) {
      const iw = Math.min(1.9, rw - 1.3);
      b.at(`${id}.island`, "f2", cx, r.z0 + 2.05, iw, 0.84, y0, 0.88);
      b.at(`${id}.itop`, "soft", cx, r.z0 + 2.05, iw + 0.08, 0.92, y0 + 0.88, 0.05);
      const n = iw > 1.5 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const sx = cx - iw / 2 + iw / n * (i + 0.5);
        b.at(`${id}.stool${i}`, "f3", sx, r.z0 + 2.78, 0.36, 0.36, y0, 0.66, "cyl");
      }
    }
    if (rd >= 5.3 && rw >= 2.9) {
      const tz = r.z0 + 4.15;
      b.at(`${id}.dtable`, "f2", cx, tz, 1.6, 0.9, y0, 0.74);
      for (const [k, dz] of [["a", -1], ["b", 1]]) {
        for (const [j, dx] of [["0", -0.42], ["1", 0.42]]) {
          b.at(`${id}.chair${k}${j}`, "f1", cx + dx, tz + dz * 0.7, 0.44, 0.44, y0, 0.46);
          b.at(`${id}.chairb${k}${j}`, "f1", cx + dx, tz + dz * 0.89, 0.44, 0.06, y0, 0.92);
        }
      }
    }
  }
  function lounge(b, id, r, y0) {
    const rw = r.x1 - r.x0;
    const cx = (r.x0 + r.x1) / 2;
    const sw = clamp(rw - 1.4, 1.4, 2.2);
    b.add(`${id}.rug`, "f3", Math.max(r.x0 + 0.25, cx - 1.4), Math.min(r.x1 - 0.25, cx + 1.4), y0, 0.014, r.z0 + 0.7, Math.min(r.z1 - 0.25, r.z0 + 2.8));
    sofa(b, id, cx, r.z0, sw, y0);
    b.at(`${id}.ottoman`, "f2", cx, r.z0 + 1.6, 0.8, 0.8, y0, 0.4);
    if (rw >= sw + 1) b.add(`${id}.shelf`, "f2", r.x0 + 0.04, r.x0 + 0.42, y0, 1.6, r.z0 + 0.45, r.z0 + 1.65);
  }
  function study(b, id, r, y0) {
    const cx = (r.x0 + r.x1) / 2;
    b.at(`${id}.desk`, "f2", cx, r.z0 + 0.38, 1.4, 0.68, y0, 0.75);
    b.at(`${id}.screen`, "f3", cx, r.z0 + 0.16, 0.62, 0.05, y0 + 0.75, 0.38);
    b.at(`${id}.seat`, "f1", cx, r.z0 + 1.08, 0.5, 0.48, y0, 0.46);
    b.at(`${id}.seatb`, "f1", cx, r.z0 + 1.32, 0.5, 0.06, y0, 0.95);
    b.add(`${id}.shelf`, "f2", r.x1 - 0.42, r.x1 - 0.04, y0, 1.75, r.z0 + 0.04, r.z0 + 1.25);
    plant(b, `${id}.pl`, r.x0 + 0.4, r.z0 + 0.4, y0, 0.85);
  }
  function furnish(b, rect, y0) {
    const { room } = rect;
    switch (room.type) {
      case "bed":
        return bedroom(b, room.id, rect, y0, room.id === "bed1");
      case "bath":
        return bathroom(b, room.id, rect, y0);
      case "living":
        return living(b, room.id, rect, y0);
      case "kitchen":
        return kitchen(b, room.id, rect, y0);
      case "lounge":
        return lounge(b, room.id, rect, y0);
      case "study":
        return study(b, room.id, rect, y0);
    }
  }
  export function computeLayout(input) {
    const F = clamp(Math.round(input.floors), 1, 3);
    const kind = input.kind || "villa";
    const beds = clamp(Math.round(input.bedrooms), kind === "studio" ? 0 : 1, 6);
    const baths = clamp(Math.round(input.bathrooms), 1, 5);
    const sqft = clamp(input.sqft, 300, 1e4);
    const { T, SLAB, WALL, LANE, STEPS, RUN, LOW, STUB } = HC;
    const plan = assignRooms(F, beds, baths);
    if (input.maid) plan[0].splice(Math.min(1, plan[0].length), 0, { id: "maid", type: "bed" });
    const perFloor = sqft / F / 10.764;
    const A = 92 * Math.pow(perFloor / 92, 0.8);
    let D = kind === "townhouse" ? clamp(Math.sqrt(A * 1.1), 6, 14) : clamp(Math.sqrt(A / (kind === "villa" ? 2.1 : 1.8)), 4.8, 13);
    let W = A / D;
    const SC = F > 1 ? LANE * Math.min(F - 1, 2) : 0;
    const extra = 2 * T + (SC ? SC + T : 0);
    const oneRowNeed = Math.max(...plan.map(rowNeed));
    const two = D >= 8.4 || oneRowNeed + extra > W * 1.1;
    const rowsPerFloor = plan.map((list) => two ? splitRows(list) : [list, []]);
    if (two && D < 8.4) {
      D = 8.4;
      W = A / D;
    }
    const need = Math.max(...rowsPerFloor.map(([a, b2]) => Math.max(rowNeed(a), rowNeed(b2))));
    W = Math.max(W, need + extra, kind === "townhouse" ? 5 : 6);
    const b = new Builder();
    const xi0 = -W / 2 + T;
    const xi1 = W / 2 - T;
    const zi0 = -D / 2 + T;
    const zi1 = D / 2;
    const xr0 = SC ? xi0 + SC + T : xi0;
    const SL = STEPS * RUN;
    for (let f = 0; f < F; f++) {
      b.f = f;
      const yb = f * PITCH;
      const y0 = yb + SLAB;
      const [back, front] = rowsPerFloor[f];
      const hasFront = front.length > 0;
      const zb = hasFront ? zi0 + (zi1 - zi0) * 0.55 : zi1;
      if (f === 0) {
        b.add(`f${f}.sl.a`, "slab", -W / 2, W / 2, yb, SLAB, -D / 2, D / 2, "box", "slab");
      } else {
        const lane = (f - 1) % 2;
        const hx0 = xi0 + lane * LANE;
        const hx1 = hx0 + LANE;
        const hz1 = zi0 + SL;
        b.add(`f${f}.sl.a`, "slab", -W / 2, W / 2, yb, SLAB, hz1, D / 2, "box", "slab");
        b.add(`f${f}.sl.b`, "slab", -W / 2, hx0, yb, SLAB, -D / 2, hz1, "box", "slab");
        b.add(`f${f}.sl.c`, "slab", hx1, W / 2, yb, SLAB, -D / 2, hz1, "box", "slab");
        b.add(`f${f}.sl.d`, "slab", hx0, hx1, yb, SLAB, -D / 2, zi0, "box", "slab");
        b.add(`f${f}.rl.f`, "rail", hx0, hx1, y0, LOW, hz1 - 0.06, hz1, "box", "rise");
        if (lane === 1) b.add(`f${f}.rl.l`, "rail", hx0, hx0 + 0.06, y0, LOW, zi0, hz1, "box", "rise");
        if (hx1 < xi0 + SC - 0.01) b.add(`f${f}.rl.r`, "rail", hx1 - 0.06, hx1, y0, LOW, zi0, hz1, "box", "rise");
      }
      if (f < F - 1) {
        const lane = f % 2;
        const lx0 = xi0 + lane * LANE + 0.03;
        const lx1 = lx0 + LANE - 0.06;
        const rise = WALL / STEPS;
        for (let k = 0; k < STEPS; k++) {
          b.add(`f${f}.st.${k}`, "stair", lx0, lx1, y0, rise * (k + 1), zi0 + SL - (k + 1) * RUN, zi0 + SL - k * RUN, "box", "rise");
        }
      }
      if (SC && zi1 - (zi0 + SL) > 1.1) plant(b, `f${f}.hall`, xi0 + LANE / 2, zi0 + SL + 0.6, y0, 0.8);
      const rects = [];
      [back, front].forEach((rooms, ri) => {
        if (!rooms.length) return;
        const z0 = ri === 0 ? zi0 : zb + T / 2;
        const z1 = ri === 0 ? hasFront ? zb - T / 2 : zi1 : zi1;
        const avail = xi1 - xr0 - T * (rooms.length - 1);
        const ws = fitWidths(rooms, avail);
        let x = xr0;
        rooms.forEach((room, j) => {
          rects.push({ room, x0: x, x1: x + ws[j], z0, z1, row: ri });
          x += ws[j];
          if (j < rooms.length - 1) {
            if (ri === 0) {
              b.add(`f${f}.pt0.${j}`, "wall", x, x + T, y0, WALL, zi0, zi0 + STUB, "box", "rise");
              b.add(`f${f}.pl0.${j}`, "wall", x, x + T, y0, LOW, zi0 + STUB, z1, "box", "rise");
            } else b.add(`f${f}.pt1.${j}`, "wall", x, x + T, y0, LOW, z0 - T / 2, zi1, "box", "rise");
            x += T;
          }
        });
      });
      if (hasFront) b.add(`f${f}.zd`, "wall", xr0 - (SC ? T : 0), xi1, y0, LOW, zb - T / 2, zb + T / 2, "box", "rise");
      if (SC) {
        b.add(`f${f}.sp`, "wall", xi0 + SC, xi0 + SC + T, y0, WALL, zi0, zi0 + STUB, "box", "rise");
        b.add(`f${f}.sp2`, "wall", xi0 + SC, xi0 + SC + T, y0, LOW, zi0 + STUB, zi1, "box", "rise");
      }
      const ops = rects.filter((r) => r.row === 0 && r.room.type !== "kitchen").map((r) => {
        const cx = (r.x0 + r.x1) / 2;
        const bath = r.room.type === "bath";
        const ww = bath ? Math.min(0.7, (r.x1 - r.x0) * 0.34) : Math.min(1.5, (r.x1 - r.x0) * 0.42);
        return { x0: cx - ww / 2, x1: cx + ww / 2, sill: bath ? 1.55 : 0.92, head: bath ? 2.08 : 2.12 };
      }).sort((a, c) => a.x0 - c.x0);
      let cur = -W / 2;
      ops.forEach((o, n) => {
        b.add(`f${f}.bw.p${n}`, "wall", cur, o.x0, y0, WALL, -D / 2, -D / 2 + T, "box", "rise");
        b.add(`f${f}.bw.s${n}`, "wall", o.x0, o.x1, y0, o.sill, -D / 2, -D / 2 + T, "box", "rise");
        b.add(`f${f}.bw.h${n}`, "wall", o.x0, o.x1, y0 + o.head, WALL - o.head, -D / 2, -D / 2 + T, "box", "rise");
        cur = o.x1;
      });
      b.add(`f${f}.bw.p${ops.length}`, "wall", cur, W / 2, y0, WALL, -D / 2, -D / 2 + T, "box", "rise");
      b.add(`f${f}.sw.l`, "wall", -W / 2, -W / 2 + T, y0, WALL, -D / 2 + T, D / 2, "wedge", "rise");
      b.add(`f${f}.sw.r`, "wall", W / 2 - T, W / 2, y0, WALL, -D / 2 + T, D / 2, "wedge", "rise");
      rects.forEach((r) => furnish(b, r, y0));
    }
    const flat = kind === "apartment" || kind === "penthouse" || kind === "studio";
    b.f = 0;
    if (kind === "villa") {
      b.add("yard", "f3", -W / 2 - 2.2, W / 2 + 2.2, -0.06, 0.06, -D / 2 - 1.4, D / 2 + 3.6, "box", "slab");
      if (input.pool) {
        b.add("pool.rim", "slab", W / 2 - 3.6, W / 2 + 1.6, 0, 0.1, D / 2 + 0.6, D / 2 + 3.1, "box", "slab");
        b.add("pool.water", "soft", W / 2 - 3.3, W / 2 + 1.3, 0.1, 0.02, D / 2 + 0.9, D / 2 + 2.8, "box", "slab");
      }
      plant(b, "yard.p1", -W / 2 - 1.2, D / 2 + 2.2, 0, 1.2);
      plant(b, "yard.p2", -W / 2 - 1.3, -D / 2 + 0.4, 0, 1);
    }
    if (kind === "townhouse") {
      b.add("nb.l", "f3", -W / 2 - 0.9, -W / 2 - 0.06, 0, F * PITCH - HC.GAP, -D / 2, D / 2 - 1.2, "box", "rise");
      b.add("nb.r", "f3", W / 2 + 0.06, W / 2 + 0.9, 0, F * PITCH - HC.GAP, -D / 2, D / 2 - 1.2, "box", "rise");
    }
    if (kind === "apartment" || kind === "studio") {
      const top = F * PITCH - HC.GAP;
      b.add("bld.l", "f3", -W / 2 - 1.2, -W / 2 - 0.06, 0, top, -D / 2, -D / 2 + D * 0.55, "box", "rise");
      b.add("bld.r", "f3", W / 2 + 0.06, W / 2 + 1.2, 0, top, -D / 2, -D / 2 + D * 0.55, "box", "rise");
    }
    if (input.balcony || kind === "apartment" || kind === "penthouse") {
      const deep = kind === "penthouse" ? 2.6 : 1.3, f = F - 1, y = f * PITCH;
      const bx0 = kind === "penthouse" ? -W / 2 : -W * 0.3, bx1 = kind === "penthouse" ? W / 2 : W * 0.3;
      b.f = f;
      b.add("bal.slab", "slab", bx0, bx1, y, HC.SLAB, D / 2, D / 2 + deep, "box", "slab");
      b.add("bal.rail", "rail", bx0, bx1, y + HC.SLAB, 0.9, D / 2 + deep - 0.06, D / 2 + deep, "box", "rise");
      if (kind === "penthouse") plant(b, "bal.p", bx1 - 0.6, D / 2 + deep - 0.6, y + HC.SLAB, 1);
    }
    const rw = W + 2 * HC.OVERHANG;
    const rd = D + 2 * HC.OVERHANG;
    const rh = flat ? 0.12 : clamp(0.3 * Math.min(rw, rd), 1.4, 3.4);
    const roof = { y: F * PITCH + (flat ? HC.ROOF_LIFT * 0.55 : HC.ROOF_LIFT), w: rw, d: rd, h: rh };
    let fw = rw, fd = rd;
    if (kind === "villa") { fw = W + 4.4; fd = D + 5; } else if (kind === "apartment" || kind === "studio") fw = W + 2.4; else if (kind === "townhouse") fw = W + 1.8;
    if (input.balcony || kind === "apartment" || kind === "penthouse") fd = Math.max(fd, D + (kind === "penthouse" ? 5.2 : 2.6));
    return { W, D, F, height: roof.y + HC.FASCIA + rh, roof, items: b.items, fit: { w: fw, d: fd } };
  }
  export function wedgePositions(r = HC.TAPER) {
    const p = (x, y, z) => [x, y, z];
    const L = { bb: p(-0.5, -0.5, -0.5), bt: p(-0.5, 0.5, -0.5), ft: p(-0.5, -0.5 + r, 0.5), fb: p(-0.5, -0.5, 0.5) };
    const R = { bb: p(0.5, -0.5, -0.5), bt: p(0.5, 0.5, -0.5), ft: p(0.5, -0.5 + r, 0.5), fb: p(0.5, -0.5, 0.5) };
    const tris = [
      L.bb,
      L.fb,
      L.ft,
      L.bb,
      L.ft,
      L.bt,
      // left
      R.bb,
      R.ft,
      R.fb,
      R.bb,
      R.bt,
      R.ft,
      // right
      L.bb,
      R.bb,
      R.fb,
      L.bb,
      R.fb,
      L.fb,
      // bottom
      L.bb,
      L.bt,
      R.bt,
      L.bb,
      R.bt,
      R.bb,
      // back
      L.fb,
      R.fb,
      R.ft,
      L.fb,
      R.ft,
      L.ft,
      // front
      L.bt,
      L.ft,
      R.ft,
      L.bt,
      R.ft,
      R.bt
      // slope
    ];
    return tris.flat();
  }
  export function writeRoof(out, w, d, h, e = HC.FASCIA) {
    const hw = w / 2;
    const hd = d / 2;
    const rl = Math.max(0, (w - d) / 2);
    const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], Dd = [-hw, 0, hd];
    const A2 = [-hw, e, -hd], B2 = [hw, e, -hd], C2 = [hw, e, hd], D2 = [-hw, e, hd];
    const R1 = [-rl, e + h, 0], R2 = [rl, e + h, 0];
    const tris = [
      A,
      B,
      C,
      A,
      C,
      Dd,
      // bottom
      Dd,
      C,
      C2,
      Dd,
      C2,
      D2,
      // fascia front
      B,
      A,
      A2,
      B,
      A2,
      B2,
      // fascia back
      C,
      B,
      B2,
      C,
      B2,
      C2,
      // fascia right
      A,
      Dd,
      D2,
      A,
      D2,
      A2,
      // fascia left
      D2,
      C2,
      R2,
      D2,
      R2,
      R1,
      // roof front
      B2,
      A2,
      R1,
      B2,
      R1,
      R2,
      // roof back
      C2,
      B2,
      R2,
      // hip right
      A2,
      D2,
      R1
      // hip left
    ];
    let i = 0;
    for (const v of tris) {
      out[i++] = v[0];
      out[i++] = v[1];
      out[i++] = v[2];
    }
  }
  export const ROOF_VERTS = 48;

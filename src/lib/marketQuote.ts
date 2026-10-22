/** Bedroom, bathroom, and hourly pricing for the US, Canada, and UK demos. The GCC engine stays in quote.ts. */
import type { HomeKind } from "./houseLayout";
export type Lang = "en" | "es" | "fr";
export type Region = "us" | "ca" | "uk";
export type Freq = "once" | "weekly" | "biweekly" | "monthly";
export type BookChannel = "sms" | "whatsapp" | "email";
export type AreaStatus = "empty" | "partial" | "invalid" | "out" | "in";

export interface ServiceCfg {
  mode: "rooms" | "hourly" | "fixed";
  base: number;
  perBed: number;
  perBath: number;
  hourly: number;
  discount: boolean;
}
export interface ExtraCfg { price: number; max: number }
export interface RoomCfg { price: number; hours: number }
export interface Market {
  id: "us" | "ca" | "uk";
  currency: "USD" | "CAD" | "GBP";
  langs: Lang[];
  defaultLang: Lang;
  region: Region;
  areaKind: "zip" | "ca" | "uk";
  areas: string[];
  serviceOrder: string[];
  services: Record<string, ServiceCfg>;
  homeOrder: string[];
  homes: Record<string, number>;
  defaultHome: string;
  beds: number[];
  baths: number[];
  defaultBeds: number;
  defaultBaths: number;
  sizeOrder: string[];
  sizes: Record<string, number>;
  conditionOrder: string[];
  conditions: Record<string, number>;
  discounts: Record<Freq, number>;
  defaultFreq: Freq;
  minHours: number;
  hourChoices: number[];
  weekendPerHour: number;
  productsPerHour: number;
  defaultProducts: boolean;
  extraOrder: string[];
  extras: Record<string, ExtraCfg>;
  roomOrder: string[];
  rooms: Record<string, RoomCfg>;
  entryOrder: string[];
  parkingOrder: string[];
  contact: { phoneDisplay: string; phoneTel: string; email: string; whatsapp: string; book: BookChannel; also: BookChannel[] };
  payment: "card" | "after";
  showTax: boolean;
  showTip: boolean;
  nameShape: "split" | "single";
}

export interface MState {
  service: string;
  home: string;
  beds: number;
  baths: number;
  size: string;
  condition: string;
  hours: number;
  hoursTouched: boolean;
  rooms: string[];
  freq: Freq;
  extras: Record<string, number>;
  pets: "none" | "dog" | "cat" | "other";
  petsAway: boolean;
  products: boolean;
  weekend: boolean;
  tip: number;
  sqft: number;
  floors: number;
  maid: boolean;
}

export interface QuoteLine { id: string; qty: number; cents: number }
export interface Quote {
  cleaningCents: number;
  discountCents: number;
  discountPct: number;
  weekendCents: number;
  productsCents: number;
  lines: QuoteLine[];
  extrasCents: number;
  tipCents: number;
  totalCents: number;
  hours: number;
  fromCents: number;
  hourly: boolean;
}

export interface HomeSpec {
  min: number;
  max: number;
  sqft: number;
  atBeds: number;
  floors: [number, number];
  defFloors: number;
  beds: [number, number];
  baths: [number, number];
  visual: HomeKind;
}

const SPECS: Record<Market["id"], Record<string, HomeSpec>> = {
  us: {
    house: { min: 1200, max: 6000, sqft: 2200, atBeds: 2, floors: [1, 3], defFloors: 2, beds: [2, 6], baths: [1, 5], visual: "villa" },
    apartment: { min: 400, max: 2200, sqft: 900, atBeds: 2, floors: [1, 1], defFloors: 1, beds: [0, 4], baths: [1, 3], visual: "apartment" },
    condo: { min: 500, max: 2800, sqft: 1100, atBeds: 2, floors: [1, 2], defFloors: 1, beds: [1, 4], baths: [1, 4], visual: "apartment" },
    townhouse: { min: 1000, max: 4000, sqft: 1800, atBeds: 2, floors: [2, 3], defFloors: 2, beds: [2, 5], baths: [1, 4], visual: "townhouse" },
  },
  ca: {
    house: { min: 1200, max: 6000, sqft: 2200, atBeds: 2, floors: [1, 3], defFloors: 2, beds: [2, 6], baths: [1, 5], visual: "villa" },
    apartment: { min: 400, max: 2200, sqft: 900, atBeds: 2, floors: [1, 1], defFloors: 1, beds: [0, 4], baths: [1, 3], visual: "apartment" },
    condo: { min: 500, max: 2800, sqft: 1100, atBeds: 2, floors: [1, 2], defFloors: 1, beds: [1, 4], baths: [1, 4], visual: "apartment" },
    townhouse: { min: 1000, max: 4000, sqft: 1800, atBeds: 2, floors: [2, 3], defFloors: 2, beds: [2, 5], baths: [1, 4], visual: "townhouse" },
  },
  uk: {
    flat: { min: 350, max: 1600, sqft: 750, atBeds: 2, floors: [1, 1], defFloors: 1, beds: [0, 3], baths: [1, 2], visual: "apartment" },
    terraced: { min: 700, max: 2200, sqft: 1100, atBeds: 2, floors: [2, 3], defFloors: 2, beds: [1, 5], baths: [1, 3], visual: "townhouse" },
    semi: { min: 900, max: 3200, sqft: 1500, atBeds: 2, floors: [2, 3], defFloors: 2, beds: [2, 5], baths: [1, 4], visual: "villa" },
    detached: { min: 1400, max: 6000, sqft: 2400, atBeds: 2, floors: [1, 3], defFloors: 2, beds: [2, 6], baths: [1, 5], visual: "villa" },
  },
};

const TUNE: Record<Market["id"], { per100: number; perFloor: number; maid: number; materials: number }> = {
  us: { per100: 5, perFloor: 25, maid: 40, materials: 20 },
  ca: { per100: 6, perFloor: 30, maid: 45, materials: 22 },
  uk: { per100: 2, perFloor: 12, maid: 20, materials: 0 },
};

export function homeSpec(id: Market["id"], home: string): HomeSpec {
  const table = SPECS[id];
  return table[home] ?? Object.values(table)[0];
}
export function sqftFor(spec: HomeSpec, beds: number) {
  const snapped = Math.round((spec.sqft + (beds - spec.atBeds) * 150) / 50) * 50;
  return Math.max(spec.min, Math.min(spec.max, snapped));
}
export function sizeExtraDollars(m: Market, s: MState) {
  const spec = homeSpec(m.id, s.home);
  const tune = TUNE[m.id];
  const expected = sqftFor(spec, s.beds);
  const sq = s.sqft > 0 ? s.sqft : expected;
  const floors = s.floors || spec.defFloors;
  let extra = Math.round((sq - expected) / 100) * tune.per100;
  extra += (floors - spec.defFloors) * tune.perFloor;
  if (s.maid) extra += tune.maid;
  if (s.products && tune.materials) extra += tune.materials;
  return extra;
}
export function tuneOf(id: Market["id"]) { return TUNE[id]; }

export function channelHref(m: Market, channel: BookChannel, subject: string, body: string) {
  const text = encodeURIComponent(body);
  if (channel === "sms") return `sms:${m.contact.phoneTel}?body=${text}`;
  if (channel === "whatsapp") return `https://wa.me/${m.contact.whatsapp}?text=${text}`;
  return `mailto:${m.contact.email}?subject=${encodeURIComponent(subject)}&body=${text}`;
}

export function suggestedHours(beds: number, roomIds: string[], rooms: Market["rooms"]) {
  let h = beds <= 1 ? 2 : beds === 2 ? 3 : beds === 3 ? 4 : beds === 4 ? 4 : beds === 5 ? 5 : 6;
  for (const id of roomIds) h += rooms[id]?.hours || 0;
  return h;
}
export function snapHours(h: number, choices: number[]) {
  const min = Math.max(2, h);
  return choices.find((c) => c >= min - 0.001) ?? choices[choices.length - 1] ?? min;
}

export function initialState(m: Market): MState {
  const rooms: string[] = [];
  return {
    service: m.serviceOrder[0],
    home: m.defaultHome,
    beds: m.defaultBeds,
    baths: m.defaultBaths,
    size: m.sizeOrder[0] || "",
    condition: m.conditionOrder[0] || "",
    hours: snapHours(suggestedHours(m.defaultBeds, rooms, m.rooms), m.hourChoices),
    hoursTouched: false,
    rooms,
    freq: m.defaultFreq,
    extras: {},
    pets: "none",
    petsAway: true,
    products: m.defaultProducts,
    weekend: false,
    tip: 0,
    sqft: sqftFor(homeSpec(m.id, m.defaultHome), m.defaultBeds),
    floors: homeSpec(m.id, m.defaultHome).defFloors,
    maid: false,
  };
}

export function clampState(m: Market, s: MState): MState {
  const service = m.services[s.service] ? s.service : m.serviceOrder[0];
  const svc = m.services[service];
  const home = m.homeOrder.includes(s.home) ? s.home : m.defaultHome;
  const beds = m.beds.includes(s.beds) ? s.beds : m.defaultBeds;
  const baths = m.baths.includes(s.baths) ? s.baths : m.defaultBaths;
  const size = m.sizeOrder.includes(s.size) ? s.size : (m.sizeOrder[0] || "");
  const condition = m.conditionOrder.includes(s.condition) ? s.condition : (m.conditionOrder[0] || "");
  const freq: Freq = svc.discount && s.freq in m.discounts ? s.freq : "once";
  const extras: Record<string, number> = {};
  for (const id of m.extraOrder) {
    const q = s.extras[id] || 0;
    if (q > 0) extras[id] = Math.min(m.extras[id].max, q);
  }
  const rooms = s.rooms.filter((id) => m.roomOrder.includes(id));
  const hours = snapHours(Math.max(m.minHours, s.hours || suggestedHours(beds, rooms, m.rooms)), m.hourChoices);
  return {
    ...s,
    service, home, beds, baths, size, condition, freq, extras, rooms, hours,
    tip: m.showTip ? s.tip : 0,
    weekend: m.weekendPerHour ? s.weekend : false,
    products: m.productsPerHour ? s.products : m.defaultProducts,
  };
}

export function quote(m: Market, s: MState): Quote {
  const svc = m.services[s.service];
  const pct = svc.discount ? (m.discounts[s.freq] || 0) : 0;
  let cleaning = 0;
  let hours = 0;
  let weekend = 0;
  let products = 0;
  const extra = sizeExtraDollars(m, s);
  if (svc.mode === "hourly") {
    hours = snapHours(Math.max(m.minHours, s.hours), m.hourChoices);
    cleaning = Math.round((svc.hourly * hours + extra) * 100);
    if (s.weekend && m.weekendPerHour) weekend = Math.round(m.weekendPerHour * hours * 100);
    if (s.products && m.productsPerHour) products = Math.round(m.productsPerHour * hours * 100);
  } else {
    const raw = svc.base
      + s.beds * svc.perBed
      + s.baths * svc.perBath
      + (m.homes[s.home] || 0)
      + (m.sizes[s.size] || 0)
      + s.rooms.reduce((a, id) => a + (m.rooms[id]?.price || 0), 0)
      + extra;
    cleaning = Math.round(raw * (1 + (m.conditions[s.condition] || 0)) * 100);
  }
  const discountCents = Math.round(cleaning * pct);
  const net = cleaning - discountCents;
  const lines = m.extraOrder
    .map((id) => {
      const qty = s.extras[id] || 0;
      return { id, qty, cents: Math.round((m.extras[id]?.price || 0) * 100) * qty };
    })
    .filter((l) => l.qty > 0);
  const extrasCents = lines.reduce((a, l) => a + l.cents, 0);
  const preTip = net + weekend + products + extrasCents;
  const tipCents = s.tip > 0 ? Math.round(preTip * s.tip) : 0;
  const weeklyPct = svc.discount ? m.discounts.weekly : 0;
  const fromCents = cleaning - Math.round(cleaning * weeklyPct);
  return {
    cleaningCents: cleaning,
    discountCents,
    discountPct: pct,
    weekendCents: weekend,
    productsCents: products,
    lines,
    extrasCents,
    tipCents,
    totalCents: preTip + tipCents,
    hours,
    fromCents,
    hourly: svc.mode === "hourly",
  };
}

export function formatMoney(cents: number, currency: Market["currency"]) {
  const v = Math.abs(Math.round(cents));
  const whole = Math.floor(v / 100);
  const frac = v % 100;
  const num = `${whole.toLocaleString("en-US")}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
  return currency === "GBP" ? `£${num}` : `${currency} ${num}`;
}

const CA = /^([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])(\d[ABCEGHJ-NPRSTV-Z]\d)$/;
const UK = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/;

export function checkArea(m: Market, raw: string): AreaStatus {
  const t = raw.trim();
  if (!t) return "empty";
  if (m.areaKind === "zip") {
    const d = t.replace(/\s+/g, "");
    if (/^\d{1,4}$/.test(d)) return "partial";
    if (!/^\d{5}$/.test(d)) return "invalid";
    return m.areas.includes(d) ? "in" : "out";
  }
  if (m.areaKind === "ca") {
    const d = t.replace(/\s+/g, "").toUpperCase();
    if (d.length < 6 && /^[A-Z0-9]+$/.test(d)) return "partial";
    const hit = d.match(CA);
    if (!hit) return "invalid";
    return m.areas.includes(hit[1]) ? "in" : "out";
  }
  const d = t.replace(/\s+/g, "").toUpperCase();
  if (d.length < 5 && /^[A-Z0-9]+$/.test(d)) return "partial";
  const hit = d.match(UK);
  if (!hit) return "invalid";
  return m.areas.includes(hit[1]) ? "in" : "out";
}

export function formatArea(m: Market, raw: string) {
  const t = raw.trim();
  if (m.areaKind === "zip") return t.replace(/\D/g, "").slice(0, 5);
  if (m.areaKind === "ca") {
    const d = t.replace(/\s+/g, "").toUpperCase();
    return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3, 6)}` : d;
  }
  const d = t.replace(/\s+/g, "").toUpperCase();
  return d.length > 3 ? `${d.slice(0, -3)} ${d.slice(-3)}` : d;
}

export function isQuebecPostal(raw: string) {
  const d = raw.trim().replace(/\s+/g, "").toUpperCase();
  const hit = d.match(CA);
  return !!hit && "GHJ".includes(hit[1][0]);
}

/** Map a market home onto the GCC dollhouse. Detached houses read as villas, row houses as townhouses, flats as apartments. */
export function houseVisual(home: string, beds: number, baths: number) {
  const b = Math.max(0, Math.min(6, Math.round(beds)));
  const table: Record<string, [HomeKind, number, number]> = {
    house: ["villa", 2, 1500],
    detached: ["villa", 2, 1700],
    semi: ["villa", 2, 1100],
    bungalow: ["villa", 1, 1200],
    townhouse: ["townhouse", b >= 4 ? 3 : 2, 980],
    terraced: ["townhouse", 2, 880],
    maisonette: ["townhouse", 2, 760],
    condo: ["apartment", 1, 780],
    apartment: ["apartment", 1, 640],
    flat: ["apartment", 1, 640],
    studioflat: ["studio", 1, 420],
  };
  const hit = table[home] ?? ["apartment", 1, 700];
  const kind = hit[0];
  const floors = hit[1];
  const sqft = kind === "studio" ? 420 : hit[2] + b * 200;
  return { kind, floors, sqft, bathrooms: Math.max(1, Math.round(baths || 1)) };
}

export function bookingRef(seed = Math.random()) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = Math.floor(seed * 32 ** 5), out = "";
  for (let i = 0; i < 5; i++) { out += A[n % 32]; n = Math.floor(n / 32); }
  return out;
}

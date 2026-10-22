import type { HomeKind } from "./houseLayout";
export type { HomeKind };
export type CleanType = "standard" | "deep" | "move";
export const KINDS: HomeKind[] = ["studio", "apartment", "townhouse", "villa", "penthouse"];
type Range = [number, number];
export interface KindCfg { rate: number; floors: Range; beds: Range; baths: Range; size: Range; base: number; perBed: number; def: { beds: number; baths: number; floors: number } }
export interface Company {
  slug: string; brand: { en: string; ar: string; ur: string }; whatsapp: string; currency: string; country?: string;
  minimum: number; roundTo: number; weeklyDiscount: number; maidRoom: number;
  labour: { ratePerHour: number; materialsPerHour: number; minHours: number; maxHoursPerVisit: number; maxCleaners: number; sqftPerCleanerHour: number; bedHours: number; bathHours: number; maidHours: number; floorHours: number; typeFactor: Record<CleanType, number>; furnishedFactor: number; rangeUp: number };
  types: Record<CleanType, object>;
  kinds: Record<HomeKind, KindCfg>; extras: Record<string, { price: number; hours: number }>; extrasFor?: Record<string, string[]>;
  hours: { open: number; close: number; slotEvery: number; lastStart: number; leadHours: number };
  closedDays: number[]; daySurchargePerHour: Record<string, number>; refPrefix: string;
  defaults: { kind: HomeKind; type: CleanType }; areas: string[];
}
export interface State { kind: HomeKind; sqft: number; floors: number; beds: number; baths: number; maid: boolean; type: CleanType; extras: string[]; weekly: boolean; materials: boolean; furnished: boolean }
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const SQM = 0.09290304;
export const maidAllowed = (k: HomeKind) => k !== "studio";
export const extrasFor = (c: Company, k: HomeKind) => Object.keys(c.extras).filter((e) => !c.extrasFor?.[e] || c.extrasFor[e].includes(k));

/** Typical size for a home type and bedroom count, rounded to 50 sq ft, inside the type's range. */
export function autoSize(c: Company, k: HomeKind, beds: number, maid: boolean) {
  const K = c.kinds[k];
  return clamp(Math.round((K.base + K.perBed * beds + (maid ? 120 : 0)) / 50) * 50, K.size[0], K.size[1]);
}
/** Fit a state into its type's limits. */
export function fitKind(c: Company, s: State): State {
  const K = c.kinds[s.kind];
  return {
    ...s,
    floors: clamp(s.floors, K.floors[0], K.floors[1]),
    beds: clamp(s.beds, K.beds[0], K.beds[1]),
    baths: clamp(s.baths, K.baths[0], K.baths[1]),
    sqft: clamp(s.sqft, K.size[0], K.size[1]),
    maid: maidAllowed(s.kind) && s.maid,
    extras: s.extras.filter((e) => extrasFor(c, s.kind).includes(e)),
    weekly: s.type === "move" ? false : s.weekly,
  };
}
/** Switching type applies its defaults, keeps the cleaning choices. */
export function switchKind(c: Company, s: State, kind: HomeKind): State {
  const d = c.kinds[kind].def;
  const maid = maidAllowed(kind) && s.maid;
  return fitKind(c, { ...s, kind, beds: d.beds, baths: d.baths, floors: d.floors, maid, sqft: autoSize(c, kind, d.beds, maid) });
}
export function initial(c: Company): State {
  return switchKind(c, { kind: c.defaults.kind, sqft: 0, floors: 1, beds: 0, baths: 1, maid: false, type: c.defaults.type, extras: [], weekly: false, materials: true, furnished: false }, c.defaults.kind);
}
/** UAE style estimate: crew size and hours from the home, priced per cleaner hour, plus materials, fixed extras and day surcharge. */
export function quote(c: Company, s: State, day?: number) {
  const L = c.labour, K = c.kinds[s.kind];
  const ex = Object.keys(c.extras).filter((k) => s.extras.includes(k));
  let work = s.sqft / L.sqftPerCleanerHour + s.beds * L.bedHours + s.baths * L.bathHours + (s.floors - 1) * L.floorHours + (s.maid ? L.maidHours : 0);
  work *= L.typeFactor[s.type] * (s.type === "move" && s.furnished ? L.furnishedFactor : 1) * K.rate;
  work += ex.reduce((a, k) => a + c.extras[k].hours, 0);
  const cleaners = clamp(Math.ceil(work / L.maxHoursPerVisit), 1, L.maxCleaners);
  const hours = Math.max(L.minHours, Math.ceil((work / cleaners) * 2) / 2);
  const ch = cleaners * hours;
  const labour = ch * L.ratePerHour;
  const materials = s.materials ? ch * L.materialsPerHour : 0;
  const surcharge = day != null && c.daySurchargePerHour[String(day)] ? ch * c.daySurchargePerHour[String(day)] : 0;
  const maid = s.maid ? c.maidRoom : 0;
  const extras = ex.map((k) => [k, c.extras[k].price] as [string, number]);
  const extrasSum = extras.reduce((a, e) => a + e[1], 0);
  let sub = labour + materials + surcharge + maid + extrasSum;
  const minimum = sub < c.minimum;
  if (minimum) sub = c.minimum;
  const disc = s.weekly ? sub * c.weeklyDiscount : 0;
  const r = (n: number) => Math.round(n / c.roundTo) * c.roundTo;
  const total = r(sub - disc);
  const high = Math.max(total, r(total * (1 + L.rangeUp)));
  return { cleaners, hours, labour, materials, surcharge, maid, extras, extrasSum, disc, total, high, minimum, rate: L.ratePerHour };
}
/** Start time slots for a day; past times today (plus lead time) are disabled; closed days have none. */
export function slots(c: Company, date: Date, now = new Date()) {
  const H = c.hours, out: { h: number; ok: boolean }[] = [];
  const closed = c.closedDays.includes(date.getDay());
  const sameDay = date.toDateString() === now.toDateString();
  for (let h = H.open; h <= H.lastStart; h += H.slotEvery) out.push({ h, ok: !closed && (!sameDay || h >= now.getHours() + now.getMinutes() / 60 + H.leadHours) });
  return out;
}
export const isClosed = (c: Company, d: Date) => c.closedDays.includes(d.getDay());
export function refCode(c: Company, seed = Math.random()) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let n = Math.floor(seed * 32 ** 5), out = "";
  for (let i = 0; i < 5; i++) { out += A[n % 32]; n = Math.floor(n / 32); }
  return (c.refPrefix || "") + out;
}
export const waUrl = (c: Company, msg: string) => `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(msg)}`;
/** Desktop without the app: open WhatsApp Web directly. */
export const waWebUrl = (c: Company, msg: string) => `https://web.whatsapp.com/send?phone=${c.whatsapp}&text=${encodeURIComponent(msg)}`;

import type { HomeKind } from "./houseLayout";
export type { HomeKind };
export type CleanType = "standard" | "deep" | "move";
export const KINDS: HomeKind[] = ["studio", "apartment", "townhouse", "villa", "penthouse"];
type Range = [number, number];
export interface KindCfg { rate: number; floors: Range; beds: Range; baths: Range; size: Range; base: number; perBed: number; def: { beds: number; baths: number; floors: number } }
export interface Company {
  slug: string; brand: { en: string; ar: string; ur: string }; whatsapp: string; currency: string;
  minimum: number; roundTo: number; extraFloor: number; weeklyDiscount: number; maidRoom: number;
  types: Record<CleanType, { rate: number; bedroom: number; bathroom: number }>;
  kinds: Record<HomeKind, KindCfg>; extras: Record<string, number>; extrasFor?: Record<string, string[]>;
  defaults: { kind: HomeKind; type: CleanType }; areas: string[];
}
export interface State { kind: HomeKind; sqft: number; floors: number; beds: number; baths: number; maid: boolean; type: CleanType; extras: string[]; weekly: boolean }
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
  return switchKind(c, { kind: c.defaults.kind, sqft: 0, floors: 1, beds: 0, baths: 1, maid: false, type: c.defaults.type, extras: [], weekly: false }, c.defaults.kind);
}
export function quote(c: Company, s: State) {
  const t = c.types[s.type], mul = c.kinds[s.kind].rate;
  const rate = Math.round(t.rate * mul * 1000) / 1000;
  const area = s.sqft * rate;
  const beds = s.beds * t.bedroom;
  const baths = s.baths * t.bathroom;
  const floorsX = (s.floors - 1) * c.extraFloor;
  const maid = s.maid ? c.maidRoom : 0;
  const extras = Object.keys(c.extras).filter((k) => s.extras.includes(k)).map((k) => [k, c.extras[k]] as [string, number]);
  const extrasSum = extras.reduce((a, e) => a + e[1], 0);
  let sub = area + beds + baths + floorsX + maid + extrasSum;
  const minimum = sub < c.minimum;
  if (minimum) sub = c.minimum;
  const disc = s.weekly ? sub * c.weeklyDiscount : 0;
  const total = Math.round((sub - disc) / c.roundTo) * c.roundTo;
  return { rate, area, beds, baths, floorsX, maid, extras, extrasSum, disc, total, minimum };
}
export const waUrl = (c: Company, msg: string) => `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(msg)}`;

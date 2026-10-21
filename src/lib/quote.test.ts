import { describe, it, expect } from "vitest";
import { quote, initial, switchKind, autoSize, fitKind, waUrl } from "./quote";
import { computeLayout } from "./houseLayout";
import { defaultCompany as c } from "./companies";
describe("quote", () => {
  it("starts as a 2BR apartment with a sensible size", () => { const s = initial(c); expect(s).toMatchObject({ kind: "apartment", beds: 2, floors: 1 }); expect(s.sqft).toBe(1250); });
  it("matches Claude's pricing for a villa-like home", () => { const s = { ...initial(c), kind: "villa" as const, sqft: 2200, floors: 2, beds: 3, baths: 2 }; const q = quote(c, s); expect(q.rate).toBeCloseTo(0.154); expect(q.total).toBe(Math.round((2200 * 0.154 + 60 + 60 + 40) / 5) * 5); });
  it("studio has no bedrooms, one floor, small size", () => { const s = switchKind(c, initial(c), "studio"); expect(s).toMatchObject({ beds: 0, floors: 1, maid: false }); expect(s.sqft).toBeGreaterThanOrEqual(300); expect(s.sqft).toBeLessThanOrEqual(800); });
  it("villa sits on 2 to 3 floors and allows a pool", () => { const s = fitKind(c, { ...switchKind(c, initial(c), "villa"), floors: 1, extras: ["pool"] }); expect(s.floors).toBe(2); expect(s.extras).toContain("pool"); expect(fitKind(c, { ...s, kind: "apartment" }).extras).not.toContain("pool"); });
  it("maid's room adds price and size", () => { const a = switchKind(c, initial(c), "villa"); expect(quote(c, { ...a, maid: true }).total).toBeGreaterThan(quote(c, a).total); expect(autoSize(c, "villa", 4, true)).toBeGreaterThan(autoSize(c, "villa", 4, false)); });
  it("weekly saves 15% and is off for move cleans", () => { const s = initial(c); const w = quote(c, { ...s, weekly: true }).total, o = quote(c, s).total; expect(w).toBeLessThan(o); expect(fitKind(c, { ...s, type: "move", weekly: true }).weekly).toBe(false); });
  it("minimum price", () => { const s = { ...switchKind(c, initial(c), "studio"), sqft: 300 }; expect(quote(c, s).total).toBe(150); });
  it("deep costs more than standard", () => { const s = initial(c); expect(quote(c, { ...s, type: "deep" }).total).toBeGreaterThan(quote(c, s).total); });
  it("whatsapp link uses the placeholder number", () => { expect(waUrl(c, "Hi")).toBe("https://wa.me/971500000000?text=Hi"); });
  it("layout builds for every type", () => { for (const k of ["studio", "apartment", "townhouse", "villa", "penthouse"] as const) { const s = switchKind(c, initial(c), k); const L = computeLayout({ sqft: s.sqft, floors: s.floors, bedrooms: s.beds, bathrooms: s.baths, kind: k, maid: true, pool: true }); expect(L.items.length).toBeGreaterThan(20); } });
});

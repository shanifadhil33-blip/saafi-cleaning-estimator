import { readdirSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { quote, initial, switchKind, autoSize, fitKind, waUrl, waWebUrl, slots, refCode } from "./quote";
import { computeLayout } from "./houseLayout";
import { companies, defaultCompany as c } from "./companies";
describe("quote", () => {
  it("starts as a 2BR apartment with materials", () => { const s = initial(c); expect(s).toMatchObject({ kind: "apartment", beds: 2, floors: 1, materials: true }); expect(s.sqft).toBe(1250); });
  it("prices per cleaner hour with materials", () => { const s = initial(c); const q = quote(c, s); expect(q.labour).toBe(q.cleaners * q.hours * 40); expect(q.materials).toBe(q.cleaners * q.hours * 10); expect(quote(c, { ...s, materials: false }).total).toBeLessThan(q.total); });
  it("range runs from total up", () => { const q = quote(c, initial(c)); expect(q.high).toBeGreaterThan(q.total); });
  it("big villas get more cleaners, hours stay within a visit", () => { const v = { ...switchKind(c, initial(c), "villa"), sqft: 8000, floors: 3, beds: 6, baths: 5, type: "deep" as const }; const q = quote(c, v); expect(q.cleaners).toBe(4); const sm = quote(c, switchKind(c, initial(c), "studio")); expect(sm.cleaners).toBe(1); expect(sm.hours).toBe(2); });
  it("furnished move out takes longer", () => { const s = { ...initial(c), type: "move" as const }; expect(quote(c, { ...s, furnished: true }).hours * quote(c, { ...s, furnished: true }).cleaners).toBeGreaterThanOrEqual(quote(c, s).hours * quote(c, s).cleaners); });
  it("Friday surcharge from config", () => { const s = initial(c); expect(quote(c, s, 5).total).toBeGreaterThan(quote(c, s, 4).total); });
  it("studio has no bedrooms, one floor", () => { const s = switchKind(c, initial(c), "studio"); expect(s).toMatchObject({ beds: 0, floors: 1, maid: false }); });
  it("villa allows a pool, apartment does not", () => { const s = fitKind(c, { ...switchKind(c, initial(c), "villa"), extras: ["pool"] }); expect(s.extras).toContain("pool"); expect(fitKind(c, { ...s, kind: "apartment" }).extras).not.toContain("pool"); });
  it("maid's room adds price and size", () => { const a = switchKind(c, initial(c), "villa"); expect(quote(c, { ...a, maid: true }).total).toBeGreaterThan(quote(c, a).total); expect(autoSize(c, "villa", 4, true)).toBeGreaterThan(autoSize(c, "villa", 4, false)); });
  it("minimum price and weekly", () => { const s = { ...switchKind(c, initial(c), "studio"), sqft: 300, materials: false }; expect(quote(c, s).total).toBe(c.minimum); expect(fitKind(c, { ...s, type: "move", weekly: true }).weekly).toBe(false); });
  it("slots: past times today are off, closed days have none", () => { const now = new Date(2026, 9, 22, 11, 0); const sl = slots(c, now, now); expect(sl.map((x) => x.h)).toEqual([8, 10, 12, 14, 16, 18]); expect(sl.filter((x) => x.ok).map((x) => x.h)).toEqual([14, 16, 18]); const cc = { ...c, closedDays: [5] }; expect(slots(cc, new Date(2026, 9, 23), now).every((x) => !x.ok)).toBe(true); });
  it("ref code and links", () => { expect(refCode(c, 0.5)).toMatch(/^[A-Z2-9]{5}$/); expect(waUrl(c, "Hi")).toBe("https://wa.me/971500000000?text=Hi"); expect(waWebUrl(c, "Hi")).toContain("web.whatsapp.com/send?phone=971500000000"); });
  it("layout builds for every type", () => { for (const k of ["studio", "apartment", "townhouse", "villa", "penthouse"] as const) { const s = switchKind(c, initial(c), k); expect(computeLayout({ sqft: s.sqft, floors: s.floors, bedrooms: s.beds, bathrooms: s.baths, kind: k, maid: true, pool: true }).items.length).toBeGreaterThan(20); } });
  it("loads every company json, including the fictional saafi sample", () => {
    const slugs = readdirSync("src/config/companies").filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -".json".length)).sort();
    expect(Object.keys(companies).sort()).toEqual(slugs);
    expect(c.slug).toBe("saafi");
    expect(c.whatsapp).toBe("971500000000");
    expect(c.brand.en).toBe("");
  });
});

import { describe, it, expect } from "vitest";
import { estimate, whatsappUrl, homeLabel, clampHome, sqftToSqm } from "./engine";
import { defaultCompany as c } from "./companies";
const base = { sqft: 2000, floors: 1 as const, bedrooms: 3, bathrooms: 2, type: "standard" as const };
describe("engine", () => {
  it("itemizes base, beds, baths, floors", () => {
    const e = estimate(c, base);
    expect(e.lines.map(l => l.amount)).toEqual([240, 45, 50, 0]);
    expect(e.subtotal).toBe(335); expect(e.total).toBe(Math.round(335 * 1.05));
  });
  it("deep costs more than standard, move out more than deep", () => {
    const s = estimate(c, base).total, d = estimate(c, { ...base, type: "deep" }).total, m = estimate(c, { ...base, type: "moveout" }).total;
    expect(d).toBeGreaterThan(s); expect(m).toBeGreaterThan(d);
  });
  it("extra floors are charged", () => { expect(estimate(c, { ...base, floors: 3 }).lines[3].amount).toBe(120); });
  it("half baths allowed", () => { expect(estimate(c, { ...base, bathrooms: 1.5 }).lines[2].amount).toBe(37.5); });
  it("clamps input", () => { const h = clampHome(c, { ...base, sqft: 99999, bathrooms: 0.2, bedrooms: -3 }); expect(h).toMatchObject({ sqft: 6000, bathrooms: 1, bedrooms: 0 }); });
  it("minimum price", () => { expect(estimate(c, { sqft: 500, floors: 1, bedrooms: 0, bathrooms: 1, type: "standard" }).subtotal).toBe(120); });
  it("crew grows with size, hours stay per visit", () => {
    const small = estimate(c, { ...base, sqft: 800, bedrooms: 1, bathrooms: 1 }), big = estimate(c, { ...base, sqft: 6000, floors: 3, type: "moveout", bedrooms: 6, bathrooms: 5 });
    expect(small.crew).toBe(1); expect(big.crew).toBeGreaterThan(2); expect(big.hours).toBeLessThanOrEqual(8);
  });
  it("label and sqm", () => { expect(homeLabel(c, { ...base, floors: 3, sqft: 2800, bedrooms: 1, bathrooms: 1.5 })).toBe("A 3 floor home: 2,800 sq ft, 1 bed, 1.5 bath, standard cleaning"); expect(sqftToSqm(1000)).toBe(93); });
  it("whatsapp link carries the summary", () => {
    const u = whatsappUrl(c, base, estimate(c, base), { name: "Omar Khalid", phone: "0501234567", email: "", address: "Villa 12, Al Barsha", date: "2026-10-23", time: "09:00", notes: "Gate code 4411" });
    expect(u.startsWith("https://wa.me/971500000000?text=")).toBe(true);
    const t = decodeURIComponent(u.split("text=")[1]); expect(t).toContain("Omar Khalid"); expect(t).toContain("Gate code 4411"); expect(t).toContain("AED 352"); expect(t).not.toContain("Email:");
  });
});

import { describe, expect, it } from "vitest";
import { getCopy } from "./marketCopy";
import { markets, shownHomes } from "./markets";
import { channelHref, checkArea, formatCount, formatMoney, homeSpec, houseVisual, initialState, isQuebecPostal, quote, type Lang, type Region } from "./marketQuote";

function walk(v: unknown, out: string[]) {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") {
    for (const a of [0, 1, 2, 3, 4, 6, 20, "USD 10"]) {
      const r = (v as (x: unknown) => unknown)(a);
      if (typeof r === "string") out.push(r);
    }
  } else if (Array.isArray(v)) v.forEach((x) => walk(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => walk(x, out));
}

describe("market quote", () => {
  it("charges weekly 20, every two weeks 15, and monthly 10, and leaves extras full price", () => {
    const m = markets.us;
    const s = initialState(m);
    const once = quote(m, s);
    const weekly = quote(m, { ...s, freq: "weekly" });
    const bi = quote(m, { ...s, freq: "biweekly" });
    const month = quote(m, { ...s, freq: "monthly" });
    expect(weekly.totalCents).toBe(once.cleaningCents - Math.round(once.cleaningCents * 0.2));
    expect(bi.totalCents).toBe(once.cleaningCents - Math.round(once.cleaningCents * 0.15));
    expect(month.totalCents).toBe(once.cleaningCents - Math.round(once.cleaningCents * 0.1));
    const withOven = quote(m, { ...s, freq: "weekly", extras: { oven: 1 } });
    expect(withOven.totalCents - weekly.totalCents).toBe(Math.round(m.extras.oven.price * 100));
  });

  it("does not discount move out or post construction", () => {
    const m = markets.us;
    for (const service of ["move", "post"] as const) {
      const s = { ...initialState(m), service };
      expect(quote(m, { ...s, freq: "weekly" }).totalCents).toBe(quote(m, s).totalCents);
    }
  });

  it("prices UK regular cleaning by the hour with the same discounts", () => {
    const m = markets.uk;
    const s = initialState(m);
    expect(s.hours).toBeGreaterThanOrEqual(2);
    const once = quote(m, s);
    expect(once.hourly).toBe(true);
    expect(quote(m, { ...s, freq: "weekly" }).totalCents).toBe(once.cleaningCents - Math.round(once.cleaningCents * 0.2));
    expect(quote(m, { ...s, freq: "biweekly" }).totalCents).toBe(once.cleaningCents - Math.round(once.cleaningCents * 0.15));
    expect(quote(m, { ...s, freq: "monthly" }).totalCents).toBe(once.cleaningCents - Math.round(once.cleaningCents * 0.1));
    expect(quote(m, { ...s, weekend: true }).weekendCents).toBe(Math.round(m.weekendPerHour * s.hours * 100));
    expect(quote(m, { ...s, products: true }).productsCents).toBe(Math.round(m.productsPerHour * s.hours * 100));
    expect(quote(m, { ...s, hours: 1 }).hours).toBe(2);
  });

  it("keeps UK fixed prices off the hourly discount", () => {
    const m = markets.uk;
    const s = { ...initialState(m), service: "tenancy" };
    expect(quote(m, s).hourly).toBe(false);
    expect(quote(m, { ...s, freq: "weekly" }).totalCents).toBe(quote(m, s).totalCents);
    expect(quote(m, s).totalCents).toBeGreaterThan(0);
  });

  it("checks service areas and Quebec postcodes", () => {
    expect(checkArea(markets.us, "10001")).toBe("in");
    expect(checkArea(markets.us, "99999")).toBe("out");
    expect(checkArea(markets.us, "1000")).toBe("partial");
    expect(checkArea(markets.us, "ABCDE")).toBe("invalid");
    expect(checkArea(markets.ca, "M5V 2T6")).toBe("in");
    expect(checkArea(markets.ca, "H2Y 1C6")).toBe("in");
    expect(checkArea(markets.ca, "K1A 0A6")).toBe("out");
    expect(isQuebecPostal("H2Y 1C6")).toBe(true);
    expect(isQuebecPostal("M5V 2T6")).toBe(false);
    expect(checkArea(markets.uk, "SW1A 1AA")).toBe("in");
    expect(checkArea(markets.uk, "E1 6AN")).toBe("in");
    expect(checkArea(markets.uk, "ZZ99 9ZZ")).toBe("out");
  });

  it("uses placeholder contact details only", () => {
    for (const m of [markets.us, markets.ca, markets.uk]) {
      expect(m.contact.phoneDisplay).toContain("555");
      expect(m.contact.phoneTel).toContain("555");
      expect(m.contact.email).toBe("hello@example.com");
      expect(m.contact.phoneDisplay).not.toMatch(/[-–—]/);
    }
    expect(markets.us.contact.whatsapp).toBe("");
    expect(markets.ca.contact.whatsapp).toBe("");
    expect(markets.uk.contact.whatsapp).toContain("555");
  });

  it("maps home types onto the dollhouse", () => {
    expect(houseVisual("house", 3, 2).kind).toBe("villa");
    expect(houseVisual("townhouse", 4, 2).kind).toBe("townhouse");
    expect(houseVisual("townhouse", 4, 2).floors).toBe(3);
    expect(houseVisual("apartment", 2, 1).kind).toBe("apartment");
    expect(houseVisual("condo", 2, 2).kind).toBe("apartment");
    expect(houseVisual("flat", 1, 1).floors).toBe(1);
    expect(houseVisual("terraced", 2, 1).kind).toBe("townhouse");
    expect(houseVisual("detached", 4, 2).sqft).toBeGreaterThan(houseVisual("semi", 4, 2).sqft);
    expect(houseVisual("studioflat", 0, 1).kind).toBe("studio");
  });

  it("formats money without a dash", () => {
    expect(formatMoney(14800, "USD")).toBe("USD 148");
    expect(formatMoney(5280, "GBP")).toBe("£52.80");
    expect(formatMoney(15725, "CAD")).toBe("CAD 157.25");
    expect(formatCount(2200, "en")).toBe("2,200");
    expect(formatCount(2200, "es")).toBe("2,200");
    expect(formatCount(2200, "fr")).toBe("2 200");
    expect(formatMoney(220000, "CAD", "fr")).toBe("CAD 2 200");
    expect(getCopy("en", "us").bedsCaption(2)).toBe("2BR");
    expect(getCopy("en", "us").bathsCaption(2)).toBe("2 bath");
    expect(getCopy("es", "us").bedsCaption(2)).toBe("2 dormitorios");
    expect(getCopy("es", "us").bathsCaption(2)).toBe("2 baños");
    expect(getCopy("fr", "ca").bedsCaption(2)).toBe("2 chambres");
    expect(getCopy("fr", "ca").bathsCaption(2)).toBe("2 salles de bain");
  });

  it("keeps public copy free of dashes and brand names", () => {
    const blobs: string[] = [];
    const cases: [Lang, Region][] = [["en", "us"], ["es", "us"], ["en", "ca"], ["fr", "ca"], ["en", "uk"]];
    for (const [lang, region] of cases) walk(getCopy(lang, region), blobs);
    const text = blobs.join("\n");
    expect(text).not.toMatch(/[—–-]/);
    expect(text).not.toMatch(/saafi|darwin|noor/i);
    expect(getCopy("en", "us").lead + getCopy("es", "us").lead + getCopy("fr", "ca").lead).not.toMatch(/whatsapp/i);
    expect(getCopy("en", "uk").lead).toMatch(/WhatsApp/);
    expect(getCopy("en", "uk").freqs.biweekly).toBe("Fortnightly");
    expect(getCopy("fr", "ca").homes.house).toBe("Maison");
    expect(getCopy("en", "uk").hoursCount(3)).toBe("3 hours");
    expect(getCopy("en", "uk").hoursCount(1)).toBe("1 hour");
    expect(getCopy("es", "us").hoursCount(3)).toBe("3 horas");
    expect(getCopy("fr", "ca").hoursCount(3)).toBe("3 heures");
    expect(getCopy("es", "ca").title).toBe(getCopy("en", "ca").title);
    expect(markets.ca.langs).toEqual(["en", "fr"]);
    expect(markets.us.defaultHome).toBe("house");
    expect(markets.ca.defaultHome).toBe("house");
    expect(initialState(markets.us).home).toBe("house");
    expect(shownHomes("us").join(",")).toBe("house,apartment,condo,townhouse");
    expect(homeSpec("us", "house").max).toBeGreaterThan(homeSpec("us", "apartment").max);
    expect(homeSpec("uk", "flat").max).toBeLessThan(homeSpec("uk", "detached").max);
    const start = initialState(markets.us);
    expect(quote(markets.us, { ...start, sqft: start.sqft + 200 }).totalCents).toBeGreaterThan(quote(markets.us, start).totalCents);
    expect(channelHref(markets.us, "sms", "Hello", "A 2 bed house")).toMatch(/^sms:\+15550100\?body=/);
    expect(channelHref(markets.uk, "whatsapp", "Hello", "Flat")).toMatch(/^https:\/\/wa\.me\/445550100\?text=/);
    expect(markets.ca.contact.book).toBe("sms");
    expect(markets.uk.contact.also).toEqual(["sms", "email"]);
  });
});

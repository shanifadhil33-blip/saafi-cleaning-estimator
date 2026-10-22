import fs from "fs";
import { describe, expect, it } from "vitest";
import {
  COUNTRIES, PRIORITY_ISOS, displayName, formatInternational, listCountries, marketCountry, phoneIssue, priorityIsos, resolveCountry,
} from "./countries";

describe("country codes", () => {
  it("lists every country once, with a flag and no dashes in the name", () => {
    const isos = COUNTRIES.map((c) => c.iso);
    expect(new Set(isos).size).toBe(isos.length);
    expect(isos.length).toBeGreaterThan(200);
    for (const c of COUNTRIES) {
      expect(c.name + c.example).not.toMatch(/[—–-]/);
      expect(fs.existsSync(`public/flags/${c.iso.toLowerCase()}.svg`)).toBe(true);
      const digits = c.example.replace(/\D/g, "");
      expect(digits.length).toBeGreaterThanOrEqual(c.min);
      expect(digits.length).toBeLessThanOrEqual(c.max);
    }
  });

  it("puts the page market first, then the other key markets", () => {
    expect(listCountries("", "en").countries.slice(0, 9).map((c) => c.iso)).toEqual([...PRIORITY_ISOS]);
    expect(priorityIsos("US")).toEqual(["US", "AE", "SA", "QA", "KW", "BH", "OM", "CA", "GB"]);
    expect(listCountries("", "en", "US").countries.slice(0, 9).map((c) => c.iso)).toEqual(["US", "AE", "SA", "QA", "KW", "BH", "OM", "CA", "GB"]);
    expect(listCountries("", "fr", "CA").countries[0].iso).toBe("CA");
    expect(listCountries("", "en", "GB").countries.slice(0, 9).map((c) => c.iso)[0]).toBe("GB");
    expect(listCountries("", "en", "GB").countries.slice(1, 9).map((c) => c.iso)).toEqual(["AE", "SA", "QA", "KW", "BH", "OM", "US", "CA"]);
    expect(listCountries("uk", "fr").countries[0].iso).toBe("GB");
    expect(listCountries("+44", "en").countries[0].iso).toBe("GB");
    expect(listCountries("الإمارات", "en").countries[0].iso).toBe("AE");
    expect(listCountries("canada", "es").countries.some((c) => c.iso === "CA")).toBe(true);
    expect(listCountries("فرنسا", "ar").countries[0].iso).toBe("FR");
    expect(listCountries("भारत", "hi").countries[0].iso).toBe("IN");
    expect(listCountries("پاکستان", "ur").countries[0].iso).toBe("PK");
    expect(listCountries("allemagne", "fr").countries[0].iso).toBe("DE");
    expect(listCountries("estados unidos", "es").countries[0].iso).toBe("US");
  });

  it("translates every country without dashes", () => {
    for (const lang of ["es", "fr", "ar", "ur", "hi"] as const) {
      for (const c of COUNTRIES) {
        const name = displayName(c, lang);
        expect(name.length).toBeGreaterThan(0);
        expect(name).not.toMatch(/[—–-]/);
      }
    }
    expect(displayName(resolveCountry("FR"), "es")).toMatch(/Francia/);
    expect(displayName(resolveCountry("DE"), "ar")).toMatch(/ألمانيا/);
  });

  it("formats an international number and strips a leading 0", () => {
    expect(formatInternational("GB", "07700900000")).toBe("+44 7700 900000");
    expect(formatInternational("GB", "7700 900000")).toBe("+44 7700 900000");
    expect(formatInternational("GB", "00447700900000")).toBe("+44 7700 900000");
    expect(formatInternational("US", "2015550123")).toBe("+1 201 555 0123");
    expect(formatInternational("CA", "4165550199")).toBe("+1 416 555 0199");
    expect(formatInternational("AE", "050 123 4567")).toBe("+971 50 123 4567");
    expect(phoneIssue("GB", "")).toBe("empty");
    expect(phoneIssue("GB", "123")).toBe("invalid");
    expect(phoneIssue("GB", "07700900000")).toBe(null);
    expect(phoneIssue("US", "2015550123")).toBe(null);
    expect(phoneIssue("AE", "5012345")).toBe("invalid");
    expect(phoneIssue("QA", "33123456")).toBe(null);
  });

  it("defaults the home and company forms to UAE, and each market to its country", () => {
    expect(resolveCountry(undefined).iso).toBe("AE");
    expect(resolveCountry("").dial).toBe("971");
    expect(resolveCountry("gb").iso).toBe("GB");
    expect(resolveCountry("nope").iso).toBe("AE");
    expect(marketCountry("us").iso).toBe("US");
    expect(marketCountry("ca").iso).toBe("CA");
    expect(marketCountry("uk").dial).toBe("44");
  });
});

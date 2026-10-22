import { describe, expect, it } from "vitest";
import { formatCoord, mapsUrl, mobileIssue } from "./phone";

describe("mobile number", () => {
  it("accepts a lightly formatted number and rejects empty or short values", () => {
    expect(mobileIssue("")).toBe("empty");
    expect(mobileIssue("   ")).toBe("empty");
    expect(mobileIssue("12")).toBe("bad");
    expect(mobileIssue("abc")).toBe("bad");
    expect(mobileIssue("(555) 010 0100")).toBeNull();
    expect(mobileIssue("07700 900000")).toBeNull();
    expect(mobileIssue("050 000 0000")).toBeNull();
    expect(mobileIssue("+1 555 010 0100")).toBeNull();
    expect(mobileIssue("1".repeat(16))).toBe("bad");
  });

  it("builds a Google Maps link from coordinates", () => {
    expect(formatCoord(40.7128)).toBe("40.7128");
    expect(formatCoord(-74.006)).toBe("-74.006");
    expect(formatCoord(0)).toBe("0");
    expect(mapsUrl(40.7128, -74.006)).toBe("https://maps.google.com/?q=40.7128,-74.006");
  });
});

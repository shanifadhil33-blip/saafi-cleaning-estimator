export type CleanType = "standard" | "deep" | "moveout";
export interface Company {
  slug: string; brand: { name: string; tagline: string };
  whatsapp: string; currency: string; vatRate: number;
  sqft: { min: number; max: number; step: number; default: number };
  types: Record<CleanType, { label: string; perSqft: number; hourFactor: number; blurb: string }>;
  perBedroom: number; perBathroom: number; perExtraFloor: number;
  sqftPerCleanerHour: number; hoursPerBedroom: number; hoursPerBathroom: number; hoursPerExtraFloor: number;
  maxHoursPerCleaner: number; maxCrew: number; minHours: number; minPrice: number;
  rooms?: Record<string, AddOn>; extras?: Record<string, AddOn>; weeklyDiscount?: number;
}
export interface AddOn { label: string; price: number; hours: number }
export interface Home { sqft: number; floors: 1 | 2 | 3; bedrooms: number; bathrooms: number; type: CleanType; rooms?: string[]; extras?: string[]; weekly?: boolean }
export interface Line { key: string; label: string; qty: string; amount: number }
export interface Estimate { saving: number; lines: Line[]; subtotal: number; vat: number; total: number; hours: number; crew: number; totalLabourHours: number }

const r2 = (n: number) => Math.round(n * 100) / 100;
export const SQM_PER_SQFT = 0.09290304;
export const sqftToSqm = (s: number) => Math.round(s * SQM_PER_SQFT);
export const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n % 1 ? 2 : 0, minimumFractionDigits: n % 1 ? 2 : 0 });

export function clampHome(c: Company, h: Home): Home {
  return {
    sqft: Math.min(c.sqft.max, Math.max(c.sqft.min, Math.round(h.sqft))),
    floors: ([1, 2, 3].includes(h.floors) ? h.floors : 1) as 1 | 2 | 3,
    bedrooms: Math.min(8, Math.max(0, Math.round(h.bedrooms))),
    bathrooms: Math.min(8, Math.max(1, Math.round(h.bathrooms * 2) / 2)),
    type: c.types[h.type] ? h.type : "standard",
    rooms: (h.rooms ?? []).filter((k) => c.rooms?.[k]), extras: (h.extras ?? []).filter((k) => c.extras?.[k]), weekly: !!h.weekly,
  };
}

export function estimate(c: Company, input: Home): Estimate {
  const h = clampHome(c, input);
  const t = c.types[h.type];
  const extra = h.floors - 1;
  const cur = c.currency;
  const lines: Line[] = [
    { key: "area", label: `Floor area · ${fmt(h.sqft)} sq ft × ${cur} ${t.perSqft.toFixed(2)}`, qty: "", amount: r2(h.sqft * t.perSqft) },
    { key: "bed", label: `Bedrooms · ${h.bedrooms} × ${cur} ${c.perBedroom}`, qty: "", amount: r2(h.bedrooms * c.perBedroom) },
    { key: "bath", label: `Bathrooms · ${h.bathrooms} × ${cur} ${c.perBathroom}`, qty: "", amount: r2(h.bathrooms * c.perBathroom) },
    { key: "floors", label: `Extra floors · ${extra} × ${cur} ${c.perExtraFloor}`, qty: "", amount: r2(extra * c.perExtraFloor) },
  ];
  let addHours = 0;
  for (const [k, tbl] of [["rooms", c.rooms], ["extras", c.extras]] as const)
    for (const id of h[k] ?? []) { const a = tbl![id]; lines.push({ key: `${k}-${id}`, label: a.label, qty: "", amount: a.price }); addHours += a.hours; }
  const gross = Math.max(c.minPrice, r2(lines.reduce((s, l) => s + l.amount, 0)));
  const saving = h.weekly ? r2(gross * (c.weeklyDiscount ?? 0)) : 0;
  if (saving) lines.push({ key: "weekly", label: `Weekly plan, ${Math.round((c.weeklyDiscount ?? 0) * 100)}% off`, qty: "", amount: -saving });
  const subtotal = r2(gross - saving);
  const vat = r2(subtotal * c.vatRate);
  const total = Math.round(subtotal + vat);
  const labour = Math.max(c.minHours,
    (h.sqft / c.sqftPerCleanerHour) * t.hourFactor + h.bedrooms * c.hoursPerBedroom + h.bathrooms * c.hoursPerBathroom + extra * c.hoursPerExtraFloor + addHours);
  const crew = Math.min(c.maxCrew, Math.max(1, Math.ceil(labour / c.maxHoursPerCleaner)));
  const hours = Math.max(1, Math.ceil((labour / crew) * 2) / 2);
  return { saving, lines, subtotal, vat, total, hours, crew, totalLabourHours: r2(labour) };
}

export function homeLabel(c: Company, h: Home, unit: "sqft" | "sqm" = "sqft") {
  const area = unit === "sqft" ? `${fmt(h.sqft)} sq ft` : `${fmt(sqftToSqm(h.sqft))} sq m`;
  const more = (h.rooms ?? []).map((k) => c.rooms?.[k]?.label.toLowerCase()).filter(Boolean).map((l) => ` · ${l}`).join("");
  return `A ${h.floors} floor home: ${area} · ${h.bedrooms} bed · ${h.bathrooms} bath${more} · ${c.types[h.type].label.toLowerCase()} cleaning`;
}

export interface Booking { name: string; phone: string; email: string; address: string; date: string; time: string; notes: string }
export function whatsappUrl(c: Company, h: Home, e: Estimate, b: Booking, unit: "sqft" | "sqm" = "sqft") {
  const text = [
    `Hello ${c.brand.name}, I would like to book a cleaning.`,
    "",
    homeLabel(c, h, unit),
    `Estimate: ${c.currency} ${fmt(e.total)} (VAT included)`,
    `About ${e.hours} hours with a crew of ${e.crew}`,
    (h.extras ?? []).length ? `Extras: ${(h.extras ?? []).map((k) => c.extras?.[k]?.label).join(", ")}` : "",
    h.weekly ? `Weekly plan (saves ${c.currency} ${fmt(e.saving)} a visit)` : "One off visit",
    "",
    `Name: ${b.name}`, `Phone: ${b.phone}`, b.email ? `Email: ${b.email}` : "",
    b.address ? `Address: ${b.address}` : "", `Day: ${b.date} at ${b.time}`, b.notes ? `Notes for the crew: ${b.notes}` : "",
  ].filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "").join("\n");
  return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}`;
}

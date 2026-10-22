import type { Market } from "./marketQuote";
import usJson from "@/config/markets/us.json";
import caJson from "@/config/markets/ca.json";
import ukJson from "@/config/markets/uk.json";

function assertMarket(m: Market) {
  if (!m.contact.phoneDisplay.includes("555") || !m.contact.phoneTel.includes("555")) {
    throw new Error(`${m.id} contact phone must be a 555 placeholder`);
  }
  if (m.contact.email !== "hello@example.com") throw new Error(`${m.id} contact email must be hello@example.com`);
  if (m.id === "uk") {
    if (!m.contact.whatsapp.includes("555")) throw new Error("uk whatsapp must be a 555 placeholder");
  } else if (m.contact.whatsapp) {
    throw new Error(`${m.id} does not use WhatsApp`);
  }
  if (m.discounts.weekly !== 0.2 || m.discounts.biweekly !== 0.15 || m.discounts.monthly !== 0.1) {
    throw new Error(`${m.id} recurring discounts must be 20, 15, and 10 percent`);
  }
  if (m.id === "ca" && m.langs.join(",") !== "en,fr") {
    throw new Error("ca languages are English and French only");
  }
  if (m.id === "us" && m.langs.join(",") !== "en,es") {
    throw new Error("us languages are English and Spanish");
  }
}

export const markets = {
  us: usJson as Market,
  ca: caJson as Market,
  uk: ukJson as Market,
};

for (const m of Object.values(markets)) assertMarket(m);

/** Home types shown on the sheet. The 3D model maps these in houseVisual. */
export function shownHomes(id: Market["id"]): string[] {
  if (id === "uk") return ["flat", "terraced", "semi", "detached"];
  return ["house", "condo", "townhouse", "apartment"];
}

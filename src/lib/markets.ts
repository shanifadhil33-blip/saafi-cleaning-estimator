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
}

export const markets = {
  us: usJson as Market,
  ca: caJson as Market,
  uk: ukJson as Market,
};

for (const m of Object.values(markets)) assertMarket(m);

export function marketChoices(id: Market["id"]): Market[] {
  if (id === "uk") return [markets.uk];
  return id === "ca" ? [markets.ca, markets.us] : [markets.us, markets.ca];
}

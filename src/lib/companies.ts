import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Company } from "./quote";

/** Every `src/config/companies/<slug>.json` is a company. The `slug` field must match the file name, which is the `/c/<slug>` path. */
const dir = path.join(process.cwd(), "src/config/companies");

function loadCompanies(): Record<string, Company> {
  const names = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const out: Record<string, Company> = {};
  for (const name of names) {
    const slug = name.slice(0, -".json".length);
    const data = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as Company;
    if (data.slug !== slug) {
      throw new Error(`${name}: "slug" is "${data.slug}", but the file name requires "${slug}".`);
    }
    out[slug] = data;
  }
  if (!out.saafi) throw new Error("src/config/companies/saafi.json is required. It is the demo homepage.");
  return out;
}

export const companies: Record<string, Company> = loadCompanies();
/** Homepage company. Same fictional sample the `/c/saafi` page uses. */
export const defaultCompany = companies.saafi;

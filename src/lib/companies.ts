import saafi from "@/config/companies/saafi.json";
import type { Company } from "./quote";
export const companies: Record<string, Company> = { saafi: saafi as unknown as Company };
export const defaultCompany = companies.saafi;

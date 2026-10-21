import saafi from "@/config/companies/saafi.json";
import type { Company } from "./engine";
export const companies: Record<string, Company> = { saafi: saafi as Company };
export const defaultCompany = companies.saafi;

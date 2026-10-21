# Saafi Cleaning Estimator (demo)
One page home cleaning estimator with a live 3D model, itemized AED price and WhatsApp booking. Fictional brand.
- Rates, brand and WhatsApp number per company: `src/config/companies/<slug>.json`, served at `/c/<slug>`. Register new files in `src/lib/companies.ts`.
- Engine: `src/lib/engine.ts` (tests: `npm test`). Live click check: `node e2e/live.mjs <url> <outdir>`.

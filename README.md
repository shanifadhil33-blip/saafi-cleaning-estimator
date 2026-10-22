# Saafi Cleaning Estimator (demo)
One page home cleaning estimator with a live 3D model, itemized AED price and WhatsApp booking. Fictional brand.
- Rates, brand and WhatsApp number per company: `src/config/companies/<slug>.json`, served at `/c/<slug>`. Register new files in `src/lib/companies.ts`.
- US and Canada demos: `/us` (USD, English and Spanish, CAD toggle or `/ca` with French). UK demo: `/uk` (GBP, English, WhatsApp). Numbers live in `src/config/markets/`. Contact details are placeholders only.
- Engine: `src/lib/engine.ts` (tests: `npm test`). Live click check: `node e2e/live.mjs <url> <outdir>`.

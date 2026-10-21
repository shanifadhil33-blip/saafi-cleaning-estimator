# Cloudflare static export

The Vercel project on `main` uses `npm run build` (`next build`) with `STATIC_EXPORT` unset. That build is unchanged: no `output: 'export'`, no `out/` directory.

Paid client pages are a second build for Cloudflare Workers static assets. Cloudflare Pages can host the same `out/` files; the Wrangler config below is the Workers static-assets path, which is what applies trailing-slash redirects and the static 404.

## Build

```bash
npm ci
npm run build:static
```

`build:static` is `STATIC_EXPORT=1 next build` (Unix shell). With that variable set, `next.config.ts` adds:

- `output: 'export'`, which writes HTML, CSS, and JS into `out/` and does not produce a Node server
- `images.unoptimized: true`, so a `next/image` later on cannot call the Next image optimizer
- `trailingSlash: false` (also the Next.js default)

`trailingSlash: false` emits `out/c/<slug>.html`, not `out/c/<slug>/index.html`.

## Pages

`src/lib/companies.ts` reads every `src/config/companies/<slug>.json`. `generateStaticParams` in `src/app/c/[slug]/page.tsx` pre-renders one page per file. `dynamicParams` is `false`, so a slug that has no JSON file is not a route.

The sample company is `src/config/companies/saafi.json`: fictional, no brand name, placeholder WhatsApp `971500000000`. `/` renders that same config. The `slug` field inside a JSON file must match its file name.

`src/app/not-found.tsx` is exported as `out/404.html`.

`en`, `hi`, `ur`, and `ar` are selected in the browser from the query string, for example `/c/saafi?lang=ar`. Nothing on the server reads `lang`. There is no middleware, no API route, and no server action. The 3D house, the price, and WhatsApp booking run in the client bundle.

## Deploy with Wrangler

No Cloudflare account is configured for this repo. Do not treat these commands as already run.

`wrangler.jsonc` at the repo root is an assets-only Worker (no Worker script):

```jsonc
{
  "name": "saafi-estimator",
  "compatibility_date": "2026-10-21",
  "assets": {
    "directory": "./out",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

`html_handling: "auto-trailing-slash"` matches the Next export:

| Request | Result |
| --- | --- |
| `/c/saafi` | `200`, body from `out/c/saafi.html` |
| `/c/saafi/` | `307` redirect to `/c/saafi` |
| `/c/saafi.html` | `307` redirect to `/c/saafi` |
| `/c/no-such-company` | `404`, body from the nearest `404.html` (`out/404.html`) |

`npx wrangler dev` after `build:static` reproduces this table on localhost. It does not deploy and does not need an account.

From the repository root, after `npx wrangler login`:

```bash
npm run build:static
npx wrangler deploy
```

Leave `not_found_handling` as `404-page`. `single-page-application` would return the homepage with status 200 for unknown slugs.

After deploy, check `/`, `/c/saafi?lang=hi` (and `en`, `ur`, `ar`), `/c/saafi/`, and `/c/not-a-company`.

## Local preview of `out/`

```bash
npm run build:static
npx serve out
```

`serve` prints a local URL (port 3000 if it is free). Checked against this export, it serves `out/c/saafi.html` with status 200 for both `/c/saafi` and `/c/saafi/`, redirects `/c/saafi.html` to `/c/saafi`, and returns `out/404.html` with status 404 for an unknown slug.

Cloudflare's `auto-trailing-slash` is stricter than `serve` for the slash: `/c/saafi/` is a 307 redirect to `/c/saafi`, not a second 200. `npx wrangler dev` (after `build:static`, still no deploy) previews that redirect.

## Limits

- The export is a snapshot. Editing a company JSON needs a new `build:static` and a new deploy.
- `build:static` relies on a Unix shell to set `STATIC_EXPORT`.
- Tapping the on-page language control stores the choice in `localStorage` and does not rewrite `?lang`. Opening a URL with `?lang=en|hi|ur|ar` still applies that language on load.
- Fonts are requested from `fonts.googleapis.com` and `fonts.gstatic.com`. Without those hosts, the page uses the fallbacks in `globals.css`.

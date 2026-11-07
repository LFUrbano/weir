# Weir

Weir is a fictional AI-inference company based in San Francisco. This repository is a concept project: a marketing site for a product that does not exist, built to show design and front-end craft. It is not a real company, and nothing on the site can be bought or called.

## Stack

- Next.js (App Router), exported as a fully static site
- React and TypeScript
- Tailwind CSS v4 and shadcn/ui on Radix (`radix-ui` primitives, style `radix-nova`), themed with the Weir tokens in `src/app/globals.css`
- Fonts via `next/font`: Funnel Display, Funnel Sans, Azeret Mono
- Vitest for unit tests, Playwright for end-to-end tests
- GitHub Actions for CI

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:3000.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build the static site into `out/`, then fix the prefetch file names a Windows build gets wrong (`scripts/fix-segment-files.mjs`) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate Next.js route types and run `tsc` |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) against `out/` served on port 4190. Run `npm run build` first. |
| `npm run package` | Build and zip `out/` into `dist/weir-<YYYY-MM-DD>.zip`, ready to upload to a static host. Requires `SITE_URL` (see below). |

## Site address (`SITE_URL`)

Share images (`og:image`) and canonical URLs must be absolute, so the build reads the site's public address from the `SITE_URL` environment variable (`src/data/site.ts`, used as Next's `metadataBase`). Without it, `npm run build` falls back to the fictional `https://weir.example`, which is fine for local work and CI.

`npm run package` refuses to build the deploy zip when `SITE_URL` is unset or still `https://weir.example`. Set it to the live address:

```bash
SITE_URL=https://your-site.netlify.app npm run package
```

On Windows PowerShell: `$env:SITE_URL = "https://your-site.netlify.app"; npm run package`.

The same address goes into `sitemap.xml` and `robots.txt`. Netlify reads `public/_headers` (long cache for `/_next/static/*`, security headers) and `public/_redirects` from the zip root.

The first time you run the end-to-end tests, install the browser with `npx playwright install chromium`.

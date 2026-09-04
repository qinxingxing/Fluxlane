# Standalone frontend

The dashboard is a static Rsbuild application. It does not require Node.js,
Go, PostgreSQL, or Redis after the build finishes.

www, console, and docs are separate Cloudflare Pages projects that share this
repository. `VITE_SITE_MODE` selects public prerender vs console SPA.

## Build

```sh
cd web
bun install --frozen-lockfile
VITE_SITE_MODE=public bun run build
```

`bun run build` runs `scripts/seo-postbuild.ts`. That step must not call
`api.fluxlane.ai`. Public HTML is generated from in-repo snapshots so the same
commit is reproducible.

Publish `web/dist` to Cloudflare Pages. When the Pages project root is `web`,
use `bun run build` as the build command and `dist` as the output directory.

Public `_redirects` (generated) does **not** include a global SPA fallback.
Unknown www paths are real 404s. Console builds keep `/* /index.html 200` and
site-wide noindex.

## Backend

Use the following variables for a separated test deployment:

```env
SERVE_FRONTEND=false
CORS_ALLOW_ORIGINS=https://test.fluxlane.ai
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_TRUSTED_URL=https://test.fluxlane.ai
FRONTEND_BASE_URL=https://test.fluxlane.ai
```

For production, replace the test origin with `https://www.fluxlane.ai`.
Multiple exact origins are comma separated. Wildcards and URL paths are
rejected. Do not add `*.pages.dev` so that Pages Preview can call production.

`www.fluxlane.ai` and `api.fluxlane.ai` are cross-origin. The API CORS allowlist
permits the www origin; they are not same-origin. Pages Preview hosts are not
on that allowlist.

`SERVE_FRONTEND=false` disables the embedded dashboard fallback while leaving
API, relay, webhook, and health endpoints available.

## Security

- Never put a secret in a `VITE_*` variable; build variables are public.
- Do not cache `/api/*`, `/v1/*`, login, billing, or webhook responses.
- Use an exact CORS allowlist when browser credentials are enabled.
- Keep Stripe webhooks and OAuth server callbacks on the API origin.
- The browser OAuth redirect URI remains on the frontend origin.

## SEO

See `docs/seo/ARCHITECTURE.md`, `docs/seo/SEO_PHASE_1.md`, and
`docs/seo/TITLE_AND_METADATA.md`.

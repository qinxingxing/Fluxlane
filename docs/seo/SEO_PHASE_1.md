# SEO phase 1 — technical foundation

Status: **IN PROGRESS**. Do not treat this as READY. Do not merge to `main` until the checklist below is green and a Pages Preview has been reviewed.

## In scope

- Per-page title / description / canonical / Open Graph / Twitter / JSON-LD
- Prerender of stable public pages without contacting the production API
- `robots.txt`, `sitemap.xml`, `_headers`, `_redirects` generated at build time
- Console site-wide noindex
- True 404s on www for unknown paths
- Hydration that does not discard the prerendered tree (React #418 = 0)

## Out of scope / deferred

- **Model detail SEO: deferred.** `/pricing/<id>` uses a unified noindex SPA shell. Independent per-model titles, copy, and sitemap entries are not done.
- Rankings as an indexable page. The public snapshot keeps rankings disabled; the URL 404s rather than redirecting home.
- Real Privacy Policy, Terms, Refund Policy, Acceptable Use Policy, legal entity, and effective dates. Until those texts live in Git, legal URLs are `noindex` and omitted from the sitemap.
- Production CORS changes for `*.pages.dev`.

## Prerender data

| Page | First-frame content |
| --- | --- |
| `/` | In-repo landing (not `/api/home_page_content`) |
| `/about` | In-repo About copy |
| `/pricing` | Stable heading + intro; live price table after hydration |
| `/privacy-policy`, `/user-agreement` | Empty/not-published state, `noindex` |
| `/rankings` | Not prerendered; disabled → `notFound` |

## Acceptance (merge gate)

- Build does not contact `api.fluxlane.ai`
- Two consecutive public builds of the same commit produce the same SHA256 for prerendered HTML
- Prerendered pages: zero React hydration #418 (see `bun run seo:hydration-check`)
- H1 and body text do not disappear during load
- Core copy is present with JavaScript disabled
- Interaction works with JavaScript enabled
- Legal empty pages are not in `sitemap.xml`
- Disabled rankings is not in the sitemap and is not a soft 404 to `/`
- Preview CORS limits are documented (this file + `ARCHITECTURE.md`)
- Console build is noindex
- www unknown paths are real 404s
- `robots.txt` / `sitemap.xml` are not covered by an SPA fallback

## Current verification (development host)

Done:

- Public prerender does not contact `api.fluxlane.ai`
- Same-commit consecutive public builds: prerendered HTML SHA256 match (after zeroing per-query `dehydratedAt`)
- Legal URLs are `noindex` and absent from `sitemap.xml`
- Rankings is absent from the sitemap; disabled rankings uses `notFound` (not `/`)
- Console build: `Disallow: /`, meta robots, `X-Robots-Tag`

Not done (blocks merge):

- React hydration **#418 is still non-zero** on all prerendered pages. The recoverable error's component stack points at TanStack Router `Match`/`Matches` `Suspense`. `bun run seo:hydration-check` currently fails. Do not merge until that check is green.

## Hydration check on the development host

Public `dist/` plus Playwright Chromium (already bootstrapped on the dev host under `~/.cache/ms-playwright`). The check serves `dist`, blocks `/api/**`, and fails on hydration errors or a disappearing H1.

```sh
cd web
VITE_SITE_MODE=public bun run build
bun run seo:hydration-check
```

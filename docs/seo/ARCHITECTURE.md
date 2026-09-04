# Public site SEO architecture

Status: **SEO PHASE 1 IN PROGRESS**. This is not a production-ready declaration.

## Origins

```text
www.fluxlane.ai       Cloudflare Pages (VITE_SITE_MODE=public)
console.fluxlane.ai   Cloudflare Pages (VITE_SITE_MODE=console)
doc.fluxlane.ai       Cloudflare Pages (docs project)
api.fluxlane.ai       API CLB
```

`www` and `api` are **cross-origin**. Production CORS allows `https://www.fluxlane.ai` (and console). It does not make them same-origin.

Cloudflare Pages Preview (`*.pages.dev`) is a different origin. It will not receive production API cookies or CORS. Do not add `*.pages.dev` to production CORS. Preview of this phase should check static SEO output (titles, canonicals, robots, sitemap, prerendered HTML). Login and live API behavior stay on the real www origin.

## Build

`web/scripts/seo-postbuild.ts` runs after `rsbuild build`.

- Public mode prerenders `/`, `/about`, `/pricing`, `/privacy-policy`, `/user-agreement` into `dist/<path>/index.html`.
- The prerenderer uses an in-repo axios adapter. It must not fetch `api.fluxlane.ai`.
- Query cache is dehydrated into `window.__FLUXLANE_PRERENDER__` with timestamps zeroed so the same commit produces the same HTML.
- Live prices, notices, and admin HTML refresh only after hydration.
- Console mode keeps the SPA shell, `robots.txt` Disallow all, and `X-Robots-Tag: noindex`.

## Hydration

The first client render must match the prerendered tree:

- English
- Default theme / font / direction (cookies apply in `useEffect`)
- Signed-out chrome (`useIsClient` gates auth UI)
- Serialized react-query cache, not `localStorage` placeholders
- No live module-flag redirects during the hydration lock

`NavigationProgress` and `Toaster` stay out of the first frame.

## Routing artifacts

Public `_redirects` has no global `/* /index.html 200`. Unknown paths are real 404s (`404.html`, noindex). Known console paths 301 to `console.fluxlane.ai`. `/pricing/*` serves the noindex model shell.

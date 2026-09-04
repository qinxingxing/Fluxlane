# Title and metadata

Page SEO is owned by `web/src/lib/seo.ts`. Route components call `usePageSeo` (public) or `usePageTitle` (console).

## Arbitration

1. The route's `PageSeo.title` always wins.
2. `/api/status` `system_name` is a fallback for routes that never registered page SEO.
3. Prerendered HTML already contains the page title. `main.tsx` must not overwrite it from cached status.

## Canonicals

- Origin: `https://www.fluxlane.ai`
- Paths have no trailing slash
- Console routes are not canonicalized onto www

## Robots

| URL | Index |
| --- | --- |
| `/`, `/about`, `/pricing` | index (sitemap) |
| `/privacy-policy`, `/user-agreement` | noindex until policy text is in Git |
| `/pricing/<model>` | noindex shell; model SEO deferred |
| `/rankings` | not prerendered; 404 while disabled |
| unknown www paths | `404.html` noindex |
| entire console origin | noindex via meta + `X-Robots-Tag` + `Disallow: /` |

## JSON-LD

- Home: Organization + WebSite
- About / Pricing: BreadcrumbList
- Empty legal pages: none

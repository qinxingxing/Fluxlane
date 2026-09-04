/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

/**
 * SEO post-build step.
 *
 * Runs after `rsbuild build` and is driven by `VITE_SITE_MODE`:
 *
 * - `public`  (www.fluxlane.ai): prerenders the indexable pages into static
 *   HTML (title, meta description, canonical, Open Graph, JSON-LD, H1 and
 *   stable copy present without JavaScript), and generates robots.txt,
 *   sitemap.xml, _headers and _redirects for the public origin.
 * - `console` (console.fluxlane.ai): keeps the SPA shell, adds a noindex
 *   meta tag, and generates a disallow-all robots.txt plus
 *   X-Robots-Tag headers.
 *
 * Determinism contract (enforced): the prerenderer NEVER contacts the
 * production API. All request data comes from local, versioned-in-Git
 * defaults, and react-query dehydration timestamps are zeroed, so the same
 * commit always produces byte-identical HTML. Live data (prices, model
 * tables, admin content) is refreshed by the client after hydration.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(__dirname, '..')
const DIST = path.join(WEB_ROOT, 'dist')

const SITE_MODE =
  process.env.VITE_SITE_MODE === 'console' ? 'console' : 'public'
const PUBLIC_ORIGIN = process.env.VITE_SITE_ORIGIN || 'https://www.fluxlane.ai'
const CONSOLE_ORIGIN = 'https://console.fluxlane.ai'

const GOOGLE_VERIFICATION = process.env.VITE_GOOGLE_SITE_VERIFICATION || ''
const BING_VERIFICATION = process.env.VITE_BING_SITE_VERIFICATION || ''

type BreadcrumbEntry = { name: string; path: string }

type RouteSeo = {
  title: string
  description: string
  canonicalPath: string
  ogType: string
  jsonLd: Record<string, unknown>[]
  /** noindex routes are prerendered but excluded from the sitemap. */
  noindex?: boolean
  /** Source paths whose git history drives <lastmod> in the sitemap. */
  lastmodSources: string[]
}

function breadcrumb(items: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map(
      (item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${PUBLIC_ORIGIN}${item.path}`,
      })
    ),
  }
}

/**
 * Prerendered public routes.
 *
 * - `/rankings` is intentionally absent: the module is disabled in the
 *   live admin configuration, and the build must not depend on live
 *   state. Its URL 404s on the public site until it is re-enabled.
 * - Legal pages render their "content not configured" state with noindex:
 *   real policy text must land in Git before they may be indexed.
 * - `/pricing` prerenders the stable heading and intro; the live price
 *   table is client-rendered data, not SEO copy.
 */
const ROUTES: Record<string, RouteSeo> = {
  '/': {
    title: 'Fluxlane – Unified AI API for Leading Models',
    description:
      'Access leading AI models through one OpenAI-compatible API. Compare pricing, manage usage, and integrate with Fluxlane using familiar SDKs.',
    canonicalPath: '/',
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Fluxlane',
        url: PUBLIC_ORIGIN,
        logo: `${PUBLIC_ORIGIN}/logo.png`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Fluxlane',
        url: PUBLIC_ORIGIN,
      },
    ],
    lastmodSources: ['src/routes/index.tsx', 'src/features/home'],
  },
  '/about': {
    title: 'About Fluxlane | Unified AI API Platform',
    description:
      'Learn how Fluxlane provides unified, transparent and scalable access to leading AI model APIs.',
    canonicalPath: '/about',
    ogType: 'website',
    jsonLd: [breadcrumb([{ name: 'About', path: '/about' }])],
    lastmodSources: ['src/routes/about', 'src/features/about'],
  },
  '/pricing': {
    title: 'AI Model API Pricing | Fluxlane',
    description:
      'Compare AI model API pricing, token costs, capabilities, and availability on Fluxlane.',
    canonicalPath: '/pricing',
    ogType: 'website',
    jsonLd: [breadcrumb([{ name: 'Pricing', path: '/pricing' }])],
    lastmodSources: ['src/routes/pricing/index.tsx', 'src/features/pricing'],
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Fluxlane',
    description:
      'Read the Fluxlane privacy policy: what data we collect, how we use it, and the choices available to you.',
    canonicalPath: '/privacy-policy',
    ogType: 'website',
    noindex: true,
    jsonLd: [],
    lastmodSources: [
      'src/routes/privacy-policy.tsx',
      'src/features/legal/privacy-policy.tsx',
    ],
  },
  '/user-agreement': {
    title: 'Terms of Service | Fluxlane',
    description:
      'Review the terms of service for using the Fluxlane unified AI API platform.',
    canonicalPath: '/user-agreement',
    ogType: 'website',
    noindex: true,
    jsonLd: [],
    lastmodSources: [
      'src/routes/user-agreement.tsx',
      'src/features/legal/user-agreement.tsx',
    ],
  },
}

const NOT_FOUND_SEO = {
  title: 'Page Not Found | Fluxlane',
  description: 'The page you requested does not exist on Fluxlane.',
}

// ============================================================================
// Small utilities
// ============================================================================

function fail(message: string): never {
  console.error(`[seo-postbuild] FAIL: ${message}`)
  process.exit(1)
}

function banProductionApi(): void {
  const origFetch = globalThis.fetch?.bind(globalThis)
  if (!origFetch) return
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = ''
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.href
    } else {
      url = input.url
    }
    if (/api\.fluxlane\.ai/i.test(url)) {
      fail(`prerender contacted production API via fetch: ${url}`)
    }
    return origFetch(input, init)
  }) as typeof fetch
}

function log(message: string): void {
  console.log(`[seo-postbuild] ${message}`)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeJsonForScript(json: unknown): string {
  return JSON.stringify(json).replaceAll('<', '\\u003c')
}

/** Replace the first occurrence without `$`-pattern interpretation. */
function replaceLiteral(
  subject: string,
  search: string,
  replacement: string
): string {
  const index = subject.indexOf(search)
  if (index === -1) return subject
  return (
    subject.slice(0, index) + replacement + subject.slice(index + search.length)
  )
}

function gitLastmod(sources: string[]): string | null {
  try {
    const result = spawnSync(
      'git',
      ['log', '-1', '--format=%cI', '--', ...sources],
      { cwd: WEB_ROOT, encoding: 'utf8' }
    )
    const value = result.stdout?.trim()
    return value ? value : null
  } catch {
    return null
  }
}

/** Zero wall-clock fields so identical commits hydrate byte-identically. */
function deterministicDehydrate(
  dehydrated: Record<string, unknown>
): Record<string, unknown> {
  const copy: Record<string, unknown> = {
    ...dehydrated,
    dehydratedAt: 0,
  }
  const queries = copy.queries
  if (Array.isArray(queries)) {
    copy.queries = queries.map((entry) => {
      const query = entry as Record<string, unknown>
      const state = query.state as Record<string, unknown> | undefined
      if (state) {
        state.dataUpdatedAt = 0
        state.fetchSuccessTime = 0
        if (Array.isArray(state.fetchStatus)) state.fetchStatus = 'idle'
      }
      query.fetchStatus = 'idle'
      return query
    })
  }
  return copy
}

// ============================================================================
// Browser shims so the React tree can render outside a browser
// ============================================================================

/**
 * Minimal `window` for the prerender pass: the tree renders as www would
 * (absolute console links, relative public links) while runtime behaviors
 * that depend on the real origin are skipped via markPrerendering().
 */
function installShims(): void {
  const g = globalThis as Record<string, unknown>
  const storage = {
    getItem: () => null as string | null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null as string | null,
    length: 0,
  }
  if (typeof g.localStorage === 'undefined') {
    g.localStorage = storage
  }
  const matchMedia = () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })
  if (typeof g.matchMedia === 'undefined') {
    g.matchMedia = matchMedia
  }
  if (typeof g.window === 'undefined') {
    g.window = {
      location: {
        hostname: 'www.fluxlane.ai',
        href: `${PUBLIC_ORIGIN}/`,
        origin: PUBLIC_ORIGIN,
        protocol: 'https:',
        host: 'www.fluxlane.ai',
        pathname: '/',
        search: '',
        hash: '',
      },
      localStorage: g.localStorage,
      matchMedia,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }
  }
}

// ============================================================================
// Deterministic axios adapter: every response comes from this file.
// The prerenderer must never contact the production API.
// ============================================================================

const DEFAULT_STATUS_BODY = {
  success: true,
  data: {
    system_name: 'Fluxlane',
    logo: '',
    footer_html: '',
    docs_link: 'https://doc.fluxlane.ai',
    HeaderNavModules: JSON.stringify({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: false, requireAuth: false },
      docs: true,
      about: true,
    }),
  },
}

const EMPTY_DOCUMENT_BODY = { success: true, data: '' }

function localMockBody(url: string): unknown {
  if (url === '/api/status') return DEFAULT_STATUS_BODY
  if (url === '/api/setup') return { success: true, data: { status: true } }
  if (url === '/api/home_page_content') return EMPTY_DOCUMENT_BODY
  if (url === '/api/about') return EMPTY_DOCUMENT_BODY
  if (url === '/api/privacy-policy') return EMPTY_DOCUMENT_BODY
  if (url === '/api/user-agreement') return EMPTY_DOCUMENT_BODY
  if (url === '/api/notice') return EMPTY_DOCUMENT_BODY
  return { success: false, message: 'prerender-mock' }
}

interface AdapterResponse {
  data: unknown
  status: number
  statusText: string
  headers: Record<string, string>
  config: unknown
}

interface AdapterConfig {
  url?: string
  method?: string
  params?: unknown
}

async function prerenderAdapter(config: AdapterConfig): Promise<AdapterResponse> {
  const url = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()

  if (method === 'post' && url === '/api/user/auth/refresh') {
    // Deterministic anonymous visitor.
    throw new Error('prerender: anonymous refresh')
  }

  return {
    data: localMockBody(url),
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}

// ============================================================================
// HTML composition
// ============================================================================

type ComposableSeo = {
  title: string
  description: string
  canonicalPath: string
  ogType: string
  jsonLd: Record<string, unknown>[]
  noindex?: boolean
}

function headTagsFor(seo: ComposableSeo): string {
  const canonical = `${PUBLIC_ORIGIN}${seo.canonicalPath}`
  const tags = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${seo.ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:site_name" content="Fluxlane" />`,
    `<meta property="og:image" content="${PUBLIC_ORIGIN}/logo.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${PUBLIC_ORIGIN}/logo.png" />`,
  ]
  if (seo.noindex) {
    tags.push('<meta name="robots" content="noindex, follow" />')
  }
  if (GOOGLE_VERIFICATION) {
    tags.push(
      `<meta name="google-site-verification" content="${escapeHtml(GOOGLE_VERIFICATION)}" />`
    )
  }
  if (BING_VERIFICATION) {
    tags.push(
      `<meta name="msvalidate.01" content="${escapeHtml(BING_VERIFICATION)}" />`
    )
  }
  for (const block of seo.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${escapeJsonForScript(block)}</script>`
    )
  }
  return tags.join('\n    ')
}

const ROOT_DIV = '<div id="root" translate="no" class="notranslate"></div>'

/**
 * React 19 Float prepends hoisted tags (<link preload>, <meta>, <title>)
 * to the renderToString output. In the browser React hoists them into
 * <head> during hydration, which would mismatch the static HTML, so drop
 * the leading hoisted run from the prerendered markup; the client re-adds
 * them to the head itself.
 */
function stripLeadingHoistedTags(content: string): string {
  let out = content
  for (;;) {
    const next = out.replace(
      /^\s*(?:<!--.*?-->\s*)?(?:<(?:link|meta)\b[^>]*\/>|<title>[\s\S]*?<\/title>)\s*/,
      ''
    )
    if (next === out) break
    out = next
  }
  return out
}

function composePageHtml(opts: {
  shell: string
  routeSeo: ComposableSeo
  content: string
  dehydratedQueries: unknown
}): string {
  const { shell, routeSeo, content, dehydratedQueries } = opts

  let html = replaceLiteral(
    shell,
    '<title>Fluxlane</title>',
    `<title>${escapeHtml(routeSeo.title)}</title>`
  )
  html = html.replace(
    /<meta name="title" content="[^"]*" \/>/,
    () => `<meta name="title" content="${escapeHtml(routeSeo.title)}" />`
  )
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    () =>
      `<meta name="description" content="${escapeHtml(routeSeo.description)}" />`
  )
  html = replaceLiteral(
    html,
    '</head>',
    `    ${headTagsFor(routeSeo)}\n  </head>`
  )

  if (!html.includes(ROOT_DIV)) {
    fail('dist/index.html has no empty #root container to inject into')
  }
  const normalizedContent = stripLeadingHoistedTags(content)
  html = html.replace(
    /<div id="root"[^>]*><\/div>/,
    () =>
      `<div id="root" translate="no" class="notranslate">${normalizedContent}</div>`
  )

  // The hydration bridge must execute before the deferred bundle. Inline
  // scripts run during parsing, so placing it right after <body> is enough.
  const bridge = `<script>window.__FLUXLANE_PRERENDER__=${escapeJsonForScript({
    route: routeSeo.canonicalPath,
    dehydratedQueries,
  })};</script>`
  html = replaceLiteral(html, '<body>', `<body>\n    ${bridge}`)

  return html
}

// ============================================================================
// Static files
// ============================================================================

const SECURITY_HEADERS = [
  '  X-Content-Type-Options: nosniff',
  '  X-Frame-Options: SAMEORIGIN',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
]

const PUBLIC_HEADERS = `/*
${SECURITY_HEADERS.join('\n')}

/index.html
  Cache-Control: no-cache, no-store, must-revalidate

/static/*
  Cache-Control: public, max-age=31536000, immutable

/logo.png
  Cache-Control: public, max-age=3600

/favicon.ico
  Cache-Control: public, max-age=3600

/robots.txt
  Cache-Control: public, max-age=3600

/sitemap.xml
  Cache-Control: public, max-age=3600
`

const CONSOLE_HEADERS = `/*
${SECURITY_HEADERS.join('\n')}
  X-Robots-Tag: noindex, nofollow, noarchive

/index.html
  Cache-Control: no-cache, no-store, must-revalidate

/static/*
  Cache-Control: public, max-age=31536000, immutable
`

/** Routes that belong to the console origin, redirected off the public site. */
const CONSOLE_ONLY_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/register',
  '/forgot-password',
  '/reset',
  '/otp',
  '/user',
  '/setup',
  '/dashboard',
  '/keys',
  '/models',
  '/playground',
  '/chat',
  '/chat2link',
  '/profile',
  '/redemption-codes',
  '/subscriptions',
  '/system-info',
  '/system-settings',
  '/usage-logs',
  '/users',
  '/wallet',
  '/channels',
  '/401',
  '/403',
  '/404',
  '/500',
  '/503',
  '/login',
  '/forbidden',
]

function publicRedirects(): string {
  const lines: string[] = [
    '# Generated by scripts/seo-postbuild.ts — do not edit.',
    '# Canonicalize trailing slashes on prerendered routes.',
    '/about/ /about 308',
    '/pricing/ /pricing 308',
    '/privacy-policy/ /privacy-policy 308',
    '/user-agreement/ /user-agreement 308',
    '',
    '# Console routes live on the console origin.',
  ]
  for (const route of CONSOLE_ONLY_ROUTES) {
    lines.push(`${route} ${CONSOLE_ORIGIN}${route} 301`)
    lines.push(`${route}/* ${CONSOLE_ORIGIN}${route}/:splat 301`)
  }
  lines.push(`/console/* ${CONSOLE_ORIGIN}/console/:splat 301`)
  lines.push(`/oauth/* ${CONSOLE_ORIGIN}/oauth/:splat 301`)
  lines.push('')
  lines.push('# Model detail pages are dynamic client-rendered routes. The')
  lines.push('# fallback shell is noindex; a valid model removes the tag')
  lines.push('# client-side after data loads, an invalid one keeps it.')
  lines.push('/pricing/* /pricing-model-shell.html 200')
  return `${lines.join('\n')}\n`
}

/**
 * SPA shell for `/pricing/<model-id>` URLs: pricing-list title/description,
 * an explicit noindex (so unknown model ids are never indexed), and no
 * canonical (the client sets the right one once model data resolves).
 */
function composePricingModelShell(shell: string): string {
  const pricing = ROUTES['/pricing']
  if (!pricing) fail('missing pricing route SEO config')
  let html = replaceLiteral(
    shell,
    '<title>Fluxlane</title>',
    `<title>${escapeHtml(pricing.title)}</title>`
  )
  html = html.replace(
    /<meta name="title" content="[^"]*" \/>/,
    () => `<meta name="title" content="${escapeHtml(pricing.title)}" />`
  )
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    () =>
      `<meta name="description" content="${escapeHtml(pricing.description)}" />`
  )
  html = replaceLiteral(
    html,
    '</head>',
    '    <meta name="robots" content="noindex, follow" />\n  </head>'
  )
  return html
}

function writeStaticFiles(indexableRoutes: string[]): void {
  if (SITE_MODE === 'console') {
    writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
    writeFileSync(path.join(DIST, '_headers'), CONSOLE_HEADERS)
    writeFileSync(path.join(DIST, '_redirects'), '/* /index.html 200\n')
    return
  }

  writeFileSync(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${PUBLIC_ORIGIN}/sitemap.xml\n`
  )
  writeFileSync(path.join(DIST, '_headers'), PUBLIC_HEADERS)
  writeFileSync(path.join(DIST, '_redirects'), publicRedirects())

  const urls = indexableRoutes
    .filter((routePath) => ROUTES[routePath]?.noindex !== true)
    .map((routePath) => {
      const seo = ROUTES[routePath]
      const lastmod = gitLastmod(seo.lastmodSources)
      return lastmod
        ? `  <url><loc>${PUBLIC_ORIGIN}${seo.canonicalPath}</loc><lastmod>${lastmod}</lastmod></url>`
        : `  <url><loc>${PUBLIC_ORIGIN}${seo.canonicalPath}</loc></url>`
    })
  writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  )
}

// ============================================================================
// Validation — fails the build when a contract is broken
// ============================================================================

function validateOutput(renderedRoutes: string[]): void {
  const robots = readFileSync(path.join(DIST, 'robots.txt'), 'utf8')
  if (SITE_MODE === 'console') {
    if (!robots.includes('Disallow: /')) {
      fail('console robots.txt must disallow all')
    }
    const shell = readFileSync(path.join(DIST, 'index.html'), 'utf8')
    if (!shell.includes('name="robots"')) {
      fail('console index.html must carry a robots noindex meta tag')
    }
    const headers = readFileSync(path.join(DIST, '_headers'), 'utf8')
    if (!headers.includes('X-Robots-Tag: noindex')) {
      fail('console _headers must set X-Robots-Tag')
    }
    return
  }

  if (!robots.includes(`Sitemap: ${PUBLIC_ORIGIN}/sitemap.xml`)) {
    fail('public robots.txt must reference the sitemap')
  }

  const indexable = renderedRoutes.filter((r) => ROUTES[r]?.noindex !== true)
  const sitemap = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8')
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
  if (locs.length !== indexable.length) {
    fail(
      `sitemap expected ${indexable.length} URLs, found ${locs.length}`
    )
  }
  for (const loc of locs) {
    if (!loc.startsWith('https://')) fail(`sitemap URL not https: ${loc}`)
    if (loc.includes('?')) fail(`sitemap URL must be canonical: ${loc}`)
    if (loc.endsWith('/privacy-policy') || loc.endsWith('/user-agreement')) {
      fail('legal pages without published content must stay out of the sitemap')
    }
    if (loc.endsWith('/rankings')) {
      fail('rankings is disabled in the live configuration and must not be indexed')
    }
  }

  const redirects = readFileSync(path.join(DIST, '_redirects'), 'utf8')
  if (/^\/\* \/index\.html 200$/m.test(redirects)) {
    fail('public _redirects must not contain a global SPA fallback')
  }
  if (!redirects.includes('/pricing/* /pricing-model-shell.html 200')) {
    fail('public _redirects must route model URLs to the noindex shell')
  }
  if (!redirects.includes('/about/ /about 308')) {
    fail('public _redirects must canonicalize trailing slashes')
  }
  for (const route of CONSOLE_ONLY_ROUTES) {
    if (!redirects.includes(`${route} ${CONSOLE_ORIGIN}${route} 301`)) {
      fail(`public _redirects must move ${route} to the console origin`)
    }
  }

  for (const route of renderedRoutes) {
    const seo = ROUTES[route]
    if (!seo) fail(`unknown rendered route ${route}`)
    const file =
      route === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, route, 'index.html')
    if (!existsSync(file)) fail(`missing prerendered file for ${route}`)
    const html = readFileSync(file, 'utf8')
    const checks: [string, string][] = [
      ['title', `<title>${escapeHtml(seo.title)}</title>`],
      ['description', 'name="description"'],
      [
        'canonical',
        `<link rel="canonical" href="${PUBLIC_ORIGIN}${seo.canonicalPath}"`,
      ],
      ['og:title', 'property="og:title"'],
      ['twitter:card', 'name="twitter:card"'],
      ['h1', '<h1'],
      ['prerender bridge', '__FLUXLANE_PRERENDER__'],
    ]
    for (const [label, needle] of checks) {
      if (!html.includes(needle)) {
        fail(`${route}: missing ${label} in prerendered HTML`)
      }
    }
    if (seo.noindex && !html.includes('name="robots"')) {
      fail(`${route}: must carry a noindex meta tag`)
    }
    // Footer destinations required on every public page.
    const footerLinks: [string, string][] = [
      ['pricing link', 'href="/pricing"'],
      ['docs link', 'https://doc.fluxlane.ai'],
      ['about link', 'href="/about"'],
      ['privacy link', 'href="/privacy-policy"'],
      ['terms link', 'href="/user-agreement"'],
      ['console link', 'https://console.fluxlane.ai'],
    ]
    for (const [label, needle] of footerLinks) {
      if (!html.includes(needle)) {
        fail(`${route}: footer missing ${label} (${needle})`)
      }
    }
    if (html.includes('>New API</span>')) {
      fail(`${route}: default upstream brand leaked into prerendered HTML`)
    }
  }

  const shell404 = path.join(DIST, '404.html')
  if (!existsSync(shell404)) fail('missing dist/404.html')
  const notFound = readFileSync(shell404, 'utf8')
  if (!notFound.includes('name="robots"') || !notFound.includes('noindex')) {
    fail('404.html must be noindex')
  }

  const modelShellPath = path.join(DIST, 'pricing-model-shell.html')
  if (!existsSync(modelShellPath)) fail('missing dist/pricing-model-shell.html')
  const modelShell = readFileSync(modelShellPath, 'utf8')
  if (
    !modelShell.includes('name="robots"') ||
    !modelShell.includes('noindex')
  ) {
    fail('pricing-model-shell.html must be noindex')
  }
  if (modelShell.includes('rel="canonical"')) {
    fail('pricing-model-shell.html must not claim a canonical URL')
  }
}

// ============================================================================
// Prerender driver
// ============================================================================

type LoadedRouter = {
  load: () => Promise<unknown>
  state: { location: { pathname: string } }
}

type PrefetchableQueryClient = {
  prefetchQuery: (options: unknown) => Promise<unknown>
}

type PrerenderModules = {
  QueryClient: new (options: unknown) => unknown
  QueryClientProvider: unknown
  ThemeProvider: unknown
  FontProvider: unknown
  DirectionProvider: unknown
  createRouter: (options: unknown) => LoadedRouter
  createMemoryHistory: (options: unknown) => unknown
  RouterProvider: unknown
  routeTree: unknown
  renderToString: (element: unknown) => string
  createElement: (
    type: unknown,
    props: unknown,
    ...children: unknown[]
  ) => unknown
  dehydrate: (client: unknown) => unknown
  markPrerendering: () => void
  prefetchRouteData: (
    routePath: string,
    queryClient: PrefetchableQueryClient
  ) => Promise<void>
}

async function loadPrerenderModules(): Promise<PrerenderModules> {
  installShims()
  banProductionApi()

  // Mark the runtime as the prerenderer before any route code runs, so
  // origin-dependent behaviors (domain redirects, auth bootstrap) are
  // skipped inside the rendered tree.
  const bridge = await import('../src/lib/prerender-bridge')
  bridge.markPrerendering()

  const http = await import('../src/lib/http-client')
  ;(http.api.defaults as { adapter: unknown }).adapter = prerenderAdapter

  const reactQuery = await import('@tanstack/react-query')
  const reactRouter = await import('@tanstack/react-router')
  const history = await import('@tanstack/history')
  const reactDomServer = await import('react-dom/server')
  const react = await import('react')
  // Route components render translated text; initialize i18n before render
  // and pin English so the prerendered HTML is deterministic regardless of
  // the build machine's environment (the root route switches the visitor to
  // their detected language after hydration).
  const i18n = (await import('../src/i18n/config')).default
  await i18n.changeLanguage('en')
  const { routeTree } = await import('../src/routeTree.gen')
  const { ThemeProvider } = await import('../src/context/theme-provider')
  const { FontProvider } = await import('../src/context/font-provider')
  const { DirectionProvider } = await import(
    '../src/context/direction-provider'
  )
  const { getAboutContent } = await import('../src/features/about/api')
  const {
    getPrivacyPolicy,
    getUserAgreement,
  } = await import('../src/features/legal/api')
  const { getStatus } = await import('../src/lib/api')

  const prefetchRouteData: PrerenderModules['prefetchRouteData'] = async (
    routePath,
    queryClient
  ) => {
    // Every query is answered by the local mock adapter: the prerendered
    // HTML depends only on this repository's code, never on live data.
    await queryClient.prefetchQuery({
      queryKey: ['status'],
      queryFn: () => getStatus(),
      staleTime: 5 * 60 * 1000,
    })
    if (routePath === '/about') {
      await queryClient.prefetchQuery({
        queryKey: ['about-content'],
        queryFn: () => getAboutContent(),
        staleTime: 5 * 60 * 1000,
      })
    }
    if (routePath === '/privacy-policy') {
      await queryClient.prefetchQuery({
        queryKey: ['privacy-policy'],
        queryFn: () => getPrivacyPolicy(),
        staleTime: 10 * 60 * 1000,
      })
    }
    if (routePath === '/user-agreement') {
      await queryClient.prefetchQuery({
        queryKey: ['user-agreement'],
        queryFn: () => getUserAgreement(),
        staleTime: 10 * 60 * 1000,
      })
    }
    // Deliberately NOT prefetched: pricing and rankings payloads. The live
    // tables are dynamic data; the client renders them after hydration.
  }

  return {
    QueryClient: reactQuery.QueryClient as PrerenderModules['QueryClient'],
    QueryClientProvider: reactQuery.QueryClientProvider,
    ThemeProvider,
    FontProvider,
    DirectionProvider,
    createRouter: reactRouter.createRouter as PrerenderModules['createRouter'],
    createMemoryHistory:
      history.createMemoryHistory as PrerenderModules['createMemoryHistory'],
    RouterProvider: reactRouter.RouterProvider,
    routeTree,
    renderToString: reactDomServer.renderToString,
    createElement: react.createElement,
    dehydrate: reactQuery.dehydrate,
    markPrerendering: bridge.markPrerendering,
    prefetchRouteData,
  }
}

async function prerenderRoute(opts: {
  routePath: string
  routeSeo: ComposableSeo
  shell: string
  modules: PrerenderModules
  outputPath: string
}): Promise<boolean> {
  const { routePath, routeSeo, shell, modules, outputPath } = opts

  const queryClient = new modules.QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })

  await modules.prefetchRouteData(
    routePath,
    queryClient as unknown as PrefetchableQueryClient
  )

  const router = modules.createRouter({
    routeTree: modules.routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    history: modules.createMemoryHistory({ initialEntries: [routePath] }),
  })
  try {
    await router.load()
  } catch (error) {
    log(`router.load(${routePath}) threw: ${String(error)}`)
  }

  const content = modules.renderToString(
    modules.createElement(
      modules.QueryClientProvider,
      { client: queryClient },
      modules.createElement(
        modules.ThemeProvider,
        null,
        modules.createElement(
          modules.FontProvider,
          null,
          modules.createElement(
            modules.DirectionProvider,
            null,
            modules.createElement(modules.RouterProvider, { router })
          )
        )
      )
    )
  )
  if (content.trim().length < 200) {
    log(`SKIP ${routePath}: rendered empty (module disabled or auth-gated)`)
    return false
  }

  const dehydrated = deterministicDehydrate(
    modules.dehydrate(queryClient) as Record<string, unknown>
  )

  const html = composePageHtml({
    shell,
    routeSeo,
    content,
    dehydratedQueries: dehydrated,
  })

  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html)
  log(`prerendered ${routePath} -> ${path.relative(WEB_ROOT, outputPath)}`)
  return true
}

async function main(): Promise<void> {
  const shellPath = path.join(DIST, 'index.html')
  if (!existsSync(shellPath)) {
    fail('dist/index.html not found — run `rsbuild build` first')
  }

  // The emitted shell must have an empty #root. Keep a pristine copy so the
  // script can be re-run standalone without rebuilding the bundle.
  const shellBackupPath = path.join(DIST, '.seo-shell.html')
  let shell: string
  const emitted = readFileSync(shellPath, 'utf8')
  if (/<div id="root"[^>]*><\/div>/.test(emitted)) {
    shell = emitted
    writeFileSync(shellBackupPath, shell)
  } else if (existsSync(shellBackupPath)) {
    shell = readFileSync(shellBackupPath, 'utf8')
  } else {
    fail('dist/index.html is not a pristine shell — re-run `rsbuild build`')
  }

  log(
    `site mode: ${SITE_MODE} (origin ${SITE_MODE === 'console' ? CONSOLE_ORIGIN : PUBLIC_ORIGIN}), no remote API access`
  )

  if (SITE_MODE === 'console') {
    const html = replaceLiteral(
      shell,
      '</head>',
      '    <meta name="robots" content="noindex, nofollow" />\n  </head>'
    )
    writeFileSync(shellPath, html)
    writeStaticFiles([])
    validateOutput([])
    log('console build finalized (noindex shell + robots/_headers/_redirects)')
    return
  }

  const modules = await loadPrerenderModules()

  const renderedRoutes: string[] = []
  for (const [routePath, routeSeo] of Object.entries(ROUTES)) {
    const outputPath =
      routePath === '/'
        ? shellPath
        : path.join(DIST, routePath, 'index.html')
    const rendered = await prerenderRoute({
      routePath,
      routeSeo,
      shell,
      modules,
      outputPath,
    })
    if (rendered) renderedRoutes.push(routePath)
  }
  if (renderedRoutes.length !== Object.keys(ROUTES).length) {
    fail('a public route failed to prerender; refusing to ship a partial site')
  }

  // 404.html: render the router's not-found view for an unknown path.
  await prerenderRoute({
    routePath: '/__fluxlane_not_found__',
    routeSeo: {
      title: NOT_FOUND_SEO.title,
      description: NOT_FOUND_SEO.description,
      canonicalPath: '/',
      ogType: 'website',
      jsonLd: [],
      noindex: true,
    },
    shell,
    modules,
    outputPath: path.join(DIST, '404.html'),
  })

  // SPA shell for /pricing/<model-id> (noindex; client decides validity).
  writeFileSync(
    path.join(DIST, 'pricing-model-shell.html'),
    composePricingModelShell(shell)
  )

  writeStaticFiles(renderedRoutes)
  validateOutput(renderedRoutes)
  if (existsSync(shellBackupPath)) {
    spawnSync('rm', [shellBackupPath])
  }
  log(
    'public build finalized (prerendered pages + robots/sitemap/_headers/_redirects)'
  )
}

void main()

/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
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
import { useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * SEO metadata registry and document-head manager.
 *
 * Static SEO text stays in English on purpose: every indexed URL has one
 * canonical language, and the public site is English-first. Page-level SEO
 * applied here always wins over the branding name returned by /api/status
 * (see `applyBrandFallbackTitle`), so titles never regress to the raw
 * system name after the status request resolves.
 */

export const SITE_ORIGIN = 'https://www.fluxlane.ai'
export const SITE_NAME = 'Fluxlane'
const OG_IMAGE = `${SITE_ORIGIN}/logo.png`

export type PageSeo = {
  title: string
  description: string
  /** Canonical path without trailing slash, e.g. `/pricing`. */
  canonicalPath: string
  ogType?: 'website' | 'article'
  jsonLd?: Record<string, unknown>[]
  /** Emit `noindex, nofollow` (e.g. soft-404 model detail pages). */
  noindex?: boolean
}

const HOME_DESCRIPTION =
  'Access leading AI models through one OpenAI-compatible API. Compare pricing, manage usage, and integrate with Fluxlane using familiar SDKs.'

export const homeSeo: PageSeo = {
  title: 'Fluxlane – Unified AI API for Leading Models',
  description: HOME_DESCRIPTION,
  canonicalPath: '/',
  ogType: 'website',
  jsonLd: [organizationJsonLd(), websiteJsonLd()],
}

export const pricingSeo: PageSeo = {
  title: 'AI Model API Pricing | Fluxlane',
  description:
    'Compare AI model API pricing, token costs, capabilities, and availability on Fluxlane.',
  canonicalPath: '/pricing',
  jsonLd: [breadcrumbJsonLd([{ name: 'Pricing', path: '/pricing' }])],
}

export const aboutSeo: PageSeo = {
  title: 'About Fluxlane | Unified AI API Platform',
  description:
    'Learn how Fluxlane provides unified, transparent and scalable access to leading AI model APIs.',
  canonicalPath: '/about',
  jsonLd: [breadcrumbJsonLd([{ name: 'About', path: '/about' }])],
}

export const rankingsSeo: PageSeo = {
  title: 'AI Model Rankings and Availability | Fluxlane',
  description:
    'Explore AI models available through Fluxlane and compare pricing, capabilities and platform availability.',
  canonicalPath: '/rankings',
  jsonLd: [breadcrumbJsonLd([{ name: 'Rankings', path: '/rankings' }])],
}

export const privacyPolicySeo: PageSeo = {
  title: 'Privacy Policy | Fluxlane',
  description:
    'Read the Fluxlane privacy policy: what data we collect, how we use it, and the choices available to you.',
  canonicalPath: '/privacy-policy',
  noindex: true,
  jsonLd: [],
}

export const userAgreementSeo: PageSeo = {
  title: 'Terms of Service | Fluxlane',
  description:
    'Review the terms of service for using the Fluxlane unified AI API platform.',
  canonicalPath: '/user-agreement',
  noindex: true,
  jsonLd: [],
}

/** SEO for a `/pricing/<model-id>` detail page. */
export function modelDetailSeo(modelName: string, modelId: string): PageSeo {
  const safeName = modelName.trim() || modelId
  return {
    title: `${safeName} API Pricing and Access | Fluxlane`,
    description: `Use the ${safeName} API through Fluxlane. Review input and output pricing, capabilities, availability and OpenAI-compatible integration examples.`,
    canonicalPath: `/pricing/${encodeURIComponent(modelId)}`,
    jsonLd: [breadcrumbJsonLd([modelBreadcrumbItem(safeName, modelId)])],
  }
}

export const notFoundSeo: PageSeo = {
  title: 'Page Not Found | Fluxlane',
  description: 'The page you requested does not exist on Fluxlane.',
  canonicalPath: '/',
  noindex: true,
}

// ============================================================================
// Console titles (UX only — console routes are noindex by robots.txt and
// X-Robots-Tag, never canonicalized to the public site)
// ============================================================================

const CONSOLE_ROUTE_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/sign-in', title: 'Sign In | Fluxlane' },
  { prefix: '/sign-up', title: 'Create Account | Fluxlane' },
  { prefix: '/register', title: 'Create Account | Fluxlane' },
  { prefix: '/dashboard', title: 'Dashboard | Fluxlane' },
  { prefix: '/models', title: 'Models | Fluxlane' },
  { prefix: '/keys', title: 'API Keys | Fluxlane' },
  { prefix: '/usage-logs', title: 'Usage Logs | Fluxlane' },
  { prefix: '/wallet', title: 'Billing and Balance | Fluxlane' },
  { prefix: '/channels', title: 'Admin Console | Fluxlane' },
  { prefix: '/users', title: 'Admin Console | Fluxlane' },
  { prefix: '/system-settings', title: 'Admin Console | Fluxlane' },
  { prefix: '/system-info', title: 'Admin Console | Fluxlane' },
  { prefix: '/pricing', title: 'AI Model API Pricing | Fluxlane' },
  {
    prefix: '/rankings',
    title: 'AI Model Rankings and Availability | Fluxlane',
  },
]

/** Derive a browser title for any path; falls back to the brand name. */
export function titleForPath(pathname: string): string {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  const match = CONSOLE_ROUTE_TITLES.find(
    (entry) =>
      normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)
  )
  return match ? match.title : SITE_NAME
}

// ============================================================================
// JSON-LD builders
// ============================================================================

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: OG_IMAGE,
  }
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_ORIGIN,
  }
}

export type BreadcrumbItem = { name: string; path: string }

export function breadcrumbJsonLd(
  items: BreadcrumbItem[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map(
      (item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${SITE_ORIGIN}${item.path}`,
      })
    ),
  }
}

function modelBreadcrumbItem(name: string, id: string): BreadcrumbItem {
  return { name, path: `/pricing/${encodeURIComponent(id)}` }
}

// ============================================================================
// Title arbitration: page-level titles beat the branding fallback from
// /api/status so the system name can never overwrite page SEO mid-flight.
// ============================================================================

let activePath: string | null = null
let pageTitle: string | null = null

function setMetaContent(name: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setPropertyContent(property: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`
  )
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(path: string): void {
  document
    .querySelectorAll('link[rel="canonical"]')
    .forEach((el) => el.remove())
  const link = document.createElement('link')
  link.setAttribute('rel', 'canonical')
  link.setAttribute('href', `${SITE_ORIGIN}${path}`)
  document.head.appendChild(link)
}

function setJsonLd(blocks: Record<string, unknown>[]): void {
  document
    .querySelectorAll('script[data-seo-jsonld]')
    .forEach((el) => el.remove())
  for (const block of blocks) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo-jsonld', 'true')
    // Escape `<` so a model name cannot close the script tag early.
    script.textContent = JSON.stringify(block).replaceAll('<', '\\u003c')
    document.head.appendChild(script)
  }
}

function setOrRemoveMetaRobots(noindex: boolean): void {
  document.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove())
  if (noindex) {
    const el = document.createElement('meta')
    el.setAttribute('name', 'robots')
    el.setAttribute('content', 'noindex, nofollow')
    document.head.appendChild(el)
  }
}

export function applySeo(seo: PageSeo): void {
  document.title = seo.title
  setMetaContent('title', seo.title)
  setMetaContent('description', seo.description)
  setCanonical(seo.canonicalPath)
  setOrRemoveMetaRobots(seo.noindex === true)
  setPropertyContent('og:type', seo.ogType ?? 'website')
  setPropertyContent('og:title', seo.title)
  setPropertyContent('og:description', seo.description)
  setPropertyContent('og:url', `${SITE_ORIGIN}${seo.canonicalPath}`)
  setPropertyContent('og:site_name', SITE_NAME)
  setPropertyContent('og:image', OG_IMAGE)
  setMetaContent('twitter:card', 'summary_large_image')
  setMetaContent('twitter:title', seo.title)
  setMetaContent('twitter:description', seo.description)
  setMetaContent('twitter:image', OG_IMAGE)
  if (seo.jsonLd && seo.jsonLd.length > 0) {
    setJsonLd(seo.jsonLd)
  } else {
    setJsonLd([])
  }
  if (activePath !== null) pageTitle = seo.title
}

/** Apply only a browser title (console pages; no canonical/OG for noindex). */
export function applyPageTitle(title: string): void {
  document.title = title
  setMetaContent('title', title)
  if (activePath !== null) pageTitle = title
}

/**
 * Branding fallback for pages without a dedicated title. Never overrides a
 * page-level title already applied for the current location.
 */
export function applyBrandFallbackTitle(name: string): void {
  if (pageTitle !== null) return
  document.title = name
  setMetaContent('title', name)
}

/** Track navigation so stale page titles do not leak into the next route. */
export function markNavigation(pathname: string): void {
  if (pathname !== activePath) {
    activePath = pathname
    pageTitle = null
  }
}

/** Apply the derived default title when the route registers no page SEO. */
export function applyDefaultTitle(pathname: string): void {
  if (pageTitle !== null || activePath !== pathname) return
  document.title = titleForPath(pathname)
}

// ============================================================================
// React bindings
// ============================================================================

/** Full SEO for an indexable public page. */
export function usePageSeo(seo: PageSeo): void {
  const location = useLocation()
  useEffect(() => {
    markNavigation(location.pathname)
    applySeo(seo)
  }, [seo, location.pathname])
}

/** Browser-title-only hook for console pages. */
export function usePageTitle(title: string): void {
  const location = useLocation()
  useEffect(() => {
    markNavigation(location.pathname)
    applyPageTitle(title)
  }, [title, location.pathname])
}

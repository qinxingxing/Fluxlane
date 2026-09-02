/* Copyright (C) 2023-2026 QuantumNous */

const PUBLIC_HOSTNAME = 'www.fluxlane.ai'
const CONSOLE_HOSTNAME = 'console.fluxlane.ai'
const CONSOLE_ORIGIN = `https://${CONSOLE_HOSTNAME}`
const PUBLIC_ORIGIN = `https://${PUBLIC_HOSTNAME}`

const PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/pricing',
  '/rankings',
  '/privacy-policy',
  '/user-agreement',
])

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

/** Pricing model detail pages (/pricing/$modelId) stay on the public site too. */
function isPublicSitePath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname === '/pricing' ||
    pathname.startsWith('/pricing/')
  )
}

/**
 * Resolve a public-site link for the current host: absolute on the console
 * origin, relative (SPA navigation) everywhere else.
 */
export function publicSiteHref(path: string): string {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === CONSOLE_HOSTNAME
  ) {
    return `${PUBLIC_ORIGIN}${path}`
  }
  return path
}

/** Resolve a console link for the current host: absolute on www, relative elsewhere. */
export function consoleSiteHref(path: string): string {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === PUBLIC_HOSTNAME
  ) {
    return `${CONSOLE_ORIGIN}${path}`
  }
  return path
}

/** Keep public pages and the account console on separate origins. */
export function getDomainRedirect(href: string): string | null {
  let current: URL
  try {
    current = new URL(href)
  } catch {
    return null
  }

  const pathname = normalizePathname(current.pathname)
  if (
    current.hostname === PUBLIC_HOSTNAME &&
    !isPublicSitePath(pathname)
  ) {
    return `${CONSOLE_ORIGIN}${current.pathname}${current.search}${current.hash}`
  }

  if (current.hostname === CONSOLE_HOSTNAME) {
    if (pathname === '/') {
      return `${CONSOLE_ORIGIN}/sign-in${current.search}${current.hash}`
    }
    if (isPublicSitePath(pathname)) {
      return `${PUBLIC_ORIGIN}${current.pathname}${current.search}${current.hash}`
    }
  }

  return null
}

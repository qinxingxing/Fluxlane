/**
 * www vs console are separate Cloudflare Pages projects that share `web/`.
 * An unset `VITE_SITE_MODE` defaults to public. If that public dist is published
 * to console.fluxlane.ai, `_redirects` 301s `/sign-in` to itself forever.
 */
export function resolveSiteMode(
  env: NodeJS.ProcessEnv = process.env
): 'console' | 'public' {
  if (env.VITE_SITE_MODE === 'console' || env.VITE_SITE_MODE === 'public') {
    return env.VITE_SITE_MODE
  }
  return looksLikeConsolePages(env) ? 'console' : 'public'
}

export function looksLikeConsolePages(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const haystack = [
    env.CF_PAGES_PROJECT_NAME,
    env.CF_PAGES_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n')
    .toLowerCase()
  return (
    haystack.includes('console.fluxlane.ai') ||
    haystack.includes('fluxlane-console')
  )
}

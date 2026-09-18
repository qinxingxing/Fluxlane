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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { consoleSiteHref, publicSiteHref } from '@/lib/domain-routing'
import { FLUXLANE_DOCS_URL } from '@/lib/fluxlane-brand'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

export type TopNavLink = {
  title: string
  href: string
  disabled?: boolean
  requiresAuth?: boolean
  external?: boolean
}

export type BuildPublicNavLinksOptions = {
  t: (key: string) => string
  status: Record<string, unknown> | null
  isAuthed: boolean
  docsLink?: string
}

/**
 * Generate top navigation links based on HeaderNavModules configuration from backend /api/status
 * Backend format example (stringified JSON):
 * {
 *   home: true,
 *   console: true,
 *   pricing: { enabled: true, requireAuth: false },
 *   rankings: { enabled: true, requireAuth: false },
 *   docs: true,
 *   about: true
 * }
 */
export function buildPublicNavLinks({
  t,
  status,
  isAuthed,
  docsLink = FLUXLANE_DOCS_URL,
}: BuildPublicNavLinksOptions): TopNavLink[] {
  const modules = parseHeaderNavModulesFromStatus(status)
  const links: TopNavLink[] = []

  if (modules.home !== false) {
    links.push({ title: t('Home'), href: publicSiteHref('/') })
  }

  if (modules.console !== false) {
    links.push({ title: t('Console'), href: consoleSiteHref('/dashboard') })
  }

  const pricing = modules.pricing
  if (pricing && typeof pricing === 'object' && pricing.enabled) {
    links.push({
      title: t('Model Square'),
      href: publicSiteHref('/pricing'),
      requiresAuth: pricing.requireAuth && !isAuthed,
    })
  }

  // Rankings defaults to enabled when HeaderNavModules is missing. That
  // flashes a /rankings link (and a 404 on deployments that disable the
  // module) before /api/status loads, and the extra item can reuse a
  // sibling Link's identity. Only render it once a real status payload
  // confirms the module is on.
  const rankings = modules.rankings
  if (status && rankings && typeof rankings === 'object' && rankings.enabled) {
    links.push({
      title: t('Rankings'),
      href: publicSiteHref('/rankings'),
      requiresAuth: rankings.requireAuth && !isAuthed,
    })
  }

  if (modules.docs !== false) {
    links.push({ title: t('Docs'), href: docsLink, external: true })
  }

  if (modules.about !== false) {
    links.push({ title: t('About'), href: publicSiteHref('/about') })
  }

  return links
}

export function useTopNavLinks(): TopNavLink[] {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { auth } = useAuthStore()
  const isAuthed = !!auth?.user

  return useMemo(
    () =>
      buildPublicNavLinks({
        t: (key) => t(key),
        status: status as Record<string, unknown> | null,
        isAuthed,
      }),
    [t, status, isAuthed]
  )
}

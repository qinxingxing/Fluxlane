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
import { DEFAULT_SYSTEM_NAME } from './constants'

export const FLUXLANE_DOCS_URL = 'https://doc.fluxlane.ai'
export const FLUXLANE_SITE_URL = 'https://www.fluxlane.ai'

function isUpstreamProductName(value: string): boolean {
  const normalized = value.trim().toLowerCase().replaceAll(/[\s_-]+/g, '')
  return (
    normalized === 'newapi' ||
    normalized === 'newapi.ai' ||
    normalized === 'newapiconsole'
  )
}

/** Public chrome never shows the upstream project name or FluxLane casing. */
export function publicBrandName(
  raw?: string | null,
  fallback: string = DEFAULT_SYSTEM_NAME
): string {
  const name = (raw ?? '').trim()
  if (!name || isUpstreamProductName(name)) {
    return fallback
  }
  if (/^flux\s*lane\.ai$/i.test(name)) {
    return 'Fluxlane.ai'
  }
  if (/^flux\s*lane$/i.test(name)) {
    return 'Fluxlane'
  }
  return name.replaceAll('FluxLane', 'Fluxlane').replaceAll('Flux Lane', 'Fluxlane')
}

/** Drop leftover New API documentation hosts; keep a custom Fluxlane URL. */
export function publicDocsLink(raw?: string | null): string {
  const link = (raw ?? '').trim()
  if (!link) {
    return FLUXLANE_DOCS_URL
  }
  const lower = link.toLowerCase()
  if (
    lower.includes('newapi.pro') ||
    lower.includes('newapi.ai') ||
    lower.includes('docs.newapi')
  ) {
    return FLUXLANE_DOCS_URL
  }
  return link
}

export function sanitizePublicStatus<T extends Record<string, unknown>>(
  status: T
): T {
  const next: Record<string, unknown> = { ...status }
  if ('system_name' in next) {
    next.system_name = publicBrandName(
      typeof next.system_name === 'string' ? next.system_name : undefined
    )
  }
  if ('docs_link' in next) {
    next.docs_link = publicDocsLink(
      typeof next.docs_link === 'string' ? next.docs_link : undefined
    )
  }
  if ('passkey_display_name' in next) {
    next.passkey_display_name = publicBrandName(
      typeof next.passkey_display_name === 'string'
        ? next.passkey_display_name
        : undefined
    )
  }
  return next as T
}

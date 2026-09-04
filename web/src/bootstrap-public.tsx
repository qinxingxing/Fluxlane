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
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { hydrateRoot } from 'react-dom/client'

import { startSpa } from '@/bootstrap-spa'
import { beginPrerenderHydration } from '@/lib/prerender-bridge'
import { createAppRouter } from '@/router'

function reportHydrationError(error: unknown, errorInfo?: { componentStack?: string }): void {
  const stack = errorInfo?.componentStack ?? ''
  // Hydration mismatches must be visible to the acceptance check.
  // eslint-disable-next-line no-console
  console.error('[fluxlane-hydration] recoverable error:', error, stack)
  try {
    window.__FLUXLANE_HYDRATION_ERROR__ = `${String(error)}\n${stack}`
  } catch {
    /* ignore */
  }
}

/**
 * Public origin production entry. Prerendered pages ship `window.$_TSR`
 * from TanStack Router's official dehydrate step; those hydrate the same
 * `#root` the postbuild injected. Pages without that bootstrap (the
 * noindex model-detail shell) stay a client-only SPA.
 */
export function startPublic(): void {
  if (!window.$_TSR) {
    startSpa()
    return
  }

  const rootElement = document.querySelector<HTMLElement>('#root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  beginPrerenderHydration()
  const router = createAppRouter()
  hydrateRoot(rootElement, <RouterClient router={router} />, {
    onRecoverableError: reportHydrationError,
  })
}

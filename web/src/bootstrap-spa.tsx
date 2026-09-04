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
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { getStatus } from '@/lib/api'
import { applyFaviconToDom } from '@/lib/dom-utils'
import { applyBrandFallbackTitle } from '@/lib/seo'
import { createAppRouter } from '@/router'

function initSystemBranding(): void {
  try {
    const saved = localStorage.getItem('status')
    if (saved) {
      const status = JSON.parse(saved) as {
        system_name?: string
        logo?: string
      }
      if (status?.system_name) applyBrandFallbackTitle(status.system_name)
      if (status?.logo) applyFaviconToDom(status.logo)
    }
  } catch {
    /* empty */
  }
  getStatus()
    .then((status) => {
      if (status?.system_name) {
        applyBrandFallbackTitle(status.system_name as string)
        try {
          localStorage.setItem('status', JSON.stringify(status))
        } catch {
          /* empty */
        }
      }
      if (status?.logo) applyFaviconToDom(status.logo as string)
    })
    .catch(() => {
      /* empty */
    })
}

/** Console origin and local `rsbuild dev`: client-only SPA, no SSR hydrate. */
export function startSpa(): void {
  const rootElement = document.querySelector<HTMLElement>('#root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  initSystemBranding()
  const router = createAppRouter()
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}

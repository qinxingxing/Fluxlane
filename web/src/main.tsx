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
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  hydrate,
  type DehydratedState,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { AxiosError } from 'axios'
import i18next from 'i18next'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { toast } from 'sonner'

import { getStatus } from '@/lib/api'
import { installBuildMetadata } from '@/lib/build-metadata'
import { applyFaviconToDom } from '@/lib/dom-utils'
import '@/lib/dayjs'
import { initializeFrontendCache } from '@/lib/frontend-cache'
import { handleServerError } from '@/lib/handle-server-error'
import { takePrerenderState } from '@/lib/prerender-bridge'
import { applyBrandFallbackTitle } from '@/lib/seo'

import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
import './i18n/config'
// Generated Routes
import { routeTree } from './routeTree.gen'

// Styles
import './styles/index.css'

// Ensure VChart theme is initialized before any chart mounts (prevents white default theme flash)
// VChart theme is driven by our ThemeProvider (html.light/html.dark) via per-chart `theme` prop.
initializeFrontendCache()
installBuildMetadata()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      // Keep focused tabs from silently re-running heavy pages like logs.
      refetchOnWindowFocus: false,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error(i18next.t('Content not modified!'))
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 500) {
          toast.error(i18next.t('Internal Server Error!'))
          router.navigate({ to: '/500' })
        }
      }
    },
  }),
})

// Consume the prerender bridge before anything else: prerendered pages ship
// a correct page-level <title> in their static HTML, and the brand fallback
// below must never overwrite it before React mounts.
const prerenderState = takePrerenderState()

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  ...(prerenderState ? { ssr: { nonce: '' } } : {}),
})

if (prerenderState) {
  // Matches.tsx reads `router.ssr` (instance field), not `options.ssr`.
  ;(router as { ssr?: Record<string, never> }).ssr = {}
}

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Set favicon and the brand fallback title from cached status, then refresh
// from network. The brand name is only a fallback: page-level SEO titles
// registered via @/lib/seo always keep priority.
;(function initSystemBranding() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const applyTitle = prerenderState
      ? () => undefined
      : applyBrandFallbackTitle
    // Cache-first
    try {
      const saved = localStorage.getItem('status')
      if (saved) {
        const s = JSON.parse(saved)
        if (s?.system_name) applyTitle(s.system_name)
        if (s?.logo) applyFaviconToDom(s.logo)
      }
    } catch {
      /* empty */
    }
    // Background refresh
    getStatus()
      .then((s) => {
        if (s?.system_name) {
          applyTitle(s.system_name as string)
          try {
            localStorage.setItem('status', JSON.stringify(s))
          } catch {
            /* empty */
          }
        }
        if (s?.logo) applyFaviconToDom(s.logo as string)
      })
      .catch(() => {
        /* empty */
      })
  } catch {
    /* empty */
  }
})()

const rootElement = document.querySelector<HTMLElement>('#root')

async function start(): Promise<void> {
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  if (prerenderState?.dehydratedQueries) {
    hydrate(queryClient, prerenderState.dehydratedQueries as DehydratedState)
  }

  const app = prerenderState ? (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <RouterProvider router={router} />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  ) : (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )

  if (prerenderState) {
    // Prerendered page: make the first client render match the server HTML.
    // router.load() resolves loaders/beforeLoad but does not await route
    // component chunks; a still-pending lazy component would suspend into an
    // empty pending state, fail hydration, and discard the prerendered DOM.
    try {
      await router.load()
      const routes = router.state.matches.map(
        (match) => router.routesById[match.routeId]
      )
      for (const route of routes) {
        await router.loadRouteChunk(route)
      }
      for (const route of Object.values(router.routesById)) {
        route.options.wrapInSuspense = false
      }
    } catch {
      /* navigation errors surface through the router UI */
    }
    ReactDOM.hydrateRoot(rootElement, app, {
      // Surface hydration recoveries loudly: the acceptance test fails
      // when prerendered pages recover from any hydration error.
      onRecoverableError(error, errorInfo) {
        const stack = errorInfo?.componentStack ?? ''
        console.error(
          '[fluxlane-hydration] recoverable error:',
          error,
          stack
        )
        try {
          window.__FLUXLANE_HYDRATION_ERROR__ = `${String(error)}\n${stack}`
        } catch {
          /* ignore */
        }
      },
    })
    return
  }

  const root = ReactDOM.createRoot(rootElement)
  root.render(app)
}

void start()

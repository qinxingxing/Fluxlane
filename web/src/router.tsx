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
  dehydrate,
  hydrate,
  type DehydratedState,
} from '@tanstack/react-query'
import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { AxiosError } from 'axios'
import i18next from 'i18next'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { DirectionProvider } from '@/context/direction-provider'
import { FontProvider } from '@/context/font-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { handleServerError } from '@/lib/handle-server-error'
import { routeTree } from '@/routeTree.gen'

/**
 * Fixed wall-clock used only in the serialized HTML payload so two
 * consecutive builds of the same commit emit identical markup. The client
 * revive step below replaces these with Date.now() before hydrate so
 * Query does not treat the snapshot as immediately stale.
 */
export const PRERENDER_QUERY_TIME = 1_700_000_000_000

export function freezeDehydratedQueryState(
  state: DehydratedState
): DehydratedState {
  return {
    mutations: state.mutations,
    queries: state.queries.map((query) => ({
      ...query,
      dehydratedAt: PRERENDER_QUERY_TIME,
      state: {
        ...query.state,
        dataUpdatedAt: PRERENDER_QUERY_TIME,
        errorUpdatedAt: query.state.errorUpdatedAt ? PRERENDER_QUERY_TIME : 0,
      },
    })),
  }
}

function reviveDehydratedQueryState(state: DehydratedState): DehydratedState {
  const now = Date.now()
  return {
    mutations: state.mutations,
    queries: state.queries.map((query) => ({
      ...query,
      dehydratedAt: now,
      state: {
        ...query.state,
        dataUpdatedAt: now,
        errorUpdatedAt: query.state.errorUpdatedAt ? now : 0,
      },
    })),
  }
}

export function createQueryClient(opts?: {
  onInternalServerError?: () => void
}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (import.meta.env.DEV) return false
          if (failureCount > 3 && import.meta.env.PROD) return false
          return !(
            error instanceof AxiosError &&
            [401, 403].includes(error.response?.status ?? 0)
          )
        },
        refetchOnWindowFocus: false,
        staleTime: 10 * 1000,
      },
      mutations: {
        onError: (error) => {
          handleServerError(error)
          if (
            error instanceof AxiosError &&
            error.response?.status === 304
          ) {
            toast.error(i18next.t('Content not modified!'))
          }
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (
          error instanceof AxiosError &&
          error.response?.status === 500
        ) {
          toast.error(i18next.t('Internal Server Error!'))
          opts?.onInternalServerError?.()
        }
      },
    }),
  })
}

/**
 * Shared router factory for the browser and the SEO prerenderer.
 * Each call allocates a new QueryClient and Router. Do not cache the
 * result at module scope, and do not write router.ssr — the official
 * SSR server/client entries set that instance field.
 */
/* oxlint-disable-next-line react/only-export-components -- factory module */
export function createAppRouter() {
  const fatalNavigate = { run() {} }
  const queryClient = createQueryClient({
    onInternalServerError: () => {
      fatalNavigate.run()
    },
  })

  const router = createTanstackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>{children}</DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  })
  fatalNavigate.run = () => {
    void router.navigate({ to: '/500' })
  }

  // Assigned after create so Register.router stays the same shape as the
  // previous module-level router (dehydrate generics otherwise break
  // useNavigate across the console tables). JSON round-trip keeps the
  // payload JSON-serializable for the HTML bootstrap (no Date/Map/Set).
  router.options.dehydrate = () =>
    // oxlint-disable-next-line unicorn/prefer-structured-clone
    JSON.parse(
      JSON.stringify(freezeDehydratedQueryState(dehydrate(queryClient)))
    ) as never
  router.options.hydrate = (dehydrated: unknown) => {
    if (!dehydrated || typeof dehydrated !== 'object') return
    const state = dehydrated as unknown as DehydratedState
    if (!Array.isArray(state.queries)) return
    hydrate(queryClient, reviveDehydratedQueryState(state))
  }

  return router
}

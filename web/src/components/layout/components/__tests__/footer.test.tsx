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
import assert from 'node:assert/strict'
import { after, afterEach, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLAnchorElement',
  'HTMLButtonElement',
  'HTMLImageElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'KeyboardEvent',
  'PointerEvent',
  'MouseEvent',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'localStorage',
  'sessionStorage',
  'location',
  'history',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} = await import('@tanstack/react-router')
const { Footer } = await import('../footer')
const { useSystemConfigStore } = await import('@/stores/system-config-store')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        About: 'About',
        'A unified, highly available AI API gateway for developers and companies.':
          'A unified, highly available AI API gateway for developers and companies.',
        'Backed by': 'Backed by',
        Console: 'Console',
        Contact: 'Contact',
        'Model Square': 'Model Square',
        Pricing: 'Pricing',
        'Privacy Policy': 'Privacy Policy',
        Product: 'Product',
        'Unified API gateway': 'Unified API gateway',
        'User Agreement': 'User Agreement',
        'footer.columns.about.title': 'About Us',
        'footer.columns.docs.links.apiDocs': 'API Documentation',
        'footer.columns.docs.links.quickStart': 'Quick Start',
        'footer.columns.docs.title': 'Documentation',
        'footer.defaultCopyright': 'All rights reserved.',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type Rendered = {
  host: HTMLDivElement
  root: ReturnType<typeof createRoot>
}

let rendered: Rendered | null = null

function createQueryClient(status: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  queryClient.setQueryData(['status'], status, {
    updatedAt: Date.now() + 60_000,
  })
  return queryClient
}

function createFooterRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Footer,
  })
  return createRouter({
    routeTree: rootRoute.addChildren([homeRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
}

async function renderFooter(status: Record<string, unknown> = {}) {
  useSystemConfigStore.setState({ loading: false })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  const router = createFooterRouter()
  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient(status)}>
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </QueryClientProvider>
    )
  })
  return host
}

async function unmountRendered() {
  if (!rendered) return
  await act(async () => rendered?.root.unmount())
  rendered.host.remove()
  rendered = null
}

afterEach(async () => {
  await unmountRendered()
})

after(() => {
  domWindow.close()
})

function hrefSet(host: HTMLElement) {
  return new Set(
    [...host.querySelectorAll('a')].map((anchor) => anchor.getAttribute('href'))
  )
}

describe('public footer', () => {
  test('renders a multi-column enterprise footer with real public destinations', async () => {
    const host = await renderFooter()
    const footer = host.querySelector('[data-public-footer]')
    assert.ok(footer)
    assert.equal(footer.classList.contains('bg-[#070a20]'), true)
    assert.equal(footer.querySelector('input[type="email"]'), null)

    const hrefs = hrefSet(host)
    assert.equal(hrefs.has('/pricing'), true)
    assert.equal(hrefs.has('/about'), true)
    assert.equal(hrefs.has('/contact'), true)
    assert.equal(hrefs.has('https://doc.fluxlane.ai'), true)
    assert.equal(hrefs.has('https://www.accesstechnologyventures.com'), true)
    assert.equal(host.textContent?.includes('Unified API gateway'), true)
    assert.equal(host.textContent?.includes('Backed by'), true)
  })

  test('keeps Privacy Policy in the footer and omits User Agreement until it is published', async () => {
    const hrefs = hrefSet(await renderFooter())
    assert.equal(hrefs.has('/privacy-policy'), true)
    assert.equal(hrefs.has('/user-agreement'), false)
  })

  test('adds User Agreement only when the legal document is enabled', async () => {
    const hrefs = hrefSet(await renderFooter({ user_agreement_enabled: true }))
    assert.equal(hrefs.has('/user-agreement'), true)
  })
})

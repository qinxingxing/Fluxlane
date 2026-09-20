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

Object.defineProperty(globalThis, 'scrollTo', {
  configurable: true,
  value: () => {},
})
Object.defineProperty(domWindow, 'scrollTo', {
  configurable: true,
  value: () => {},
})
Object.defineProperty(domWindow, 'scrollY', {
  configurable: true,
  writable: true,
  value: 0,
})
Object.defineProperty(globalThis, 'scrollY', {
  configurable: true,
  get: () => domWindow.scrollY,
  set: (value: number) => {
    Object.defineProperty(domWindow, 'scrollY', {
      configurable: true,
      writable: true,
      value,
    })
  },
})

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
const { PublicHeader } = await import('../public-header')
const { useSystemConfigStore } = await import('@/stores/system-config-store')
const { publicHeaderBarClassName } = await import('../../lib/public-chrome')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        About: 'About',
        Cancel: 'Cancel',
        Console: 'Console',
        Contact: 'Contact',
        Docs: 'Docs',
        Features: 'Features',
        'Get Started': 'Get Started',
        'Go to Dashboard': 'Go to Dashboard',
        Home: 'Home',
        'Model Square': 'Model Square',
        Models: 'Models',
        Pricing: 'Pricing',
        'Please sign in to view {{module}}.':
          'Please sign in to view {{module}}.',
        'Redirecting to sign in in {{seconds}} seconds.':
          'Redirecting to sign in in {{seconds}} seconds.',
        'Sign in': 'Sign in',
        'Sign in now': 'Sign in now',
        'Sign in required': 'Sign in required',
        'Toggle navigation menu': 'Toggle navigation menu',
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

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  queryClient.setQueryData(['status'], {}, { updatedAt: Date.now() + 60_000 })
  queryClient.setQueryData(
    ['notice'],
    { success: true, data: '' },
    { updatedAt: Date.now() + 60_000 }
  )
  return queryClient
}

function createHeaderRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <PublicHeader showNotifications={false} showLanguageSwitcher={false} />
    ),
  })
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    component: () => null,
  })
  const signUpRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-up',
    component: () => null,
  })
  return createRouter({
    routeTree: rootRoute.addChildren([homeRoute, signInRoute, signUpRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
}

async function renderHeader() {
  useSystemConfigStore.setState({ loading: false })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  const router = createHeaderRouter()
  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
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
  Object.defineProperty(domWindow, 'scrollY', {
    configurable: true,
    writable: true,
    value: 0,
  })
})

after(() => {
  domWindow.close()
})

describe('public header', () => {
  test('keeps a full-width bar with ghost sign-in and primary get-started actions', async () => {
    const host = await renderHeader()
    const header = host.querySelector('[data-public-header]')
    assert.ok(header)
    assert.equal(header.getAttribute('data-scrolled'), 'false')
    assert.equal(header.classList.contains('fixed'), true)
    assert.equal(header.className.includes('max-w-[52rem]'), false)

    const signIn = [...host.querySelectorAll('a')].find((anchor) =>
      anchor.textContent?.includes('Sign in')
    )
    const getStarted = [...host.querySelectorAll('a')].find((anchor) =>
      anchor.textContent?.includes('Get Started')
    )
    assert.ok(signIn)
    assert.ok(getStarted)
    assert.equal(signIn.getAttribute('data-variant'), 'ghost')
    assert.equal(getStarted.getAttribute('data-variant'), 'default')
    assert.equal(signIn.getAttribute('href'), '/sign-in')
    assert.equal(getStarted.getAttribute('href'), '/sign-up')
  })

  test('switches to the frosted sticky state after scrolling past 20px', async () => {
    const host = await renderHeader()
    const header = host.querySelector('[data-public-header]')
    assert.ok(header)

    Object.defineProperty(domWindow, 'scrollY', {
      configurable: true,
      writable: true,
      value: 40,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    assert.equal(header.getAttribute('data-scrolled'), 'true')
    const bar = header.firstElementChild
    assert.ok(bar)
    for (const token of publicHeaderBarClassName(true).split(' ')) {
      assert.equal(bar.classList.contains(token), true)
    }
    assert.equal(bar.className.includes('rounded-2xl'), false)
    assert.equal(bar.className.includes('max-w-[52rem]'), false)
  })
})

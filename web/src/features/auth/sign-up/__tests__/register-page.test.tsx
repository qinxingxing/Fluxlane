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
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLButtonElement',
  'HTMLImageElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'localStorage',
  'sessionStorage',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

globalThis.scrollTo = () => {}

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
const { SignUp } = await import('../index')
const { RegisterPage } = await import('../components/register-page')
const { UserAuthForm } = await import('../../sign-in/components/user-auth-form')
const { useSystemConfigStore } = await import('@/stores/system-config-store')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
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

function createSignUpRouter() {
  const rootRoute = createRootRoute({ component: Outlet })
  const signUpRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-up',
    component: SignUp,
  })
  const signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-in',
    component: () => null,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  return createRouter({
    routeTree: rootRoute.addChildren([signUpRoute, signInRoute, homeRoute]),
    history: createMemoryHistory({ initialEntries: ['/sign-up'] }),
  })
}

async function renderSignUp() {
  useSystemConfigStore.setState({ loading: false })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  queryClient.setQueryData(
    ['status'],
    { register_enabled: true },
    {
      updatedAt: Date.now() + 60_000,
    }
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  const router = createSignUpRouter()
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </QueryClientProvider>
    )
  })
  return host
}

afterEach(async () => {
  if (!rendered) return
  await act(async () => rendered?.root.unmount())
  rendered.host.remove()
  rendered = null
})

after(() => {
  domWindow.close()
})

describe('registration page', () => {
  test('places email verification on the shared dark auth layout', async () => {
    const host = await renderSignUp()
    const layout = host.querySelector('[data-auth-layout="split"]')
    const email = host.querySelector('input[type="email"]')
    const phone = host.querySelector('input[type="tel"]')
    const code = host.querySelector('input[autocomplete="one-time-code"]')
    const submit = host.querySelector('button[type="submit"]')
    const page = [...host.querySelectorAll('div')].find((node) =>
      node.className.includes('bg-[#070b24]')
    )

    assert.ok(layout)
    assert.equal(layout?.classList.contains('lg:grid-cols-12'), true)
    assert.ok(page)
    assert.equal(
      host
        .querySelector('img[src="/logo-full.png"]')
        ?.className.includes('h-8'),
      true
    )
    assert.equal(
      host.textContent?.includes(
        'Start your high-availability AI infrastructure journey'
      ),
      true
    )
    assert.equal(
      host.textContent?.includes('Create your Fluxlane account'),
      true
    )
    assert.ok(email)
    assert.ok(phone)
    assert.ok(code)
    assert.equal(host.textContent?.includes('Send code'), true)
    assert.equal(host.textContent?.includes('SMS verification code'), false)
    assert.equal(submit?.className.includes('from-violet-600'), true)
    assert.equal(host.querySelector('[data-slot="status-badge"]'), null)
  })
})

describe('sign-in page', () => {
  test('uses the same logo, background, fields, and button as registration', async () => {
    useSystemConfigStore.setState({ loading: false })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    queryClient.setQueryData(
      ['status'],
      { register_enabled: true, password_login_enabled: true },
      { updatedAt: Date.now() + 60_000 }
    )
    const rootRoute = createRootRoute({ component: Outlet })
    const signInRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/sign-in',
      component: () => (
        <RegisterPage
          headerAction={{ to: '/sign-up', label: 'Sign up' }}
          form={<UserAuthForm showSignUp />}
        />
      ),
    })
    const signUpRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/sign-up',
      component: () => null,
    })
    const homeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => null,
    })
    const forgotRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/forgot-password',
      component: () => null,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        signInRoute,
        signUpRoute,
        homeRoute,
        forgotRoute,
      ]),
      history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
    })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    rendered = { host, root }
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <RouterProvider router={router} />
          </I18nextProvider>
        </QueryClientProvider>
      )
    })

    const layout = host.querySelector('[data-auth-layout="split"]')
    const username = host.querySelector('input[autocomplete="username"]')
    const password = host.querySelector(
      'input[autocomplete="current-password"]'
    )
    const submit = host.querySelector('button[type="submit"]')
    const page = [...host.querySelectorAll('div')].find((node) =>
      node.className.includes('bg-[#070b24]')
    )

    assert.ok(layout)
    assert.ok(page)
    assert.equal(
      host
        .querySelector('img[src="/logo-full.png"]')
        ?.className.includes('h-8'),
      true
    )
    assert.equal(host.textContent?.includes('Sign in'), true)
    assert.equal(host.textContent?.includes('Sign up'), true)
    assert.ok(username)
    assert.equal(username?.className.includes('h-12'), true)
    assert.equal(username?.className.includes('bg-white/5'), true)
    assert.ok(password)
    assert.equal(password?.className.includes('h-12'), true)
    assert.equal(submit?.className.includes('from-violet-600'), true)
  })
})

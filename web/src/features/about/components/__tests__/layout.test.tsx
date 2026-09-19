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
const { FluxlaneAbout } = await import('../../fluxlane-about')
const { aboutPageLayout } = await import('../../lib/layout')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'API Gateway Active': 'API Gateway Active',
        'About Fluxlane': 'About Fluxlane',
        'About us': 'About us',
        'A unified, stable, and transparent AI model API that helps developers and companies reduce integration and operations cost, and get from idea to production faster.':
          'A unified, stable, and transparent AI model API that helps developers and companies reduce integration and operations cost, and get from idea to production faster.',
        'Access emphasizes flexible, long-term partnerships, providing capital and strategic support to growth companies in consumer technology, enterprise software, cloud computing, and infrastructure.':
          'Access emphasizes flexible, long-term partnerships, providing capital and strategic support to growth companies in consumer technology, enterprise software, cloud computing, and infrastructure.',
        'Access technology investments include DigitalOcean, Alibaba, Amazon, Agora, Pinduoduo, PingCAP, SpaceX, and Zhihu. According to DigitalOcean public disclosures, Access-related entities are significant shareholders, and Access Technology Ventures leadership also participates in DigitalOcean corporate governance.':
          'Access technology investments include DigitalOcean, Alibaba, Amazon, Agora, Pinduoduo, PingCAP, SpaceX, and Zhihu. According to DigitalOcean public disclosures, Access-related entities are significant shareholders, and Access Technology Ventures leadership also participates in DigitalOcean corporate governance.',
        'Connecting models, developers, and real businesses':
          'Connecting models, developers, and real businesses',
        'Create account': 'Create account',
        'Create lasting value with reliable engineering and a clear experience':
          'Create lasting value with reliable engineering and a clear experience',
        'Fluxlane is an AI infrastructure platform held and supported by Access Technology Ventures, and operated day to day by Aidroplet. Access Technology Ventures is the long-term technology investment platform of Access Industries.':
          'Fluxlane is an AI infrastructure platform held and supported by Access Technology Ventures, and operated day to day by Aidroplet. Access Technology Ventures is the long-term technology investment platform of Access Industries.',
        'Fluxlane is an AI model API aggregation and usage management platform for developers and companies. Through an OpenAI-compatible unified interface, you can more easily connect models, manage tokens, inspect usage, and reconcile costs.':
          'Fluxlane is an AI model API aggregation and usage management platform for developers and companies. Through an OpenAI-compatible unified interface, you can more easily connect models, manage tokens, inspect usage, and reconcile costs.',
        'Held and supported by Access Technology Ventures':
          'Held and supported by Access Technology Ventures',
        'Keep it simple': 'Keep it simple',
        'Learn about Access Technology Ventures':
          'Learn about Access Technology Ventures',
        'Learn about Aidroplet': 'Learn about Aidroplet',
        'Let AI capabilities flow into every product, more simply':
          'Let AI capabilities flow into every product, more simply',
        'Long-term capital, long-term building':
          'Long-term capital, long-term building',
        'Lower integration cost with a unified interface and clear docs, so teams can focus on product innovation instead of tedious adapters.':
          'Lower integration cost with a unified interface and clear docs, so teams can focus on product innovation instead of tedious adapters.',
        'Our backing': 'Our backing',
        'Our values': 'Our values',
        'Protect every request with ongoing load tests, capacity safeguards, monitoring alerts, and failure drills, building enterprise-grade high availability.':
          'Protect every request with ongoing load tests, capacity safeguards, monitoring alerts, and failure drills, building enterprise-grade high availability.',
        'Show prices, token usage, and spend records clearly, so costs are understandable and traceable, with no hidden fees.':
          'Show prices, token usage, and spend records clearly, so costs are understandable and traceable, with no hidden fees.',
        'Stability first': 'Stability first',
        'The platform currently connects model services such as DigitalOcean Serverless Inference, and uses a standardized access layer to smooth over differences across underlying models so AI capabilities can drop into your business code more easily.':
          'The platform currently connects model services such as DigitalOcean Serverless Inference, and uses a standardized access layer to smooth over differences across underlying models so AI capabilities can drop into your business code more easily.',
        'Transparent and trustworthy': 'Transparent and trustworthy',
        'View document': 'View document',
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
  queryClient.setQueryData(
    ['status'],
    { docs_link: 'https://doc.fluxlane.ai' },
    { updatedAt: Date.now() + 60_000 }
  )
  return queryClient
}

function createAboutRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  })
  const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/about',
    component: FluxlaneAbout,
  })
  const signUpRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sign-up',
    component: () => null,
  })

  return createRouter({
    routeTree: rootRoute.addChildren([aboutRoute, signUpRoute]),
    history: createMemoryHistory({ initialEntries: ['/about'] }),
  })
}

async function renderAboutPage() {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  const router = createAboutRouter()
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
})

after(() => {
  domWindow.close()
})

describe('about page layout', () => {
  test('keeps the hero in a two-column desktop grid with mobile-centered copy', async () => {
    const host = await renderAboutPage()
    const page = host.querySelector('[data-about-page]')
    const hero = host.querySelector('[data-about-hero]')
    const visual = host.querySelector('[data-about-visual]')

    assert.ok(page)
    assert.ok(hero)
    assert.ok(visual)
    assert.equal(hero.classList.contains('grid'), true)
    assert.equal(hero.classList.contains('md:grid-cols-2'), true)
    assert.equal(hero.classList.contains('text-center'), true)
    assert.equal(hero.classList.contains('md:text-left'), true)
    assert.equal(visual.classList.contains('h-[400px]'), true)
    assert.equal(visual.classList.contains('rounded-2xl'), true)
    assert.equal(visual.classList.contains('backdrop-blur-xl'), true)
  })

  test('keeps the original purple navy canvas with a visible 40px stripe grid', async () => {
    const host = await renderAboutPage()
    const backdrop = host.querySelector('[data-about-backdrop]')

    assert.ok(backdrop)
    assert.equal(backdrop.className, aboutPageLayout.backdrop)
    assert.equal(backdrop.classList.contains('bg-[#0c112e]'), true)
    assert.equal(backdrop.classList.contains('bg-[size:40px_40px]'), true)
    assert.equal(backdrop.classList.contains('absolute'), true)
    assert.equal(backdrop.classList.contains('inset-0'), true)
    assert.equal(backdrop.classList.contains('-z-10'), false)
  })

  test('places backing content beside the capital card and values in a three-column desktop grid', async () => {
    const host = await renderAboutPage()
    const backing = host.querySelector('[data-about-backing] > div')
    const values = host.querySelector('[data-about-values] > div:last-child')
    const cards = host.querySelectorAll('[data-about-value-card]')

    assert.ok(backing)
    assert.ok(values)
    assert.equal(backing.className, aboutPageLayout.backing)
    assert.equal(values.className, aboutPageLayout.values)
    assert.equal(backing.classList.contains('md:grid-cols-2'), true)
    assert.equal(values.classList.contains('md:grid-cols-3'), true)
    assert.equal(cards.length, 3)
  })

  test('links the hero CTAs to sign-up and docs, and keeps the backing partner links', async () => {
    const host = await renderAboutPage()
    const primary = host.querySelector('[data-about-cta-primary]')
    const docs = host.querySelector('[data-about-cta-docs]')
    const access = [...host.querySelectorAll('a')].find((anchor) =>
      anchor.textContent?.includes('Learn about Access Technology Ventures')
    )
    const aidroplet = [...host.querySelectorAll('a')].find((anchor) =>
      anchor.textContent?.includes('Learn about Aidroplet')
    )

    assert.ok(primary)
    assert.ok(docs)
    assert.ok(access)
    assert.ok(aidroplet)
    assert.equal(primary.getAttribute('href'), '/sign-up')
    assert.equal(docs.getAttribute('href'), 'https://doc.fluxlane.ai')
    assert.equal(
      access.getAttribute('href'),
      'https://www.accesstechnologyventures.com'
    )
    assert.equal(aidroplet.getAttribute('href'), 'https://www.aidroplet.com')
    assert.equal(host.textContent?.includes('API Gateway Active'), true)
  })
})

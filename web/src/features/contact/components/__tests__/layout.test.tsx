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
import type { ReactElement } from 'react'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLFormElement',
  'HTMLLabelElement',
  'HTMLFieldSetElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'KeyboardEvent',
  'PointerEvent',
  'MouseEvent',
  'FocusEvent',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
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
const { ContactPage } = await import('../contact-page')
const { contactPageLayout } = await import('../../lib/layout')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Acme Robotics, Inc.': 'Acme Robotics, Inc.',
        'A number we can reach you on': 'A number we can reach you on',
        'Build highly available AI infrastructure together':
          'Build highly available AI infrastructure together',
        'Claude, GPT-4o, DeepSeek-V3': 'Claude, GPT-4o, DeepSeek-V3',
        'Company name': 'Company name',
        'Contact & Partnership': 'Contact & Partnership',
        'Describe your workload, concurrency, or latency needs':
          'Describe your workload, concurrency, or latency needs',
        'Get in touch with the Fluxlane team':
          'Get in touch with the Fluxlane team',
        'Inquiry dispatch': 'Inquiry dispatch',
        'Monthly budget': 'Monthly budget',
        'Phone / WeChat': 'Phone / WeChat',
        'Privacy Policy': 'Privacy Policy',
        'Requested models': 'Requested models',
        'Requirements (optional)': 'Requirements (optional)',
        'Secure encrypted': 'Secure encrypted',
        'Share a few details about your business. A solutions architect will follow up within 24 hours with a tailored onboarding review.':
          'Share a few details about your business. A solutions architect will follow up within 24 hours with a tailored onboarding review.',
        'Submit inquiry': 'Submit inquiry',
        'We protect your business information. We do not retain request logs or share company details with third parties.':
          'We protect your business information. We do not retain request logs or share company details with third parties.',
        'Whether you need an enterprise API gateway, high-volume token procurement, a private deployment, or a partnership, our team is ready to help around the clock.':
          'Whether you need an enterprise API gateway, high-volume token procurement, a private deployment, or a partnership, our team is ready to help around the clock.',
        'Work email': 'Work email',
        '$0 – $1,000': '$0 – $1,000',
        '$1,000 – $5,000': '$1,000 – $5,000',
        '$5,000 – $20,000': '$5,000 – $20,000',
        'More than $20,000': 'More than $20,000',
        'name@company.com': 'name@company.com',
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
    {
      turnstile_check: false,
      turnstile_site_key: '',
      privacy_policy_enabled: true,
    },
    { updatedAt: Date.now() + 60_000 }
  )
  return queryClient
}

async function renderTree(tree: ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
        <I18nextProvider i18n={i18n}>{tree}</I18nextProvider>
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

describe('contact page layout', () => {
  test('keeps the original purple field and 48px striped grid behind the page', async () => {
    const host = await renderTree(<ContactPage />)
    const page = host.querySelector('[data-contact-page]')
    const stripes = host.querySelector('[data-contact-stripes]')

    assert.ok(page)
    assert.ok(stripes)
    assert.equal(page.className, contactPageLayout.page)
    assert.equal(page.classList.contains('bg-[#0c112e]'), true)
    assert.equal(stripes.className, contactPageLayout.stripes)
    assert.equal(stripes.classList.contains('bg-[size:48px_48px]'), true)
  })

  test('centers the inquiry form under a centered hero instead of a two-column page grid', async () => {
    const host = await renderTree(<ContactPage />)
    const page = host.querySelector('[data-contact-page]')
    const hero = host.querySelector('[data-contact-hero]')
    const formPanel = host.querySelector('[data-contact-form-panel]')

    assert.ok(page)
    assert.ok(hero)
    assert.ok(formPanel)
    assert.equal(hero.classList.contains('items-center'), true)
    assert.equal(hero.classList.contains('text-center'), true)
    assert.equal(hero.classList.contains('mx-auto'), true)
    assert.equal(formPanel.className, contactPageLayout.formPanel)
    assert.equal(formPanel.parentElement?.classList.contains('grid'), false)
    assert.equal(page.querySelector('[class*="md:grid-cols"]'), null)
  })

  test('keeps company/email and phone/model fields in two-column rows and budget options in four columns', async () => {
    const host = await renderTree(<ContactPage />)
    const fieldRows = [
      ...host.querySelectorAll<HTMLElement>('[data-contact-field-row]'),
    ]
    assert.equal(fieldRows.length, 2)
    for (const row of fieldRows) {
      assert.equal(row.classList.contains('grid'), true)
      assert.equal(row.classList.contains('sm:grid-cols-2'), true)
    }

    const budget = host.querySelector<HTMLElement>(
      '[data-contact-budget-options]'
    )
    assert.ok(budget)
    assert.equal(budget.classList.contains('grid'), true)
    assert.equal(budget.classList.contains('grid-cols-2'), true)
    assert.equal(budget.classList.contains('sm:grid-cols-4'), true)
    assert.equal(
      budget.querySelectorAll('[data-slot="radio-group-item"]').length,
      4
    )
  })
})

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
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'MouseEvent',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'customElements',
  'CSSStyleSheet',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: (query: string) => domWindow.matchMedia(query),
})

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { PricingSidebar } = await import('../pricing-sidebar')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Filter: 'Filter',
        Reset: 'Reset',
        Groups: 'Groups',
        All: 'All',
        Providers: 'Providers',
        'All Providers': 'All Providers',
        'Model Tags': 'Model Tags',
        'All Tags': 'All Tags',
        'Pricing Type': 'Pricing Type',
        'All Models': 'All Models',
        'Token-based': 'Token-based',
        'Per Request': 'Per Request',
        'Endpoint Type': 'Endpoint Type',
        'All Endpoints': 'All Endpoints',
        Chat: 'Chat',
        Response: 'Response',
        Anthropic: 'Anthropic',
        Gemini: 'Gemini',
        Rerank: 'Rerank',
        Image: 'Image',
        Embeddings: 'Embeddings',
        Video: 'Video',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

const models = [
  {
    id: 1,
    model_name: 'kimi-k3',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    vendor_name: 'Moonshot',
    supported_endpoint_types: ['openai'],
  },
]

describe('pricing sidebar chips', () => {
  after(() => {
    domWindow.close()
  })

  test('marks the selected provider chip as pressed and reports a new vendor when another chip is clicked', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const selected: string[] = []

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <PricingSidebar
            quotaTypeFilter='all'
            endpointTypeFilter='all'
            vendorFilter='all'
            groupFilter='all'
            tagFilter='all'
            onQuotaTypeChange={() => {}}
            onEndpointTypeChange={() => {}}
            onVendorChange={(value) => selected.push(value)}
            onGroupChange={() => {}}
            onTagChange={() => {}}
            vendors={[{ id: 1, name: 'Moonshot' }]}
            groups={['default', 'vip']}
            groupRatios={{ default: 1, vip: 1 }}
            tags={[]}
            models={models}
            hasActiveFilters={false}
            onClearFilters={() => {}}
          />
        </I18nextProvider>
      )
    })

    const chips = [
      ...container.querySelectorAll<HTMLButtonElement>(
        '[data-slot="filter-chip"]'
      ),
    ]
    const allChip = chips.find((chip) =>
      chip.textContent?.includes('All Providers')
    )
    const moonshotChip = chips.find((chip) =>
      chip.textContent?.includes('Moonshot')
    )

    assert.ok(allChip)
    assert.ok(moonshotChip)
    assert.equal(allChip?.getAttribute('aria-pressed'), 'true')
    assert.equal(moonshotChip?.getAttribute('aria-pressed'), 'false')
    assert.ok(allChip?.className.includes('rounded-full'))
    assert.equal(container.textContent?.includes('Providers'), true)
    assert.equal(container.textContent?.includes('Groups'), false)
    assert.equal(container.textContent?.includes('Model Tags'), false)
    assert.equal(container.textContent?.includes('Pricing Type'), false)
    assert.equal(container.textContent?.includes('Endpoint Type'), false)

    await act(async () => {
      moonshotChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    assert.deepEqual(selected, ['Moonshot'])

    root.unmount()
    container.remove()
  })
})

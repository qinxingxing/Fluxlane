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

Object.defineProperty(domWindow.navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: async () => {},
  },
})

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { ModelCard } = await import('../model-card')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Input: 'Input',
        Output: 'Output',
        Details: 'Details',
        Copy: 'Copy',
        'No description available.': 'No description available.',
        'Token-based': 'Token-based',
        'Per Request': 'Per Request',
        'Dynamic Pricing': 'Dynamic Pricing',
        'Latency short': 'Lat.',
        'Throughput short': 'TPS',
        'Status short': 'Status',
        'Average latency': 'Average latency',
        Throughput: 'Throughput',
        'Success rate': 'Success rate',
        'Copied to clipboard': 'Copied to clipboard',
        'Failed to copy to clipboard': 'Failed to copy to clipboard',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

const tokenModel = {
  id: 1,
  model_name: 'kimi-k3',
  quota_type: 0,
  model_ratio: 1.5,
  completion_ratio: 1,
  enable_groups: ['default'],
  supported_endpoint_types: ['openai'],
}

describe('model marketplace card', () => {
  after(() => {
    domWindow.close()
  })

  test('shows the fallback description, group badge, and placeholder metrics when a model has no copy or perf data', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <ModelCard model={tokenModel} onClick={() => {}} />
        </I18nextProvider>
      )
    })

    const card = container.querySelector('[data-slot="model-card"]')
    assert.ok(card)
    assert.equal(card?.querySelector('h3')?.textContent, 'kimi-k3')
    assert.match(card?.textContent ?? '', /No description available\./)
    assert.match(card?.textContent ?? '', /default/)
    assert.match(card?.textContent ?? '', /Token-based/)
    assert.match(card?.textContent ?? '', /Lat\./)
    assert.match(card?.textContent ?? '', /—/)
    assert.match(card?.textContent ?? '', /openai/)
    assert.match(card?.textContent ?? '', /1M/)

    root.unmount()
    container.remove()
  })

  test('opens details from the details button without treating copy as a details click', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    let detailClicks = 0

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <ModelCard
            model={tokenModel}
            onClick={() => {
              detailClicks += 1
            }}
          />
        </I18nextProvider>
      )
    })

    const details = container.querySelector('button')
    const copy = container.querySelector('button[aria-label="Copy"]')
    assert.ok(details)
    assert.ok(copy)

    await act(async () => {
      copy?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    assert.equal(detailClicks, 0)

    await act(async () => {
      details?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    assert.equal(detailClicks, 1)

    root.unmount()
    container.remove()
  })
})

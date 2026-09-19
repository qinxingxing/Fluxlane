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
  'HTMLInputElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
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
const { PricingHero } = await import('../pricing-hero')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Model Square': 'Model Square',
        'This site currently has {{count}} models enabled':
          'This site currently has {{count}} models enabled',
        'Explore curated AI models, compare prices and capabilities, and pick the right model for each scenario.':
          'Explore curated AI models, compare prices and capabilities, and pick the right model for each scenario.',
        'Search model names, providers, endpoints, or tags...':
          'Search model names, providers, endpoints, or tags...',
        'Search models': 'Search models',
        'Search models...': 'Search models...',
        'Clear search': 'Clear search',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

describe('pricing marketplace hero', () => {
  after(() => {
    domWindow.close()
  })

  test('highlights the enabled model count inside the marketplace heading copy', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <PricingHero
            modelCount={2}
            searchInput=''
            onSearchChange={() => {}}
            onSearchClear={() => {}}
          />
        </I18nextProvider>
      )
    })

    const hero = container.querySelector('[data-slot="pricing-hero"]')
    assert.ok(hero)
    assert.equal(hero?.querySelector('h1')?.textContent, 'Model Square')
    assert.match(hero?.textContent ?? '', /This site currently has/)
    assert.equal(
      hero?.querySelector('[data-slot="model-count"]')?.textContent,
      '2'
    )
    assert.equal(
      hero?.querySelector('input')?.getAttribute('placeholder'),
      'Search model names, providers, endpoints, or tags...'
    )

    root.unmount()
    container.remove()
  })
})

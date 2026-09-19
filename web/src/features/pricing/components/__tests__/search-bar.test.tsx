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
  'MouseEvent',
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

const { act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { SearchBar } = await import('../search-bar')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Search models...': 'Search models...',
        'Search models': 'Search models',
        'Clear search': 'Clear search',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

function SearchHarness(props: { initialValue?: string }) {
  const [value, setValue] = useState(props.initialValue ?? '')
  return (
    <I18nextProvider i18n={i18n}>
      <SearchBar
        value={value}
        onChange={setValue}
        onClear={() => setValue('')}
      />
    </I18nextProvider>
  )
}

describe('marketplace search bar', () => {
  after(() => {
    domWindow.close()
  })

  test('keeps a pill-shaped field and clears the query from the clear button', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<SearchHarness initialValue='kimi' />)
    })

    const input = container.querySelector('input')
    assert.ok(input)
    assert.ok(input?.className.includes('rounded-full'))
    assert.equal(input?.value, 'kimi')

    const clear = container.querySelector('button[aria-label="Clear search"]')
    assert.ok(clear)

    await act(async () => {
      clear?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    assert.equal(input?.value, '')

    root.unmount()
    container.remove()
  })
})

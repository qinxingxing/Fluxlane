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
const { TooltipProvider } = await import('@/components/ui/tooltip')
const { ApiKeysProvider } = await import('../api-keys-provider')
const { ApiKeysDeleteDialog } = await import('../api-keys-delete-dialog')
const { DataTableRowActions } = await import('../data-table-row-actions')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

const apiKey = {
  id: 7,
  name: 'billing-key',
  key: 'sk-hidden',
  status: 1,
  remain_quota: 0,
  used_quota: 0,
  unlimited_quota: true,
  expired_time: -1,
  created_time: 0,
  accessed_time: 0,
  group: 'default',
  auto_groups: null,
  cross_group_retry: false,
  model_limits_enabled: false,
  model_limits: '',
  allow_ips: '',
}

function RowActionsHarness() {
  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ApiKeysProvider>
          <DataTableRowActions row={{ original: apiKey } as never} />
          <ApiKeysDeleteDialog />
        </ApiKeysProvider>
      </TooltipProvider>
    </I18nextProvider>
  )
}

function menuItemLabels(): string[] {
  return [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')].map(
    (item) => item.textContent?.trim() ?? ''
  )
}

describe('API key row actions menu', () => {
  after(() => {
    domWindow.close()
  })

  test('opens a menu that only offers Delete and starts the delete confirmation', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<RowActionsHarness />)
    })

    const menuButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Open menu"]'
    )
    assert.ok(menuButton)

    await act(async () => {
      menuButton.click()
    })

    assert.deepEqual(menuItemLabels(), ['Delete'])
    assert.equal(document.body.textContent?.includes('Copy Key'), false)
    assert.equal(
      document.body.textContent?.includes('Copy Connection Info'),
      false
    )
    assert.equal(document.body.textContent?.includes('CC Switch'), false)
    assert.equal(document.body.textContent?.includes('Chat'), false)

    const deleteItem = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-item"]'
    )
    assert.ok(deleteItem)

    await act(async () => {
      deleteItem.click()
    })

    assert.equal(document.body.textContent?.includes('Are you sure?'), true)
    assert.equal(document.body.textContent?.includes('billing-key'), true)

    await act(async () => root.unmount())
    container.remove()
  })
})

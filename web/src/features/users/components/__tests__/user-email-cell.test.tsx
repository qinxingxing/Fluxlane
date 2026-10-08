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
import type { ReactNode } from 'react'

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
const { UserTextCell } = await import('../user-email-cell')
const { useUsersColumns } = await import('../users-columns')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Email: 'Email',
        'Mobile number': 'Mobile number',
        'Not set': 'Not set',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

const roots: Array<{ unmount: () => void }> = []

async function render(node: ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(node)
  })
  return container
}

function EmailHarness(props: { value?: string }) {
  return (
    <I18nextProvider i18n={i18n}>
      <UserTextCell value={props.value} />
    </I18nextProvider>
  )
}

function EmailColumnProbe() {
  const columns = useUsersColumns()
  const emailColumn = columns.find(
    (column) => 'accessorKey' in column && column.accessorKey === 'email'
  )
  const phoneColumn = columns.find(
    (column) => 'accessorKey' in column && column.accessorKey === 'phone'
  )
  const emailHeader =
    typeof emailColumn?.header === 'string' ? emailColumn.header : ''
  const phoneHeader =
    typeof phoneColumn?.header === 'string' ? phoneColumn.header : ''

  return (
    <div>
      <div data-email-column={emailColumn ? 'present' : 'missing'}>
        {emailHeader}
      </div>
      <div data-phone-column={phoneColumn ? 'present' : 'missing'}>
        {phoneHeader}
      </div>
    </div>
  )
}

function ColumnHarness() {
  return (
    <I18nextProvider i18n={i18n}>
      <EmailColumnProbe />
    </I18nextProvider>
  )
}

describe('user list email column', () => {
  afterEach(async () => {
    for (const root of roots.splice(0)) {
      await act(async () => {
        root.unmount()
      })
    }
    document.body.replaceChildren()
  })

  after(() => {
    domWindow.close()
  })

  test('shows the address without a verification badge', async () => {
    const container = await render(<EmailHarness value='ada@example.com' />)

    assert.equal(container.textContent?.includes('ada@example.com'), true)
    assert.equal(container.textContent?.includes('Not set'), false)
    assert.equal(container.querySelector('[data-slot="status-badge"]'), null)
  })

  test('shows not set without a verification badge when the value is blank', async () => {
    const container = await render(<EmailHarness value='   ' />)

    assert.equal(container.textContent?.includes('Not set'), true)
    assert.equal(container.querySelector('[data-slot="status-badge"]'), null)
  })

  test('includes email and mobile number columns without a verification status', async () => {
    const container = await render(<ColumnHarness />)
    const emailMarker = container.querySelector('[data-email-column]')
    const phoneMarker = container.querySelector('[data-phone-column]')

    assert.equal(emailMarker?.getAttribute('data-email-column'), 'present')
    assert.equal(emailMarker?.textContent, 'Email')
    assert.equal(phoneMarker?.getAttribute('data-phone-column'), 'present')
    assert.equal(phoneMarker?.textContent, 'Mobile number')
    assert.equal(container.querySelector('[data-slot="status-badge"]'), null)
  })
})

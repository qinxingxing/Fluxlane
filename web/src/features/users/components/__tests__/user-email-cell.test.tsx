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
const { UserEmailCell } = await import('../user-email-cell')
const { useUsersColumns } = await import('../users-columns')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Email: 'Email',
        'Not set': 'Not set',
        Verified: 'Verified',
        Unverified: 'Unverified',
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

function EmailHarness(props: { email?: string }) {
  return (
    <I18nextProvider i18n={i18n}>
      <UserEmailCell email={props.email} />
    </I18nextProvider>
  )
}

function EmailColumnProbe() {
  const columns = useUsersColumns()
  const emailColumn = columns.find(
    (column) => 'accessorKey' in column && column.accessorKey === 'email'
  )
  const header =
    typeof emailColumn?.header === 'string' ? emailColumn.header : ''

  return (
    <div data-email-column={emailColumn ? 'present' : 'missing'}>{header}</div>
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

  test('shows the address and a verified badge when the account has an email', async () => {
    const container = await render(<EmailHarness email='ada@example.com' />)
    const badge = container.querySelector('[data-slot="status-badge"]')

    assert.equal(container.textContent?.includes('ada@example.com'), true)
    assert.equal(container.textContent?.includes('Not set'), false)
    assert.equal(badge?.textContent, 'Verified')
  })

  test('shows not set and an unverified badge when the account has no email', async () => {
    const container = await render(<EmailHarness email='   ' />)
    const badge = container.querySelector('[data-slot="status-badge"]')

    assert.equal(container.textContent?.includes('ada@example.com'), false)
    assert.equal(container.textContent?.includes('Not set'), true)
    assert.equal(badge?.textContent, 'Unverified')
  })

  test('includes an Email column in the user list', async () => {
    const container = await render(<ColumnHarness />)
    const marker = container.querySelector('[data-email-column]')

    assert.equal(marker?.getAttribute('data-email-column'), 'present')
    assert.equal(marker?.textContent, 'Email')
  })
})

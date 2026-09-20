/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
    10|but WITHOUT ANY WARRANTY; without even the implied warranty of
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
const { LoadingSkeleton, SidebarSkeleton } = await import('../loading-skeleton')

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type Rendered = {
  host: HTMLDivElement
  root: ReturnType<typeof createRoot>
}

let rendered: Rendered | null = null

async function renderTree(tree: ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  await act(async () => {
    root.render(tree)
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

describe('pricing marketplace loading placeholders', () => {
  test('does not render an h1 in place of the marketplace heading', async () => {
    const host = await renderTree(<LoadingSkeleton />)

    assert.equal(host.querySelector('h1'), null)
    assert.equal(host.querySelector('[data-slot="pricing-hero"]'), null)
  })

  test('keeps the filter rail skeleton in the sticky sidebar column', async () => {
    const host = await renderTree(<SidebarSkeleton />)
    const sidebar = host.querySelector('[data-slot="pricing-sidebar-skeleton"]')

    assert.ok(sidebar)
    assert.equal(sidebar.classList.contains('sticky'), true)
    assert.equal(sidebar.classList.contains('xl:block'), true)
  })
})

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
import { describe, test } from 'node:test'

import { buildPublicNavLinks } from '../use-top-nav-links'

const t = (key: string) => key

function hrefFor(title: string, status: Record<string, unknown> | null) {
  return buildPublicNavLinks({ t, status, isAuthed: false }).find(
    (link) => link.title === title
  )?.href
}

describe('buildPublicNavLinks', () => {
  test('Model Square always points at /pricing when pricing is enabled', () => {
    assert.equal(hrefFor('Model Square', null), '/pricing')
    assert.equal(
      hrefFor('Model Square', {
        HeaderNavModules: JSON.stringify({
          pricing: { enabled: true, requireAuth: false },
          rankings: { enabled: false, requireAuth: false },
        }),
      }),
      '/pricing'
    )
    assert.equal(
      hrefFor('Model Square', {
        HeaderNavModules: JSON.stringify({
          pricing: { enabled: true, requireAuth: false },
          rankings: { enabled: true, requireAuth: false },
        }),
      }),
      '/pricing'
    )
  })

  test('omits Rankings while status is unknown so the default enabled flag cannot flash /rankings', () => {
    const links = buildPublicNavLinks({ t, status: null, isAuthed: false })
    assert.equal(
      links.some(
        (link) => link.href === '/rankings' || link.href === '/ranking'
      ),
      false
    )
    assert.equal(
      links.find((link) => link.title === 'Model Square')?.href,
      '/pricing'
    )
  })

  test('omits Rankings when status disables the module', () => {
    const links = buildPublicNavLinks({
      t,
      status: {
        HeaderNavModules: JSON.stringify({
          pricing: { enabled: true, requireAuth: false },
          rankings: { enabled: false, requireAuth: false },
        }),
      },
      isAuthed: false,
    })
    assert.equal(
      links.some((link) => link.title === 'Rankings'),
      false
    )
    assert.equal(
      links.find((link) => link.title === 'Model Square')?.href,
      '/pricing'
    )
  })

  test('includes Rankings only after status confirms it is enabled', () => {
    const links = buildPublicNavLinks({
      t,
      status: {
        HeaderNavModules: JSON.stringify({
          rankings: { enabled: true, requireAuth: false },
        }),
      },
      isAuthed: false,
    })
    assert.equal(
      links.find((link) => link.title === 'Rankings')?.href,
      '/rankings'
    )
    assert.equal(
      links.find((link) => link.title === 'Model Square')?.href,
      '/pricing'
    )
  })
})

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

import { moduleAccessAfterStatusFailure } from '../nav-modules'

describe('moduleAccessAfterStatusFailure', () => {
  test('uses cached status when a live status read fails', () => {
    const access = moduleAccessAfterStatusFailure('pricing', {
      HeaderNavModules: JSON.stringify({
        pricing: { enabled: true, requireAuth: false },
      }),
    })
    assert.equal(access.enabled, true)
    assert.equal(access.requireAuth, false)
  })

  test('falls back to in-repo defaults instead of treating the module as disabled', () => {
    const pricing = moduleAccessAfterStatusFailure('pricing', null)
    assert.equal(pricing.enabled, true)

    const rankings = moduleAccessAfterStatusFailure('rankings', null)
    assert.equal(rankings.enabled, true)
  })

  test('respects a cached disabled rankings flag without inventing a home redirect', () => {
    const access = moduleAccessAfterStatusFailure('rankings', {
      HeaderNavModules: JSON.stringify({
        rankings: { enabled: false, requireAuth: false },
      }),
    })
    assert.equal(access.enabled, false)
  })
})

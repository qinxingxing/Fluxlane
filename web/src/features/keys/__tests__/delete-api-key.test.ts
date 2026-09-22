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
import { afterEach, describe, test } from 'node:test'

import { api } from '@/lib/api'

import { deleteApiKey } from '../api'

type DeleteClient = {
  delete: (url: string) => Promise<{ data: { success: boolean } }>
}

const client = api as unknown as DeleteClient
const originalDelete = client.delete

describe('deleteApiKey', () => {
  afterEach(() => {
    client.delete = originalDelete
  })

  test('requests DELETE /api/token/:id without a trailing slash', async () => {
    const calls: string[] = []
    client.delete = async (url) => {
      calls.push(url)
      return { data: { success: true } }
    }

    const result = await deleteApiKey(42)

    assert.deepEqual(calls, ['/api/token/42'])
    assert.equal(result.success, true)
  })
})

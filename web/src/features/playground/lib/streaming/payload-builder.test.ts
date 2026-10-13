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

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../constants'
import type { Message } from '../../types'
import { buildChatCompletionPayload } from './payload-builder'

const message: Message = {
  key: 'user-1',
  from: 'user',
  versions: [{ id: 'v1', content: '你好' }],
}

describe('playground chat payload', () => {
  test('keeps sampling parameters for ordinary chat models', () => {
    const payload = buildChatCompletionPayload(
      [message],
      { ...DEFAULT_CONFIG, model: 'gpt-4o', max_tokens: 128 },
      { ...DEFAULT_PARAMETER_ENABLED, max_tokens: true }
    )

    assert.equal(payload.temperature, 0.7)
    assert.equal(payload.top_p, 1)
    assert.equal(payload.max_tokens, 128)
    assert.equal(payload.max_completion_tokens, undefined)
    assert.equal(payload.frequency_penalty, 0)
    assert.equal(payload.presence_penalty, 0)
  })

  test('sends GPT-6 without the sampling fields it rejects', () => {
    const payload = buildChatCompletionPayload(
      [message],
      { ...DEFAULT_CONFIG, model: 'gpt-6-sol', max_tokens: 128 },
      { ...DEFAULT_PARAMETER_ENABLED, max_tokens: true }
    )

    assert.equal(payload.model, 'gpt-6-sol')
    assert.equal(payload.temperature, undefined)
    assert.equal(payload.top_p, undefined)
    assert.equal(payload.max_tokens, undefined)
    assert.equal(payload.max_completion_tokens, 128)
    assert.equal(payload.frequency_penalty, undefined)
    assert.equal(payload.presence_penalty, undefined)
    assert.deepEqual(payload.messages, [{ role: 'user', content: '你好' }])
  })
})

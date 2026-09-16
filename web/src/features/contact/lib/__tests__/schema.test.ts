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

import { MAX_CONTACT_DESCRIPTION_LEN } from '../constants'
import { contactFormSchema } from '../schema'

const valid = {
  company: 'Fluxlane',
  email: 'ops@example.com',
  phone: '+14155552671',
  requestedModel: 'GPT-4o',
  monthlyBudget: '1000-5000',
  description: 'Need a gateway',
  website: '',
}

describe('contactFormSchema', () => {
  test('accepts required fields and an optional description', () => {
    const result = contactFormSchema.safeParse({ ...valid, description: '' })
    assert.equal(result.success, true)
  })

  test('rejects a missing company name', () => {
    const result = contactFormSchema.safeParse({ ...valid, company: '  ' })
    assert.equal(result.success, false)
  })

  test('rejects an invalid email address', () => {
    const result = contactFormSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    })
    assert.equal(result.success, false)
  })

  test('rejects a phone number without enough digits', () => {
    const result = contactFormSchema.safeParse({ ...valid, phone: '12345' })
    assert.equal(result.success, false)
  })

  test('rejects a missing budget selection', () => {
    const result = contactFormSchema.safeParse({
      ...valid,
      monthlyBudget: '',
    })
    assert.equal(result.success, false)
  })

  test('rejects an unknown budget value', () => {
    const result = contactFormSchema.safeParse({
      ...valid,
      monthlyBudget: '5000-2000',
    })
    assert.equal(result.success, false)
  })

  test('rejects a description over the length bound', () => {
    const result = contactFormSchema.safeParse({
      ...valid,
      description: 'x'.repeat(MAX_CONTACT_DESCRIPTION_LEN + 1),
    })
    assert.equal(result.success, false)
  })
})

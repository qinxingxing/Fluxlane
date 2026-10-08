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

import { registerFormSchema } from '../constants'

const validRegistration = {
  username: 'newuser',
  email: 'newuser@example.com',
  countryCode: '+86',
  phone: '13800138000',
  verificationCode: '123456',
  password: 'password12',
  confirmPassword: 'password12',
}

describe('registerFormSchema', () => {
  test('rejects a missing email address', () => {
    const result = registerFormSchema.safeParse({
      ...validRegistration,
      email: '',
    })
    assert.equal(result.success, false)
  })

  test('rejects an invalid email address', () => {
    const result = registerFormSchema.safeParse({
      ...validRegistration,
      email: 'not-an-email',
    })
    assert.equal(result.success, false)
  })

  test('rejects a filled phone number that does not match the country code', () => {
    const result = registerFormSchema.safeParse({
      ...validRegistration,
      phone: '12345',
    })
    assert.equal(result.success, false)
  })

  test('accepts a blank phone number when the email code is present', () => {
    const result = registerFormSchema.safeParse({
      ...validRegistration,
      phone: '',
    })
    assert.equal(result.success, true)
  })

  test('rejects a missing email verification code', () => {
    const result = registerFormSchema.safeParse({
      ...validRegistration,
      verificationCode: '',
    })
    assert.equal(result.success, false)
  })

  test('accepts username, email, optional phone, email code, and matching passwords', () => {
    const result = registerFormSchema.safeParse(validRegistration)
    assert.equal(result.success, true)
  })
})

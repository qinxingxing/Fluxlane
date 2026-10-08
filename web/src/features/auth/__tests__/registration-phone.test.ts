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

import { evaluatePasswordStrength } from '../lib/password-strength'
import { buildRegistrationPhone } from '../lib/registration-phone'

describe('buildRegistrationPhone', () => {
  test('builds an E.164 number from a supported country code and national number', () => {
    assert.equal(
      buildRegistrationPhone('+86', '138-0013-8000'),
      '+8613800138000'
    )
    assert.equal(buildRegistrationPhone('+852', '51234567'), '+85251234567')
  })

  test('rejects a national number with the wrong length', () => {
    assert.equal(buildRegistrationPhone('+86', '1380013800'), null)
    assert.equal(buildRegistrationPhone('+1', '123'), null)
  })
})

describe('evaluatePasswordStrength', () => {
  test('stays empty until a password is entered', () => {
    assert.equal(evaluatePasswordStrength(''), 'empty')
  })

  test('marks a short password as weak', () => {
    assert.equal(evaluatePasswordStrength('abc'), 'weak')
  })

  test('marks mixed case of sufficient length as fair', () => {
    assert.equal(evaluatePasswordStrength('Abcdefgh'), 'fair')
  })

  test('marks length, mixed case, a number, and a symbol as strong', () => {
    assert.equal(evaluatePasswordStrength('Abcdef1!'), 'strong')
  })
})

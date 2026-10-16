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

import {
  isBlockedRegistrationEmail,
  registrationEmailDomainBlacklist,
} from '../registration-email-domain'

const blockedDomains = ['maxxspace.com']

describe('registration email domain blacklist', () => {
  test('blocks the domain after trimming and lowercasing', () => {
    assert.equal(
      isBlockedRegistrationEmail('  User@MaxXspace.COM ', blockedDomains),
      true
    )
    assert.equal(
      isBlockedRegistrationEmail('user@ MaxXspace.com', blockedDomains),
      true
    )
  })

  test('does not block a domain that only contains the blocked name', () => {
    assert.equal(
      isBlockedRegistrationEmail('user@notmaxxspace.com', blockedDomains),
      false
    )
    assert.equal(
      isBlockedRegistrationEmail('user@maxxspace.com.example', blockedDomains),
      false
    )
    assert.equal(
      isBlockedRegistrationEmail('user@sub.maxxspace.com', blockedDomains),
      false
    )
  })

  test('uses the published list and falls back only when it is missing', () => {
    assert.deepEqual(
      registrationEmailDomainBlacklist({ email_domain_blacklist: [] }),
      []
    )
    assert.deepEqual(
      registrationEmailDomainBlacklist({
        email_domain_blacklist: [' MaxXspace.COM '],
      }),
      [' MaxXspace.COM ']
    )
    assert.deepEqual(registrationEmailDomainBlacklist(null), ['maxxspace.com'])
  })
})

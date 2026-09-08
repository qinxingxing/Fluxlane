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
  FLUXLANE_LEGAL_ENTITY,
  FLUXLANE_PRIVACY_EFFECTIVE_DATE,
  FLUXLANE_PRIVACY_EMAIL,
  FLUXLANE_PUBLIC_SITE,
  isPrivacyPolicyEnabled,
} from '../fluxlane-privacy-policy'

describe('Fluxlane privacy policy', () => {
  test('identifies the Singapore company, public site, and privacy contact', () => {
    assert.equal(FLUXLANE_LEGAL_ENTITY, 'FLUX LANE PTE.LTD.')
    assert.equal(FLUXLANE_PUBLIC_SITE, 'https://www.fluxlane.ai')
    assert.equal(FLUXLANE_PRIVACY_EMAIL, 'privacy@fluxlane.ai')
    assert.equal(FLUXLANE_PRIVACY_EFFECTIVE_DATE, '8 September 2026')
  })

  test('treats the Git-published policy as enabled even when admin text is empty', () => {
    assert.equal(isPrivacyPolicyEnabled(null), true)
    assert.equal(isPrivacyPolicyEnabled({}), true)
    assert.equal(isPrivacyPolicyEnabled({ privacy_policy_enabled: false }), true)
    assert.equal(isPrivacyPolicyEnabled({ privacy_policy_enabled: true }), true)
  })
})

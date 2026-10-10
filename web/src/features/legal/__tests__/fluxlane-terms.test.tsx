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
import { renderToStaticMarkup } from 'react-dom/server'

import { FluxlaneTerms } from '../fluxlane-terms-page'
import {
  FLUXLANE_SUPPORT_EMAIL,
  FLUXLANE_TERMS_EFFECTIVE_DATE,
  isUserAgreementEnabled,
} from '../fluxlane-terms'

describe('Fluxlane terms of service', () => {
  test('treats the Git-published terms as enabled even when admin text is empty', () => {
    assert.equal(FLUXLANE_TERMS_EFFECTIVE_DATE, '10 October 2026')
    assert.equal(FLUXLANE_SUPPORT_EMAIL, 'support@fluxlane.ai')
    assert.equal(isUserAgreementEnabled(null), true)
    assert.equal(isUserAgreementEnabled({}), true)
    assert.equal(isUserAgreementEnabled({ user_agreement_enabled: false }), true)
    assert.equal(isUserAgreementEnabled({ user_agreement_enabled: true }), true)
  })

  test('renders the terms beside a privacy policy link', () => {
    const html = renderToStaticMarkup(<FluxlaneTerms />)
    assert.match(html, /<h1[^>]*>Terms of Service<\/h1>/)
    assert.match(html, /FLUX LANE PTE\. LTD\./)
    assert.match(html, /href="https:\/\/www\.fluxlane\.ai\/privacy-policy"/)
    assert.match(html, /href="mailto:support@fluxlane\.ai"/)
  })
})

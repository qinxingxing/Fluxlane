/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
    10|but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  FLUXLANE_DOCS_URL,
  publicBrandName,
  publicDocsLink,
  sanitizePublicStatus,
} from '../fluxlane-brand'

describe('publicBrandName', () => {
  test('replaces empty and upstream product names with Fluxlane', () => {
    assert.equal(publicBrandName(''), 'Fluxlane')
    assert.equal(publicBrandName(undefined), 'Fluxlane')
    assert.equal(publicBrandName('New API'), 'Fluxlane')
    assert.equal(publicBrandName('NewAPI'), 'Fluxlane')
    assert.equal(publicBrandName('new-api'), 'Fluxlane')
  })

  test('normalizes FluxLane casing', () => {
    assert.equal(publicBrandName('FluxLane'), 'Fluxlane')
    assert.equal(publicBrandName('FluxLane.ai'), 'Fluxlane.ai')
  })

  test('keeps a custom operator name', () => {
    assert.equal(publicBrandName('Acme Gateway'), 'Acme Gateway')
  })
})

describe('publicDocsLink', () => {
  test('replaces missing and New API documentation hosts', () => {
    assert.equal(publicDocsLink(undefined), FLUXLANE_DOCS_URL)
    assert.equal(publicDocsLink('https://docs.newapi.pro'), FLUXLANE_DOCS_URL)
    assert.equal(
      publicDocsLink('https://docs.newapi.pro/api/'),
      FLUXLANE_DOCS_URL
    )
  })

  test('keeps the Fluxlane docs origin', () => {
    assert.equal(
      publicDocsLink('https://doc.fluxlane.ai/'),
      'https://doc.fluxlane.ai/'
    )
  })
})

describe('sanitizePublicStatus', () => {
  test('rewrites leaked brand fields from /api/status', () => {
    const sanitized = sanitizePublicStatus({
      system_name: 'FluxLane.ai',
      docs_link: 'https://docs.newapi.pro',
      passkey_display_name: 'New API',
      footer_html: '@2026 fluxlane.ai',
    })
    assert.equal(sanitized.system_name, 'Fluxlane.ai')
    assert.equal(sanitized.docs_link, FLUXLANE_DOCS_URL)
    assert.equal(sanitized.passkey_display_name, 'Fluxlane')
    assert.equal(sanitized.footer_html, '@2026 fluxlane.ai')
  })
})

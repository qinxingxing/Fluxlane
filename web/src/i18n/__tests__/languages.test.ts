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
  convertDetectedLanguage,
  detectInitialLanguage,
  normalizeInterfaceLanguage,
  resolveInterfaceLanguage,
} from '../languages'

describe('resolveInterfaceLanguage', () => {
  test('keeps cached i18next codes instead of remapping zhTW to simplified Chinese', () => {
    assert.equal(resolveInterfaceLanguage('zhCN'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zhTW'), 'zhTW')
    assert.equal(convertDetectedLanguage('zhTW'), 'zhTW')
  })

  test('maps browser Chinese tags onto zhCN or zhTW', () => {
    assert.equal(resolveInterfaceLanguage('zh'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-CN'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh_cn'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-Hans'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-TW'), 'zhTW')
    assert.equal(resolveInterfaceLanguage('zh-Hant-TW'), 'zhTW')
  })

  test('maps regional tags onto the matching supported language', () => {
    assert.equal(resolveInterfaceLanguage('fr-FR'), 'fr')
    assert.equal(resolveInterfaceLanguage('en-US'), 'en')
    assert.equal(resolveInterfaceLanguage('ja-JP'), 'ja')
    assert.equal(resolveInterfaceLanguage('pt-BR'), undefined)
    assert.equal(resolveInterfaceLanguage(''), undefined)
    assert.equal(resolveInterfaceLanguage(null), undefined)
  })
})

describe('normalizeInterfaceLanguage', () => {
  test('falls back to simplified Chinese when the locale is missing or unsupported', () => {
    assert.equal(normalizeInterfaceLanguage('zh'), 'zhCN')
    assert.equal(normalizeInterfaceLanguage('zhTW'), 'zhTW')
    assert.equal(normalizeInterfaceLanguage('pt-BR'), 'zhCN')
    assert.equal(normalizeInterfaceLanguage(undefined), 'zhCN')
  })
})

describe('detectInitialLanguage', () => {
  test('uses an explicit stored preference', () => {
    assert.equal(detectInitialLanguage({ storedLanguage: 'zh' }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: 'zhTW' }), 'zhTW')
    assert.equal(detectInitialLanguage({ storedLanguage: 'en' }), 'en')
  })

  test('ignores leftover i18nextLng English and defaults to simplified Chinese', () => {
    assert.equal(detectInitialLanguage({ storedLanguage: null }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: '' }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: 'i18nextLng' }), 'zhCN')
  })
})

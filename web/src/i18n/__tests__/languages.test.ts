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
  INTERFACE_LANGUAGE_OPTIONS,
  INTERFACE_LANGUAGE_STORAGE_KEY,
  applyInterfaceLanguage,
  convertDetectedLanguage,
  detectInitialLanguage,
  normalizeInterfaceLanguage,
  resolveInterfaceLanguage,
} from '../languages'

describe('INTERFACE_LANGUAGE_OPTIONS', () => {
  test('only offers English and Simplified Chinese in the switcher', () => {
    assert.deepEqual(
      INTERFACE_LANGUAGE_OPTIONS.map((lang) => lang.code),
      ['zhCN', 'en']
    )
  })
})

describe('resolveInterfaceLanguage', () => {
  test('keeps supported interface codes', () => {
    assert.equal(resolveInterfaceLanguage('zhCN'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('en'), 'en')
  })

  test('maps all Chinese tags onto zhCN', () => {
    assert.equal(resolveInterfaceLanguage('zh'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-CN'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh_cn'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-Hans'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-TW'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zh-Hant-TW'), 'zhCN')
    assert.equal(resolveInterfaceLanguage('zhTW'), 'zhCN')
    assert.equal(convertDetectedLanguage('zhTW'), 'zhCN')
  })

  test('rejects languages that are no longer in the switcher', () => {
    assert.equal(resolveInterfaceLanguage('fr-FR'), undefined)
    assert.equal(resolveInterfaceLanguage('ja-JP'), undefined)
    assert.equal(resolveInterfaceLanguage('ru'), undefined)
    assert.equal(resolveInterfaceLanguage('vi'), undefined)
    assert.equal(resolveInterfaceLanguage('en-US'), 'en')
    assert.equal(resolveInterfaceLanguage('pt-BR'), undefined)
    assert.equal(resolveInterfaceLanguage(''), undefined)
    assert.equal(resolveInterfaceLanguage(null), undefined)
  })
})

describe('normalizeInterfaceLanguage', () => {
  test('falls back to simplified Chinese when the locale is missing or unsupported', () => {
    assert.equal(normalizeInterfaceLanguage('zh'), 'zhCN')
    assert.equal(normalizeInterfaceLanguage('zhTW'), 'zhCN')
    assert.equal(normalizeInterfaceLanguage('fr'), 'zhCN')
    assert.equal(normalizeInterfaceLanguage('pt-BR'), 'zhCN')
    assert.equal(normalizeInterfaceLanguage(undefined), 'zhCN')
  })
})

describe('detectInitialLanguage', () => {
  test('uses an explicit stored preference', () => {
    assert.equal(detectInitialLanguage({ storedLanguage: 'zh' }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: 'zhTW' }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: 'en' }), 'en')
  })

  test('ignores leftover i18nextLng English and defaults to simplified Chinese', () => {
    assert.equal(detectInitialLanguage({ storedLanguage: null }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: '' }), 'zhCN')
    assert.equal(detectInitialLanguage({ storedLanguage: 'i18nextLng' }), 'zhCN')
  })
})

describe('applyInterfaceLanguage', () => {
  test('persists the choice before awaiting changeLanguage so a re-pin cannot revert it', async () => {
    const order: string[] = []
    const store = new Map<string, string>()
    const previousWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            order.push(`persist:${value}`)
            store.set(key, value)
          },
          removeItem: (key: string) => {
            store.delete(key)
          },
          clear: () => store.clear(),
          key: () => null,
          get length() {
            return store.size
          },
        },
      },
    })

    try {
      await applyInterfaceLanguage(
        {
          language: 'zhCN',
          changeLanguage: async (language: string) => {
            order.push(`change:${language}`)
            assert.equal(
              store.get(INTERFACE_LANGUAGE_STORAGE_KEY),
              'en',
              'stored preference must already be English before i18n switches'
            )
          },
        },
        'en'
      )
      assert.deepEqual(order, ['persist:en', 'change:en'])
      assert.equal(
        detectInitialLanguage({
          storedLanguage: store.get(INTERFACE_LANGUAGE_STORAGE_KEY),
        }),
        'en'
      )
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
      })
    }
  })

  test('does not call changeLanguage when i18n is already on that code', async () => {
    let changed = 0
    const applied = await applyInterfaceLanguage(
      {
        language: 'en',
        changeLanguage: async () => {
          changed += 1
        },
      },
      'en'
    )
    assert.equal(applied, 'en')
    assert.equal(changed, 0)
  })

  test('returns undefined for an unsupported language without switching', async () => {
    const applied = await applyInterfaceLanguage(
      {
        language: 'zhCN',
        changeLanguage: async () => {
          throw new Error('should not change')
        },
      },
      'pt-BR'
    )
    assert.equal(applied, undefined)
  })
})

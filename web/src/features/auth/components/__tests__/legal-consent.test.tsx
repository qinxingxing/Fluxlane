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
import { after, afterEach, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node'] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { LegalConsent } = await import('../legal-consent')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        and: 'and',
        'I have read and agree to the': 'I have read and agree to the',
        'Privacy Policy': 'Privacy Policy',
        'Terms of Service': 'Terms of Service',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

afterEach(async () => {
  if (!root || !host) return
  await act(async () => root?.unmount())
  host.remove()
  root = null
  host = null
})

after(() => {
  domWindow.close()
})

describe('registration legal consent', () => {
  test('shows Terms of Service immediately before Privacy Policy when admin text is empty', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <I18nextProvider i18n={i18n}>
          <LegalConsent
            status={null}
            checked={false}
            onCheckedChange={() => undefined}
          />
        </I18nextProvider>
      )
    })

    const hrefs = [...host.querySelectorAll('a')].map((anchor) =>
      anchor.getAttribute('href')
    )
    assert.deepEqual(hrefs, ['/user-agreement', '/privacy-policy'])
    assert.match(
      host.textContent ?? '',
      /I have read and agree to the Terms of Service and Privacy Policy/
    )
  })
})

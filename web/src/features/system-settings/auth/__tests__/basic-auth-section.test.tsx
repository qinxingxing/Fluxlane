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
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLTextAreaElement',
  'Node',
  'Element',
  'Event',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { BasicAuthSection } = await import('../basic-auth-section')
const { SettingsPageProvider } =
  await import('../../components/settings-page-context')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

async function renderAdminAuthSection() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    root?.render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <SettingsPageProvider actionsContainer={null}>
            <BasicAuthSection
              defaultValues={{
                PasswordLoginEnabled: true,
                PasswordRegisterEnabled: true,
                EmailVerificationEnabled: false,
                RegisterEnabled: true,
                EmailDomainRestrictionEnabled: false,
                EmailAliasRestrictionEnabled: false,
                EmailDomainWhitelist: 'gmail.com',
                EmailDomainBlacklist: 'maxxspace.com',
              }}
            />
          </SettingsPageProvider>
        </QueryClientProvider>
      </I18nextProvider>
    )
  })
}

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
  }
  host?.remove()
  host = null
  root = null
})

after(() => {
  domWindow.close()
})

describe('admin authentication settings', () => {
  test('shows the email domain blacklist below the whitelist', async () => {
    await renderAdminAuthSection()
    const labels = [...(host?.querySelectorAll('label') ?? [])].map((label) =>
      label.textContent?.trim()
    )
    const whitelistIndex = labels.indexOf('Email Domain Whitelist')
    const blacklistIndex = labels.indexOf('Email Domain Blacklist')
    const textareas = [...(host?.querySelectorAll('textarea') ?? [])]

    assert.ok(whitelistIndex >= 0)
    assert.ok(blacklistIndex > whitelistIndex)
    assert.equal(textareas[0]?.value, 'gmail.com')
    assert.equal(textareas[1]?.value, 'maxxspace.com')
    assert.equal(
      host?.textContent?.includes(
        'New registrations from these domains are rejected'
      ),
      true
    )
  })
})

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
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { isPrerendering, readPrerenderState } from '@/lib/prerender-bridge'

import {
  detectInitialLanguage,
  persistInterfaceLanguage,
  setInterfaceLanguagePersistEnabled,
  toIntlLocale,
} from './languages'
import en from './locales/en.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'
import ru from './locales/ru.json'
import vi from './locales/vi.json'
import zhTW from './locales/zh-TW.json'
import zhCN from './locales/zh.json'

export const resources = {
  en,
  zhCN,
  fr,
  ru,
  ja,
  vi,
  zhTW,
} as const

function applyDocumentLanguage(code?: string | null) {
  if (typeof document === 'undefined') return
  const locale = toIntlLocale(code)
  if (locale) {
    document.documentElement.lang = locale
  }
}

function syncDocumentLanguage(code?: string | null) {
  applyDocumentLanguage(code)
  if (code) persistInterfaceLanguage(code)
}

// Prerendered pages (and the build-time prerenderer) ship English HTML.
// Pin `en` for that first tree so hydration matches; do not write `en` to
// localStorage. The root route switches to the visitor language after
// hydration, then reveals `#root`.
const pinEnglish = isPrerendering() || readPrerenderState() !== null
if (pinEnglish) {
  setInterfaceLanguagePersistEnabled(false)
}

const initialLanguage = pinEnglish ? 'en' : detectInitialLanguage()

export const i18nReady = i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: ['en', 'zhCN', 'fr', 'ru', 'ja', 'vi', 'zhTW'],
  load: 'currentOnly',
  nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
  debug: import.meta.env.DEV,
  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
  },
})

void i18nReady.then(() => {
  syncDocumentLanguage(i18n.resolvedLanguage || i18n.language)
})

i18n.on('languageChanged', syncDocumentLanguage)

export default i18n

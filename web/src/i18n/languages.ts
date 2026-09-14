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
export const INTERFACE_LANGUAGE_OPTIONS = [
  { code: 'zhCN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zhTW', label: '繁體中文' },
] as const

export type InterfaceLanguageCode =
  (typeof INTERFACE_LANGUAGE_OPTIONS)[number]['code']

/** Written only when the visitor explicitly picks a language. */
export const INTERFACE_LANGUAGE_STORAGE_KEY = 'fluxlaneInterfaceLng'
export const I18N_READY_ATTR = 'data-i18n-ready'
export const I18N_PENDING_ATTR = 'data-i18n-pending'
export const DEFAULT_INTERFACE_LANGUAGE: InterfaceLanguageCode = 'zhCN'

const INTERFACE_LANGUAGE_CODES = new Set<string>(
  INTERFACE_LANGUAGE_OPTIONS.map((lang) => lang.code)
)

export type LanguageDetectionSource = {
  storedLanguage?: string | null
}

/**
 * Resolve a stored, user, or browser locale onto an interface language code.
 *
 * Cached i18next codes (`zhCN` / `zhTW`) must match first: running them through
 * `convertDetectedLanguage` would treat `zhTW` as generic `zh*` and map it to
 * simplified Chinese. Browser tags such as `zh`, `zh-cn`, and `fr-FR` then map
 * onto `supportedLngs` the same way i18next eventually would, instead of
 * falling through to English.
 */
export function resolveInterfaceLanguage(
  value?: string | null
): InterfaceLanguageCode | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (INTERFACE_LANGUAGE_CODES.has(trimmed)) {
    return trimmed as InterfaceLanguageCode
  }

  const converted = convertDetectedLanguage(trimmed)
  if (INTERFACE_LANGUAGE_CODES.has(converted)) {
    return converted as InterfaceLanguageCode
  }

  const lower = converted.replaceAll('_', '-').toLowerCase()
  if (INTERFACE_LANGUAGE_CODES.has(lower)) {
    return lower as InterfaceLanguageCode
  }

  const base = lower.split('-')[0]
  if (base && INTERFACE_LANGUAGE_CODES.has(base)) {
    return base as InterfaceLanguageCode
  }
  return undefined
}

export function normalizeInterfaceLanguage(value?: string | null): string {
  return resolveInterfaceLanguage(value) ?? DEFAULT_INTERFACE_LANGUAGE
}

/**
 * Language for the first paint. An explicit switcher/profile choice wins;
 * otherwise Simplified Chinese. Browser `navigator.languages` and leftover
 * `i18nextLng` values are ignored — the latter was written during English
 * hydration and made nav/footer stick on English after refresh.
 */
export function detectInitialLanguage(
  source: LanguageDetectionSource = {}
): InterfaceLanguageCode {
  const storedLanguage =
    source.storedLanguage !== undefined
      ? source.storedLanguage
      : readStoredLanguage()
  return resolveInterfaceLanguage(storedLanguage) ?? DEFAULT_INTERFACE_LANGUAGE
}

export function persistInterfaceLanguage(code: string) {
  if (typeof window === 'undefined') return
  const resolved = resolveInterfaceLanguage(code)
  if (!resolved) return
  try {
    window.localStorage.setItem(INTERFACE_LANGUAGE_STORAGE_KEY, resolved)
  } catch {
    /* empty */
  }
}

export function markDocumentI18nReady() {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute(I18N_PENDING_ATTR)
  document.documentElement.setAttribute(I18N_READY_ATTR, '')
  document.querySelector('#root')?.setAttribute(I18N_READY_ATTR, '')
}

function readStoredLanguage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(INTERFACE_LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Map a browser-detected locale onto the interface language codes this project
 * uses with i18next (`zhCN` / `zhTW`).
 *
 * Browsers report standard BCP-47 tags (`zh-CN`, `zh-TW`, `zh-Hant`, `zh`, ...),
 * but `supportedLngs`/resources use the non-standard camelCase codes, so without
 * this mapping a Chinese browser would never match and fall back to English.
 * Non-Chinese codes are returned unchanged so i18next's own `supportedLngs`
 * matching still applies (e.g. `fr-FR` -> `fr`, `ja` -> `ja`).
 */
export function convertDetectedLanguage(value: string): string {
  const lower = value.trim().replaceAll('_', '-').toLowerCase()
  if (!lower.startsWith('zh')) return value
  if (
    lower === 'zhtw' ||
    lower === 'zh-tw' ||
    lower === 'zh-hk' ||
    lower === 'zh-mo' ||
    lower.startsWith('zh-hant')
  ) {
    return 'zhTW'
  }
  return 'zhCN'
}

/**
 * Convert an interface language code (the values i18next uses, such as `zhCN` /
 * `zhTW`) into a valid BCP-47 locale tag that the `Intl.*` APIs accept.
 *
 * `new Intl.NumberFormat('zhCN')` throws `RangeError: Invalid language tag`, so
 * any locale derived from `i18n.language` / `i18n.resolvedLanguage` MUST be run
 * through this before it reaches an `Intl` constructor. Unknown values fall back
 * to `undefined`, which makes `Intl` use the runtime default locale.
 */
export function toIntlLocale(value?: string | null): string | undefined {
  if (!value) return undefined
  switch (value) {
    case 'zhCN':
      return 'zh-CN'
    case 'zhTW':
      return 'zh-TW'
    default:
      break
  }
  try {
    return Intl.getCanonicalLocales(value)[0]
  } catch {
    return undefined
  }
}

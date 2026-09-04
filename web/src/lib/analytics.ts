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
/**
 * Thin wrapper over Google Tag Manager `dataLayer`.
 *
 * Only whitelisted event names and a small set of non-sensitive params are
 * forwarded. Never extend this with API keys, tokens, prompts, balances, or
 * URL query strings — GTM is a third party.
 */

export type AnalyticsEventName =
  | 'view_pricing'
  | 'view_model'
  | 'click_get_started'
  | 'click_documentation'
  | 'click_console'

type AnalyticsParams = {
  /** Model identifier for `view_model`; a bare model id, never a key. */
  modelId?: string
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

export function trackEvent(
  name: AnalyticsEventName,
  params?: AnalyticsParams
): void {
  if (typeof window === 'undefined') return
  const dataLayer = window.dataLayer
  if (!Array.isArray(dataLayer)) return
  const payload: Record<string, unknown> = { event: name }
  if (params?.modelId) {
    // Keep the id bounded and free of anything that could carry a query
    // string or secret.
    const safeId = params.modelId.slice(0, 128).replaceAll(/[?&=#]/g, '')
    if (safeId) payload.model_id = safeId
  }
  dataLayer.push(payload)
}

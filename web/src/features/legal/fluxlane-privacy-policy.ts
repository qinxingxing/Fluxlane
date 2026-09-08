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

export const FLUXLANE_LEGAL_ENTITY = 'FLUX LANE PTE.LTD.'
export const FLUXLANE_PRIVACY_EMAIL = 'privacy@fluxlane.ai'
export const FLUXLANE_PUBLIC_SITE = 'https://www.fluxlane.ai'
export const FLUXLANE_PRIVACY_EFFECTIVE_DATE = '8 September 2026'
export const FLUXLANE_PRIVACY_POLICY_PUBLISHED = true

export function isPrivacyPolicyEnabled(
  status?: { privacy_policy_enabled?: boolean } | null
): boolean {
  if (status?.privacy_policy_enabled) return true
  return FLUXLANE_PRIVACY_POLICY_PUBLISHED
}

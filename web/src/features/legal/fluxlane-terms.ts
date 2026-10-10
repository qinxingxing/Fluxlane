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

export const FLUXLANE_TERMS_EFFECTIVE_DATE = '10 October 2026'
export const FLUXLANE_SUPPORT_EMAIL = 'support@fluxlane.ai'
export const FLUXLANE_TERMS_PUBLISHED = true

export function isUserAgreementEnabled(
  status?: { user_agreement_enabled?: boolean } | null
): boolean {
  if (status?.user_agreement_enabled) return true
  return FLUXLANE_TERMS_PUBLISHED
}

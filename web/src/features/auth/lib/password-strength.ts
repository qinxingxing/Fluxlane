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

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong'

export function evaluatePasswordStrength(value: string): PasswordStrength {
  if (!value) return 'empty'
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1
  if (score <= 1 || value.length < 8) return 'weak'
  if (score === 2) return 'fair'
  return 'strong'
}

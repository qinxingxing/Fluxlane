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

export const REGISTRATION_COUNTRY_CODES = [
  { value: '+86', label: '+86 (CN)', digits: 11 },
  { value: '+1', label: '+1 (US)', digits: 10 },
  { value: '+852', label: '+852 (HK)', digits: 8 },
  { value: '+65', label: '+65 (SG)', digits: 8 },
] as const

export type RegistrationCountryCode =
  (typeof REGISTRATION_COUNTRY_CODES)[number]['value']

const countryByValue = new Map(
  REGISTRATION_COUNTRY_CODES.map((country) => [country.value, country])
)

export function buildRegistrationPhone(
  countryCode: string,
  nationalNumber: string
): string | null {
  const country = countryByValue.get(countryCode as RegistrationCountryCode)
  if (!country) return null
  const digits = nationalNumber.replaceAll(/[\s-]/g, '')
  if (!/^\d+$/.test(digits) || digits.length !== country.digits) return null
  if (country.value === '+86' && !/^1[3-9]\d{9}$/.test(digits)) return null
  return `${country.value}${digits}`
}

export function isRegistrationPhone(
  countryCode: string,
  nationalNumber: string
): boolean {
  return buildRegistrationPhone(countryCode, nationalNumber) !== null
}

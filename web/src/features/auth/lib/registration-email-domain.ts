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

const DEFAULT_REGISTRATION_EMAIL_DOMAIN_BLACKLIST = ['maxxspace.com']

type RegistrationEmailDomainStatus = {
  email_domain_blacklist?: unknown
  data?: {
    email_domain_blacklist?: unknown
  }
} | null

export function registrationEmailDomain(email: string): string {
  const parts = email.trim().split('@')
  if (parts.length !== 2) return ''
  const local = parts[0]?.trim() ?? ''
  const domain = parts[1]?.trim().toLowerCase() ?? ''
  if (!local || !domain) return ''
  return domain
}

export function isBlockedRegistrationEmail(
  email: string,
  domains: readonly string[]
): boolean {
  const domain = registrationEmailDomain(email)
  if (!domain) return false
  return domains.some((item) => item.trim().toLowerCase() === domain)
}

export function registrationEmailDomainBlacklist(
  status: RegistrationEmailDomainStatus | undefined
): string[] {
  const raw =
    status?.email_domain_blacklist ?? status?.data?.email_domain_blacklist
  if (!Array.isArray(raw)) {
    return [...DEFAULT_REGISTRATION_EMAIL_DOMAIN_BLACKLIST]
  }
  return raw.filter((item): item is string => typeof item === 'string')
}

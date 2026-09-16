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
export const MONTHLY_BUDGETS = [
  '0-1000',
  '1000-5000',
  '5000-20000',
  '20000-plus',
] as const

export type MonthlyBudget = (typeof MONTHLY_BUDGETS)[number]

export const MONTHLY_BUDGET_OPTIONS: {
  value: MonthlyBudget
  labelKey: string
}[] = [
  { value: '0-1000', labelKey: '$0 – $1,000' },
  { value: '1000-5000', labelKey: '$1,000 – $5,000' },
  { value: '5000-20000', labelKey: '$5,000 – $20,000' },
  { value: '20000-plus', labelKey: 'More than $20,000' },
]

export const MAX_CONTACT_COMPANY_LEN = 255
export const MAX_CONTACT_EMAIL_LEN = 80
export const MAX_CONTACT_PHONE_LEN = 40
export const MAX_CONTACT_MODEL_LEN = 255
export const MAX_CONTACT_DESCRIPTION_LEN = 4000

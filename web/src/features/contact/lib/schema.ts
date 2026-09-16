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
import { z } from 'zod'

import {
  MAX_CONTACT_COMPANY_LEN,
  MAX_CONTACT_DESCRIPTION_LEN,
  MAX_CONTACT_EMAIL_LEN,
  MAX_CONTACT_MODEL_LEN,
  MAX_CONTACT_PHONE_LEN,
  MONTHLY_BUDGETS,
} from './constants'

export function isValidContactPhone(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_CONTACT_PHONE_LEN) {
    return false
  }
  let digits = 0
  for (const char of trimmed) {
    if (char >= '0' && char <= '9') {
      digits += 1
      continue
    }
    if ('+ -()./'.includes(char)) {
      continue
    }
    return false
  }
  return digits >= 6 && digits <= 15
}

export const contactFormSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, 'Please enter your company name')
    .max(MAX_CONTACT_COMPANY_LEN, 'Please enter your company name'),
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email')
    .email({ message: 'Please enter a valid email address' })
    .max(MAX_CONTACT_EMAIL_LEN, 'Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(1, 'Please enter a phone number')
    .max(MAX_CONTACT_PHONE_LEN, 'Please enter a valid phone number')
    .refine(isValidContactPhone, 'Please enter a valid phone number'),
  requestedModel: z
    .string()
    .trim()
    .min(1, 'Please enter the models you need')
    .max(MAX_CONTACT_MODEL_LEN, 'Please enter the models you need'),
  monthlyBudget: z
    .string()
    .refine(
      (value): value is (typeof MONTHLY_BUDGETS)[number] =>
        (MONTHLY_BUDGETS as readonly string[]).includes(value),
      'Please select a monthly budget'
    ),
  description: z
    .string()
    .max(
      MAX_CONTACT_DESCRIPTION_LEN,
      'Please keep the description under 4000 characters'
    ),
  website: z.string(),
})

export type ContactFormInput = z.input<typeof contactFormSchema>
export type ContactFormValues = z.output<typeof contactFormSchema>

export const contactFormDefaultValues: ContactFormInput = {
  company: '',
  email: '',
  phone: '',
  requestedModel: '',
  monthlyBudget: '',
  description: '',
  website: '',
}

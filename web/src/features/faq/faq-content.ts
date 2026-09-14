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

export const FAQ_ADVANTAGES = [
  'A unified API and authentication flow',
  'Calls that follow mainstream OpenAI API formats',
  'Centralized token, balance, and usage management',
  'Clear model prices and call records',
  'Lower cost to connect and switch among multiple models',
] as const

export const FAQ_ERROR_COLUMNS = [
  'Status code or symptom',
  'Common cause',
  'Suggested action',
] as const

export const FAQ_ERROR_ROWS = [
  {
    code: '400',
    cause: 'Wrong model name, request parameters, or request format',
    action:
      'Check the request against the Model Square and the API documentation',
  },
  {
    code: '401',
    cause: 'The API Key is wrong, expired, disabled, or malformed',
    action:
      'Check the Authorization header and generate a new API Key if needed',
  },
  {
    code: '403',
    cause: 'This API Key cannot access the requested model, group, or IP',
    action: 'Check API Key permissions, model access, and IP restrictions',
  },
  {
    code: '429',
    cause:
      'Insufficient account quota, too many requests, or upstream rate limiting',
    action:
      'Check your balance and the error payload, lower concurrency, and retry with exponential backoff',
  },
  {
    code: '500/502/503',
    cause: 'FluxLane.AI or an upstream model service is temporarily unavailable',
    action: 'Retry later. Contact support if the error continues',
  },
  {
    code: 'Request timeout',
    cause:
      'The model took a long time to generate, the network dropped, or the client timeout is too short',
    action: 'Enable streaming and raise the client timeout',
  },
  {
    code: 'Incomplete response',
    cause:
      'The network dropped, output length was capped, or the model hit its maximum output',
    action: 'Check parameters such as max_tokens and read the full error payload',
  },
] as const

export const FAQ_REFUND_ELIGIBLE = [
  'Paid through a payment channel supported by the platform',
  'Not yet used to cover model calls or other service fees',
  'Can be matched to the corresponding top-up order',
  'Meets the application window and other conditions in these rules',
] as const

export const FAQ_REFUND_INELIGIBLE = [
  'Amounts already consumed for service usage',
  'Vouchers, coupons, bonus balance, and other promotional credit',
  'Credit granted free through campaigns, compensation, or promotions',
  'Balance that cannot be matched to a valid payment order',
  'Other amounts the platform may decline to refund where applicable law allows',
] as const

export const FAQ_REFUND_APPLICATION_ITEMS = [
  'Your FluxLane.AI registration email',
  'The relevant order number',
  'Payment time and amount',
  'Payment proof or a transaction screenshot',
  'The reason for the refund',
  'Other information reasonably required to verify identity and the ledger',
] as const

export const FAQ_REFUND_LIMITS = [
  'Each order may be submitted for a refund only once. After a partial refund, further requests for the same order are not accepted.',
  'Apply within 180 days after the related top-up order is completed.',
  'If a payment channel, applicable law, or a regulator requires a different window or process, that requirement prevails.',
  "FX differences, bank fees, and charges levied by the paying institution are handled under those institutions' rules.",
  'A model price change after you top up is not an automatic reason to refund a historical top-up order.',
] as const

export const FAQ_ABUSE_ACTIONS = [
  'Pause refund review',
  'Temporarily restrict the account or related balance',
  'Ask for additional identity and transaction evidence',
  'Refuse applications that do not meet the refund conditions',
  'Report the matter to the payment institution, bank, or a competent authority',
  'Pursue legal remedies',
] as const

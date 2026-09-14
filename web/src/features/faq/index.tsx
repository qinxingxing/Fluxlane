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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  FAQ_ABUSE_ACTIONS,
  FAQ_ADVANTAGES,
  FAQ_ERROR_COLUMNS,
  FAQ_ERROR_ROWS,
  FAQ_REFUND_APPLICATION_ITEMS,
  FAQ_REFUND_ELIGIBLE,
  FAQ_REFUND_INELIGIBLE,
  FAQ_REFUND_LIMITS,
} from './faq-content'

const bodyClass = 'text-muted-foreground text-sm leading-relaxed md:text-base'
const listClass = `${bodyClass} list-disc space-y-2 pl-5`
const headingClass = 'text-xl font-semibold tracking-tight md:text-2xl'

export function FaqPage() {
  const { t } = useTranslation()

  return (
    <PublicLayout>
      <article className='mx-auto max-w-4xl space-y-10 py-6 md:py-10'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-semibold tracking-tight'>
            {t('Frequently Asked Questions')}
          </h1>
          <p className={bodyClass}>
            {t(
              'Answers about FluxLane.AI models, OpenAI-compatible APIs, billing, invoices, and refunds.'
            )}
          </p>
        </header>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Who is FluxLane.AI for?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI serves individual developers, AI startups, enterprises, and university students and faculty with unified API access to mainstream AI models. You can call the models you need based on actual usage, without buying or maintaining GPUs or other hardware.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('What advantages does FluxLane.AI offer?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI aggregates models from providers such as OpenAI, Anthropic, Moonshot AI, Z.ai, and DeepSeek, and provides:'
            )}
          </p>
          <ul className={listClass}>
            {FAQ_ADVANTAGES.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>
          <p className={bodyClass}>
            {t('For currently available models and prices, see the')}{' '}
            <Link
              to='/pricing'
              className='text-primary underline underline-offset-4'
            >
              {t('Model Square')}
            </Link>{' '}
            {t('and treat that page as the source of truth.')}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Is FluxLane.AI compatible with the OpenAI API format?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI is compatible with mainstream OpenAI API call formats. If your app already uses the OpenAI SDK or a compatible interface, you usually only need to change the API base URL, API Key, and model name.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Supported parameters, context length, and features can differ by model. Review the model notes and API documentation before you migrate.'
            )}
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className={headingClass}>
            {t('How do I troubleshoot API errors?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'Start from the HTTP status code and the error payload:'
            )}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                {FAQ_ERROR_COLUMNS.map((column) => (
                  <TableHead key={column} className='whitespace-normal'>
                    {t(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FAQ_ERROR_ROWS.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className='whitespace-normal font-medium'>
                    {row.code === 'Request timeout' ||
                    row.code === 'Incomplete response'
                      ? t(row.code)
                      : row.code}
                  </TableCell>
                  <TableCell className='whitespace-normal'>
                    {t(row.cause)}
                  </TableCell>
                  <TableCell className='whitespace-normal'>
                    {t(row.action)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className={bodyClass}>
            {t(
              'When you contact support, include the request time, model name, HTTP status code, error message, and Request ID. Do not send a full API Key by email or chat.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Does the platform support intelligent inference routing?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI does not currently choose models automatically by price, latency, or availability, and it does not fail over across upstreams on its own.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'If you need intelligent routing, enterprise inference, or higher concurrency, contact'
            )}{' '}
            <a
              href='https://www.aidroplet.com'
              className='text-primary underline underline-offset-4'
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('Zhuopu Cloud')}
            </a>{' '}
            {t('to discuss related options.')}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t(
              'Do I need my own OpenAI or Anthropic credentials to use those models?'
            )}
          </h2>
          <p className={bodyClass}>
            {t(
              'When you call models already connected through FluxLane.AI, you usually do not need a separate vendor account, API Key, or developer verification.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI provides a unified entry point. Availability can still depend on supply, regional policy, network conditions, and upstream status.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Any cooperation, authorization, or affiliation between FluxLane.AI and the model vendors named on this site should be judged from information those parties publish officially.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>{t('How does FluxLane.AI bill?')}</h2>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI uses prepaid credit and deducts fees from actual usage.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Different models may bill input tokens, output tokens, cached tokens, or other meters separately. The price applied to a call is the effective price shown on the Model Square and in the console when the call happens.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Prices may change because of upstream vendor adjustments, FX, service cost, or operating policy. A change applies only to calls after it takes effect and does not reopen completed calls.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Where can I see model prices?')}
          </h2>
          <p className={bodyClass}>
            {t('Open the')}{' '}
            <Link
              to='/pricing'
              className='text-primary underline underline-offset-4'
            >
              {t('Model Square')}
            </Link>{' '}
            {t('to see currently supported models and prices.')}
          </p>
          <p className={bodyClass}>
            {t(
              'Some models have different input, output, cache, or long-context prices. Read the billing notes for that model before you call it.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Can FluxLane.AI issue invoices?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI is operated by a Singapore company and can issue a commercial invoice based on actual transactions.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Chinese mainland VAT special invoices and VAT ordinary invoices are not available today. If you expect high usage, or you need purchase-order, contract, or payment paperwork, contact us before you top up.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Can I get a refund after topping up?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'Amounts already consumed for service usage cannot be refunded. Unused paid principal that meets the refund conditions can be requested under the refund rules.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Bonus balance, vouchers, coupons, and other promotional credit are not paid principal and cannot be refunded or cashed out.'
            )}
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className={headingClass}>
            {t('Can I withdraw my account balance?')}
          </h2>
          <p className={bodyClass}>
            {t(
              'Account balance is not a stored-value account or e-wallet and cannot be freely transferred or withdrawn.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Unused paid principal that meets the refund conditions can be returned to the original payment method under the refund rules.'
            )}
          </p>
        </section>

        <section className='space-y-6'>
          <h2 className={headingClass}>{t('Refund rules')}</h2>
          <p className={bodyClass}>
            {t(
              'Please read these rules before you top up. Completing a top-up means you have read and agree to them. They do not affect consumer rights that applicable law does not allow a contract to waive.'
            )}
          </p>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('1. What can be refunded')}
          </h3>
          <p className={bodyClass}>
            {t('Only the following balance may be submitted for a refund:')}
          </p>
          <ul className={listClass}>
            {FAQ_REFUND_ELIGIBLE.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>
          <p className={bodyClass}>
            {t('The following amounts cannot be refunded:')}
          </p>
          <ul className={listClass}>
            {FAQ_REFUND_INELIGIBLE.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('2. Refund amount')}
          </h3>
          <p className={bodyClass}>
            {t(
              'Refunds are calculated from unused paid principal recorded in the platform ledger.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'In principle, the refund equals unused paid principal on the order minus payment-channel fees that were incurred and cannot be returned, where applicable.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'If the payment channel does not return the original transaction fee, or the refund creates extra charges, the platform may deduct those actual costs from the refund where the law allows and the top-up page already disclosed them.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Bonus balance, vouchers, and other promotional credit are never converted into a cash refund.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'When remaining eligible paid principal is below the equivalent of USD 5, refund requests are generally not accepted because of channel fees and manual review cost, unless applicable law requires otherwise.'
            )}
          </p>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('3. How to apply')}
          </h3>
          <p className={bodyClass}>
            {t(
              'The account holder must apply from the registration email and provide:'
            )}
          </p>
          <ul className={listClass}>
            {FAQ_REFUND_APPLICATION_ITEMS.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>
          <p className={bodyClass}>
            {t(
              'To protect the account and funds, the platform may require identity or payment-account verification.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Do not send passwords, full API Keys, bank-card PINs, or verification codes by email or chat.'
            )}
          </p>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('4. Review and payout time')}
          </h3>
          <p className={bodyClass}>
            {t(
              'Complete applications are usually reviewed within 5 to 7 business days after all materials arrive.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'Approved refunds are returned, in principle, through the original payment channel and currency to the original paying account. Arrival time depends on the payment institution or bank and usually takes another 1 to 7 business days.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              "Corporate bank transfers are returned to the original paying company's bank account. If the payer details do not match, the account is closed, or the channel cannot reverse the original path, the platform will agree another lawful, verifiable method with the applicant."
            )}
          </p>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('5. Refund limits')}
          </h3>
          <ul className={listClass}>
            {FAQ_REFUND_LIMITS.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('6. Handling abnormal activity')}
          </h3>
          <p className={bodyClass}>
            {t(
              'If the platform has reasonable evidence of stolen cards, malicious payment, repeated top-up-and-refund cycles, exploiting system defects for bonus credit, fraud, or other illegal activity, it may, to the extent the law allows:'
            )}
          </p>
          <ul className={listClass}>
            {FAQ_ABUSE_ACTIONS.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>
          <p className={bodyClass}>
            {t(
              'The platform will notify the user through the registration email or another reasonable channel before or after a restriction, unless law, a regulator, or an investigation forbids notice.'
            )}
          </p>

          <h3 className='text-lg font-semibold tracking-tight'>
            {t('7. Other notes')}
          </h3>
          <p className={bodyClass}>
            {t(
              'FluxLane.AI provides AI model API service billed on actual usage. Account balance only offsets platform service fees, earns no interest, cannot be transferred between users, and is not a bank account, e-wallet, or other payment account.'
            )}
          </p>
          <p className={bodyClass}>
            {t(
              'If these rules conflict with a mandatory provision of applicable law, the mandatory provision prevails.'
            )}
          </p>
        </section>
      </article>
    </PublicLayout>
  )
}

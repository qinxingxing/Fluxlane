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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import {
  formatDualPriceDiscount,
  getFableDualPriceOffers,
  type DualPriceOffer,
} from '../lib/dual-price'
import {
  getDynamicPricingSummary,
  type DynamicPriceEntry,
} from '../lib/dynamic-price'
import { stripTrailingZeros } from '../lib/price'
import type { PricingModel, TokenUnit } from '../types'

export function DualPriceSummary(props: {
  model: PricingModel
  tokenUnit: TokenUnit
  priceRate?: number
  usdExchangeRate?: number
  showRechargePrice?: boolean
  layout: 'card' | 'table' | 'detail'
  /** Card and detail show input/output. Table cache column shows cache read. */
  fields?: 'primary' | 'cache'
}) {
  const { t } = useTranslation()
  const offers = getFableDualPriceOffers(props.model)
  if (!offers) return null

  const rows = offers.map((offer) => {
    const summary = getDynamicPricingSummary(props.model, {
      tokenUnit: props.tokenUnit,
      showRechargePrice: props.showRechargePrice,
      priceRate: props.priceRate,
      usdExchangeRate: props.usdExchangeRate,
      groupRatioMultiplier: offer.ratio,
    })
    const entries =
      props.fields === 'cache'
        ? (summary?.entries.filter(
            (entry) => entry.field === 'cacheReadPrice'
          ) ?? [])
        : (summary?.primaryEntries ?? [])
    return {
      offer,
      entries,
    }
  })

  if (rows.every((row) => row.entries.length === 0)) return null

  if (props.layout === 'table') {
    return (
      <div
        data-slot='dual-price'
        className='flex max-w-full min-w-0 flex-col gap-1'
      >
        {rows.map((row) => (
          <div key={row.offer.key} className='min-w-0'>
            <div className='text-muted-foreground text-[10px] font-semibold tracking-wider uppercase'>
              {t(row.offer.labelKey)}
              {row.offer.key === 'special' ? (
                <span className='text-primary ml-1 normal-case'>
                  {formatDualPriceDiscount(row.offer.ratio)}
                </span>
              ) : null}
            </div>
            <PriceSlash
              entries={row.entries}
              emphasize={row.offer.key === 'special'}
            />
          </div>
        ))}
      </div>
    )
  }

  if (props.layout === 'detail') {
    return (
      <div data-slot='dual-price' className='space-y-3'>
        {rows.map((row) => (
          <div key={row.offer.key}>
            <OfferLabel offer={row.offer} />
            <div className='mt-1.5 grid grid-cols-2 gap-2'>
              {row.entries.map((entry) => (
                <div
                  key={entry.key}
                  className='bg-muted/20 rounded-lg border p-3'
                >
                  <div className='text-muted-foreground text-xs'>
                    {t(entry.shortLabel)}
                  </div>
                  <div className='text-foreground mt-1 font-mono text-base font-semibold tabular-nums'>
                    {entry.formatted}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div data-slot='dual-price' className='mb-6 flex flex-col gap-1.5'>
      {rows.map((row) => {
        const isSpecial = row.offer.key === 'special'
        return (
          <div
            key={row.offer.key}
            data-price-tier={row.offer.key}
            className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'
          >
            <span
              className={cn(
                'text-[11px] font-semibold',
                isSpecial ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {t(row.offer.labelKey)}
              {isSpecial ? (
                <span className='bg-primary/10 ml-1.5 rounded px-1.5 py-0.5'>
                  {formatDualPriceDiscount(row.offer.ratio)}
                </span>
              ) : null}
            </span>
            {row.entries.map((entry) => (
              <span
                key={entry.key}
                className='text-muted-foreground font-mono text-sm whitespace-nowrap'
              >
                {t(entry.shortLabel)}{' '}
                <strong className='text-foreground font-semibold'>
                  {entry.formatted}
                </strong>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function OfferLabel(props: { offer: DualPriceOffer }) {
  const { t } = useTranslation()
  const isSpecial = props.offer.key === 'special'
  return (
    <span
      className={cn(
        'text-[11px] font-semibold tracking-wider uppercase',
        isSpecial ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {t(props.offer.labelKey)}
      {isSpecial ? (
        <span className='bg-primary/10 ml-1.5 rounded px-1.5 py-0.5 normal-case'>
          {formatDualPriceDiscount(props.offer.ratio)}
        </span>
      ) : null}
    </span>
  )
}

function PriceSlash(props: {
  entries: DynamicPriceEntry[]
  emphasize: boolean
}) {
  return (
    <span className='font-mono text-sm tabular-nums'>
      {props.entries.map((entry, index) => (
        <span key={entry.key}>
          {index > 0 ? (
            <span className='text-muted-foreground/40 mx-1'>/</span>
          ) : null}
          <span
            className={
              props.emphasize ? 'text-foreground' : 'text-muted-foreground'
            }
          >
            {stripTrailingZeros(entry.formatted)}
          </span>
        </span>
      ))}
    </span>
  )
}

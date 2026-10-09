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
import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  formatDualPriceDiscount,
  getChannelOffer,
  type ChannelKey,
} from '../lib/dual-price'
import {
  getDynamicPricingSummary,
  isDynamicPricingModel,
} from '../lib/dynamic-price'
import { isTokenBasedModel } from '../lib/model-helpers'
import {
  formatPrice,
  formatRequestPrice,
  stripTrailingZeros,
} from '../lib/price'
import type { PricingModel, TokenUnit } from '../types'

const OFFICIAL_NOTE =
  'Official channel: the price is higher, but service is stable.'
const SPECIAL_NOTE =
  'Special channel: capacity is plentiful, but stability is not guaranteed.'

export function ChannelNote() {
  const { t } = useTranslation()
  const official = t(OFFICIAL_NOTE)
  const special = t(SPECIAL_NOTE)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              data-slot='channel-note'
              className='text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full'
              aria-label={`${official} ${special}`}
            />
          }
        >
          <CircleAlert className='size-3.5' aria-hidden='true' />
        </TooltipTrigger>
        <TooltipContent className='max-w-xs flex-col items-start gap-1 text-left'>
          <p>{official}</p>
          <p>{special}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Amount(props: { formatted: string; fold: string | null }) {
  return (
    <span>
      {stripTrailingZeros(props.formatted)}
      {props.fold ? (
        <span className='text-primary ml-1 text-[11px] font-semibold'>
          {props.fold}
        </span>
      ) : null}
    </span>
  )
}

function EmptyPrice() {
  return <span className='text-muted-foreground/30 text-xs'>—</span>
}

export function ChannelPriceCell(props: {
  model: PricingModel
  channel: ChannelKey
  field: 'price' | 'cache'
  tokenUnit: TokenUnit
  tokenUnitLabel: string
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}) {
  const { t } = useTranslation()
  const offer = getChannelOffer(props.model, props.channel)
  if (!offer) return <EmptyPrice />

  const fold =
    props.channel === 'special' ? formatDualPriceDiscount(offer.ratio) : null

  if (isDynamicPricingModel(props.model)) {
    const summary = getDynamicPricingSummary(props.model, {
      tokenUnit: props.tokenUnit,
      showRechargePrice: props.showRechargePrice,
      priceRate: props.priceRate,
      usdExchangeRate: props.usdExchangeRate,
      groupRatioMultiplier: offer.ratio,
    })
    if (!summary || summary.isSpecialExpression) {
      if (props.field === 'cache') return <EmptyPrice />
      return (
        <span className='text-muted-foreground text-xs'>
          {t('Dynamic Pricing')}
        </span>
      )
    }

    if (props.field === 'cache') {
      const entry = summary.entries.find(
        (item) => item.field === 'cacheReadPrice'
      )
      if (!entry) return <EmptyPrice />
      return (
        <div className='max-w-full min-w-0'>
          <span className='font-mono text-sm tabular-nums'>
            <Amount formatted={entry.formatted} fold={fold} />
          </span>
        </div>
      )
    }

    if (summary.primaryEntries.length === 0) return <EmptyPrice />
    return (
      <div className='max-w-full min-w-0'>
        <span className='font-mono text-sm tabular-nums'>
          {summary.primaryEntries.map((entry, index) => (
            <span key={entry.key}>
              {index > 0 ? (
                <span className='text-muted-foreground/40 mx-1'>/</span>
              ) : null}
              <Amount formatted={entry.formatted} fold={fold} />
            </span>
          ))}
        </span>
        <div className='text-muted-foreground/50 text-[10px]'>
          / {props.tokenUnitLabel} tokens
        </div>
      </div>
    )
  }

  if (props.field === 'cache') {
    if (!isTokenBasedModel(props.model) || props.model.cache_ratio == null) {
      return <EmptyPrice />
    }
    return (
      <span className='font-mono text-sm tabular-nums'>
        <Amount
          formatted={formatPrice(
            props.model,
            'cache',
            props.tokenUnit,
            props.showRechargePrice,
            props.priceRate,
            props.usdExchangeRate,
            offer.group
          )}
          fold={fold}
        />
      </span>
    )
  }

  if (!isTokenBasedModel(props.model)) {
    return (
      <span className='font-mono text-sm tabular-nums'>
        <Amount
          formatted={formatRequestPrice(
            props.model,
            props.showRechargePrice,
            props.priceRate,
            props.usdExchangeRate,
            offer.group
          )}
          fold={fold}
        />
      </span>
    )
  }

  return (
    <div className='max-w-full min-w-0'>
      <span className='font-mono text-sm tabular-nums'>
        <Amount
          formatted={formatPrice(
            props.model,
            'input',
            props.tokenUnit,
            props.showRechargePrice,
            props.priceRate,
            props.usdExchangeRate,
            offer.group
          )}
          fold={fold}
        />
        <span className='text-muted-foreground/40 mx-1'>/</span>
        <Amount
          formatted={formatPrice(
            props.model,
            'output',
            props.tokenUnit,
            props.showRechargePrice,
            props.priceRate,
            props.usdExchangeRate,
            offer.group
          )}
          fold={fold}
        />
      </span>
      <div className='text-muted-foreground/50 text-[10px]'>
        / {props.tokenUnitLabel} tokens
      </div>
    </div>
  )
}

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
import { ArrowRight, Check, Copy, Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  formatDiscountOffPercent,
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
  'Official channel, the price is higher, but service is stable.'
const SPECIAL_NOTE =
  'Special channel: the price is lower and capacity is plentiful, but stability is not guaranteed.'

type NoteChannel = 'list' | 'special' | 'both'

type TaggedAmount = {
  formatted: string
  tag: 'in' | 'out' | null
}

type ChannelQuote = {
  amounts: TaggedAmount[]
  cache: string | null
  fallback: string | null
}

type QuoteOptions = {
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}

function tagForField(field: string): 'in' | 'out' | null {
  if (field === 'inputPrice') return 'in'
  if (field === 'outputPrice') return 'out'
  return null
}

function quoteChannel(
  model: PricingModel,
  channel: ChannelKey,
  options: QuoteOptions,
  dynamicLabel: string
): ChannelQuote | null {
  const offer = getChannelOffer(model, channel)
  if (!offer) return null

  if (isDynamicPricingModel(model)) {
    const summary = getDynamicPricingSummary(model, {
      tokenUnit: options.tokenUnit,
      showRechargePrice: options.showRechargePrice,
      priceRate: options.priceRate,
      usdExchangeRate: options.usdExchangeRate,
      groupRatioMultiplier: offer.ratio,
    })
    if (!summary || summary.isSpecialExpression) {
      return { amounts: [], cache: null, fallback: dynamicLabel }
    }
    const cache = summary.entries.find(
      (entry) => entry.field === 'cacheReadPrice'
    )
    return {
      amounts: summary.primaryEntries.map((entry) => ({
        formatted: entry.formatted,
        tag: tagForField(entry.field),
      })),
      cache: cache ? stripTrailingZeros(cache.formatted) : null,
      fallback: null,
    }
  }

  if (!isTokenBasedModel(model)) {
    return {
      amounts: [
        {
          formatted: formatRequestPrice(
            model,
            options.showRechargePrice,
            options.priceRate,
            options.usdExchangeRate,
            offer.group
          ),
          tag: null,
        },
      ],
      cache: null,
      fallback: null,
    }
  }

  const cache =
    model.cache_ratio == null
      ? null
      : stripTrailingZeros(
          formatPrice(
            model,
            'cache',
            options.tokenUnit,
            options.showRechargePrice,
            options.priceRate,
            options.usdExchangeRate,
            offer.group
          )
        )

  return {
    amounts: [
      {
        formatted: formatPrice(
          model,
          'input',
          options.tokenUnit,
          options.showRechargePrice,
          options.priceRate,
          options.usdExchangeRate,
          offer.group
        ),
        tag: 'in',
      },
      {
        formatted: formatPrice(
          model,
          'output',
          options.tokenUnit,
          options.showRechargePrice,
          options.priceRate,
          options.usdExchangeRate,
          offer.group
        ),
        tag: 'out',
      },
    ],
    cache,
    fallback: null,
  }
}

function EmptyPrice(props: { centered?: boolean }) {
  return (
    <span
      className={
        props.centered
          ? 'block text-center text-[#4a4455]'
          : 'text-[#4a4455]'
      }
    >
      —
    </span>
  )
}

function AmountLine(props: { amounts: TaggedAmount[] }) {
  return (
    <span className='font-mono font-medium text-[#dee0ff]'>
      {props.amounts.map((amount, index) => (
        <span key={`${amount.tag ?? 'amount'}-${amount.formatted}`}>
          {index > 0 ? (
            <span className='text-[#958da1]'> / </span>
          ) : null}
          {stripTrailingZeros(amount.formatted)}
          {amount.tag ? (
            <span className='ml-1 text-[11px]! font-normal text-[#958da1]'>
              {amount.tag}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  )
}

export function ModelIdCell(props: { name: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  return (
    <div className='flex items-center gap-2'>
      <span className='font-mono font-semibold text-[#dee0ff]'>{props.name}</span>
      <button
        type='button'
        className='rounded p-1 text-[#958da1] transition-colors hover:bg-[#191d3b] hover:text-[#dee0ff]'
        aria-label={t('Copy model name')}
        title={t('Copy model name')}
        onClick={(event) => {
          event.stopPropagation()
          const write = navigator.clipboard?.writeText(props.name)
          if (!write) return
          void write.then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          })
        }}
      >
        {copied ? (
          <Check className='size-3.5 text-[#a2e7ff]' aria-hidden='true' />
        ) : (
          <Copy className='size-3.5' aria-hidden='true' />
        )}
      </button>
    </div>
  )
}

export function ChannelColumnTitle(props: {
  title: string
  unit?: string
  align?: 'start' | 'end' | 'center'
  note?: 'list' | 'special'
}) {
  let alignClass = 'inline-flex items-center gap-1.5'
  if (props.align === 'end') {
    alignClass = 'inline-flex w-full items-center justify-end gap-1.5'
  }
  if (props.align === 'center') {
    alignClass = 'inline-flex w-full items-center justify-center gap-1.5'
  }

  return (
    <span className={alignClass}>
      <span>{props.title}</span>
      {props.unit ? (
        <span className='font-mono text-[11px]! font-normal text-[#4a4455]'>
          ({props.unit})
        </span>
      ) : null}
      {props.note ? <ChannelNote channel={props.note} /> : null}
    </span>
  )
}

export function ChannelNote(props: { channel?: NoteChannel }) {
  const { t } = useTranslation()
  const channel = props.channel ?? 'both'
  const official = t(OFFICIAL_NOTE)
  const special = t(SPECIAL_NOTE)
  let label = `${official} ${special}`
  if (channel === 'list') label = official
  if (channel === 'special') label = special

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              data-slot='channel-note'
              className='inline-flex size-4 shrink-0 items-center justify-center text-[#958da1] hover:text-[#dee0ff]'
              aria-label={label}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <Info className='size-3.5' aria-hidden='true' />
        </TooltipTrigger>
        <TooltipContent className='pricing-cjk max-w-56 flex-col items-start gap-1 text-left'>
          {channel !== 'special' ? (
            <p>
              <span className='font-semibold text-[#a2e7ff]'>
                {t('Official channel')}
              </span>
              <span className='mt-0.5 block font-normal text-[#ccc3d7]'>
                {official}
              </span>
            </p>
          ) : null}
          {channel !== 'list' ? (
            <p>
              <span className='font-semibold text-[#cebdff]'>
                {t('Special channel')}
              </span>
              <span className='mt-0.5 block font-normal text-[#ccc3d7]'>
                {special}
              </span>
            </p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ChannelPriceCell(props: {
  model: PricingModel
  channel: ChannelKey
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}) {
  const { t } = useTranslation()
  const quote = quoteChannel(
    props.model,
    props.channel,
    props,
    t('Dynamic Pricing')
  )
  if (!quote) return <EmptyPrice centered />
  if (quote.fallback) {
    return <span className='text-xs text-[#958da1]'>{quote.fallback}</span>
  }
  if (quote.amounts.length === 0) return <EmptyPrice centered />

  return (
    <div className='flex flex-col items-end'>
      <AmountLine amounts={quote.amounts} />
    </div>
  )
}

export function ChannelDiscountBadge(props: { model: PricingModel }) {
  const list = getChannelOffer(props.model, 'list')
  const special = getChannelOffer(props.model, 'special')
  const discount =
    list && special ? formatDiscountOffPercent(special.ratio) : null
  if (!discount) return <EmptyPrice />

  return (
    <span className='inline-flex items-center rounded bg-[#232846] px-2 py-0.5 font-mono text-[12px]! font-semibold text-[#a2e7ff]'>
      {discount}
    </span>
  )
}

export function CacheCompareCell(props: {
  model: PricingModel
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}) {
  const { t } = useTranslation()
  const list = quoteChannel(props.model, 'list', props, t('Dynamic Pricing'))
  const special = quoteChannel(
    props.model,
    'special',
    props,
    t('Dynamic Pricing')
  )
  const official = list?.cache ?? null
  const discounted = special?.cache ?? null
  if (!official && !discounted) return <EmptyPrice />
  if (official && discounted && official !== discounted) {
    return (
      <div className='flex items-center justify-end gap-1.5 font-mono text-[#dee0ff]'>
        <span className='text-[13px]! text-[#ccc3d7]'>{official}</span>
        <ArrowRight className='size-3 text-[#958da1]' aria-hidden='true' />
        <span className='text-[13px]! font-medium'>{discounted}</span>
      </div>
    )
  }

  return (
    <span className='font-mono text-[#dee0ff]'>
      {discounted ?? official}
    </span>
  )
}

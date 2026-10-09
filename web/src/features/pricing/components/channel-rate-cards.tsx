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
import { ArrowLeftRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
import type { PriceType, PricingModel, TokenUnit } from '../types'
import { ChannelNote } from './channel-price-cell'

const CACHE_FIELDS = new Set([
  'cacheReadPrice',
  'cacheCreatePrice',
  'cacheCreate1hPrice',
])

type RateLine = {
  key: string
  label: string
  formatted: string
  cache: boolean
}

type ChannelRates = {
  input: string | null
  output: string | null
  extra: RateLine[]
  fallback: string | null
}

type RateOptions = {
  tokenUnit: TokenUnit
  tokenUnitLabel: string
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}

function formatTokenPrice(
  model: PricingModel,
  type: PriceType,
  group: string,
  options: RateOptions
): string {
  return stripTrailingZeros(
    formatPrice(
      model,
      type,
      options.tokenUnit,
      options.showRechargePrice,
      options.priceRate,
      options.usdExchangeRate,
      group
    )
  )
}

function ratesForChannel(
  model: PricingModel,
  channel: ChannelKey,
  options: RateOptions,
  dynamicLabel: string,
  labelFor: (key: string) => string
): ChannelRates | null {
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
      return { input: null, output: null, extra: [], fallback: dynamicLabel }
    }
    const input = summary.primaryEntries.find(
      (entry) => entry.field === 'inputPrice'
    )
    const output = summary.primaryEntries.find(
      (entry) => entry.field === 'outputPrice'
    )
    return {
      input: input ? stripTrailingZeros(input.formatted) : null,
      output: output ? stripTrailingZeros(output.formatted) : null,
      extra: summary.secondaryEntries.map((entry) => ({
        key: entry.key,
        label: labelFor(entry.shortLabel),
        formatted: stripTrailingZeros(entry.formatted),
        cache: CACHE_FIELDS.has(entry.field),
      })),
      fallback: null,
    }
  }

  if (!isTokenBasedModel(model)) {
    return {
      input: stripTrailingZeros(
        formatRequestPrice(
          model,
          options.showRechargePrice,
          options.priceRate,
          options.usdExchangeRate,
          offer.group
        )
      ),
      output: null,
      extra: [],
      fallback: null,
    }
  }

  const extra: RateLine[] = []
  if (model.cache_ratio != null) {
    extra.push({
      key: 'cache',
      label: labelFor('Cache Read'),
      formatted: formatTokenPrice(model, 'cache', offer.group, options),
      cache: true,
    })
  }
  if (model.create_cache_ratio != null) {
    extra.push({
      key: 'create-cache',
      label: labelFor('Cache Write'),
      formatted: formatTokenPrice(model, 'create_cache', offer.group, options),
      cache: true,
    })
  }

  return {
    input: formatTokenPrice(model, 'input', offer.group, options),
    output: formatTokenPrice(model, 'output', offer.group, options),
    extra,
    fallback: null,
  }
}

function PriceBox(props: {
  label: string
  amount: string | null
  unit: string
  fold: string | null
  emphasize: boolean
}) {
  return (
    <div className='flex flex-col rounded-lg bg-[#191d3b] p-3.5'>
      <div className='mb-1 flex items-center justify-between gap-2'>
        <span className='font-mono text-[12px] font-semibold tracking-wider text-[#958da1] uppercase'>
          {props.label}
        </span>
        {props.fold ? (
          <span className='rounded bg-[#6144af]/30 px-1.5 font-mono text-[11px] font-bold text-[#cebdff]'>
            {props.fold}
          </span>
        ) : null}
      </div>
      <div className='flex items-baseline gap-1'>
        <span
          className={
            props.emphasize
              ? 'font-mono text-2xl font-bold text-[#a2e7ff]'
              : 'font-mono text-2xl font-bold text-[#dee0ff]'
          }
        >
          {props.amount ?? '—'}
        </span>
        {props.amount ? (
          <span className='font-mono text-sm text-[#958da1]'>/ {props.unit}</span>
        ) : null}
      </div>
    </div>
  )
}

function ChannelCard(props: {
  model: PricingModel
  channel: ChannelKey
  options: RateOptions
}) {
  const { t } = useTranslation()
  const offer = getChannelOffer(props.model, props.channel)
  const discount = offer ? formatDiscountOffPercent(offer.ratio) : null
  const rates = ratesForChannel(
    props.model,
    props.channel,
    props.options,
    t('Dynamic Pricing'),
    (key) => t(key)
  )
  const special = props.channel === 'special'
  const title = special ? t('Special channel') : t('Official channel')
  const caption = special
    ? t('Special concurrent route')
    : t('Standard official connection')
  const priceDiscount = special ? discount : null

  return (
    <div className='flex flex-col rounded-xl bg-[#141936] p-5 transition-colors hover:bg-[#232846]'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <span
              className={
                special
                  ? 'text-2xl font-semibold text-[#a2e7ff]'
                  : 'text-2xl font-semibold text-[#dee0ff]'
              }
            >
              {title}
            </span>
            <ChannelNote channel={props.channel} />
          </div>
          <span className='font-mono text-sm text-[#ccc3d7]'>{caption}</span>
        </div>
        {!special && offer ? (
          <span className='rounded-md bg-[#2e3351] px-2.5 py-1 font-mono text-[12px] font-semibold tracking-wider text-[#a2e7ff] uppercase'>
            {t('Stable baseline')}
          </span>
        ) : null}
      </div>

      {rates?.fallback ? (
        <p className='font-mono text-sm text-[#958da1]'>{rates.fallback}</p>
      ) : (
        <div className='mb-4 grid grid-cols-2 gap-3'>
          <PriceBox
            label='INPUT'
            amount={rates?.input ?? null}
            unit={props.options.tokenUnitLabel}
            fold={rates?.input ? priceDiscount : null}
            emphasize={special}
          />
          <PriceBox
            label='OUTPUT'
            amount={rates?.output ?? null}
            unit={props.options.tokenUnitLabel}
            fold={rates?.output ? priceDiscount : null}
            emphasize={special}
          />
        </div>
      )}

      {rates && rates.extra.length > 0 ? (
        <div className='flex flex-col gap-2 rounded-lg bg-[#191d3b] p-3.5'>
          <span className='font-mono text-[12px] font-semibold tracking-wider text-[#958da1] uppercase'>
            {rates.extra.some((line) => line.cache)
              ? t('Prompt caching')
              : t('More prices')}
          </span>
          {rates.extra.map((line) => (
            <div
              key={line.key}
              className='flex items-center justify-between gap-3 font-mono text-sm'
            >
              <span className='text-[#ccc3d7]'>{line.label}</span>
              <span
                className={
                  special ? 'font-medium text-[#a2e7ff]' : 'font-medium text-[#dee0ff]'
                }
              >
                {line.formatted}
                <span className='ml-1 text-[#958da1]'>/ {props.options.tokenUnitLabel}</span>
                {priceDiscount ? (
                  <span className='ml-1 text-[11px] text-[#958da1]'>
                    {priceDiscount}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ChannelRateCards(props: {
  model: PricingModel
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}) {
  const { t } = useTranslation()
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'
  const options: RateOptions = {
    tokenUnit: props.tokenUnit,
    tokenUnitLabel,
    priceRate: props.priceRate,
    usdExchangeRate: props.usdExchangeRate,
    showRechargePrice: props.showRechargePrice,
  }
  const showCaching = Boolean(
    props.model.cache_ratio != null ||
      props.model.create_cache_ratio != null ||
      (props.model.billing_expr || '').includes('cr *')
  )

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <ArrowLeftRight className='size-5 text-[#a2e7ff]' aria-hidden='true' />
          <h2 className='text-2xl font-semibold text-[#dee0ff]'>
            {t('Dual-channel rates')}
          </h2>
          <span className='font-mono text-sm text-[#4a4455]'>
            {t('Settled per {{unit}} tokens', { unit: tokenUnitLabel })}
          </span>
        </div>
        {showCaching ? (
          <span className='font-mono text-sm text-[#ccc3d7]'>
            {t('Supports prompt caching')}
          </span>
        ) : null}
      </div>
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
        <ChannelCard model={props.model} channel='list' options={options} />
        <ChannelCard model={props.model} channel='special' options={options} />
      </div>
    </section>
  )
}

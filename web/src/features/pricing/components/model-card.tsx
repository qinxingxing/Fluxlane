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
import { ChevronRight, Copy } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getLobeIcon } from '@/lib/lobe-icon'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPricingSummary,
} from '../lib/dynamic-price'
import { pricingLayout } from '../lib/layout'
import { isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import type { PricingModel, TokenUnit } from '../types'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelPerfBadge, type ModelPerfBadgeData } from './model-perf-badge'

export interface ModelCardProps {
  model: PricingModel
  onClick: () => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
  perf?: ModelPerfBadgeData
}

export const ModelCard = memo(function ModelCard(props: ModelCardProps) {
  const { t } = useTranslation()
  const { copyToClipboard } = useCopyToClipboard()
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const showRechargePrice = props.showRechargePrice ?? false
  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitLabel = tokenUnit === 'K' ? '1K' : '1M'
  const groups = props.model.enable_groups || []
  const endpoints = props.model.supported_endpoint_types || []
  const modelIconKey = props.model.icon || props.model.vendor_icon
  const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 28) : null
  const initial = props.model.model_name?.charAt(0).toUpperCase() || '?'
  const isDynamicPricing =
    props.model.billing_mode === 'tiered_expr' &&
    Boolean(props.model.billing_expr)
  const hasCachedPrice = isTokenBased && props.model.cache_ratio != null
  const dynamicSummary = isDynamicPricing
    ? getDynamicPricingSummary(props.model, {
        tokenUnit,
        showRechargePrice,
        priceRate,
        usdExchangeRate,
        groupRatioMultiplier: getDynamicDisplayGroupRatio(
          props.model,
          props.selectedGroup
        ),
      })
    : null

  const primaryGroup = groups[0]
  const primaryEndpoint = endpoints[0]
  let fallbackStatus: ReactNode = tokenUnitLabel
  if (primaryEndpoint) {
    fallbackStatus = (
      <span className='flex items-center justify-end gap-1'>
        <span className='truncate'>{primaryEndpoint}</span>
        <span className='opacity-50'>{tokenUnitLabel}</span>
      </span>
    )
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(props.model.model_name || '')
  }

  const handleDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    props.onClick()
  }

  let priceSummary: ReactNode
  if (dynamicSummary) {
    if (dynamicSummary.isSpecialExpression) {
      priceSummary = (
        <span className='min-w-0'>
          <span className='text-warning'>
            {t('Special billing expression')}
          </span>
          <code className='text-muted-foreground/70 mt-0.5 line-clamp-1 block font-mono text-[11px] break-all'>
            {dynamicSummary.rawExpression}
          </code>
        </span>
      )
    } else if (dynamicSummary.primaryEntries.length > 0) {
      priceSummary = (
        <>
          {dynamicSummary.primaryEntries.map((entry) => (
            <span
              key={entry.key}
              className='text-muted-foreground whitespace-nowrap'
            >
              {t(entry.shortLabel)}{' '}
              <strong className='text-foreground font-mono font-semibold'>
                {entry.formatted}
              </strong>
            </span>
          ))}
        </>
      )
    } else {
      priceSummary = (
        <span className='text-muted-foreground text-sm'>
          {t('Dynamic Pricing')}
        </span>
      )
    }
  } else if (isTokenBased) {
    priceSummary = (
      <>
        <span className='text-muted-foreground whitespace-nowrap'>
          {t('Input')}{' '}
          <strong className='text-foreground font-mono font-semibold'>
            {formatPrice(
              props.model,
              'input',
              tokenUnit,
              showRechargePrice,
              priceRate,
              usdExchangeRate,
              props.selectedGroup
            )}
          </strong>
        </span>
        <span className='text-muted-foreground whitespace-nowrap'>
          {t('Output')}{' '}
          <strong className='text-foreground font-mono font-semibold'>
            {formatPrice(
              props.model,
              'output',
              tokenUnit,
              showRechargePrice,
              priceRate,
              usdExchangeRate,
              props.selectedGroup
            )}
          </strong>
        </span>
        {hasCachedPrice && (
          <span className='text-muted-foreground whitespace-nowrap'>
            {t('Cached')}{' '}
            <strong className='text-foreground font-mono font-semibold'>
              {formatPrice(
                props.model,
                'cache',
                tokenUnit,
                showRechargePrice,
                priceRate,
                usdExchangeRate,
                props.selectedGroup
              )}
            </strong>
          </span>
        )}
      </>
    )
  } else {
    priceSummary = (
      <span className='text-muted-foreground whitespace-nowrap'>
        <strong className='text-foreground font-mono font-semibold'>
          {formatRequestPrice(
            props.model,
            showRechargePrice,
            priceRate,
            usdExchangeRate,
            props.selectedGroup
          )}
        </strong>{' '}
        / {t('request')}
      </span>
    )
  }

  return (
    <article data-slot='model-card' className={pricingLayout.card}>
      <div
        aria-hidden
        className='via-primary absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100'
      />

      <div className='mb-6 flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-start gap-4'>
          <div className='bg-muted/40 border-border/60 flex size-12 shrink-0 items-center justify-center rounded-xl border'>
            {modelIcon || (
              <span className='text-muted-foreground text-lg font-bold'>
                {initial}
              </span>
            )}
          </div>
          <div className='min-w-0'>
            <h3 className='text-foreground mb-1 truncate text-xl leading-tight font-semibold'>
              {props.model.model_name}
            </h3>
            <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-sm'>
              {priceSummary}
            </div>
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleDetails}
            className='h-8 gap-1 px-3 text-[11px] font-semibold tracking-wider uppercase'
          >
            {t('Details')}
            <ChevronRight className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            onClick={handleCopy}
            className='size-8'
            aria-label={t('Copy')}
            title={t('Copy')}
          >
            <Copy className='size-3.5' />
          </Button>
        </div>
      </div>

      <p className='text-muted-foreground mb-8 line-clamp-2 min-h-[2.5rem] flex-1 text-sm leading-relaxed'>
        {props.model.description || t('No description available.')}
      </p>

      <div className='border-border/60 flex items-end justify-between gap-3 border-t pt-4'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          {primaryGroup && (
            <span className='bg-muted text-muted-foreground rounded-md px-2 py-1 text-[11px] font-semibold tracking-wider uppercase'>
              {primaryGroup}
            </span>
          )}
          <ModelBillingModeBadge
            model={props.model}
            className='border-primary/20 bg-primary/10 rounded-md border px-2 py-1 text-[11px] tracking-wider uppercase'
          />
        </div>
        <ModelPerfBadge
          perf={props.perf}
          fallbackStatus={fallbackStatus}
          className='shrink-0 self-end'
        />
      </div>
    </article>
  )
})

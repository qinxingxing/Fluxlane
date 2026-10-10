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
import type { ColumnDef } from '@tanstack/react-table'
import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { consoleSiteHref } from '@/lib/domain-routing'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import type { PricingModel, TokenUnit } from '../types'
import {
  CacheCompareCell,
  ChannelColumnTitle,
  ChannelDiscountBadge,
  ChannelPriceCell,
  ModelIdCell,
} from './channel-price-cell'

export interface PricingColumnsOptions {
  tokenUnit?: TokenUnit
  priceRate?: number
  usdExchangeRate?: number
  showRechargePrice?: boolean
  selectedGroup?: string
}

export function usePricingColumns(
  options: PricingColumnsOptions = {}
): ColumnDef<PricingModel>[] {
  const { t } = useTranslation()
  const tokenUnit = options.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = options.priceRate ?? 1
  const usdExchangeRate = options.usdExchangeRate ?? 1
  const showRechargePrice = options.showRechargePrice ?? false
  const tokenUnitLabel = tokenUnit === 'K' ? '1K' : '1M'
  const priceOptions = {
    tokenUnit,
    priceRate,
    usdExchangeRate,
    showRechargePrice,
  }

  const columns: ColumnDef<PricingModel>[] = [
    {
      accessorKey: 'model_name',
      header: () => <ChannelColumnTitle title={t('model_id')} />,
      cell: ({ row }) => <ModelIdCell name={row.original.model_name} />,
      size: 280,
      minSize: 176,
      maxSize: 320,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'official_price',
      header: () => (
        <ChannelColumnTitle
          title={t('Official channel')}
          unit={tokenUnitLabel}
          align='end'
          note='list'
        />
      ),
      cell: ({ row }) => (
        <ChannelPriceCell
          model={row.original}
          channel='list'
          {...priceOptions}
        />
      ),
      size: 220,
      enableSorting: false,
    },
    {
      id: 'special_price',
      header: () => (
        <ChannelColumnTitle
          title={t('Special channel')}
          unit={tokenUnitLabel}
          align='end'
          note='special'
        />
      ),
      cell: ({ row }) => (
        <ChannelPriceCell
          model={row.original}
          channel='special'
          {...priceOptions}
        />
      ),
      size: 220,
      enableSorting: false,
    },
    {
      id: 'price_gap',
      header: () => <ChannelColumnTitle title={t('Discount')} align='center' />,
      cell: ({ row }) => (
        <div className='flex justify-center'>
          <ChannelDiscountBadge model={row.original} />
        </div>
      ),
      size: 110,
      enableSorting: false,
    },
    {
      id: 'cache_compare',
      header: () => (
        <ChannelColumnTitle title={t('Cache')} align='end' />
      ),
      cell: ({ row }) => (
        <CacheCompareCell model={row.original} {...priceOptions} />
      ),
      size: 160,
      enableSorting: false,
    },
    {
      accessorKey: 'vendor_name',
      header: () => <ChannelColumnTitle title={t('provider')} />,
      cell: ({ row }) => {
        const name = row.original.vendor_name
        if (!name) return <span className='text-[#4a4455]'>—</span>
        return (
          <span className='inline-flex items-center gap-1.5 text-[#ccc3d7]'>
            <span className='size-1.5 rounded-full bg-[#00d2fd]' />
            <span className='lowercase'>{name}</span>
          </span>
        )
      },
      size: 130,
      enableSorting: false,
    },
    {
      id: 'run',
      header: () => (
        <span className='inline-flex w-full justify-end'>
          {t('Call and debug')}
        </span>
      ),
      cell: () => (
        <div className='flex justify-end'>
          <a
            href={consoleSiteHref('/sign-up')}
            className='inline-flex items-center gap-1.5 rounded-lg bg-[#191d3b] px-3 py-1.5 font-mono text-[12px]! font-semibold tracking-wider text-[#dee0ff] shadow-sm transition-colors hover:bg-[#323756] hover:text-[#a2e7ff]'
            onClick={(event) => event.stopPropagation()}
          >
            <Play className='size-3.5 text-[#a2e7ff]' aria-hidden='true' />
            {t('Run')}
          </a>
        </div>
      ),
      size: 140,
      enableSorting: false,
    },
  ]

  return columns
}

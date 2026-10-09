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
import { Boxes } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { FILTER_ALL } from '../constants'
import type { PricingModel, PricingVendor } from '../types'
import { SearchBar } from './search-bar'

const FREQUENT_QUERIES = ['claude', 'deepseek']

export function ProviderFilterBar(props: {
  vendors: PricingVendor[]
  models: PricingModel[]
  vendorFilter: string
  onVendorChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const options = [
    {
      value: FILTER_ALL,
      label: t('All'),
      count: props.models.length,
    },
    ...props.vendors
      .map((vendor) => ({
        value: vendor.name,
        label: vendor.name,
        count: props.models.filter((model) => model.vendor_name === vendor.name)
          .length,
      }))
      .filter((vendor) => vendor.count > 0),
  ]

  return (
    <div
      data-slot='provider-filter'
      className='flex flex-col gap-2.5 rounded-xl bg-[#191d3b] p-3 shadow-sm'
    >
      <div className='flex items-center gap-2 border-b border-[#232846]/40 pb-2'>
        <Boxes className='size-4 text-[#a2e7ff]' aria-hidden='true' />
        <span className='font-mono text-[12px] font-semibold tracking-wider text-[#958da1] uppercase'>
          PROVIDER {t('Provider filter')}
        </span>
        <span className='hidden font-mono text-[11px] text-[#4a4455] sm:inline'>
          {t('Filter across channels and major model providers.')}
        </span>
      </div>
      <div className='flex flex-wrap items-center gap-1.5'>
        {options.map((option) => {
          const active = props.vendorFilter === option.value
          return (
            <button
              key={option.value}
              type='button'
              aria-pressed={active}
              onClick={() => props.onVendorChange(option.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-sm transition-colors',
                active
                  ? 'bg-[#232846] text-[#a2e7ff]'
                  : 'bg-[#070b28] text-[#ccc3d7] hover:bg-[#232846] hover:text-[#dee0ff]'
              )}
            >
              {option.value === FILTER_ALL ? <span>ALL</span> : null}
              <span className={option.value === FILTER_ALL ? '' : 'lowercase'}>
                {option.label}
              </span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-[11px]',
                  active
                    ? 'bg-[#070b28] text-[#a2e7ff]'
                    : 'bg-[#191d3b] text-[#958da1]'
                )}
              >
                {option.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MarketplaceCommandBar(props: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col items-stretch gap-3 rounded-xl border border-[#232846]/60 bg-[#191d3b]/60 p-1.5 shadow-sm sm:flex-row sm:items-center'>
      <SearchBar
        value={props.value}
        onChange={props.onChange}
        onClear={props.onClear}
        placeholder={t('Search model ID, provider, or alias')}
        className='min-w-0 flex-1'
      />
      <div className='hidden items-center gap-1.5 px-2 font-mono text-[12px] text-[#958da1] sm:flex'>
        <span className='text-[11px] tracking-wider text-[#4a4455] uppercase'>
          {t('Frequent')}:
        </span>
        {FREQUENT_QUERIES.map((query) => (
          <button
            key={query}
            type='button'
            onClick={() => props.onChange(query)}
            className='rounded px-2 py-0.5 text-[#958da1] transition-colors hover:bg-[#232846] hover:text-[#a2e7ff]'
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  )
}

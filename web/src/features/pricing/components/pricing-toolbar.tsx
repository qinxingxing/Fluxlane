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
import { ArrowUpDown, Check, Grid2X2, Table2 } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import {
  VIEW_MODES,
  getSortLabels,
  type SortOption,
  type ViewMode,
} from '../constants'
import { pricingLayout } from '../lib/layout'
import type { TokenUnit } from '../types'

type SegmentOption = {
  value: string
  label?: string
  icon?: React.ComponentType<{ className?: string }>
  tooltip?: string
}

export interface PricingToolbarProps {
  filteredCount: number
  totalCount?: number
  sortBy: string
  onSortChange: (value: string) => void
  tokenUnit: TokenUnit
  onTokenUnitChange: (value: TokenUnit) => void
  showRechargePrice: boolean
  onRechargePriceChange: (value: boolean) => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
}

function SegmentedControl(props: {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}) {
  return (
    <div
      role='group'
      aria-label={props.ariaLabel}
      className='inline-flex h-8 items-center rounded-lg bg-[#070b28] p-0.5'
    >
      {props.options.map((option) => {
        const Icon = option.icon
        const isActive = option.value === props.value
        const button = (
          <button
            key={option.value}
            type='button'
            onClick={() => props.onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex h-full items-center justify-center rounded-md text-xs font-medium transition-all',
              Icon && !option.label ? 'w-7' : 'gap-1.5 px-3',
              isActive
                ? 'bg-[#232846] text-[#a2e7ff]'
                : 'text-[#958da1] hover:text-[#dee0ff]'
            )}
          >
            {Icon && <Icon className='size-3.5' />}
            {option.label}
          </button>
        )

        if (!option.tooltip) {
          return button
        }

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger render={button} />
            <TooltipContent side='bottom' className='text-xs'>
              {option.tooltip}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function PricingToolbar(props: PricingToolbarProps) {
  const { t } = useTranslation()
  const sortLabels = getSortLabels(t)
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'

  const handleTokenUnitChange = useCallback(
    (value: string) => props.onTokenUnitChange(value as TokenUnit),
    [props]
  )

  const handleViewModeChange = useCallback(
    (value: string) => props.onViewModeChange(value as ViewMode),
    [props]
  )

  const handleRechargePriceChange = useCallback(
    (value: string) => props.onRechargePriceChange(value === 'recharge'),
    [props]
  )

  return (
    <div className={pricingLayout.toolbar}>
      <div className='flex items-center gap-4'>
        <span>
          {t('CURRENCY')}:{' '}
          <span className='text-[#dee0ff]'>
            {t('USD / {{unit}} tokens', { unit: tokenUnitLabel })}
          </span>
        </span>
        <span className='text-[#dee0ff] tabular-nums'>
          {props.filteredCount.toLocaleString()}
        </span>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <SegmentedControl
          options={[
            { value: 'standard', label: t('Standard') },
            { value: 'recharge', label: t('Recharge') },
          ]}
          value={props.showRechargePrice ? 'recharge' : 'standard'}
          onChange={handleRechargePriceChange}
          ariaLabel={t('Price display mode')}
        />
        <SegmentedControl
          options={[
            { value: 'M', label: '/1M' },
            { value: 'K', label: '/1K' },
          ]}
          value={props.tokenUnit}
          onChange={handleTokenUnitChange}
          ariaLabel={t('Token unit')}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 gap-1.5 border-[#4a4455]/40 bg-[#070b28] px-3 text-xs text-[#ccc3d7]'
              />
            }
          >
            <ArrowUpDown className='size-3.5' />
            <span>{sortLabels[props.sortBy as SortOption] || t('Sort')}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            {Object.entries(sortLabels).map(([value, label]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => props.onSortChange(value)}
                className='gap-2'
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    props.sortBy === value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <SegmentedControl
          options={[
            {
              value: VIEW_MODES.CARD,
              icon: Grid2X2,
              tooltip: t('Card view'),
            },
            {
              value: VIEW_MODES.TABLE,
              icon: Table2,
              tooltip: t('Table view'),
            },
          ]}
          value={props.viewMode}
          onChange={handleViewModeChange}
          ariaLabel={t('View mode')}
        />
      </div>
    </div>
  )
}

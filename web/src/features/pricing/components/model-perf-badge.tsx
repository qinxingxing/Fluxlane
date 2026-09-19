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
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { getSuccessRateDotClass } from '@/features/performance-metrics/lib/format'
import { cn } from '@/lib/utils'

export type ModelPerfBadgeData = {
  avg_latency_ms: number
  success_rate: number
  avg_tps: number
  recent_success_rates?: number[]
}

export interface ModelPerfBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  perf: ModelPerfBadgeData | undefined
  fallbackStatus?: ReactNode
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return value > 1 ? String(Math.round(value)) : value.toFixed(1)
}

function formatCompactLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  if (ms >= 1_000) return `${formatCompactNumber(ms / 1_000)}s`
  return `${formatCompactNumber(ms)}ms`
}

function formatCompactThroughput(tps: number): string {
  if (!Number.isFinite(tps) || tps <= 0) return '—'
  if (tps >= 1_000) return `${formatCompactNumber(tps / 1_000)}Kt`
  return `${formatCompactNumber(tps)}t`
}

export const ModelPerfBadge = memo(function ModelPerfBadge(
  props: ModelPerfBadgeProps
) {
  const { t } = useTranslation()
  const perf = props.perf
  const avgLatencyMs = perf?.avg_latency_ms ?? 0
  const avgTps = perf?.avg_tps ?? 0
  const successRate = perf?.success_rate

  const recentRates =
    perf?.recent_success_rates?.filter((rate) => Number.isFinite(rate)) ?? []
  let statusRates: number[] = []
  if (recentRates.length > 0) {
    statusRates = recentRates.slice(-3)
  } else if (successRate != null) {
    statusRates = [successRate]
  }
  const statusBars = [
    ...Array(Math.max(0, 3 - statusRates.length)).fill(null),
    ...statusRates,
  ].slice(-3)

  let statusTitle = t('Status short')
  if (successRate != null) {
    statusTitle = `${t('Success rate')}: ${successRate.toFixed(1)}%`
  }

  return (
    <div
      data-slot='model-perf-badge'
      className={cn(
        'grid w-[132px] grid-cols-[38px_48px_30px] gap-x-2 text-right tabular-nums',
        props.className
      )}
    >
      <div title={t('Average latency')} className='min-w-0'>
        <div className='text-muted-foreground/55 text-[10px] leading-4'>
          {t('Latency short')}
        </div>
        <div className='font-mono text-xs leading-4 whitespace-nowrap'>
          {formatCompactLatency(avgLatencyMs)}
        </div>
      </div>
      <div title={t('Throughput')} className='min-w-0'>
        <div className='text-muted-foreground/55 truncate text-[10px] leading-4'>
          {t('Throughput short')}
        </div>
        <div className='font-mono text-xs leading-4 whitespace-nowrap'>
          {formatCompactThroughput(avgTps)}
        </div>
      </div>
      <div title={statusTitle} className='min-w-0'>
        <div className='text-muted-foreground/55 truncate text-[10px] leading-4'>
          {t('Status short')}
        </div>
        {perf ? (
          <div className='flex h-4 items-center justify-end gap-0.5'>
            {(['recent', 'prior', 'latest'] as const).map((slot, index) => {
              const rate = statusBars[index]
              return (
                <span
                  key={`${slot}-${rate ?? 'empty'}`}
                  className={cn(
                    'w-1.5 rounded-full',
                    slot === 'recent' && 'h-2',
                    slot === 'prior' && 'h-2.5',
                    slot === 'latest' && 'h-3',
                    rate == null
                      ? 'bg-muted-foreground/15'
                      : getSuccessRateDotClass(rate)
                  )}
                />
              )
            })}
          </div>
        ) : (
          <div className='text-muted-foreground/80 flex h-4 items-center justify-end font-mono text-xs leading-4'>
            {props.fallbackStatus ?? '—'}
          </div>
        )}
      </div>
    </div>
  )
})

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
import { Skeleton } from '@/components/ui/skeleton'

import { VIEW_MODES, type ViewMode } from '../constants'
import { pricingLayout } from '../lib/layout'

export interface LoadingSkeletonProps {
  viewMode?: ViewMode
}

export function LoadingSkeleton(props: LoadingSkeletonProps) {
  const viewMode = props.viewMode ?? VIEW_MODES.TABLE

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <FilterBarSkeleton />
      {viewMode === VIEW_MODES.TABLE ? (
        <TableContentSkeleton />
      ) : (
        <CardContentSkeleton />
      )}
    </div>
  )
}

export function SidebarSkeleton() {
  return (
    <aside
      data-slot='pricing-sidebar-skeleton'
      className={`${pricingLayout.sidebar} ${pricingLayout.sidebarSticky}`}
    >
      <div className='mb-4 flex items-center justify-between'>
        <Skeleton className='h-4 w-16' />
        <Skeleton className='h-7 w-16' />
      </div>
      <div className='flex flex-col gap-6'>
        {['groups', 'providers', 'tags', 'pricing', 'endpoints'].map(
          (section) => (
            <div key={section} className='flex flex-col gap-3'>
              <Skeleton className='h-3 w-24' />
              <div className='flex flex-wrap gap-2'>
                {[72, 88, 64].map((width) => (
                  <Skeleton
                    key={`${section}-${width}`}
                    className='h-8 rounded-full'
                    style={{ width: `${width}px` }}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  )
}

function CardContentSkeleton() {
  return (
    <div className={pricingLayout.cardGrid}>
      {['card-a', 'card-b', 'card-c', 'card-d'].map((cardId) => (
        <div key={cardId} className='rounded-2xl border p-6'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex min-w-0 items-start gap-4'>
              <Skeleton className='size-12 shrink-0 rounded-xl' />
              <div className='flex min-w-0 flex-1 flex-col gap-2'>
                <Skeleton className='h-5 w-36' />
                <Skeleton className='h-3.5 w-48' />
              </div>
            </div>
            <Skeleton className='h-8 w-16 rounded-md' />
          </div>
          <div className='mt-8 flex flex-col gap-2'>
            <Skeleton className='h-3.5 w-full' />
            <Skeleton className='h-3.5 w-4/5' />
          </div>
          <div className='mt-8 flex items-center justify-between border-t pt-4'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-6 w-16 rounded-md' />
              <Skeleton className='h-6 w-20 rounded-md' />
            </div>
            <Skeleton className='h-8 w-32' />
          </div>
        </div>
      ))}
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className={pricingLayout.toolbar}>
      <Skeleton className='h-5 w-20' />
      <div className='flex flex-wrap items-center gap-2'>
        <Skeleton className='h-8 w-28 rounded-lg' />
        <Skeleton className='h-8 w-20 rounded-lg' />
        <Skeleton className='h-8 w-24' />
        <Skeleton className='h-8 w-16 rounded-lg' />
      </div>
    </div>
  )
}

function TableContentSkeleton() {
  const columns = [
    { id: 'name', width: 200 },
    { id: 'input', width: 100 },
    { id: 'output', width: 100 },
    { id: 'cache', width: 100 },
    { id: 'group', width: 80 },
    { id: 'type', width: 100 },
  ]
  const rows = [
    'row-1',
    'row-2',
    'row-3',
    'row-4',
    'row-5',
    'row-6',
    'row-7',
    'row-8',
    'row-9',
    'row-10',
  ]

  return (
    <div className='flex flex-col gap-4'>
      <div className='overflow-hidden rounded-lg border'>
        <div className='bg-muted/30 border-b px-4 py-3'>
          <div className='flex items-center gap-4'>
            {columns.map((col) => (
              <Skeleton
                key={col.id}
                className='h-4'
                style={{ width: `${col.width}px` }}
              />
            ))}
          </div>
        </div>
        {rows.map((rowId) => (
          <div
            key={rowId}
            className='flex items-center gap-4 border-b px-4 py-3 last:border-b-0'
          >
            {columns.map((col) => (
              <Skeleton
                key={`${rowId}-${col.id}`}
                className='h-5'
                style={{ width: `${col.width}px` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-5 w-32' />
        <div className='flex items-center gap-2'>
          {['prev', 'one', 'two', 'next'].map((control) => (
            <Skeleton key={control} className='size-8' />
          ))}
        </div>
      </div>
    </div>
  )
}

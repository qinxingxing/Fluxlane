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

import { SearchBar } from './search-bar'

const COUNT_MARKER = '%%COUNT%%'

export interface PricingHeroProps {
  modelCount: number
  searchInput: string
  onSearchChange: (value: string) => void
  onSearchClear: () => void
}

function ModelCountLine(props: { count: number }) {
  const { t } = useTranslation()
  const template = t('This site currently has {{count}} models enabled', {
    count: COUNT_MARKER,
  })
  const markerIndex = template.indexOf(COUNT_MARKER)

  if (markerIndex === -1) {
    return (
      <>
        {t('This site currently has {{count}} models enabled', {
          count: props.count,
        })}
      </>
    )
  }

  return (
    <>
      {template.slice(0, markerIndex)}
      <span
        data-slot='model-count'
        className='text-primary font-semibold tabular-nums'
      >
        {props.count}
      </span>
      {template.slice(markerIndex + COUNT_MARKER.length)}
    </>
  )
}

export function PricingHero(props: PricingHeroProps) {
  const { t } = useTranslation()

  return (
    <header
      data-slot='pricing-hero'
      className='relative mx-auto mb-8 max-w-3xl pt-5 text-center sm:mb-10 sm:pt-10'
    >
      <div
        aria-hidden
        className='bg-primary/20 pointer-events-none absolute top-1/2 left-1/2 -z-10 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]'
      />
      <h1 className='text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.1] font-bold tracking-tight'>
        {t('Model Square')}
      </h1>
      <p className='text-muted-foreground mt-3 text-sm sm:mt-4 sm:text-base'>
        <ModelCountLine count={props.modelCount} />
      </p>
      <p className='text-muted-foreground/70 mx-auto mt-2 max-w-2xl text-xs leading-relaxed sm:text-sm'>
        {t(
          'Explore curated AI models, compare prices and capabilities, and pick the right model for each scenario.'
        )}
      </p>
      <SearchBar
        value={props.searchInput}
        onChange={props.onSearchChange}
        onClear={props.onSearchClear}
        placeholder={t('Search model names, providers, endpoints, or tags...')}
        className='mx-auto mt-4 max-w-2xl sm:mt-6'
      />
    </header>
  )
}

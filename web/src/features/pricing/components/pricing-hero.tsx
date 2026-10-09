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

const COUNT_MARKER = '%%COUNT%%'

export interface PricingHeroProps {
  modelCount: number
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
    <header data-slot='pricing-hero' className='flex flex-col gap-2'>
      <h1 className='text-2xl font-semibold tracking-tight text-[#dee0ff] md:text-[32px] md:leading-[1.2]'>
        {t('Model prices')}
      </h1>
      <p className='text-sm text-[#958da1]'>
        <ModelCountLine count={props.modelCount} />
      </p>
    </header>
  )
}

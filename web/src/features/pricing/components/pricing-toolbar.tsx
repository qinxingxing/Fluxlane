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

import { pricingLayout } from '../lib/layout'
import type { TokenUnit } from '../types'

export interface PricingToolbarProps {
  filteredCount: number
  tokenUnit: TokenUnit
}

export function PricingToolbar(props: PricingToolbarProps) {
  const { t } = useTranslation()
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'

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
    </div>
  )
}

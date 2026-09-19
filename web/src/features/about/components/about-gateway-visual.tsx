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
import { Network } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { aboutPageLayout } from '../lib/layout'

export function AboutGatewayVisual() {
  const { t } = useTranslation()

  return (
    <div data-about-visual className={aboutPageLayout.visual}>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-[#0c112e]/50 to-violet-500/10 transition-colors group-hover:from-[#0c112e]/40'
      />
      <svg
        aria-hidden
        className='absolute inset-0 h-full w-full opacity-80 mix-blend-screen'
        viewBox='0 0 640 400'
        fill='none'
      >
        <rect width='640' height='400' fill='#0c112e' />
        <g stroke='rgba(255,255,255,0.08)' strokeWidth='1'>
          <path d='M0 80H640M0 160H640M0 240H640M0 320H640' />
          <path d='M80 0V400M160 0V400M240 0V400M320 0V400M400 0V400M480 0V400M560 0V400' />
        </g>
        <path
          d='M90 300C170 250 220 120 320 150C420 180 470 80 560 110'
          stroke='#00d4ff'
          strokeOpacity='0.55'
          strokeWidth='1.5'
        />
        <path
          d='M70 90C150 140 230 280 340 250C450 220 500 330 590 290'
          stroke='#d3bbff'
          strokeOpacity='0.7'
          strokeWidth='1.5'
        />
        <circle cx='180' cy='168' r='18' fill='#6d28d9' fillOpacity='0.35' />
        <circle cx='180' cy='168' r='6' fill='#d3bbff' />
        <circle cx='320' cy='150' r='22' fill='#00d2fd' fillOpacity='0.18' />
        <circle cx='320' cy='150' r='7' fill='#3cd7ff' />
        <circle cx='470' cy='214' r='16' fill='#6144af' fillOpacity='0.4' />
        <circle cx='470' cy='214' r='5' fill='#cebdff' />
        <circle cx='560' cy='110' r='5' fill='#3cd7ff' />
        <circle cx='90' cy='300' r='4' fill='#d3bbff' />
      </svg>
      <div className='absolute right-4 bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[#0c112e]/80 p-4 backdrop-blur-md'>
        <div className='flex items-center gap-3'>
          <Network
            aria-hidden='true'
            className='size-[18px] text-cyan-300'
            strokeWidth={1.75}
          />
          <span className='font-mono text-sm text-[#dee0ff]'>
            {t('API Gateway Active')}
          </span>
        </div>
      </div>
    </div>
  )
}

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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { aboutPageLayout } from '../lib/layout'

const PORTFOLIO = ['DigitalOcean', 'SpaceX', 'Amazon', 'Alibaba'] as const

export function AboutBacking() {
  const { t } = useTranslation()

  return (
    <section
      data-about-backing
      className={cn(aboutPageLayout.container, aboutPageLayout.section)}
    >
      <div className={aboutPageLayout.backing}>
        <div className='flex flex-col gap-6'>
          <span className='font-mono text-xs font-semibold tracking-widest text-cyan-300 uppercase'>
            {t('Our backing')}
          </span>
          <h2 className='text-2xl font-semibold tracking-tight text-[#dee0ff] md:text-[32px] md:leading-[1.2]'>
            {t('Held and supported by Access Technology Ventures')}
          </h2>
          <div className='flex flex-col gap-4 text-base leading-relaxed text-[#ccc3d7]'>
            <p>
              {t(
                'Fluxlane is an AI infrastructure platform held and supported by Access Technology Ventures, and operated day to day by Aidroplet. Access Technology Ventures is the long-term technology investment platform of Access Industries.'
              )}
            </p>
            <p>
              {t(
                'Access technology investments include DigitalOcean, Alibaba, Amazon, Agora, Pinduoduo, PingCAP, SpaceX, and Zhihu. According to DigitalOcean public disclosures, Access-related entities are significant shareholders, and Access Technology Ventures leadership also participates in DigitalOcean corporate governance.'
              )}
            </p>
          </div>
          <a
            className='inline-flex items-center gap-2 text-base text-cyan-300 hover:underline'
            href='https://www.accesstechnologyventures.com'
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('Learn about Access Technology Ventures')}
            <ArrowRight aria-hidden='true' className='size-[18px]' />
          </a>
          <a
            className='inline-flex items-center gap-2 text-base text-cyan-300 hover:underline'
            href='https://www.aidroplet.com'
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('Learn about Aidroplet')}
            <ArrowRight aria-hidden='true' className='size-[18px]' />
          </a>
        </div>
        <div className='relative overflow-hidden rounded-2xl border border-white/10 bg-[#232846] p-8'>
          <div
            aria-hidden
            className='absolute -top-10 -right-10 size-32 rounded-full bg-cyan-400/10 blur-2xl'
          />
          <h3 className='mb-4 text-2xl font-semibold text-[#dee0ff]'>
            {t('Long-term capital, long-term building')}
          </h3>
          <p className='text-base leading-relaxed text-[#ccc3d7]'>
            {t(
              'Access emphasizes flexible, long-term partnerships, providing capital and strategic support to growth companies in consumer technology, enterprise software, cloud computing, and infrastructure.'
            )}
          </p>
          <div className='mt-8 grid grid-cols-2 gap-4 opacity-50'>
            {PORTFOLIO.map((name) => (
              <div
                key={name}
                className='rounded border border-white/10 px-3 py-2 text-center font-mono text-xs font-semibold tracking-widest text-[#dee0ff] uppercase'
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

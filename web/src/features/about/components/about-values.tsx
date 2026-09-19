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
import { Code2, Eye, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { aboutPageLayout } from '../lib/layout'

const ABOUT_VALUES = [
  {
    icon: Code2,
    titleKey: 'Keep it simple',
    descriptionKey:
      'Lower integration cost with a unified interface and clear docs, so teams can focus on product innovation instead of tedious adapters.',
    hoverBorder: 'hover:border-violet-400/50',
    glowClass: 'bg-violet-500/10 group-hover:bg-violet-500/20',
    iconClass: 'text-violet-300',
  },
  {
    icon: Eye,
    titleKey: 'Transparent and trustworthy',
    descriptionKey:
      'Show prices, token usage, and spend records clearly, so costs are understandable and traceable, with no hidden fees.',
    hoverBorder: 'hover:border-cyan-300/50',
    glowClass: 'bg-cyan-400/10 group-hover:bg-cyan-400/20',
    iconClass: 'text-cyan-300',
  },
  {
    icon: Shield,
    titleKey: 'Stability first',
    descriptionKey:
      'Protect every request with ongoing load tests, capacity safeguards, monitoring alerts, and failure drills, building enterprise-grade high availability.',
    hoverBorder: 'hover:border-violet-300/50',
    glowClass: 'bg-violet-300/10 group-hover:bg-violet-300/20',
    iconClass: 'text-violet-200',
  },
] as const

export function AboutValues() {
  const { t } = useTranslation()

  return (
    <section
      data-about-values
      className={cn(aboutPageLayout.container, aboutPageLayout.section)}
    >
      <div className='mb-16 text-center'>
        <span className='mb-2 block font-mono text-xs font-semibold tracking-widest text-violet-300 uppercase'>
          {t('Our values')}
        </span>
        <h2 className='text-2xl font-semibold tracking-tight text-[#dee0ff] md:text-[32px] md:leading-[1.2]'>
          {t(
            'Create lasting value with reliable engineering and a clear experience'
          )}
        </h2>
      </div>
      <div className={aboutPageLayout.values}>
        {ABOUT_VALUES.map((value) => {
          const Icon = value.icon
          return (
            <article
              key={value.titleKey}
              data-about-value-card
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0c112e] p-8 transition-colors',
                value.hoverBorder
              )}
            >
              <div
                aria-hidden
                className={cn(
                  'absolute -top-10 -right-10 size-32 rounded-full blur-2xl transition-colors',
                  value.glowClass
                )}
              />
              <div className='mb-6 flex size-12 items-center justify-center rounded-xl border border-white/10 bg-[#232846]'>
                <Icon
                  aria-hidden='true'
                  className={cn('size-6', value.iconClass)}
                />
              </div>
              <h3 className='mb-3 text-2xl font-semibold text-[#dee0ff]'>
                {t(value.titleKey)}
              </h3>
              <p className='text-base leading-relaxed text-[#ccc3d7]'>
                {t(value.descriptionKey)}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

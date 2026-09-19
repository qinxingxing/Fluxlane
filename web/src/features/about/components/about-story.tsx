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

import { cn } from '@/lib/utils'

import { aboutPageLayout } from '../lib/layout'

export function AboutStory() {
  const { t } = useTranslation()

  return (
    <section
      data-about-story
      className={cn(aboutPageLayout.container, aboutPageLayout.section)}
    >
      <div className={aboutPageLayout.story}>
        <span className='mb-4 block font-mono text-xs font-semibold tracking-widest text-cyan-300 uppercase'>
          {t('About us')}
        </span>
        <h2 className='mb-6 text-2xl font-semibold tracking-tight text-[#dee0ff] md:text-[32px] md:leading-[1.2]'>
          {t('Connecting models, developers, and real businesses')}
        </h2>
        <div className='flex flex-col gap-6 text-base leading-relaxed text-[#ccc3d7]'>
          <p>
            {t(
              'Fluxlane is an AI model API aggregation and usage management platform for developers and companies. Through an OpenAI-compatible unified interface, you can more easily connect models, manage tokens, inspect usage, and reconcile costs.'
            )}
          </p>
          <p>
            {t(
              'The platform currently connects model services such as DigitalOcean Serverless Inference, and uses a standardized access layer to smooth over differences across underlying models so AI capabilities can drop into your business code more easily.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

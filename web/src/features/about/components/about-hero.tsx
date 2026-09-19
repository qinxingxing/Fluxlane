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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { publicDocsLink } from '@/lib/fluxlane-brand'
import { cn } from '@/lib/utils'

import { aboutPageLayout } from '../lib/layout'
import { AboutGatewayVisual } from './about-gateway-visual'

export function AboutHero() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl = publicDocsLink(
    typeof status?.docs_link === 'string' ? status.docs_link : undefined
  )

  return (
    <section
      data-about-hero
      className={cn(aboutPageLayout.container, aboutPageLayout.hero)}
    >
      <div className='z-10 flex flex-col items-center gap-6 md:items-start'>
        <span className='inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 font-mono text-xs font-semibold tracking-widest text-violet-300 uppercase'>
          {t('About Fluxlane')}
        </span>
        <h1 className='text-[clamp(2rem,5vw,3rem)] leading-[1.1] font-bold tracking-tight text-[#dee0ff]'>
          {t('Let AI capabilities flow into every product, more simply')}
        </h1>
        <p className='max-w-xl text-base leading-relaxed text-[#ccc3d7]'>
          {t(
            'A unified, stable, and transparent AI model API that helps developers and companies reduce integration and operations cost, and get from idea to production faster.'
          )}
        </p>
        <div className='flex w-full flex-col justify-center gap-4 pt-4 sm:w-auto sm:flex-row md:justify-start'>
          <Button
            data-about-cta-primary
            className='h-auto rounded-xl border-t border-white/20 bg-gradient-to-r from-violet-600 to-purple-500 px-8 py-3 text-white shadow-[0_0_20px_rgba(211,187,255,0.3)] hover:from-violet-500 hover:to-purple-400 hover:text-white'
            render={<Link to='/sign-up' />}
          >
            {t('Create account')}
          </Button>
          <Button
            data-about-cta-docs
            variant='outline'
            className='h-auto rounded-xl border-cyan-300 bg-transparent px-8 py-3 text-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-200'
            render={
              <a href={docsUrl} target='_blank' rel='noopener noreferrer' />
            }
          >
            {t('View document')}
          </Button>
        </div>
      </div>
      <AboutGatewayVisual />
    </section>
  )
}

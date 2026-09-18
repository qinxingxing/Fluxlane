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

import { ContactForm } from './contact-form'

export function ContactPage() {
  const { t } = useTranslation()

  return (
    <main data-contact-page className='relative overflow-hidden pt-16'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
      >
        <div className='absolute -top-32 left-1/2 h-[450px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-700/20 via-purple-700/10 to-transparent blur-[120px]' />
        <div className='absolute top-1/3 -left-48 h-[500px] w-[600px] rounded-full bg-cyan-400/10 blur-[140px]' />
        <div className='absolute -right-48 bottom-40 h-[550px] w-[650px] rounded-full bg-violet-700/15 blur-[150px]' />
        <svg
          className='absolute inset-0 h-full w-full opacity-35'
          height='100%'
          width='100%'
        >
          <defs>
            <pattern
              height='48'
              id='contact-infra-grid'
              patternUnits='userSpaceOnUse'
              width='48'
            >
              <path
                className='stroke-border'
                d='M 48 0 L 0 0 0 48'
                fill='none'
                strokeWidth='0.75'
              />
              <circle
                className='fill-cyan-300'
                cx='48'
                cy='48'
                opacity='0.3'
                r='1'
              />
            </pattern>
          </defs>
          <rect fill='url(#contact-infra-grid)' height='100%' width='100%' />
        </svg>
      </div>

      <div className='relative mx-auto flex w-full max-w-[1280px] flex-col gap-16 px-4 py-12 md:gap-24 md:px-10 md:py-20'>
        <section
          data-contact-hero
          className='mx-auto flex max-w-4xl flex-col items-center text-center'
        >
          <div className='bg-muted/40 mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 shadow-sm backdrop-blur-md'>
            <span className='relative flex size-2'>
              <span className='absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-70' />
              <span className='relative inline-flex size-2 rounded-full bg-cyan-400' />
            </span>
            <span className='font-mono text-[11px] font-semibold tracking-[0.16em] text-cyan-300 uppercase'>
              {t('Contact & Partnership')}
            </span>
          </div>
          <h1 className='mb-6 text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.15] font-bold tracking-tight'>
            {t('Get in touch with the Fluxlane team')}
            <br className='hidden sm:block' />
            <span className='bg-gradient-to-r from-cyan-300 via-violet-300 to-purple-300 bg-clip-text text-transparent'>
              {t('Build highly available AI infrastructure together')}
            </span>
          </h1>
          <p className='text-muted-foreground max-w-2xl text-base leading-relaxed'>
            {t(
              'Whether you need an enterprise API gateway, high-volume token procurement, a private deployment, or a partnership, our team is ready to help around the clock.'
            )}
          </p>
        </section>

        <div data-contact-form-panel className='mx-auto w-full max-w-3xl'>
          <ContactForm />
        </div>
      </div>
    </main>
  )
}

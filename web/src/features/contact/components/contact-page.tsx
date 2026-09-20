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

import { contactPageLayout } from '../lib/layout'
import { ContactForm } from './contact-form'

export function ContactPage() {
  const { t } = useTranslation()

  return (
    <main data-contact-page className={contactPageLayout.page}>
      <div aria-hidden className='pointer-events-none absolute inset-0'>
        <div className='absolute -top-32 left-1/2 h-[450px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#6d28d9]/20 via-[#6144af]/10 to-transparent blur-[120px]' />
        <div className='absolute top-1/3 -left-48 h-[500px] w-[600px] rounded-full bg-[#00d2fd]/10 blur-[140px]' />
        <div className='absolute -right-48 bottom-40 h-[550px] w-[650px] rounded-full bg-[#6d28d9]/15 blur-[150px]' />
        <div data-contact-stripes className={contactPageLayout.stripes} />
      </div>

      <div className='relative mx-auto flex w-full max-w-[1280px] flex-col gap-16 px-4 py-12 md:gap-24 md:px-10 md:py-20'>
        <section
          data-contact-hero
          className='mx-auto flex max-w-4xl flex-col items-center text-center'
        >
          <h1 className='mb-6 text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.15] font-bold tracking-tight'>
            {t('Get in touch with the Fluxlane team')}
          </h1>
          <p className='max-w-2xl text-base leading-relaxed text-[#ccc3d7]'>
            {t(
              'Whether you need an enterprise API gateway, high-volume token procurement, a private deployment, or a partnership, our team is ready to help around the clock.'
            )}
          </p>
        </section>

        <div data-contact-form-panel className={contactPageLayout.formPanel}>
          <ContactForm />
        </div>
      </div>
    </main>
  )
}

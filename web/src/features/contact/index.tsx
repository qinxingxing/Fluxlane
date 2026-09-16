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

import { PublicLayout } from '@/components/layout'

import { ContactForm } from './components/contact-form'

export function Contact() {
  const { t } = useTranslation()

  return (
    <PublicLayout showMainContainer={false}>
      <main className='relative overflow-hidden pt-20'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-[0.06]'
        />
        <section className='mx-auto grid max-w-6xl items-start gap-12 px-6 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] md:py-28'>
          <div className='space-y-5'>
            <span className='inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-widest text-violet-300 uppercase'>
              {t('Contact')}
            </span>
            <h1 className='text-[clamp(2.1rem,4.5vw,3.2rem)] leading-[1.1] font-bold tracking-tight'>
              {t('Talk to sales')}
            </h1>
            <p className='text-muted-foreground max-w-xl text-base leading-relaxed'>
              {t(
                'Tell us about your AI API needs and our team will follow up.'
              )}
            </p>
          </div>
          <div className='border-border/50 bg-background/70 rounded-2xl border p-6 backdrop-blur-xl md:p-8'>
            <ContactForm />
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}

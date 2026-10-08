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
import { Activity, ArrowLeftRight, BadgeCheck, Shield } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'
import { BRAND_WORDMARK } from '@/lib/constants'

type RegisterPageProps = {
  form: ReactNode
  headerAction?: {
    to: '/sign-in' | '/sign-up'
    label: string
  } | null
}

export function RegisterPage(props: RegisterPageProps) {
  const { t } = useTranslation()
  const highlights = [
    {
      icon: ArrowLeftRight,
      title: t('Unified OpenAI-compatible API'),
      description: t(
        'Move existing clients over without code changes, including mainstream and private models.'
      ),
    },
    {
      icon: Activity,
      title: t('Fine-grained real-time token monitoring'),
      description: t(
        'Millisecond usage breakdowns with automatic budget cutoffs.'
      ),
    },
    {
      icon: Shield,
      title: t('Zero data retention'),
      description: t(
        'Enterprise traffic is relayed through, with end-to-end privacy.'
      ),
    },
  ]
  const { systemName, loading } = useSystemConfig()
  const headerAction =
    props.headerAction === undefined
      ? { to: '/sign-in' as const, label: t('Sign in') }
      : props.headerAction

  return (
    <div className='dark'>
      <div className='relative min-h-svh overflow-x-clip bg-[#070b24] text-slate-200'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(124,58,237,0.18),transparent_70%),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_100%,32px_32px,32px_32px]'
        />
        <header className='sticky top-0 z-50 border-b border-violet-500/25 bg-[#0c112e]/85 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl'>
          <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-6'>
            <Link to='/' aria-label={systemName} className='flex items-center'>
              {loading ? (
                <Skeleton className='h-8 w-40 rounded-md' />
              ) : (
                <img
                  src={BRAND_WORDMARK}
                  alt={systemName}
                  width={317}
                  height={32}
                  className='h-8 w-auto'
                />
              )}
            </Link>
            {headerAction ? (
              <Link
                to={headerAction.to}
                className='rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white'
              >
                {headerAction.label}
              </Link>
            ) : null}
          </div>
        </header>
        <main className='relative mx-auto max-w-7xl px-6 pt-12 pb-24'>
          <div
            data-auth-layout='split'
            className='grid items-start gap-8 lg:grid-cols-12'
          >
            <section className='space-y-8 lg:sticky lg:top-24 lg:col-span-5'>
              <h1 className='text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl'>
                {t('Start your high-availability AI infrastructure journey')}
              </h1>
              <div className='grid gap-3.5'>
                {highlights.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className='flex items-start gap-4 rounded-xl border border-violet-500/20 bg-white/5 p-4 transition-colors hover:border-violet-500/40'
                    >
                      <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300'>
                        <Icon className='size-5' aria-hidden='true' />
                      </div>
                      <div>
                        <h2 className='text-base font-medium text-slate-100'>
                          {item.title}
                        </h2>
                        <p className='mt-1 text-xs text-slate-400'>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className='flex items-center justify-between rounded-xl border border-violet-500/10 bg-white/5 p-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex -space-x-2'>
                    <span className='flex size-7 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/40 text-[10px] font-bold text-white'>
                      99.9
                    </span>
                    <span className='flex size-7 items-center justify-center rounded-full border border-violet-500/30 bg-indigo-600/40 text-[10px] font-bold text-cyan-200'>
                      SLA
                    </span>
                  </div>
                  <span className='text-xs text-slate-400'>
                    {t('Global distributed edge availability')}
                  </span>
                </div>
                <BadgeCheck
                  className='size-4 text-cyan-300'
                  aria-hidden='true'
                />
              </div>
            </section>
            <div className='lg:col-span-7'>{props.form}</div>
          </div>
        </main>
      </div>
    </div>
  )
}

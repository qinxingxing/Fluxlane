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
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { isPrivacyPolicyEnabled } from '@/features/legal/fluxlane-privacy-policy'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { trackEvent } from '@/lib/analytics'
import { BRAND_WORDMARK, DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { consoleSiteHref, publicSiteHref } from '@/lib/domain-routing'
import {
  FLUXLANE_DOCS_URL,
  FLUXLANE_SITE_URL,
  publicBrandName,
} from '@/lib/fluxlane-brand'
import { cn } from '@/lib/utils'

import {
  publicFooterClassName,
  publicFooterLinkClassName,
} from '../lib/public-chrome'

interface FooterLink {
  text: string
  href: string
  badge?: string
  track?: 'docs' | 'console'
}

interface FooterColumnProps {
  title: string
  links: FooterLink[]
}

interface FooterProps {
  name?: string
  columns?: FooterColumnProps[]
  copyright?: string
  className?: string
}

const ACCESS_VENTURES_URL = 'https://www.accesstechnologyventures.com'

function FooterLinkItem(props: { link: FooterLink }) {
  const { t } = useTranslation()
  const isExternal = props.link.href.startsWith('http')
  const label = t(props.link.text)

  const content = (
    <>
      {label}
      {props.link.badge ? (
        <span className='rounded bg-purple-500/20 px-1 text-[9px] text-purple-300'>
          {props.link.badge}
        </span>
      ) : null}
    </>
  )

  const className = cn(
    publicFooterLinkClassName,
    'flex items-center justify-between gap-2'
  )

  const onClick = () => {
    if (props.link.track === 'docs') trackEvent('click_documentation')
    if (props.link.track === 'console') trackEvent('click_console')
  }

  if (isExternal) {
    return (
      <a
        href={props.link.href}
        target='_blank'
        rel='noopener noreferrer'
        className={className}
        onClick={onClick}
      >
        {content}
      </a>
    )
  }

  return (
    <Link to={props.link.href} className={className} onClick={onClick}>
      {content}
    </Link>
  )
}

function LegalLinks(props: { leadingSeparator?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { key: string; label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({
      key: 'user-agreement',
      label: t('User Agreement'),
      href: publicSiteHref('/user-agreement'),
    })
  }
  if (isPrivacyPolicyEnabled(status)) {
    items.push({
      key: 'privacy-policy',
      label: t('Privacy Policy'),
      href: publicSiteHref('/privacy-policy'),
    })
  }
  if (items.length === 0) {
    return null
  }
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {(props.leadingSeparator || index > 0) && (
            <span aria-hidden='true' className='text-slate-600'>
              ·
            </span>
          )}
          <a href={item.href} className={publicFooterLinkClassName}>
            {item.label}
          </a>
        </Fragment>
      ))}
    </>
  )
}

function ProjectAttribution(props: { currentYear: number; inline?: boolean }) {
  const content = (
    <span className='text-slate-500'>
      &copy; {props.currentYear}{' '}
      <a
        href={FLUXLANE_SITE_URL}
        className='font-medium text-slate-300 transition-colors hover:text-white'
      >
        {DEFAULT_SYSTEM_NAME}
      </a>
    </span>
  )
  if (props.inline) {
    return content
  }
  return <div className='text-center text-xs sm:text-right'>{content}</div>
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { systemName, footerHtml } = useSystemConfig()

  const displayName = publicBrandName(systemName || props.name)
  const currentYear = new Date().getFullYear()
  const showPrivacy = isPrivacyPolicyEnabled(status)

  const fallbackColumns = useMemo<FooterColumnProps[]>(() => {
    const companyLinks: FooterLink[] = [
      {
        text: 'About',
        href: publicSiteHref('/about'),
      },
      {
        text: 'Contact',
        href: publicSiteHref('/contact'),
      },
    ]
    if (showPrivacy) {
      companyLinks.push({
        text: 'Privacy Policy',
        href: publicSiteHref('/privacy-policy'),
      })
    }
    if (status?.user_agreement_enabled) {
      companyLinks.push({
        text: 'User Agreement',
        href: publicSiteHref('/user-agreement'),
      })
    }

    return [
      {
        title: 'Product',
        links: [
          {
            text: 'Model Square',
            href: publicSiteHref('/pricing'),
          },
          {
            text: 'Unified API gateway',
            href: FLUXLANE_DOCS_URL,
            track: 'docs',
          },
          {
            text: 'Pricing',
            href: publicSiteHref('/pricing'),
          },
          {
            text: 'Console',
            href: consoleSiteHref('/dashboard'),
            track: 'console',
          },
        ],
      },
      {
        title: 'footer.columns.docs.title',
        links: [
          {
            text: 'footer.columns.docs.links.quickStart',
            href: FLUXLANE_DOCS_URL,
            track: 'docs',
          },
          {
            text: 'footer.columns.docs.links.apiDocs',
            href: FLUXLANE_DOCS_URL,
            track: 'docs',
          },
        ],
      },
      {
        title: 'footer.columns.about.title',
        links: companyLinks,
      },
    ]
  }, [showPrivacy, status?.user_agreement_enabled])

  const displayColumns = props.columns ?? fallbackColumns

  if (footerHtml) {
    return (
      <footer
        data-public-footer
        className={cn(publicFooterClassName, props.className)}
      >
        <div className='mx-auto w-full max-w-7xl px-8 py-8'>
          <div className='flex flex-col items-center justify-between gap-6 border border-white/10 bg-white/[0.03] px-5 py-5 md:flex-row'>
            <div
              className='custom-footer min-w-0 text-center text-sm text-slate-400 sm:text-left'
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
            <div className='flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs'>
              <LegalLinks />
              <ProjectAttribution currentYear={currentYear} inline />
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer
      data-public-footer
      className={cn(publicFooterClassName, props.className)}
    >
      <div className='mx-auto max-w-7xl px-8 py-16'>
        <div className='grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5'>
          <div className='col-span-2 space-y-4 pr-6 md:col-span-3 lg:col-span-2'>
            <Link to='/' className='flex items-center gap-2.5'>
              <img
                src={BRAND_WORDMARK}
                alt={displayName}
                width={218}
                height={22}
                className='h-[22px] w-auto'
              />
            </Link>
            <p className='max-w-sm text-xs leading-relaxed text-slate-400'>
              {t(
                'A unified, highly available AI API gateway for developers and companies.'
              )}
            </p>
            <a
              href={ACCESS_VENTURES_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-purple-400/40 hover:text-white'
            >
              <span className='font-mono text-purple-400'>
                {t('Backed by')}
              </span>
              <span>Access Technology Ventures</span>
            </a>
          </div>

          {displayColumns.map((column) => (
            <div key={column.title} className='space-y-3'>
              <h2 className='font-mono text-xs font-semibold tracking-wider text-slate-200 uppercase'>
                {t(column.title)}
              </h2>
              <ul className='space-y-2.5 text-xs'>
                {column.links.map((link) => (
                  <li key={`${link.href}:${link.text}`}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className='mt-12 flex flex-col items-center justify-between gap-x-3 gap-y-3 border-t border-white/5 pt-6 sm:flex-row'>
          <div className='flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:justify-start'>
            <span>
              &copy; {currentYear} {displayName}.{' '}
              {props.copyright ?? t('footer.defaultCopyright')}
            </span>
            <LegalLinks leadingSeparator />
          </div>
          <ProjectAttribution currentYear={currentYear} />
        </div>
      </div>
    </footer>
  )
}

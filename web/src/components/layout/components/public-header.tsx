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
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/use-notifications'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { useIsClient } from '@/lib/client-only'
import { BRAND_WORDMARK } from '@/lib/constants'
import { consoleSiteHref } from '@/lib/domain-routing'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { defaultTopNavLinks } from '../config/top-nav.config'
import {
  PUBLIC_HEADER_SCROLL_THRESHOLD_PX,
  publicHeaderBarClassName,
  publicHeaderInnerClassName,
  publicHeaderNavItemActiveClassName,
  publicHeaderNavItemClassName,
  publicHeaderRootClassName,
} from '../lib/public-chrome'
import type { TopNavLink } from '../types'
import { PublicButton } from './public-button'

const AUTH_PROMPT_SECONDS = 5

type AuthPromptTarget = {
  title: string
  href: string
}

export interface PublicHeaderProps {
  navLinks?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  navContent?: React.ReactNode
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  siteName?: string
  homeUrl?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showNavigation?: boolean
  showAuthButtons?: boolean
  showNotifications?: boolean
  className?: string
}

function isAbsoluteHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export function PublicHeader(props: PublicHeaderProps) {
  const {
    navLinks = defaultTopNavLinks,
    showThemeSwitch = false,
    showLanguageSwitcher = false,
    siteName: customSiteName,
    homeUrl = '/',
    showAuthButtons = true,
    showNotifications = true,
  } = props

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authPromptTarget, setAuthPromptTarget] =
    useState<AuthPromptTarget | null>(null)
  const [authPromptSecondsLeft, setAuthPromptSecondsLeft] =
    useState(AUTH_PROMPT_SECONDS)
  const { auth } = useAuthStore()
  const { systemName, loading } = useSystemConfig()
  const dynamicLinks = useTopNavLinks()
  const notifications = useNotifications()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const user = auth.user
  const isClient = useIsClient()
  const isAuthenticated = isClient && !!user
  const displaySiteName = customSiteName || systemName
  const links = dynamicLinks.length > 0 ? dynamicLinks : navLinks
  const signInHref = consoleSiteHref('/sign-in')
  const signUpHref = consoleSiteHref('/sign-up')
  const dashboardHref = consoleSiteHref('/dashboard')

  useEffect(() => {
    const onScroll = () =>
      setScrolled(window.scrollY > PUBLIC_HEADER_SCROLL_THRESHOLD_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!authPromptTarget) return

    const intervalId = window.setInterval(() => {
      setAuthPromptSecondsLeft((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      const redirect = authPromptTarget.href
      setAuthPromptTarget(null)
      navigate({ to: '/sign-in', search: { redirect } })
    }, AUTH_PROMPT_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [authPromptTarget, navigate])

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptTarget(null)
    setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
  }, [])

  const navigateToSignIn = useCallback(() => {
    const redirect = authPromptTarget?.href || '/'
    setAuthPromptTarget(null)
    navigate({ to: '/sign-in', search: { redirect } })
  }, [authPromptTarget?.href, navigate])

  const handleNavLinkClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      link: TopNavLink,
      closeMobile = false
    ) => {
      if (link.disabled) {
        event.preventDefault()
        return
      }

      if (link.requiresAuth) {
        event.preventDefault()
        if (closeMobile) {
          setMobileOpen(false)
        }
        setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
        setAuthPromptTarget({
          title: link.title,
          href: link.href,
        })
        return
      }

      if (closeMobile) {
        setMobileOpen(false)
      }
    },
    []
  )

  const renderNavLink = (
    link: TopNavLink,
    options: { mobile?: boolean; index?: number } = {}
  ) => {
    const isActive = pathname === link.href
    const itemKey = `${link.title}-${link.href}`
    const absolute = isAbsoluteHref(link.href)
    const className = options.mobile
      ? cn(
          'flex items-center gap-3 py-3 text-base font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          mobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          isActive ? 'text-white' : 'text-slate-300',
          link.disabled && 'pointer-events-none opacity-50'
        )
      : cn(
          isActive
            ? publicHeaderNavItemActiveClassName
            : publicHeaderNavItemClassName,
          link.disabled && 'pointer-events-none opacity-50'
        )
    const transitionStyle = options.mobile
      ? {
          transitionDelay: mobileOpen
            ? `${100 + (options.index ?? 0) * 50}ms`
            : '0ms',
        }
      : undefined

    if (link.external || absolute) {
      return (
        <a
          key={itemKey}
          href={link.href}
          {...(link.external && {
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
          aria-disabled={link.disabled}
          tabIndex={link.disabled ? -1 : undefined}
          onClick={(event) =>
            handleNavLinkClick(event, link, Boolean(options.mobile))
          }
          className={className}
          style={transitionStyle}
        >
          {link.title}
        </a>
      )
    }

    return (
      <Link
        key={itemKey}
        to={link.href}
        disabled={link.disabled}
        onClick={(event) =>
          handleNavLinkClick(event, link, Boolean(options.mobile))
        }
        className={className}
        style={transitionStyle}
      >
        {link.title}
      </Link>
    )
  }

  const renderAuthHref = (
    href: string,
    className: string,
    children: React.ReactNode,
    buttonProps: {
      variant?: 'default' | 'outline' | 'ghost' | 'destructive'
      size?: 'sm' | 'default' | 'lg' | 'icon'
    } = {}
  ) => {
    const absolute = isAbsoluteHref(href)
    if (absolute) {
      return (
        <PublicButton
          variant={buttonProps.variant}
          size={buttonProps.size}
          className={className}
          render={<a href={href} />}
        >
          {children}
        </PublicButton>
      )
    }
    return (
      <PublicButton
        variant={buttonProps.variant}
        size={buttonProps.size}
        className={className}
        render={<Link to={href} />}
      >
        {children}
      </PublicButton>
    )
  }

  return (
    <>
      <header
        data-public-header
        data-scrolled={scrolled ? 'true' : 'false'}
        className={cn(publicHeaderRootClassName, props.className)}
      >
        <div className={publicHeaderBarClassName(scrolled)}>
          <nav className={publicHeaderInnerClassName}>
            <Link
              to={homeUrl}
              className='group flex shrink-0 items-center gap-2.5'
            >
              <img
                src={BRAND_WORDMARK}
                alt={displaySiteName}
                width={198}
                height={20}
                className='h-5 w-auto transition-all duration-300 group-hover:scale-105'
              />
            </Link>

            <div className='hidden flex-1 items-center justify-center gap-0.5 md:flex'>
              {links.map((link) => renderNavLink(link))}
            </div>

            <div className='hidden items-center gap-2 md:flex'>
              {showLanguageSwitcher && (
                <div className='text-slate-200 [&_button]:text-slate-200'>
                  <LanguageSwitcher />
                </div>
              )}
              {showThemeSwitch && <ThemeSwitch />}
              {showNotifications && isClient && (
                <NotificationPopover
                  open={notifications.popoverOpen}
                  onOpenChange={notifications.setPopoverOpen}
                  unreadCount={notifications.unreadCount}
                  activeTab={notifications.activeTab}
                  onTabChange={notifications.setActiveTab}
                  notice={notifications.notice}
                  announcements={notifications.announcements}
                  loading={notifications.loading}
                />
              )}

              {showAuthButtons && (
                <>
                  {loading && <Skeleton className='h-[38px] w-24 rounded-lg' />}
                  {!loading && isAuthenticated && (
                    <>
                      {renderAuthHref(
                        dashboardHref,
                        '',
                        <>
                          {t('Console')}
                          <ArrowRight className='size-3.5 transition-transform group-hover:translate-x-0.5' />
                        </>
                      )}
                      <ProfileDropdown />
                    </>
                  )}
                  {!loading && !isAuthenticated && (
                    <>
                      {renderAuthHref(signInHref, '', t('Sign in'), {
                        variant: 'ghost',
                      })}
                      {renderAuthHref(
                        signUpHref,
                        'group',
                        <>
                          {t('Get Started')}
                          <ArrowRight className='size-3.5 transition-transform group-hover:translate-x-0.5' />
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className='flex items-center gap-2 md:hidden'>
              {showLanguageSwitcher && <LanguageSwitcher />}
              {showThemeSwitch && <ThemeSwitch />}
              {showAuthButtons && !loading && isAuthenticated && (
                <ProfileDropdown />
              )}
              <PublicButton
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setMobileOpen((value) => !value)}
                aria-label={t('Toggle navigation menu')}
              >
                <div className='relative size-4'>
                  <span
                    className={cn(
                      'absolute inset-x-0 block h-[1.5px] origin-center rounded-full bg-current transition-all duration-300',
                      mobileOpen ? 'top-[7px] rotate-45' : 'top-[3px]'
                    )}
                  />
                  <span
                    className={cn(
                      'absolute inset-x-0 top-[7px] block h-[1.5px] rounded-full bg-current transition-all duration-300',
                      mobileOpen ? 'scale-x-0 opacity-0' : 'opacity-100'
                    )}
                  />
                  <span
                    className={cn(
                      'absolute inset-x-0 block h-[1.5px] origin-center rounded-full bg-current transition-all duration-300',
                      mobileOpen ? 'top-[7px] -rotate-45' : 'top-[11px]'
                    )}
                  />
                </div>
              </PublicButton>
            </div>
          </nav>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-[#070b24]/98 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:pointer-events-none md:hidden',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
      >
        <div className='flex h-full flex-col justify-between px-8 pt-20 pb-10'>
          <nav className='flex flex-col gap-1'>
            {links.map((link, index) =>
              renderNavLink(link, { mobile: true, index })
            )}
          </nav>

          <div
            className={cn(
              'flex flex-col gap-3 transition-all duration-500',
              mobileOpen
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            )}
            style={{ transitionDelay: mobileOpen ? '250ms' : '0ms' }}
          >
            {showAuthButtons && isAuthenticated && (
              <PublicButton
                size='lg'
                className='w-full'
                render={
                  isAbsoluteHref(dashboardHref) ? (
                    <a href={dashboardHref} />
                  ) : (
                    <Link to={dashboardHref} />
                  )
                }
                onClick={() => setMobileOpen(false)}
              >
                {t('Go to Dashboard')}
              </PublicButton>
            )}
            {showAuthButtons && !isAuthenticated && (
              <>
                <PublicButton
                  variant='ghost'
                  size='lg'
                  className='w-full'
                  render={
                    isAbsoluteHref(signInHref) ? (
                      <a href={signInHref} />
                    ) : (
                      <Link to={signInHref} />
                    )
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {t('Sign in')}
                </PublicButton>
                <PublicButton
                  size='lg'
                  className='w-full'
                  render={
                    isAbsoluteHref(signUpHref) ? (
                      <a href={signUpHref} />
                    ) : (
                      <Link to={signUpHref} />
                    )
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {t('Get Started')}
                  <ArrowRight className='size-4' />
                </PublicButton>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={!!authPromptTarget}
        onOpenChange={(open) => {
          if (!open) {
            closeAuthPrompt()
          }
        }}
        title={t('Sign in required')}
        description={t('Please sign in to view {{module}}.', {
          module: authPromptTarget?.title || '',
        })}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        footer={
          <>
            <Button variant='outline' onClick={closeAuthPrompt}>
              {t('Cancel')}
            </Button>
            <Button onClick={navigateToSignIn}>{t('Sign in now')}</Button>
          </>
        }
      >
        <div className='bg-muted/40 text-muted-foreground rounded-lg px-3 py-2 text-sm'>
          {t('Redirecting to sign in in {{seconds}} seconds.', {
            seconds: authPromptSecondsLeft,
          })}
        </div>
      </Dialog>
    </>
  )
}

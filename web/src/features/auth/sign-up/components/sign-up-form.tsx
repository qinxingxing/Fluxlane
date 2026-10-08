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
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { register, wechatLoginByCode } from '@/features/auth/api'
import {
  authCardClassName,
  authFieldClassName,
  authLabelClassName,
  authSelectClassName,
  authSubmitClassName,
} from '@/features/auth/components/auth-visual'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { registerFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useEmailVerification } from '@/features/auth/hooks/use-email-verification'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import { evaluatePasswordStrength } from '@/features/auth/lib/password-strength'
import {
  REGISTRATION_COUNTRY_CODES,
  buildRegistrationPhone,
} from '@/features/auth/lib/registration-phone'
import {
  getAffiliateCode,
  saveAffiliateCode,
} from '@/features/auth/lib/storage'
import { isPrivacyPolicyEnabled } from '@/features/legal/fluxlane-privacy-policy'
import { useStatus } from '@/hooks/use-status'
import { isAuthBundle } from '@/lib/api'
import { getServerErrorMessageKey } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

const strengthTone = {
  empty: 'text-slate-500',
  weak: 'text-red-400',
  fair: 'text-cyan-300',
  strong: 'text-violet-300',
} as const

const strengthFill = {
  weak: 'bg-red-400',
  fair: 'bg-cyan-300',
  strong: 'bg-violet-400',
} as const

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [wechatCode, setWeChatCode] = useState('')
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const legalConsentErrorMessage = t('Please agree to the legal terms first')

  const { status } = useStatus()
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const { redirectToLogin, handleLoginSuccess } = useAuthRedirect()
  const {
    isSending: isSendingCode,
    secondsLeft,
    isActive,
    sendCode,
  } = useEmailVerification({
    turnstileToken,
    validateTurnstile,
  })

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      countryCode: '+86',
      phone: '',
      verificationCode: '',
      password: '',
      confirmPassword: '',
    },
  })

  const emailValue = form.watch('email')
  const passwordValue = form.watch('password')
  const confirmPasswordValue = form.watch('confirmPassword')
  const passwordStrength = evaluatePasswordStrength(passwordValue)
  const passwordsMatch =
    confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = isPrivacyPolicyEnabled(status)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const oauthRegisterEnabled =
    status?.oauth_register_enabled ??
    status?.data?.oauth_register_enabled ??
    true
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const turnstileReady = !isTurnstileEnabled || Boolean(turnstileToken)

  const wechatQrCodeUrl = useMemo(() => {
    return (
      status?.wechat_qrcode ||
      status?.wechat_qr_code ||
      status?.wechat_qrcode_image_url ||
      status?.wechat_qr_code_image_url ||
      status?.wechat_account_qrcode_image_url ||
      status?.WeChatAccountQRCodeImageURL ||
      status?.data?.wechat_qrcode ||
      status?.data?.WeChatAccountQRCodeImageURL ||
      ''
    )
  }, [status])

  useEffect(() => {
    if (requiresLegalConsent) {
      setAgreedToLegal(false)
    } else {
      setAgreedToLegal(true)
    }
  }, [requiresLegalConsent])

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get('aff')?.trim()
    if (aff) {
      saveAffiliateCode(aff)
    }
  }, [])

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    let phone = ''
    if (data.phone.trim()) {
      const builtPhone = buildRegistrationPhone(data.countryCode, data.phone)
      if (!builtPhone) {
        form.setError('phone', {
          message: t('Please enter a valid phone number'),
        })
        return
      }
      phone = builtPhone
    }

    if (!validateTurnstile()) return

    setIsLoading(true)
    try {
      const res = await register({
        username: data.username,
        password: data.password,
        email: data.email,
        phone,
        verification_code: data.verificationCode,
        aff_code: getAffiliateCode(),
        turnstile: turnstileToken,
      })

      if (res?.success) {
        toast.success(t('Account created! Please sign in'))
        redirectToLogin()
      } else {
        toast.error(res?.message || t('Failed to create account'))
      }
    } catch {
      // Errors are handled by global interceptor
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendVerificationCode() {
    const email = emailValue.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.setError('email', {
        message: t('Please enter a valid email address'),
      })
      return
    }
    form.clearErrors('email')
    if (await sendCode(email)) {
      setTurnstileToken('')
      setTurnstileWidgetKey((current) => current + 1)
    }
  }

  const handleOpenWeChatDialog = () => {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    setIsWeChatDialogOpen(true)
  }

  const handleWeChatDialogChange = (open: boolean) => {
    setIsWeChatDialogOpen(open)
    if (!open) {
      setWeChatCode('')
      setIsWeChatSubmitting(false)
    }
  }

  async function handleWeChatLogin() {
    if (!wechatCode.trim()) {
      toast.error(t('Please enter the verification code'))
      return
    }

    setIsWeChatSubmitting(true)
    try {
      const res = await wechatLoginByCode(wechatCode)
      if (res?.success && isAuthBundle(res.data)) {
        await handleLoginSuccess(res.data)
        toast.success(t('Signed in via WeChat'))
        handleWeChatDialogChange(false)
      } else {
        if (getServerErrorMessageKey(res)) return
        toast.error(res?.message || t('Login failed'))
      }
    } catch (error: unknown) {
      if (getServerErrorMessageKey(error)) return
      toast.error(t('Login failed'))
    } finally {
      setIsWeChatSubmitting(false)
    }
  }

  let verificationCodeAction: ReactNode = t('Send code')
  if (isActive) {
    verificationCodeAction = t('Resend in {{seconds}}s', {
      seconds: secondsLeft,
    })
  } else if (isSendingCode) {
    verificationCodeAction = <Loader2 className='h-4 w-4 animate-spin' />
  }

  let filledBars = 0
  if (passwordStrength === 'weak') filledBars = 1
  if (passwordStrength === 'fair') filledBars = 2
  if (passwordStrength === 'strong') filledBars = 3
  const activeStrengthFill =
    passwordStrength === 'empty' ? '' : strengthFill[passwordStrength]
  let strengthText = t('Not entered')
  if (passwordStrength === 'weak') strengthText = t('Weak')
  if (passwordStrength === 'fair') strengthText = t('Fair')
  if (passwordStrength === 'strong') strengthText = t('Strong')

  return (
    <Form {...form}>
      <form
        id='registrationForm'
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(authCardClassName, className)}
        {...props}
      >
        <div className='flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between'>
          <h2 className='text-2xl font-semibold text-white'>
            {t('Create your Fluxlane account')}
          </h2>
          <p className='text-sm text-slate-400 sm:text-right'>
            {t('Already have an account?')}{' '}
            <Link
              to='/sign-in'
              className='font-semibold text-violet-300 hover:text-violet-200'
            >
              {t('Sign in')}
            </Link>
          </p>
        </div>

        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={authLabelClassName}>
                {t('Username')}
              </FormLabel>
              <FormControl>
                <div className='relative'>
                  <User
                    className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500'
                    aria-hidden='true'
                  />
                  <Input
                    placeholder={t('Enter your username')}
                    autoComplete='username'
                    className={authFieldClassName}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={authLabelClassName}>{t('Email')}</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Mail
                    className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500'
                    aria-hidden='true'
                  />
                  <Input
                    placeholder={t('name@company.com')}
                    type='email'
                    autoComplete='email'
                    className={authFieldClassName}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='verificationCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={authLabelClassName}>
                {t('Verification code')}
              </FormLabel>
              <FormControl>
                <div className='relative'>
                  <MessageSquare
                    className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500'
                    aria-hidden='true'
                  />
                  <Input
                    placeholder={t('Please enter the verification code')}
                    autoComplete='one-time-code'
                    inputMode='numeric'
                    className={cn(authFieldClassName, 'pr-36')}
                    {...field}
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    className='absolute top-1.5 right-1.5 h-9 text-cyan-200 hover:bg-cyan-400/15 hover:text-cyan-100'
                    disabled={
                      isLoading ||
                      isSendingCode ||
                      isActive ||
                      !emailValue ||
                      !turnstileReady
                    }
                    onClick={handleSendVerificationCode}
                  >
                    {verificationCodeAction}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='space-y-1.5'>
          <FormLabel className={authLabelClassName}>
            {t('Bind a phone number')}
          </FormLabel>
          <div className='grid grid-cols-12 gap-2'>
            <FormField
              control={form.control}
              name='countryCode'
              render={({ field }) => (
                <FormItem className='col-span-4 sm:col-span-3'>
                  <FormControl>
                    <select
                      aria-label={t('Country code')}
                      className={authSelectClassName}
                      {...field}
                    >
                      {REGISTRATION_COUNTRY_CODES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem className='col-span-8 sm:col-span-9'>
                  <FormControl>
                    <div className='relative'>
                      <Phone
                        className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500'
                        aria-hidden='true'
                      />
                      <Input
                        placeholder={t('Enter your phone number')}
                        type='tel'
                        autoComplete='tel-national'
                        inputMode='numeric'
                        className={authFieldClassName}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={authLabelClassName}>
                {t('Set a password')}
              </FormLabel>
              <FormControl>
                <div className='relative'>
                  <Lock
                    className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500'
                    aria-hidden='true'
                  />
                  <Input
                    placeholder={t(
                      'At least 8 characters, with uppercase, lowercase, a number, and a symbol'
                    )}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='new-password'
                    className={cn(authFieldClassName, 'pr-11')}
                    {...field}
                  />
                  <button
                    type='button'
                    className='absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-white'
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={t('Toggle password visibility')}
                  >
                    {showPassword ? (
                      <EyeOff className='size-4' aria-hidden='true' />
                    ) : (
                      <Eye className='size-4' aria-hidden='true' />
                    )}
                  </button>
                </div>
              </FormControl>
              <div className='flex items-center gap-2 pt-1'>
                <div className='grid h-1.5 flex-1 grid-cols-3 gap-1.5'>
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={cn(
                        'rounded-full bg-white/10',
                        index < filledBars && activeStrengthFill
                      )}
                    />
                  ))}
                </div>
                <span className={cn('text-xs', strengthTone[passwordStrength])}>
                  {strengthText}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={authLabelClassName}>
                {t('Confirm password')}
              </FormLabel>
              <FormControl>
                <div className='relative'>
                  <Lock
                    className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500'
                    aria-hidden='true'
                  />
                  <Input
                    placeholder={t('Confirm password')}
                    type='password'
                    autoComplete='new-password'
                    className={cn(authFieldClassName, 'pr-11')}
                    {...field}
                  />
                  <CheckCircle2
                    className={cn(
                      'absolute top-1/2 right-3 size-4 -translate-y-1/2',
                      passwordsMatch ? 'text-cyan-300' : 'text-slate-600'
                    )}
                    aria-hidden='true'
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isTurnstileEnabled && (
          <Turnstile
            key={turnstileWidgetKey}
            siteKey={turnstileSiteKey}
            onVerify={setTurnstileToken}
          />
        )}

        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          className='border-white/10 bg-white/5'
        />

        <Button
          type='submit'
          className={authSubmitClassName}
          disabled={
            isLoading ||
            (requiresLegalConsent && !agreedToLegal) ||
            !turnstileReady
          }
        >
          {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          <span>{t('Register')}</span>
          <ArrowRight className='size-5' aria-hidden='true' />
        </Button>

        {oauthRegisterEnabled && (
          <OAuthProviders
            status={status}
            disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
            onWeChatLogin={hasWeChatLogin ? handleOpenWeChatDialog : undefined}
            isWeChatLoading={isWeChatSubmitting}
            className='pt-2'
          />
        )}
      </form>

      {hasWeChatLogin && (
        <Dialog
          open={isWeChatDialogOpen}
          onOpenChange={handleWeChatDialogChange}
          title={t('WeChat sign in')}
          description={t(
            'Scan the QR code to follow the official account and reply with “验证码” to receive your verification code.'
          )}
          contentClassName='max-w-sm'
          headerClassName='text-left'
          contentHeight='auto'
          bodyClassName='space-y-4'
          footer={
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleWeChatDialogChange(false)}
                disabled={isWeChatSubmitting}
              >
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleWeChatLogin}
                disabled={
                  isWeChatSubmitting ||
                  !wechatCode.trim() ||
                  (requiresLegalConsent && !agreedToLegal)
                }
                className='gap-2'
              >
                {isWeChatSubmitting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : null}
                {t('Confirm')}
              </Button>
            </>
          }
        >
          {wechatQrCodeUrl ? (
            <div className='flex justify-center'>
              <img
                src={wechatQrCodeUrl}
                alt={t('WeChat login QR code')}
                className='h-40 w-40 rounded-md border object-contain'
              />
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              {t('QR code is not configured. Please contact support.')}
            </p>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='wechat-code'>{t('Verification code')}</Label>
            <Input
              id='wechat-code'
              placeholder={t('Enter the verification code')}
              value={wechatCode}
              onChange={(event) => setWeChatCode(event.target.value)}
              autoComplete='one-time-code'
            />
          </div>
        </Dialog>
      )}
    </Form>
  )
}

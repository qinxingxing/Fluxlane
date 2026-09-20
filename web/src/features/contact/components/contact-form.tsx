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
import {
  Brain,
  Building2,
  CircleCheck,
  Loader2,
  Lock,
  Mail,
  Phone,
  Zap,
} from 'lucide-react'
import {
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import { isPrivacyPolicyEnabled } from '@/features/legal/fluxlane-privacy-policy'
import { useStatus } from '@/hooks/use-status'
import { publicSiteHref } from '@/lib/domain-routing'
import { getServerErrorMessageKey } from '@/lib/server-error-message'

import { submitSalesInquiry } from '../api'
import { MONTHLY_BUDGET_OPTIONS } from '../lib/constants'
import {
  contactFormDefaultValues,
  contactFormSchema,
  type ContactFormInput,
  type ContactFormValues,
} from '../lib/schema'

const fieldInputClassName =
  'bg-muted/40 h-11 border-transparent pl-10 text-sm focus-visible:bg-muted/70'

function ContactBilingualLabel(props: { children: ReactNode; hint: string }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <FormLabel className='text-muted-foreground w-auto text-xs font-semibold tracking-wide'>
        {props.children}
      </FormLabel>
      <span className='font-mono text-[11px] tracking-[0.12em] text-violet-300 uppercase'>
        {props.hint}
      </span>
    </div>
  )
}

function ContactIconField(props: {
  icon: ComponentType<{ className?: string }>
  children: ReactElement
}) {
  const Icon = props.icon
  return (
    <div className='relative'>
      <Icon
        aria-hidden
        className='text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2'
      />
      <FormControl>{props.children}</FormControl>
    </div>
  )
}

export function ContactForm() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [submitted, setSubmitted] = useState(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const form = useForm<ContactFormInput, unknown, ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contactFormDefaultValues,
  })
  const isSubmitting = form.formState.isSubmitting
  const privacyHref = publicSiteHref('/privacy-policy')

  async function onSubmit(values: ContactFormValues) {
    if (!validateTurnstile()) {
      return
    }
    try {
      const res = await submitSalesInquiry(
        {
          company: values.company,
          email: values.email,
          phone: values.phone,
          requested_model: values.requestedModel,
          monthly_budget: values.monthlyBudget,
          description: values.description,
          website: values.website,
        },
        turnstileToken
      )
      if (!res?.success) {
        if (getServerErrorMessageKey(res)) return
        toast.error(
          res?.message ||
            t('Unable to submit your inquiry. Please try again later.')
        )
        return
      }
      setSubmitted(true)
      form.reset(contactFormDefaultValues)
      setTurnstileToken('')
      setTurnstileWidgetKey((key) => key + 1)
    } catch {
      toast.error(t('Unable to submit your inquiry. Please try again later.'))
    }
  }

  return (
    <div className='bg-card/80 relative overflow-hidden rounded-2xl p-6 shadow-2xl backdrop-blur-xl sm:p-10'>
      <div
        aria-hidden
        className='pointer-events-none absolute -top-24 -right-24 hidden size-80 rounded-full bg-violet-700/20 blur-3xl sm:block'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute -bottom-24 -left-24 hidden size-80 rounded-full bg-cyan-400/10 blur-3xl sm:block'
      />
      {submitted ? (
        <div
          role='status'
          className='bg-muted/40 relative flex flex-col items-center gap-4 rounded-lg px-6 py-10 text-center'
        >
          <CircleCheck aria-hidden className='size-8 text-cyan-300' />
          <div className='space-y-2'>
            <h2 className='text-xl font-semibold tracking-tight'>
              {t('Inquiry submitted.')}
            </h2>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {t(
                'A solutions architect received your request and will email a tailored evaluation shortly.'
              )}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            className='mt-2'
            onClick={() => setSubmitted(false)}
          >
            {t('Submit another inquiry')}
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className='relative flex flex-col gap-6'
          >
            <div
              data-contact-field-row
              className='grid grid-cols-1 gap-5 sm:grid-cols-2'
            >
              <FormField
                control={form.control}
                name='company'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <Field data-invalid={fieldState.invalid}>
                      <ContactBilingualLabel hint='COMPANY NAME'>
                        {t('Company name')} *
                      </ContactBilingualLabel>
                      <ContactIconField icon={Building2}>
                        <Input
                          autoComplete='organization'
                          className={fieldInputClassName}
                          placeholder={t('Acme Robotics, Inc.')}
                          {...field}
                        />
                      </ContactIconField>
                      <FormMessage />
                    </Field>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <Field data-invalid={fieldState.invalid}>
                      <ContactBilingualLabel hint='WORK EMAIL'>
                        {t('Work email')} *
                      </ContactBilingualLabel>
                      <ContactIconField icon={Mail}>
                        <Input
                          type='email'
                          autoComplete='email'
                          className={fieldInputClassName}
                          placeholder={t('name@company.com')}
                          {...field}
                        />
                      </ContactIconField>
                      <FormMessage />
                    </Field>
                  </FormItem>
                )}
              />
            </div>

            <div
              data-contact-field-row
              className='grid grid-cols-1 gap-5 sm:grid-cols-2'
            >
              <FormField
                control={form.control}
                name='phone'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <Field data-invalid={fieldState.invalid}>
                      <ContactBilingualLabel hint='PHONE / WECHAT'>
                        {t('Phone / WeChat')} *
                      </ContactBilingualLabel>
                      <ContactIconField icon={Phone}>
                        <Input
                          type='tel'
                          autoComplete='tel'
                          className={fieldInputClassName}
                          placeholder={t('A number we can reach you on')}
                          {...field}
                        />
                      </ContactIconField>
                      <FormMessage />
                    </Field>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='requestedModel'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <Field data-invalid={fieldState.invalid}>
                      <ContactBilingualLabel hint='DESIRED MODELS'>
                        {t('Requested models')} *
                      </ContactBilingualLabel>
                      <ContactIconField icon={Brain}>
                        <Input
                          className={fieldInputClassName}
                          placeholder={t('Claude, GPT-4o, DeepSeek-V3')}
                          {...field}
                        />
                      </ContactIconField>
                      <FormMessage />
                    </Field>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='monthlyBudget'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FieldSet>
                    <div className='flex items-center justify-between gap-3'>
                      <FieldLegend
                        variant='label'
                        className='text-muted-foreground mb-0 text-xs font-semibold tracking-wide'
                      >
                        {t('Monthly budget')}
                      </FieldLegend>
                      <span className='font-mono text-[11px] tracking-[0.12em] text-violet-300 uppercase'>
                        MONTHLY BUDGET
                      </span>
                    </div>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? '')}
                      className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'
                      aria-invalid={fieldState.invalid}
                      data-contact-budget-options
                    >
                      {MONTHLY_BUDGET_OPTIONS.map((option) => (
                        <FieldLabel
                          key={option.value}
                          className='bg-muted/40 hover:bg-muted/70 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-3 font-normal has-data-checked:bg-violet-700/20 has-data-checked:ring-1 has-data-checked:ring-violet-400/40'
                        >
                          <RadioGroupItem value={option.value} />
                          <span className='font-mono text-sm'>
                            {t(option.labelKey)}
                          </span>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                    <FormMessage />
                  </FieldSet>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field, fieldState }) => (
                <FormItem>
                  <Field data-invalid={fieldState.invalid}>
                    <ContactBilingualLabel hint='PROJECT DETAILS'>
                      {t('Requirements (optional)')}
                    </ContactBilingualLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        className='bg-muted/40 focus-visible:bg-muted/70 min-h-28 resize-none border-transparent text-sm'
                        placeholder={t(
                          'Describe your workload, concurrency, or latency needs'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </Field>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='website'
              render={({ field }) => (
                <div
                  className='absolute -left-[9999px] h-0 w-0 overflow-hidden'
                  aria-hidden
                >
                  <Input autoComplete='off' {...field} tabIndex={-1} />
                </div>
              )}
            />

            {isTurnstileEnabled ? (
              <Turnstile
                key={turnstileWidgetKey}
                siteKey={turnstileSiteKey}
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
              />
            ) : null}

            <div className='text-muted-foreground flex items-start gap-2.5'>
              <Lock
                aria-hidden
                className='mt-0.5 size-4 shrink-0 text-cyan-300'
              />
              <p className='text-xs leading-relaxed'>
                {t(
                  'We protect your business information. We do not retain request logs or share company details with third parties.'
                )}{' '}
                {isPrivacyPolicyEnabled(status) ? (
                  <a
                    href={privacyHref}
                    className='underline underline-offset-4'
                  >
                    {t('Privacy Policy')}
                  </a>
                ) : null}
              </p>
            </div>

            <Button
              type='submit'
              disabled={isSubmitting}
              className='h-auto w-full rounded-xl bg-gradient-to-r from-violet-700 via-purple-600 to-violet-700 py-4 text-base font-semibold text-white shadow-lg shadow-violet-700/30 hover:from-violet-600 hover:via-purple-500 hover:to-violet-600 hover:text-white'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  {t('Submitting')}
                </>
              ) : (
                <>
                  {t('Submit inquiry')}
                  <Zap aria-hidden className='size-4' />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}

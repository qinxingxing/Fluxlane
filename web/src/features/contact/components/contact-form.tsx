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
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
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

  if (submitted) {
    return (
      <div
        role='status'
        className='border-border/50 bg-muted/10 rounded-2xl border px-6 py-10 text-center'
      >
        <h2 className='text-xl font-semibold tracking-tight'>
          {t(
            'Thank you. We received your inquiry and will follow up by email.'
          )}
        </h2>
        <Button
          type='button'
          variant='outline'
          className='mt-6'
          onClick={() => setSubmitted(false)}
        >
          {t('Submit another inquiry')}
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className='relative'
      >
        <FieldGroup>
          <FormField
            control={form.control}
            name='company'
            render={({ field, fieldState }) => (
              <FormItem>
                <Field data-invalid={fieldState.invalid}>
                  <FormLabel>{t('Company name')}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete='organization'
                      placeholder={t('Your company')}
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
            name='email'
            render={({ field, fieldState }) => (
              <FormItem>
                <Field data-invalid={fieldState.invalid}>
                  <FormLabel>{t('Email')}</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      autoComplete='email'
                      placeholder={t('name@example.com')}
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
            name='phone'
            render={({ field, fieldState }) => (
              <FormItem>
                <Field data-invalid={fieldState.invalid}>
                  <FormLabel>{t('Phone')}</FormLabel>
                  <FormControl>
                    <Input
                      type='tel'
                      autoComplete='tel'
                      placeholder={t('+1 415 555 2671')}
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
            name='requestedModel'
            render={({ field, fieldState }) => (
              <FormItem>
                <Field data-invalid={fieldState.invalid}>
                  <FormLabel>{t('Requested models')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('GPT-4o, Claude, Gemini')}
                      {...field}
                    />
                  </FormControl>
                  <FieldDescription>
                    {t('Tell us which models you need to access.')}
                  </FieldDescription>
                  <FormMessage />
                </Field>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='monthlyBudget'
            render={({ field, fieldState }) => (
              <FormItem>
                <FieldSet>
                  <FieldLegend variant='label'>
                    {t('Monthly budget')}
                  </FieldLegend>
                  <RadioGroup
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    className='grid gap-2 sm:grid-cols-2'
                    aria-invalid={fieldState.invalid}
                  >
                    {MONTHLY_BUDGET_OPTIONS.map((option) => (
                      <FieldLabel
                        key={option.value}
                        className='border-border/60 hover:bg-muted/40 has-data-checked:border-primary/50 has-data-checked:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal'
                      >
                        <RadioGroupItem value={option.value} />
                        {t(option.labelKey)}
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
                  <FormLabel>{t('Requirements (optional)')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder={t(
                        'Describe volume, integration needs, or timeline'
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
        </FieldGroup>
        {isTurnstileEnabled ? (
          <div className='mt-6'>
            <Turnstile
              key={turnstileWidgetKey}
              siteKey={turnstileSiteKey}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken('')}
            />
          </div>
        ) : null}
        {isPrivacyPolicyEnabled(status) ? (
          <p className='text-muted-foreground mt-6 text-sm leading-relaxed'>
            {t('We use this information to follow up on your inquiry.')}{' '}
            <a href={privacyHref} className='underline underline-offset-4'>
              {t('Privacy Policy')}
            </a>
          </p>
        ) : null}
        <Button
          type='submit'
          className='mt-6 w-full sm:w-auto'
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              {t('Submitting')}
            </>
          ) : (
            t('Submit inquiry')
          )}
        </Button>
      </form>
    </Form>
  )
}

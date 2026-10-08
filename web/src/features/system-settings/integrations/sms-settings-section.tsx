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
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useResetForm } from '../hooks/use-reset-form'
import { useUpdateOption } from '../hooks/use-update-option'

const smsSchema = z.object({
  SMSTencentSecretId: z.string(),
  SMSTencentSecretKey: z.string(),
  SMSTencentSdkAppId: z.string(),
  SMSTencentSignName: z.string(),
  SMSTencentTemplateId: z.string(),
  SMSTencentRegion: z.string(),
})

type SmsFormValues = z.infer<typeof smsSchema>

type SmsSettingsSectionProps = {
  defaultValues: SmsFormValues
}

export function SmsSettingsSection(props: SmsSettingsSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const form = useForm<SmsFormValues>({
    resolver: zodResolver(smsSchema),
    defaultValues: props.defaultValues,
  })

  useResetForm(form, props.defaultValues)

  const onSubmit = async (values: SmsFormValues) => {
    const sanitized = {
      SMSTencentSecretId: values.SMSTencentSecretId.trim(),
      SMSTencentSecretKey: values.SMSTencentSecretKey.trim(),
      SMSTencentSdkAppId: values.SMSTencentSdkAppId.trim(),
      SMSTencentSignName: values.SMSTencentSignName.trim(),
      SMSTencentTemplateId: values.SMSTencentTemplateId.trim(),
      SMSTencentRegion: values.SMSTencentRegion.trim() || 'ap-guangzhou',
    }
    const initial = {
      SMSTencentSecretId: props.defaultValues.SMSTencentSecretId.trim(),
      SMSTencentSecretKey: props.defaultValues.SMSTencentSecretKey.trim(),
      SMSTencentSdkAppId: props.defaultValues.SMSTencentSdkAppId.trim(),
      SMSTencentSignName: props.defaultValues.SMSTencentSignName.trim(),
      SMSTencentTemplateId: props.defaultValues.SMSTencentTemplateId.trim(),
      SMSTencentRegion: props.defaultValues.SMSTencentRegion.trim(),
    }
    const updates: Array<{ key: string; value: string }> = []
    const keys = [
      'SMSTencentSecretId',
      'SMSTencentSdkAppId',
      'SMSTencentSignName',
      'SMSTencentTemplateId',
      'SMSTencentRegion',
    ] as const
    for (const key of keys) {
      if (sanitized[key] !== initial[key]) {
        updates.push({ key, value: sanitized[key] })
      }
    }
    if (
      sanitized.SMSTencentSecretKey &&
      sanitized.SMSTencentSecretKey !== initial.SMSTencentSecretKey
    ) {
      updates.push({
        key: 'SMSTencentSecretKey',
        value: sanitized.SMSTencentSecretKey,
      })
    }
    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  return (
    <SettingsSection title={t('Tencent Cloud SMS')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            saveLabel='Save SMS settings'
          />
          <FormField
            control={form.control}
            name='SMSTencentSecretId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Secret ID')}</FormLabel>
                <FormControl>
                  <Input autoComplete='off' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='SMSTencentSecretKey'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Secret Key')}</FormLabel>
                <FormControl>
                  <Input type='password' autoComplete='off' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='SMSTencentSdkAppId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('SDK App ID')}</FormLabel>
                <FormControl>
                  <Input autoComplete='off' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='SMSTencentSignName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('SMS signature')}</FormLabel>
                <FormControl>
                  <Input autoComplete='off' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='SMSTencentTemplateId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Template ID')}</FormLabel>
                <FormControl>
                  <Input autoComplete='off' {...field} />
                </FormControl>
                <FormDescription>
                  {t(
                    'The template must include one parameter for the verification code.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='SMSTencentRegion'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Region')}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete='off'
                    placeholder='ap-guangzhou'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}

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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'

import { getPrivacyPolicy } from './api'
import { FluxlanePrivacyPolicy } from './fluxlane-privacy-policy-page'
import { LegalDocument } from './legal-document'

export function PrivacyPolicy() {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: ['privacy-policy'],
    queryFn: getPrivacyPolicy,
    staleTime: 10 * 60 * 1000,
  })

  if ((data?.data?.trim() ?? '').length > 0) {
    return (
      <LegalDocument
        title={t('Privacy Policy')}
        queryKey='privacy-policy'
        fetchDocument={getPrivacyPolicy}
        emptyMessage={t(
          'The administrator has not configured a privacy policy yet.'
        )}
      />
    )
  }

  return (
    <PublicLayout>
      <FluxlanePrivacyPolicy />
    </PublicLayout>
  )
}

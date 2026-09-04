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
import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPolicy } from '@/features/legal'
import { getPrivacyPolicy } from '@/features/legal/api'
import { privacyPolicySeo, usePageSeo } from '@/lib/seo'

function PrivacyPolicyPage() {
  usePageSeo(privacyPolicySeo)
  return <PrivacyPolicy />
}

export const Route = createFileRoute('/privacy-policy')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ['privacy-policy'],
      queryFn: getPrivacyPolicy,
      staleTime: 10 * 60 * 1000,
    }),
  component: PrivacyPolicyPage,
})

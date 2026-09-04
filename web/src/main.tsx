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
import { startPublic } from '@/bootstrap-public'
import { startSpa } from '@/bootstrap-spa'
import { installBuildMetadata } from '@/lib/build-metadata'
import '@/lib/dayjs'
import { initializeFrontendCache } from '@/lib/frontend-cache'
import type { createAppRouter } from '@/router'
import './i18n/config'
import './styles/index.css'

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

initializeFrontendCache()
installBuildMetadata()

const isConsoleBuild = import.meta.env.VITE_SITE_MODE === 'console'
const isDev = import.meta.env.DEV

if (isConsoleBuild || isDev) {
  startSpa()
} else {
  startPublic()
}

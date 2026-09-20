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
import { cn } from '@/lib/utils'

/** Scroll distance that switches the public header into the frosted sticky state. */
export const PUBLIC_HEADER_SCROLL_THRESHOLD_PX = 20

export const publicHeaderRootClassName =
  'fixed inset-x-0 top-0 z-50 w-full transition-all duration-300'

export const publicHeaderInnerClassName =
  'mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6'

export const publicHeaderNavItemClassName =
  'rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/5 hover:text-white'

export const publicHeaderNavItemActiveClassName =
  'rounded-lg border border-purple-500/20 bg-purple-500/10 px-3.5 py-1.5 text-sm font-medium text-purple-300'

export function publicHeaderBarClassName(scrolled: boolean): string {
  return cn(
    'w-full text-white transition-all duration-300',
    scrolled
      ? 'border-b border-purple-500/25 bg-[#0c112e]/85 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7),0_0_20px_0_rgba(124,58,237,0.12)] backdrop-blur-xl'
      : 'border-b border-white/[0.06] bg-[#0c112e]/40 backdrop-blur-md'
  )
}

export const publicFooterClassName =
  'relative z-10 border-t border-white/10 bg-[#070a20] text-sm text-slate-400'

export const publicFooterLinkClassName =
  'transition-colors hover:text-purple-300'

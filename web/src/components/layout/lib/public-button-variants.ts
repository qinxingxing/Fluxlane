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
import { cva } from 'class-variance-authority'

export const publicButtonVariants = cva(
  "group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c112e] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-purple-600 text-white shadow-lg shadow-purple-600/30 hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-purple-600/50 active:scale-[0.98] active:bg-purple-800',
        outline:
          'border border-white/15 bg-white/[0.03] font-medium text-slate-200 hover:border-purple-400/50 hover:bg-white/[0.08] hover:text-white',
        ghost:
          'font-medium text-slate-300 hover:bg-purple-500/10 hover:text-purple-300',
        destructive:
          'border border-rose-500/20 bg-rose-500/10 font-medium text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/20',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        default: 'h-[38px] px-4 text-sm',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

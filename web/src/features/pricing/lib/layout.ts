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

/** Stable layout contracts for the public model marketplace. */
export const pricingLayout = {
  pageShell: 'relative min-h-[calc(100svh-var(--app-header-height,3rem))]',
  pageContainer:
    'relative mx-auto w-full max-w-7xl px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 xl:px-8',
  pageGrid: 'grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]',
  atmosphereFill:
    'pointer-events-none absolute inset-0 bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))] dark:bg-[#0c112e]',
  atmosphereGlow:
    'pointer-events-none absolute inset-0 opacity-50 dark:opacity-40',
  atmosphereGrid:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--primary)_28%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--primary)_28%,transparent)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-[0.35] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] dark:opacity-100',
  sidebar:
    'overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm',
  sidebarSticky:
    'hover-scrollbar sticky top-4 hidden max-h-[calc(100dvh-2rem)] self-start overflow-y-auto xl:block',
  filterChip:
    'inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors',
  filterChipActive: 'border-primary/50 bg-primary/15 text-primary',
  filterChipInactive:
    'border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
  toolbar:
    'flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between',
  cardGrid: 'grid grid-cols-1 gap-6 lg:grid-cols-2',
  card: 'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_color-mix(in_oklch,var(--primary)_15%,transparent)]',
  searchInput:
    'border-border/60 bg-card placeholder:text-muted-foreground/50 hover:border-border focus:border-primary/50 focus:ring-primary/20 h-10 w-full rounded-full border pr-16 pl-10 text-sm transition-all outline-none focus:ring-2',
} as const

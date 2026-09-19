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
export const aboutPageLayout = {
  page: 'relative min-h-screen overflow-x-hidden pt-24 pb-20 text-[#dee0ff]',
  backdrop:
    'pointer-events-none absolute inset-0 bg-[#0c112e] bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]',
  container: 'relative mx-auto max-w-[1280px] px-4 md:px-10',
  hero: 'grid grid-cols-1 items-center gap-12 pt-20 pb-24 text-center md:grid-cols-2 md:text-left',
  visual:
    'group relative h-[400px] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#161b33]/80 backdrop-blur-xl',
  story: 'mx-auto max-w-3xl text-center md:text-left',
  backing: 'grid grid-cols-1 items-start gap-12 md:grid-cols-2',
  values: 'grid grid-cols-1 gap-6 md:grid-cols-3',
  section: 'border-t border-white/5 py-20',
}

/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the GNU Affero General Public License as
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
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False during server rendering and during the hydration pass, true
 * afterwards. Use it to keep visitor-specific UI (auth state, persisted
 * preferences) out of the deterministic first frame: the prerendered HTML
 * and the first client render stay identical, and the real state is
 * applied in a follow-up render after hydration.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

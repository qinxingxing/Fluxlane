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
import { useEffect, useState } from 'react'

import { isHttpUrl } from '@/lib/content-format'

import { getHomePageContent } from '../api'
import type { HomePageContentResult } from '../types'

const STORAGE_KEY = 'home_page_content'

/**
 * Hook to load and manage custom home page content
 * Supports both Markdown/HTML content and iframe URLs
 *
 * The default landing renders immediately: cached custom content (if any)
 * is read synchronously as the initial state and the API only refreshes it
 * afterwards. This keeps the public first paint free of a loading gate.
 */
export function useHomePageContent(): HomePageContentResult {
  // First frame is always the in-repo landing. Cached custom HTML is a
  // visitor-specific override and must not participate in hydration.
  const [state, setState] = useState<{ content: string; isLoaded: boolean }>({
    content: '',
    isLoaded: true,
  })

  useEffect(() => {
    let mounted = true

    const loadContent = async () => {
      try {
        const response = await getHomePageContent()
        const { success, data } = response

        if (!mounted) return

        if (success && data) {
          setState({ content: data, isLoaded: true })
          localStorage.setItem(STORAGE_KEY, data)
        } else {
          // Clear content if API returns empty
          setState({ content: '', isLoaded: true })
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        if (!mounted) return
        // eslint-disable-next-line no-console
        console.error('Failed to load home page content:', error)
        setState((prev) => ({ ...prev, isLoaded: true }))
      }
    }

    loadContent()

    return () => {
      mounted = false
    }
  }, [])

  const isUrl = isHttpUrl(state.content)

  return { content: state.content, isLoaded: state.isLoaded, isUrl }
}

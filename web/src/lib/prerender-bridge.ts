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
/**
 * Bridge between the build-time prerenderer and the client bundle.
 *
 * The SEO post-build step emits `window.__FLUXLANE_PRERENDER__` into each
 * prerendered HTML file. The client uses it to (1) hydrate the react-query
 * cache with the exact data the HTML was rendered with, and (2) pin the
 * initial i18n language to the prerendered one so hydration is stable, then
 * switch to the visitor's detected language after mount.
 */

export type PrerenderState = {
  route: string
  dehydratedQueries?: unknown
}

declare global {
  interface Window {
    __FLUXLANE_PRERENDER__?: PrerenderState
    __FLUXLANE_HYDRATION_ERROR__?: string
  }
}

let prerendering = false
let hydrationLocked = false
let wasPrerendered = false

/**
 * Marks the current JS runtime as the build-time prerenderer. Runtime
 * behaviors that depend on the real browser origin (domain routing, auth
 * bootstrap) must stay out of prerendered HTML.
 */
export function markPrerendering(): void {
  prerendering = true
}

export function isPrerendering(): boolean {
  return prerendering
}

/**
 * True while the prerenderer is running, and on the client from the
 * moment prerendered HTML is consumed until the first hydration commit.
 * Use this to keep beforeLoad (auth, setup, live module flags) from
 * changing the tree that React must hydrate against.
 */
export function isPrerenderHydration(): boolean {
  return prerendering || hydrationLocked
}

export function beginPrerenderHydration(): void {
  hydrationLocked = true
  wasPrerendered = true
}

export function endPrerenderHydration(): void {
  hydrationLocked = false
}

export function readPrerenderState(): PrerenderState | null {
  if (typeof window === 'undefined') return null
  const state = window.__FLUXLANE_PRERENDER__ ?? null
  if (state) {
    wasPrerendered = true
  }
  return state
}

/** Whether the current page was served from a prerendered HTML file. */
export function wasPrerenderedPage(): boolean {
  return wasPrerendered
}

/**
 * Consume the flag once so later navigations behave like a normal SPA.
 * Returns the state the first time it is called on a prerendered page.
 */
export function takePrerenderState(): PrerenderState | null {
  const state = readPrerenderState()
  if (state) {
    beginPrerenderHydration()
    delete window.__FLUXLANE_PRERENDER__
  }
  return state
}

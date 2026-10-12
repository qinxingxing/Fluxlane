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
 * Hydration smoke test (dev tool, not shipped): loads a prerendered page
 * from the local static server in jsdom, executes the real client bundle,
 * and reports hydration/runtime errors and post-hydration page state.
 *
 * Usage: node scripts/hydration-smoke.mjs <path>  (server on :8090)
 */

import { JSDOM, VirtualConsole } from 'jsdom'

const path = process.argv[2] ?? '/'
const url = `http://localhost:${process.env.PORT ?? '8090'}${path}`

const consoleMessages = []
const pageErrors = []

const virtualConsole = new VirtualConsole()
virtualConsole.on('error', (...args) =>
  consoleMessages.push(['error', args.map(String).join(' ')])
)
virtualConsole.on('warn', (...args) =>
  consoleMessages.push(['warn', args.map(String).join(' ')])
)
virtualConsole.on('jsdomError', (err) => pageErrors.push(String(err)))

const dom = await JSDOM.fromURL(url, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.matchMedia =
      window.matchMedia ||
      ((query) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }))
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.IntersectionObserver =
      window.IntersectionObserver ?? IntersectionObserverStub
    window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub
    window.HTMLElement.prototype.scrollIntoView = () => undefined
    window.fetch =
      window.fetch ??
      (() => Promise.reject(new Error('jsdom: no fetch, use XHR')))
  },
})

await new Promise((resolve) => setTimeout(resolve, 6000))

const { document } = dom.window
const result = {
  url,
  title: document.title,
  rootChildren: document.querySelector('#root')?.children.length ?? -1,
  h1: document.querySelector('h1')?.textContent?.slice(0, 60) ?? null,
  canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
  hydrationErrors: consoleMessages
    .filter(([level, msg]) =>
      /hydrat|did not match|server rendered|Minified React error/i.test(msg)
    )
    .map(([, msg]) => msg.slice(0, 300)),
  reactErrors: consoleMessages
    .filter(([level, msg]) => level === 'error')
    .map(([, msg]) => msg.slice(0, 200))
    .slice(0, 10),
  pageErrors: pageErrors.map((e) => e.slice(0, 200)).slice(0, 10),
  warningCount: consoleMessages.filter(([l]) => l === 'warn').length,
}

console.log(JSON.stringify(result, null, 2))
dom.window.close()
process.exit(0)

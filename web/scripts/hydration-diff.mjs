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
 * Dev tool: diff the text nodes of the prerendered HTML (scripts disabled)
 * against the post-hydration DOM (scripts enabled) to locate hydration
 * text mismatches. Usage: node scripts/hydration-diff.mjs <path>
 */

import { JSDOM, VirtualConsole } from 'jsdom'

const pathArg = process.argv[2] ?? '/'
const url = `http://localhost:8090${pathArg}`

const silentConsole = new VirtualConsole()
// jsdom cannot parse modern CSS and the local static server 403/404s API
// XHRs; neither affects text-node comparison.

function collectTexts(dom) {
  const root = dom.window.document.querySelector('#root')
  if (!root) return []
  const walker = dom.window.document.createTreeWalker(
    root,
    dom.window.NodeFilter.SHOW_TEXT
  )
  const texts = []
  let node
  while ((node = walker.nextNode())) {
    const value = node.nodeValue?.trim()
    if (value) texts.push(value)
  }
  return texts
}

const staticDom = await JSDOM.fromURL(url, {
  runScripts: 'outside-only',
  virtualConsole: silentConsole,
})
const staticTexts = collectTexts(staticDom)
staticDom.window.close()

const liveDom = await JSDOM.fromURL(url, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
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
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.IntersectionObserver = window.IntersectionObserver ?? IO
    window.ResizeObserver = window.ResizeObserver ?? RO
    window.HTMLElement.prototype.scrollIntoView = () => undefined
    window.fetch = window.fetch ?? (() => Promise.reject(new Error('no fetch')))
  },
})
await new Promise((resolve) => setTimeout(resolve, 6000))
const liveTexts = collectTexts(liveDom)

console.log('static text nodes:', staticTexts.length)
console.log('live text nodes:', liveTexts.length)
console.log('--- texts only in STATIC (possible dropped/mismatch) ---')
for (const t of staticTexts) {
  if (!liveTexts.includes(t)) console.log(' S:', JSON.stringify(t.slice(0, 90)))
}
console.log('--- texts only in LIVE (added after hydration) ---')
for (const t of liveTexts) {
  if (!staticTexts.includes(t))
    console.log(' L:', JSON.stringify(t.slice(0, 90)))
}
liveDom.window.close()

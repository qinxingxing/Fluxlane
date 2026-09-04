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

/**
 * Hydration acceptance check for the prerendered public pages.
 *
 * Serves web/dist locally, loads every prerendered page in headless
 * Chromium, and FAILS (exit 1) when:
 *
 * - React reports a hydration mismatch / recoverable error (#418 etc.),
 * - the H1 or main content disappears at any point during load,
 * - the final DOM loses the prerendered heading or footer.
 *
 * API calls to the production origin are blocked: the deterministic
 * first frame must not depend on network timing. (On the real site the
 * API is cross-origin with an explicit CORS allowlist; previews on
 * *.pages.dev have no API access by design.)
 *
 * Requirements: dist/ built with VITE_SITE_MODE=public, playwright-core
 * with a chromium executable (see docs/seo/SEO_PHASE_1.md for the
 * headless-shell + system libraries bootstrap used on the dev host).
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
}

const PORT = Number(process.env.SEO_HYDRATION_PORT || 18223)
const CHROME_LIBS = process.env.LD_LIBRARY_PATH
  ? undefined
  : '/tmp/chrome-libs/root/usr/lib/x86_64-linux-gnu'

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`)
      // Deterministic first frame: block every same-origin API call.
      if (url.pathname.startsWith('/api/')) {
        res.writeHead(403, { 'content-type': 'application/json' })
        res.end('{"success":false,"message":"blocked by hydration check"}')
        return
      }
      const fileFor = (candidate) => {
        if (existsSync(candidate) && !candidate.endsWith('/')) {
          const stat = statSync(candidate)
          if (stat.isFile()) return candidate
        }
        const index = path.join(candidate, 'index.html')
        return existsSync(index) ? index : null
      }
      const requested =
        url.pathname === '/'
          ? path.join(DIST, 'index.html')
          : path.join(DIST, url.pathname)
      const file = fileFor(requested)
      if (!file) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
        res.end(await readFile(path.join(DIST, '404.html'), 'utf8'))
        return
      }
      if (res.headersSent) return
      res.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      })
      res.end(await readFile(file))
    } catch {
      if (!res.headersSent) res.writeHead(500)
      res.end('internal error')
    }
  })
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)))
}

const PAGES = ['/', '/about', '/pricing', '/privacy-policy', '/user-agreement']

async function main() {
  const server = await startServer()
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    env: {
      ...process.env,
      ...(CHROME_LIBS
        ? {
            LD_LIBRARY_PATH: [CHROME_LIBS, process.env.LD_LIBRARY_PATH]
              .filter(Boolean)
              .join(':'),
          }
        : {}),
    },
  })

  let failures = 0

  for (const pagePath of PAGES) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const hydrationErrors = []
    page.on('pageerror', (error) => {
      hydrationErrors.push(String(error))
    })
    page.on('console', (message) => {
      const text = message.text()
      if (
        message.type() === 'error' &&
        (/hydration|hydrat/i.test(text) ||
          /React error #4(18|23|25)/.test(text) ||
          text.includes('[fluxlane-hydration]'))
      ) {
        hydrationErrors.push(text)
      }
    })
    // Block the production API: the deterministic first frame must not
    // depend on cross-origin network timing.
    await page.route('**/api/**', (route) => route.abort())

    await page.goto(`http://localhost:${PORT}${pagePath}`, {
      waitUntil: 'domcontentloaded',
    })

    const early = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      textLen: (document.getElementById('root')?.textContent || '').trim()
        .length,
    }))

    // Sample the H1 across load: it must never disappear.
    let h1Disappeared = false
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(300)
      const hasH1 = await page.evaluate(
        () => !!document.querySelector('#root h1')
      )
      if (!hasH1) h1Disappeared = true
    }

    const final = await page.evaluate(() => ({
      h1: document.querySelector('#root h1')?.textContent?.trim() ?? null,
      textLen: (document.getElementById('root')?.textContent || '').trim()
        .length,
      footer: !!document.querySelector('#root footer'),
      title: document.title,
      hydrationFlag:
        window.__FLUXLANE_HYDRATION_ERROR__ ?? null,
    }))

    const problems = []
    if (hydrationErrors.length > 0) {
      problems.push(
        `hydration errors (${hydrationErrors.length}): ${hydrationErrors[0].slice(0, 160)}`
      )
    }
    if (final.hydrationFlag) {
      problems.push(`hydration flag: ${final.hydrationFlag.slice(0, 160)}`)
    }
    if (!early.h1) problems.push('no H1 before hydration')
    if (h1Disappeared) problems.push('H1 disappeared during load')
    if (!final.h1) problems.push('no H1 after hydration')
    if (!early.textLen) problems.push('no prerendered text content')
    if (final.textLen < early.textLen * 0.5) {
      problems.push('content shrank drastically after hydration')
    }
    if (!final.footer) problems.push('footer missing after hydration')

    if (problems.length > 0) {
      failures += 1
      console.log(`FAIL ${pagePath}`)
      for (const problem of problems) console.log(`  - ${problem}`)
    } else {
      console.log(
        `PASS ${pagePath} (h1="${final.h1.slice(0, 40)}", text ${early.textLen}->${final.textLen})`
      )
    }
    await context.close()
  }

  await browser.close()
  server.close()

  if (failures > 0) {
    console.error(`hydration check FAILED for ${failures} page(s)`)
    process.exit(1)
  }
  console.log('hydration check passed for all prerendered pages')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

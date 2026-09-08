import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { looksLikeConsolePages, resolveSiteMode } from './resolve-site-mode'

describe('resolveSiteMode', () => {
  test('honors an explicit VITE_SITE_MODE', () => {
    assert.equal(resolveSiteMode({ VITE_SITE_MODE: 'console' }), 'console')
    assert.equal(resolveSiteMode({ VITE_SITE_MODE: 'public' }), 'public')
  })

  test('defaults to public when Cloudflare env is absent', () => {
    assert.equal(resolveSiteMode({}), 'public')
  })

  test('detects the console Pages project from CF_PAGES_URL', () => {
    assert.equal(
      resolveSiteMode({
        CF_PAGES_URL: 'https://fluxlane-console.pages.dev',
      }),
      'console'
    )
    assert.equal(
      looksLikeConsolePages({
        CF_PAGES_URL: 'https://console.fluxlane.ai',
      }),
      true
    )
  })

  test('does not treat the www Pages project as console', () => {
    assert.equal(
      resolveSiteMode({
        CF_PAGES_URL: 'https://fluxlane.pages.dev',
      }),
      'public'
    )
  })
})

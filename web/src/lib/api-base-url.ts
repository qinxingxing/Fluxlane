/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''

const configuredPublicApiBaseUrl =
  (import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined)?.trim() ?? ''

function normalizeApiBaseUrl(value: string): string {
  if (!value) return ''

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute http(s) URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use http or https')
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== '' && parsed.pathname !== '/')
  ) {
    throw new Error('VITE_API_BASE_URL must contain only scheme and host')
  }

  return parsed.origin
}

const FLUXLANE_FRONTEND_HOSTNAMES = new Set([
  'www.fluxlane.ai',
  'console.fluxlane.ai',
])
const FLUXLANE_PLATFORM_API_ORIGIN = 'https://api.fluxlane.ai'
const FLUXLANE_PUBLIC_API_ORIGIN = 'https://run.fluxlane.ai'

function isFluxlaneFrontend(): boolean {
  return (
    typeof window !== 'undefined' &&
    FLUXLANE_FRONTEND_HOSTNAMES.has(window.location.hostname)
  )
}

const normalizedConfiguredApiBaseUrl = normalizeApiBaseUrl(configuredApiBaseUrl)

export const API_BASE_URL = isFluxlaneFrontend()
  ? FLUXLANE_PLATFORM_API_ORIGIN
  : normalizedConfiguredApiBaseUrl

const normalizedConfiguredPublicApiBaseUrl = normalizeApiBaseUrl(
  configuredPublicApiBaseUrl
)

export const PUBLIC_API_BASE_URL = isFluxlaneFrontend()
  ? FLUXLANE_PUBLIC_API_ORIGIN
  : normalizedConfiguredPublicApiBaseUrl

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export function getPublicApiOrigin(): string {
  if (PUBLIC_API_BASE_URL) return PUBLIC_API_BASE_URL
  if (API_BASE_URL) return API_BASE_URL
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

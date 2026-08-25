# Standalone frontend

The dashboard is a static Rsbuild application. It does not require Node.js,
Go, PostgreSQL, or Redis after the build finishes.

## Build

```sh
cd web
bun install --frozen-lockfile
VITE_API_BASE_URL=https://api-test.fluxlane.ai bun run build:check
```

Publish `web/dist` to Cloudflare Pages. When the Pages project root is
`web`, use `bun run build` as the build command and `dist` as the output
directory. The checked-in `_redirects` file provides SPA route fallback.

## Backend

Use the following variables for a separated test deployment:

```env
SERVE_FRONTEND=false
CORS_ALLOW_ORIGINS=https://test.fluxlane.ai
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_TRUSTED_URL=https://test.fluxlane.ai
FRONTEND_BASE_URL=https://test.fluxlane.ai
```

For production, replace the test origin with `https://www.fluxlane.ai`.
Multiple exact origins are comma separated. Wildcards and URL paths are
rejected.

`SERVE_FRONTEND=false` disables the embedded dashboard fallback while leaving
API, relay, webhook, and health endpoints available.

Production launch checks and billing reconciliation are in
`docs/production-launch-test-plan.md`. Capacity Phase 1 is complete; do not
re-run load tests unless the documented regression triggers fire.

## Security

- Never put a secret in a `VITE_*` variable; build variables are public.
- Do not cache `/api/*`, `/v1/*`, login, billing, or webhook responses.
- Use an exact CORS allowlist when browser credentials are enabled.
- Keep Stripe webhooks and OAuth server callbacks on the API origin.
- The browser OAuth redirect URI remains on the frontend origin.

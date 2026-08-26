import http from 'k6/http';
import { Counter } from 'k6/metrics';

// B17 helper: fire TOTAL requests through Run CLB. Do not set TARGET_HOST.
// Operator must set token remain to cover about ALLOWED requests first.
const success = new Counter('billing_success');
const denied = new Counter('billing_denied');
const other = new Counter('billing_other');

const SNI = __ENV.SNI || __ENV.RUN_HOST || 'run.fluxlane.ai';
const API_KEY = __ENV.TEST_API_KEY;
const MODEL = __ENV.TEST_MODEL || 'gpt-4o-mini';
const TOTAL = Number(__ENV.TOTAL_REQUESTS || 20);
const ALLOWED = Number(__ENV.ALLOWED || 5);

if (!API_KEY) {
  throw new Error('TEST_API_KEY is required');
}
if (__ENV.TARGET_HOST) {
  throw new Error('Do not set TARGET_HOST; B17 must go through CLB so both RUN nodes share state');
}

export const options = {
  scenarios: {
    burst: {
      executor: 'shared-iterations',
      vus: Math.min(TOTAL, Number(__ENV.VUS || TOTAL)),
      iterations: TOTAL,
      maxDuration: '5m',
    },
  },
};

const payload = JSON.stringify({
  model: MODEL,
  stream: false,
  max_tokens: 8,
  messages: [{ role: 'user', content: 'Reply with the single word pong.' }],
});

export default function () {
  const res = http.post(`https://${SNI}/v1/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: '120s',
  });
  if (res.status === 200) {
    success.add(1);
  } else if (res.status === 403) {
    denied.add(1);
  } else {
    other.add(1);
  }
}

export function handleSummary(data) {
  const ok = (data.metrics.billing_success && data.metrics.billing_success.values.count) || 0;
  const deny = (data.metrics.billing_denied && data.metrics.billing_denied.values.count) || 0;
  const rest = (data.metrics.billing_other && data.metrics.billing_other.values.count) || 0;
  let line = `http_200=${ok} http_403=${deny} other=${rest} allowed=${ALLOWED}\n`;
  if (ok > ALLOWED) {
    line += `FAIL Provider-proxy HTTP 200 (${ok}) > allowed (${ALLOWED})\n`;
  } else {
    line += `http_200 <= allowed; still confirm remain >= 0 with ./underfunded-burst.sh or /api/usage/token/\n`;
  }
  return { stdout: line };
}

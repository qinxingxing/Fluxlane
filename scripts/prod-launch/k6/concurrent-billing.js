import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const success = new Counter('billing_success');
const failed = new Counter('billing_failed');

const SNI = __ENV.SNI || __ENV.RUN_HOST || 'run.fluxlane.ai';
const API_KEY = __ENV.TEST_API_KEY;
const MODEL = __ENV.TEST_MODEL || 'gpt-4o-mini';
const TOTAL = Number(__ENV.TOTAL_REQUESTS || 20);

if (!API_KEY) {
  throw new Error('TEST_API_KEY is required');
}

if (__ENV.TARGET_HOST) {
  throw new Error(
    'Do not set TARGET_HOST for shared-state billing; traffic must go through CLB'
  );
}

export const options = {
  scenarios: {
    once: {
      executor: 'shared-iterations',
      vus: Number(__ENV.VUS || 10),
      iterations: TOTAL,
      maxDuration: '5m',
    },
  },
  thresholds: {
    billing_failed: ['count==0'],
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
  const ok = check(res, { '200': (r) => r.status === 200 });
  if (ok) {
    success.add(1);
  } else {
    failed.add(1);
  }
}

export function handleSummary(data) {
  const okCount = data.metrics.billing_success
    ? data.metrics.billing_success.values.count
    : 0;
  const note =
    `Successful chat completions: ${okCount}\n` +
    `Re-run: ./billing-verify.sh --expect-requests ${okCount}\n` +
    `Or snapshot /api/usage/token/ before this test and after SETTLE_WAIT_SECONDS.\n`;
  return {
    stdout: note,
  };
}

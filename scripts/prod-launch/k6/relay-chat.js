import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const success = new Counter('chat_success');
const limited = new Counter('chat_429');
const fail5xx = new Counter('chat_5xx');
const otherFail = new Rate('chat_other_fail');

const SNI = __ENV.SNI || __ENV.RUN_HOST || 'run.fluxlane.ai';
const TARGET_IP = __ENV.TARGET_HOST || '';
const API_KEY = __ENV.TEST_API_KEY;
const MODEL = __ENV.TEST_MODEL || 'gpt-4o-mini';
const STREAM = (__ENV.STREAM || 'false').toLowerCase() === 'true';

if (!API_KEY) {
  throw new Error('TEST_API_KEY is required');
}

export const options = {
  hosts: TARGET_IP ? { [SNI]: TARGET_IP } : {},
  scenarios: {
    chat: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: Number(__ENV.MAX_VUS || 20) },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    chat_5xx: ['count==0'],
    http_req_duration: ['p(95)<15000'],
  },
};

const payload = JSON.stringify({
  model: MODEL,
  stream: STREAM,
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
    tags: { endpoint: '/v1/chat/completions' },
  });

  if (res.status === 200) {
    success.add(1);
    check(res, { 'has request id': (r) => !!r.headers['X-Oneapi-Request-Id'] });
  } else if (res.status === 429) {
    limited.add(1);
  } else if (res.status >= 500) {
    fail5xx.add(1);
  } else {
    otherFail.add(1);
  }
  sleep(Number(__ENV.THINK_SECONDS || 0.5));
}

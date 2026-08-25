import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failRate = new Rate('non_ok');
const SNI = __ENV.SNI || __ENV.API_HOST || 'api.fluxlane.ai';
const TARGET_IP = __ENV.TARGET_HOST || '';
const API_KEY = __ENV.TEST_API_KEY || '';

export const options = {
  hosts: TARGET_IP ? { [SNI]: TARGET_IP } : {},
  scenarios: {
    control: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m', target: 30 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    non_ok: ['rate<0.01'],
  },
};

export default function () {
  const status = http.get(`https://${SNI}/api/status`, {
    headers: { Accept: 'application/json' },
    tags: { endpoint: '/api/status' },
  });
  const statusOk = check(status, {
    'status endpoint 200': (r) => r.status === 200,
    'status success': (r) => r.body && r.body.indexOf('"success"') !== -1,
  });
  failRate.add(!statusOk);

  if (API_KEY) {
    const models = http.get(`https://${SNI}/v1/models`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      tags: { endpoint: '/v1/models' },
    });
    const modelsOk = check(models, {
      'models 200': (r) => r.status === 200,
    });
    failRate.add(!modelsOk && models.status !== 429);
  }

  sleep(0.2);
}

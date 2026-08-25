import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failRate = new Rate('http_fail');
const latency = new Trend('health_ms');

const SNI = __ENV.SNI || __ENV.API_HOST || 'api.fluxlane.ai';
const TARGET_IP = __ENV.TARGET_HOST || '';
const PATHS = (__ENV.PATHS || '/healthz,/readyz').split(',');

export const options = {
  hosts: TARGET_IP ? { [SNI]: TARGET_IP } : {},
  scenarios: {
    health: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_fail: [{ threshold: 'rate<0.001', abortOnFail: false }],
    http_req_duration: ['p(95)<150', 'p(99)<400'],
  },
  insecureSkipTLSVerify: false,
};

export default function () {
  for (const path of PATHS) {
    const res = http.get(`https://${SNI}${path.trim()}`, {
      tags: { endpoint: path.trim() },
    });
    latency.add(res.timings.duration);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
    });
    failRate.add(!ok);
  }
  sleep(0.1);
}

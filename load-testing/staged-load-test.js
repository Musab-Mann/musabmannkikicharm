/**
 * Staged load test for KKCharm — run with k6 (https://k6.io).
 *
 *   k6 run -e BASE_URL=https://staging.kkcharm.example load-testing/staged-load-test.js
 *
 * SAFETY: BASE_URL must point at a STAGING deployment, never production.
 * This script only exercises read-heavy, cacheable public endpoints
 * (homepage, collections, product detail, search) — it deliberately does
 * NOT submit real orders in bulk, since that would write thousands of fake
 * rows into a real orders table and could trigger real "new order" emails
 * if EMAIL_API_KEY is configured on staging. A separate, much smaller,
 * explicitly-opt-in checkout test is provided below and defaults to OFF.
 *
 * Stages follow the requested progression: 1,000 → 5,000 → 10,000 → 25,000
 * → 50,000 → 100,000. These are virtual users (concurrent simulated
 * browsers), not total requests — k6 reports requests/sec, p50/p95/p99
 * latency, and error rate separately, exactly as required. Read the
 * summary at the end for all of these; do not judge success by "requests
 * completed" alone.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const RUN_CHECKOUT_TEST = __ENV.RUN_CHECKOUT_TEST === "true"; // opt-in, off by default

export const errorRate = new Rate("errors");
export const apiLatency = new Trend("api_latency", true);

export const options = {
  scenarios: {
    staged_ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 1000 },
        { duration: "3m", target: 1000 },
        { duration: "2m", target: 5000 },
        { duration: "3m", target: 5000 },
        { duration: "2m", target: 10000 },
        { duration: "3m", target: 10000 },
        { duration: "2m", target: 25000 },
        { duration: "3m", target: 25000 },
        { duration: "2m", target: 50000 },
        { duration: "3m", target: 50000 },
        { duration: "2m", target: 100000 },
        { duration: "3m", target: 100000 },
        { duration: "2m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    errors: ["rate<0.01"],
  },
};

const PRODUCT_IDS = ["LA-0001", "LA-0002", "LA-0003"]; // replace with real seeded IDs before running

export default function () {
  const requests = [
    { url: `${BASE_URL}/`, name: "homepage" },
    { url: `${BASE_URL}/collections/charms`, name: "collection" },
    { url: `${BASE_URL}/product/${PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)]}`, name: "product_detail" },
    { url: `${BASE_URL}/api/products`, name: "api_products" },
    { url: `${BASE_URL}/api/health`, name: "api_health" },
  ];

  const req = requests[Math.floor(Math.random() * requests.length)];
  const start = Date.now();
  const res = http.get(req.url, { tags: { name: req.name } });
  apiLatency.add(Date.now() - start);

  const ok = check(res, { "status is 200": (r) => r.status === 200 });
  errorRate.add(!ok);

  sleep(Math.random() * 2 + 1); // 1-3s think time, roughly human browsing pace
}

/**
 * Opt-in checkout test — much lower volume on purpose. Run separately:
 *   k6 run -e BASE_URL=... -e RUN_CHECKOUT_TEST=true --vus 20 --duration 2m \
 *     load-testing/staged-load-test.js
 * Before running against staging: point EMAIL_API_KEY at a sink that won't
 * spam a real inbox, and be ready to bulk-delete the resulting test orders
 * (they are NOT flagged isDemoData — clean up manually after the run).
 */
export function checkoutSmokeTest() {
  if (!RUN_CHECKOUT_TEST) return;
  const payload = JSON.stringify({
    customer: {
      fullName: "Load Test",
      email: `loadtest+${__VU}_${__ITER}@example.com`,
      whatsapp: "+923000000000",
      phone: "+923000000000",
    },
    delivery: { address: "Test Address", area: "Test", city: "Rawalpindi", postalCode: "46000" },
    items: [{ productId: PRODUCT_IDS[0], quantity: 1 }],
    paymentMethod: "cod",
  });
  const res = http.post(`${BASE_URL}/api/orders`, payload, { headers: { "Content-Type": "application/json" } });
  check(res, { "order created": (r) => r.status === 201 || r.status === 429 }); // 429 = rate limit correctly engaging
}

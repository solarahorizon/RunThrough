# Seam A — mock the network

The single biggest source of flaky UX tests is the real backend: it's slow, it
goes down, its data changes, and some calls write real rows. Seam A intercepts the
calls in the browser so they never reach a server. The flow becomes deterministic,
fast, and safe to run anywhere — including against production, because a mocked
route is fulfilled in-browser and never hits the wire.

## The helper

```js
import { mockApi, capture } from './runthrough.mjs';

await mockApi(page, {
  // METHOD url-glob : handler
  'GET **/api/menu':   { items: [{ id: 'latte', name: 'Latte', price: 4.5 }] }, // JSON 200 shorthand
  'POST **/api/order': (route) => route.fulfill({ status: 201, json: { id: 'ORD-1' } }),
});
```

- **Key** = optional `METHOD ` prefix + a Playwright URL glob. No method = match any.
- **Value**:
  - a plain object/array → fulfilled as `200 application/json` (the common case);
  - a function → you get the Playwright [`Route`](https://playwright.dev/docs/api/class-route)
    and control status/headers/body, or call `route.fallback()` / `route.abort()`.
- Pass a **BrowserContext** instead of a Page to apply the mock to every page in
  that context.

## Asserting the app actually called the API

Mocking replaces the response; `capture` lets you also assert the request *happened*
and inspect its body — without mocking it away.

```js
const order = capture(page, (r) => r.url().includes('/api/order') && r.method() === 'POST');
// … drive the UI …
ok(order.get() !== null, 'an order POST was issued');
ok(/"qty":2/.test(order.get().postData() || ''), 'order body carries qty=2');
```

`capture` returns `{ get() }` (most recent match) and `{ all() }` (every match).

## Patterns

**Error states.** Mock a 500 to test your error UI deterministically:
```js
await mockApi(page, { 'GET **/api/menu': (r) => r.fulfill({ status: 500, body: 'boom' }) });
```

**Slow network / spinners.** Delay before fulfilling:
```js
'GET **/api/menu': async (r) => { await new Promise((res) => setTimeout(res, 800)); r.fulfill({ json: { items: [] } }); }
```

**Let some calls through.** Mock only what you must; un-matched URLs hit the real
target normally. To explicitly pass a matched route through, `route.fallback()`.

## Why this is also your "safe against prod" story

theDramList's recommender suite asserts that clicking 👍 *issues* a `POST
/api/feedback` — but runs against a local static serve, so no real row is written.
Same principle here: mock or capture the write, never let the test mutate real
data. If you point `BASE` at production to smoke-test rendering, mocking the writes
keeps it read-only.

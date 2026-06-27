# Troubleshooting

The snags that come up adopting Run-Through, and the fix for each.

### 1. `browserType.launch: Chromium distribution 'chrome' is not found`
The kit uses system Chrome via `channel: 'chrome'`. Either install Google Chrome,
or switch to Playwright's bundled Chromium:
```js
const browser = await launch({ channel: undefined });   // then: npx playwright install chromium
```

### 2. Selector times out, but the element is clearly there
- The app hadn't rendered yet. Navigate with `{ waitUntil: 'networkidle' }` and use
  `waitFor(page, sel)` before asserting.
- The element starts `hidden` and JS reveals it — wait for the *visible* state:
  `waitFor(page, '[data-testid="x"]:not([hidden])')`.
- Wrong selector. Confirm the `data-testid` is actually in the DOM (log
  `await page.content()` once, or run with `launch({ headless: false })` to watch).

### 3. My mock isn't being used — the app hits the real API
- Register `mockApi` **before** `page.goto`. A route added after navigation misses
  the in-flight request.
- Check the glob. `**/api/menu` matches any host; `/api/menu` (no `**`) won't match
  an absolute URL. When unsure, log requests: `page.on('request', r => console.log(r.method(), r.url()))`.
- Method mismatch — `'POST **/api/order'` won't intercept the `GET`. Drop the method
  to match any.

### 4. Test passes locally, fails in the suite runner (or vice versa)
- `BASE` differs. The runner sets `BASE=http://localhost:<port>`; a standalone run
  uses whatever you export. Make sure your build is actually being served there.
- The runner serves *static files only* and returns **501 for non-GET**. If a spec
  sees a 501, it issued a real API call it should have mocked (Seam A).

### 5. "no console errors" assertion is red over harmless noise
Filter the known-benign lines:
```js
ok(realErrors(page, [/favicon\.ico/, /analytics/, /501/]).length === 0, 'no real console errors');
```
Keep the ignore list tight — each pattern is a thing you've chosen to stop watching.

### 6. State seed has no effect
The init script must be registered before navigation — use
`openPage(browser, { seed })` or `seedState(context, …)` *before* `goto`. Setting
`localStorage` after the page loads is too late; the app already read it. See
[`STATE_SEEDING_PATTERN.md`](STATE_SEEDING_PATTERN.md).

### 7. Flaky waits / race conditions
Don't `waitForTimeout` and hope. Wait for the *observable result*: the element that
appears, the `aria-pressed="true"`, the network request via `capture`. Fixed sleeps
are the #1 cause of "passes on my machine."

### 8. Testing a React Native / Capacitor webview and Playwright can't attach
Playwright drives a browser at a URL — it can't reach *inside* a packaged native
app's webview. Point it at the web layer instead, or use Maestro/Detox for the
native shell. Full explanation: [`WEBVIEW_APPS.md`](WEBVIEW_APPS.md).

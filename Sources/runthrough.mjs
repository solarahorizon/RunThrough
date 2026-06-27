/**
 * Run-Through — Playwright-style UX testing for web apps, packaged.
 *
 * This is the WHOLE kit: one file you copy into your project's `tests/` directory.
 * No framework, no test runner, no config, no DSL — just helpers around plain
 * Playwright, plus the two seams (mock-the-API / seed-the-state) that make UX
 * tests deterministic instead of flaky.
 *
 * Drives the REAL browser (system Chrome via channel) against a URL you choose.
 * Point it at a locally-served build (default) or set BASE to hit any deployment.
 *
 * Quick shape of a spec:
 *
 *   import { run, launch, openPage, mockApi, capture } from './runthrough.mjs';
 *   const { ok, section, finish } = run('Checkout');
 *   const browser = await launch();
 *   try {
 *     const page = await openPage(browser);
 *     await mockApi(page, { 'POST **\/api/order': (r) => r.fulfill({ json: { id: 1 } }) });
 *     await page.goto(`${BASE}/`);
 *     ...
 *     ok(await isVisible(page, '#confirm'), 'order confirmation shown');
 *   } finally { await browser.close(); }
 *   finish();
 *
 * License: MIT. Copy it, edit it, vendor it — it's yours.
 */

import { chromium } from 'playwright';

/* -------------------------------------------------------------------------- *
 * Target resolution
 *
 * BASE defaults to a locally-served build. Set BASE to test a real deployment:
 *   BASE=https://example.com node tests/checkout.spec.mjs
 * Keep the default local so a stray run never POSTs real data to production —
 * see Docs/MOCK_API_PATTERN.md for why the API seam matters even against prod.
 * -------------------------------------------------------------------------- */
export const PORT = process.env.PORT || '8765';
export const BASE = process.env.BASE || `http://localhost:${PORT}`;

/* -------------------------------------------------------------------------- *
 * 1. Assertion harness — the ✓/✗ runner, no dependency on a test framework.
 * -------------------------------------------------------------------------- */
export function run(title = '') {
  let pass = 0, fail = 0;
  if (title) console.log(`\n=== ${title} ===`);

  const ok = (cond, msg) => {
    if (cond) { pass++; console.log(`  ✓ ${msg}`); }
    else { fail++; console.log(`  ✗ FAIL: ${msg}`); }
    return !!cond;
  };
  const section = (label) => console.log(`\n[${label}]`);
  const finish = () => {
    console.log(`\n${'='.repeat(44)}\nRESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  };
  return { ok, section, finish, get pass() { return pass; }, get fail() { return fail; } };
}

/* -------------------------------------------------------------------------- *
 * 2. Browser + page — system Chrome, with console/page errors captured for you.
 * -------------------------------------------------------------------------- */
export async function launch(opts = {}) {
  // Default to the Chrome already on the machine (`channel: 'chrome'`) — no extra
  // browser download. Pass { channel: undefined } to force Playwright's bundled
  // Chromium, or { headless: false } to watch it drive. If system Chrome is
  // missing, fall back to bundled Chromium automatically; if neither is present,
  // throw a message that says exactly how to fix it.
  const channel = 'channel' in opts ? opts.channel : 'chrome';
  const { channel: _drop, ...rest } = opts;
  try {
    return await chromium.launch(channel ? { channel, ...rest } : rest);
  } catch (err) {
    if (!channel) throw err; // caller explicitly asked for bundled Chromium
    try {
      return await chromium.launch(rest); // system Chrome not found → bundled Chromium
    } catch {
      throw new Error(
        'Run-Through could not launch a browser.\n' +
        'Install Google Chrome, or fetch Playwright\'s bundled Chromium with:\n' +
        '  npx playwright install chromium\n' +
        `(original error: ${err.message})`
      );
    }
  }
}

/**
 * Open a page with error capture wired up. Read page.rtErrors after a flow and
 * assert it's empty — catches the console errors a "looks fine" screenshot hides.
 * Pass `seed` to start from an exact localStorage state (Mode B); see seedState.
 */
export async function openPage(browser, { viewport, seed, ...ctxOpts } = {}) {
  const context = await browser.newContext({
    viewport: viewport || { width: 1000, height: 1400 },
    ...ctxOpts,
  });
  if (seed) await seedState(context, seed);
  const page = await context.newPage();
  page.rtErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') page.rtErrors.push(m.text()); });
  page.on('pageerror', (e) => page.rtErrors.push(String(e)));
  return page;
}

/** Filter captured errors down to the ones you actually care about. */
export function realErrors(page, ignore = []) {
  return (page.rtErrors || []).filter((e) => !ignore.some((rx) => rx.test(e)));
}

/* -------------------------------------------------------------------------- *
 * 3. Seam A — mock the network.
 *
 * The single biggest source of flaky UX tests is the real backend: slow, down,
 * stateful, or it writes real rows. Intercept the calls instead. A mocked route
 * never reaches your server — so this is also how you safely test a flow that
 * would otherwise POST real data, even against production.
 * -------------------------------------------------------------------------- */

/**
 * @param target  a Page or a BrowserContext (context = applies to every page)
 * @param routes  { 'METHOD url-glob': handler } — METHOD optional; glob is a
 *                Playwright URL pattern. handler gets the Playwright Route.
 *                Shorthand: a plain object/array value is fulfilled as JSON 200.
 *
 *   await mockApi(page, {
 *     'GET **\/api/menu':  { items: [{ id: 1, name: 'Latte' }] },   // JSON 200
 *     'POST **\/api/order': (route) => route.fulfill({ status: 201, json: { id: 9 } }),
 *   });
 */
export async function mockApi(target, routes) {
  for (const [key, handler] of Object.entries(routes)) {
    const sp = key.indexOf(' ');
    const method = sp > 0 ? key.slice(0, sp).toUpperCase() : null;
    const glob = sp > 0 ? key.slice(sp + 1) : key;
    await target.route(glob, async (route) => {
      if (method && route.request().method().toUpperCase() !== method) return route.fallback();
      if (typeof handler === 'function') return handler(route);
      return route.fulfill({ status: 200, json: handler }); // value shorthand
    });
  }
}

/**
 * Watch for a request without mocking it — assert the app issued the call and
 * inspect the body. Returns { get(), all() }.
 *
 *   const order = capture(page, (r) => r.url().includes('/api/order') && r.method() === 'POST');
 *   ... click ...
 *   ok(order.get(), 'an order POST was issued');
 *   ok(/"qty":2/.test(order.get().postData() || ''), 'body carries qty=2');
 */
export function capture(page, matcher) {
  const hits = [];
  // Let a broken matcher surface loudly: a typo that throws should fail the test,
  // not silently report "no request captured". Keep matchers null-safe themselves
  // (e.g. `r.postData() || ''`).
  page.on('request', (r) => { if (matcher(r)) hits.push(r); });
  return { get: () => hits[hits.length - 1] || null, all: () => hits.slice() };
}

/* -------------------------------------------------------------------------- *
 * 4. Seam B — seed exact starting state.
 *
 * For apps whose state lives in the client (localStorage, IndexedDB flags,
 * feature toggles). Set it BEFORE the app's JS runs, so the very first render is
 * already in the state you want to test. No clicking through setup every time.
 * -------------------------------------------------------------------------- */
export async function seedState(context, { localStorage = {}, cookies = [] } = {}) {
  const entries = Object.entries(localStorage);
  if (entries.length) {
    await context.addInitScript((kv) => {
      for (const [k, v] of kv) {
        window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }, entries);
  }
  if (cookies.length) await context.addCookies(cookies);
}

/* -------------------------------------------------------------------------- *
 * 5. Action + assertion wrappers — thin sugar over the verbose Playwright API
 *    so specs read like a user's intent, not a pile of waitFor boilerplate.
 * -------------------------------------------------------------------------- */
export const click = (page, sel) => page.locator(sel).click();
export const fill = (page, sel, value) => page.fill(sel, value);

/** Type into a combobox/autocomplete, then click the first suggestion. */
export async function pickFromList(page, inputSel, listItemSel, query) {
  await page.fill(inputSel, query);
  await page.waitForSelector(listItemSel, { timeout: 5000 });
  await page.locator(listItemSel).first().click();
}

export const isVisible = (page, sel) =>
  page.locator(sel).first().isVisible().catch(() => false);
export const isDisabled = (page, sel) => page.locator(sel).first().isDisabled();
export const count = (page, sel) => page.locator(sel).count();
export const text = (page, sel) => page.locator(sel).first().innerText();
export const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name);

/** Wait for an element, returning true/false instead of throwing on timeout. */
export async function waitFor(page, sel, opts = {}) {
  try { await page.waitForSelector(sel, { timeout: 5000, ...opts }); return true; }
  catch { return false; }
}

/** Assert the rendered text of an element matches a string or RegExp. */
export async function textMatches(page, sel, expected) {
  const t = await text(page, sel);
  return expected instanceof RegExp ? expected.test(t) : t.includes(expected);
}

/**
 * Demo spec 1 — the order flow, with Seam A (mock the network).
 *
 * Proves: menu renders from a MOCKED /api/menu, the cart gates the order button,
 * placing the order issues a POST we capture and inspect, and the UI confirms —
 * all without a real backend. Imports the real kit file at Sources/ (not a copy).
 *
 * Run via the suite:  node Scripts/run-specs.mjs Examples/DemoApp/public Examples/DemoApp/tests
 * Or standalone:      PORT=8765 node Examples/DemoApp/tests/order.spec.mjs   (needs the server up)
 */
import {
  run, launch, openPage, mockApi, capture, BASE,
  click, isDisabled, count, attr, waitFor, isVisible, text, realErrors,
} from '../../../Sources/runthrough.mjs';

const { ok, section, finish } = run('Tiny Café — order flow (Seam A: mock API)');
const browser = await launch();

try {
  const page = await openPage(browser);

  // Seam A: hand the app a canned menu + a canned order response. The real
  // server is never touched, so this flow is deterministic and writes nothing.
  await mockApi(page, {
    'GET **/api/menu': { items: [
      { id: 'espresso', name: 'Espresso', price: 3.0 },
      { id: 'tart',     name: 'Egg Tart', price: 3.5 },
    ] },
    'POST **/api/order': (route) => route.fulfill({ status: 201, json: { id: 'ORD-42' } }),
  });
  const orderPost = capture(page, (r) => r.url().includes('/api/order') && r.method() === 'POST');

  section('1. Menu renders from the mocked API');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await waitFor(page, '[data-testid="menu-item"]');
  ok((await count(page, '[data-testid="menu-item"]')) === 2, 'two menu items rendered');
  ok(await isVisible(page, '[data-id="espresso"]'), 'mocked item "espresso" is shown (proves the mock, not the fallback, rendered)');

  section('2. Cart gates the order button');
  ok(await isDisabled(page, '[data-testid="place-order"]'), 'order disabled with empty cart');
  await click(page, '[data-add="espresso"]');
  ok((await text(page, '[data-testid="cart-count"]')) === '1', 'cart count = 1 after add');
  ok(!(await isDisabled(page, '[data-testid="place-order"]')), 'order enabled once cart has an item');

  section('3. Placing the order POSTs + confirms');
  await click(page, '[data-testid="place-order"]');
  await waitFor(page, '[data-testid="confirm"]:not([hidden])');
  ok(await isVisible(page, '[data-testid="confirm"]'), 'confirmation banner shown');
  ok((await text(page, '[data-testid="order-id"]')) === 'ORD-42', 'confirmation shows the mocked order id');
  const req = orderPost.get();
  ok(req !== null, 'a POST to /api/order was issued');
  ok(req && /"id":"espresso"/.test(req.postData() || ''), 'order body carries the espresso line item');

  section('4. Clear resets the flow');
  await click(page, '[data-testid="clear"]');
  ok((await text(page, '[data-testid="cart-count"]')) === '0', 'cart cleared');
  ok(await isDisabled(page, '[data-testid="place-order"]'), 'order disabled again after clear');

  ok(realErrors(page).length === 0, `no console/page errors during the flow (${realErrors(page).length})`);
} finally {
  await browser.close();
}

finish();

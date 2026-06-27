/**
 * Demo spec 2 — Seam B (seed exact starting state).
 *
 * Proves: you can start the very first render already in a chosen state — here a
 * cart with two items pre-loaded — without clicking through setup. The seed is
 * written to localStorage BEFORE the app's JS runs, so the app boots into it.
 *
 * This is the web twin of Rehearsal's launch-arg state seed: same idea, "start
 * from this exact state," so a test about *checkout* doesn't re-test *adding*.
 */
import {
  run, launch, openPage, mockApi, BASE,
  isDisabled, text, waitFor, isVisible,
} from '../../../Sources/runthrough.mjs';

const { ok, section, finish } = run('Tiny Café — seeded cart (Seam B: state seed)');
const browser = await launch();

try {
  // Seed a cart of 2 items via the app's localStorage key, before any page loads.
  const page = await openPage(browser, {
    seed: { localStorage: { 'rt-demo-cart': [['latte', 1], ['bun', 1]] } },
  });
  await mockApi(page, { 'GET **/api/menu': { items: [
    { id: 'latte', name: 'Latte', price: 4.5 },
    { id: 'bun',   name: 'Cinnamon Bun', price: 5.0 },
  ] } });

  section('1. App boots straight into the seeded cart');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await waitFor(page, '[data-testid="menu-item"]');
  ok((await text(page, '[data-testid="cart-count"]')) === '2', 'cart count = 2 from the seed (no clicks)');
  ok(!(await isDisabled(page, '[data-testid="place-order"]')), 'order button enabled immediately — checkout is testable in isolation');

  section('2. A fresh context has an empty cart (seed is per-context, not sticky)');
  const fresh = await openPage(browser);
  await mockApi(fresh, { 'GET **/api/menu': { items: [{ id: 'latte', name: 'Latte', price: 4.5 }] } });
  await fresh.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await waitFor(fresh, '[data-testid="menu-item"]');
  ok((await text(fresh, '[data-testid="cart-count"]')) === '0', 'unseeded context starts empty — no test leaks into the next');
  ok(await isDisabled(fresh, '[data-testid="place-order"]'), 'order disabled in the fresh context');
} finally {
  await browser.close();
}

finish();

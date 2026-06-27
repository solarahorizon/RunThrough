# Seam B — seed exact starting state

For apps whose state lives on the client: localStorage, cookies, feature flags,
a saved cart, an onboarding-complete marker. Instead of clicking through setup at
the start of every test, you write the state **before the app's JS runs**, so the
very first render is already where you want it. A test about *checkout* shouldn't
have to re-test *adding to cart* — seed the cart, test the checkout.

This is the web twin of [Rehearsal](https://github.com/solarahorizon/Rehearsal)'s
launch-argument state seed: same idea — *"boot from this exact state"* — different
mechanism (an init script instead of a launch arg).

## The helper

```js
import { openPage, seedState } from './runthrough.mjs';

// Easiest: seed at page-open time.
const page = await openPage(browser, {
  seed: { localStorage: { 'rt-demo-cart': [['latte', 1], ['bun', 1]] } },
});
await page.goto(`${BASE}/`); // app boots with 2 items already in the cart
```

Or seed a context directly (applies to every page opened from it):

```js
const context = await browser.newContext();
await seedState(context, {
  localStorage: { 'feature.newCheckout': 'on', 'auth.token': 'test-token' },
  cookies: [{ name: 'consent', value: 'all', url: BASE }],
});
```

- **Values** that aren't strings are `JSON.stringify`'d for you (objects, arrays).
- Seeding uses `context.addInitScript`, which runs **before any page script** on
  every navigation in that context — so the state is present on first paint, no
  race.

## It must run before `goto`

The seam works because the init script is registered on the *context* before the
page navigates. `openPage(browser, { seed })` and `seedState(context, …)` both do
this for you. If you set localStorage *after* `goto`, the app has already read it —
too late. Seed first, navigate second.

## Isolation: seeds don't leak

Each `openPage` creates a fresh `BrowserContext` with its own storage. A seed in
one scenario is invisible to the next — the demo's second spec asserts exactly
this (`seeded context = 2 items`, `fresh context = 0 items`). Keep one context per
scenario and your tests can't contaminate each other.

## When to use which seam

| State lives… | Seam |
|---|---|
| behind an API call | A — `mockApi` |
| in localStorage / cookies / client flags | B — `seedState` |
| both (logged-in user *and* a server cart) | both, together |

# Run-Through demo — Tiny Café

A runnable demo that drives the **real** kit file (`../../Sources/runthrough.mjs`,
imported directly — not a copy) against a tiny self-contained web app. The fastest
way to see what adoption looks like before you touch your own project.

## Run it

From the repo root:

```bash
npm install
npm run demo
```

Expect **2/2 spec files green, 16 assertions**.

Under the hood `npm run demo` runs:

```bash
node Scripts/run-specs.mjs Examples/DemoApp/public Examples/DemoApp/tests
```

which serves [`public/`](public/) on `http://localhost:8765`, runs every
`*.spec.mjs` in [`tests/`](tests/), prints a per-spec summary, and exits non-zero
if anything failed.

Want to see it in a real browser window? `npm run serve:demo` and open
`http://localhost:8765` — the café app runs standalone with a built-in fallback
menu (the tests swap in their own menu via the API mock).

## What the two specs show

| Spec | Seam | Proves |
|---|---|---|
| [`order.spec.mjs`](tests/order.spec.mjs) | **A — mock API** | menu renders from a mocked `GET /api/menu`; cart gates the order button; placing the order issues a `POST /api/order` we capture + body-assert; UI confirms — no real backend |
| [`seeded-cart.spec.mjs`](tests/seeded-cart.spec.mjs) | **B — seed state** | the app boots straight into a 2-item cart seeded via localStorage (no clicks); a fresh context starts empty (seeds don't leak) |

## The app

[`public/index.html`](public/index.html) is one dependency-free file: a café menu,
an add-to-cart with a count that gates "Place order", and a confirmation banner. It
loads its menu from `GET /api/menu` and submits to `POST /api/order` — both mocked
in the order spec — and restores a saved cart from localStorage, which the seeded
spec exploits. It's deliberately tiny so the *test patterns* are the point, not the
app.

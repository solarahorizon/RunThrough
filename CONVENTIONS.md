# CONVENTIONS.md

Condensed convention reference. For long-form rationale, see [`Docs/`](Docs/).

---

## 1. Copy files, don't add a dependency (beyond Playwright)

Run-Through is a **template-clone repo**, not an npm package. You copy
`Sources/runthrough.mjs` into your `tests/` directory and own it. Playwright is
the only real dependency; the kit itself is one file you can read top to bottom
and edit. There is intentionally no `run-through` package to `npm install` — that
keeps the surface honest and lets you fork helpers without a PR.

## 2. Selectors: `data-testid`, dot-namespaced

Format: `<feature>.<element>[.<state-or-index>]`

| Segment | Shape | Example |
|---|---|---|
| `<feature>` | lowercase, one word | `cart` |
| `<element>` | lowerCamelCase | `placeOrder` |
| `<state>` / index | lowercase / int | `disabled`, `0` |

```html
<button data-testid="cart.placeOrder">Place order</button>
<li data-testid="cart.item.0">…</li>
```

Query with the attribute selector: `page.locator('[data-testid="cart.placeOrder"]')`.
Full rationale: [`Docs/SELECTOR_CONVENTIONS.md`](Docs/SELECTOR_CONVENTIONS.md).

## 3. Spec file shape

- One file per user-facing flow: `tests/<flow>.spec.mjs`.
- Each spec is a standalone Node program: it imports the kit, opens a browser,
  drives, asserts with `ok(...)`, and calls `finish()` (which sets the exit code).
- `BASE` comes from the environment, defaulting to a local serve — never hard-code
  a production URL in a spec.

## 4. Determinism is mandatory, not optional

A spec that depends on the real backend's data or latency is a flake waiting to
happen. Every spec must make its flow deterministic via one or both seams:

- **Seam A (`mockApi`)** — for anything over the network.
- **Seam B (`seedState`)** — for anything in client state.

A spec that hits a real API un-mocked is a bug in the spec, not a feature.

## 5. One context per scenario

Use a fresh `openPage(browser)` per scenario so state (cookies, localStorage,
seeded carts) never leaks from one assertion block into the next. The demo's
second spec proves the isolation explicitly.

## 6. Always assert "no console errors"

End flows with `ok(realErrors(page).length === 0, ...)`. UX that looks right can
still be throwing underneath; this is the cheapest catch for it.

# Selector conventions

Tests break for two reasons: the app changed (good — the test caught it), or the
*selector* changed though the behaviour didn't (bad — a false alarm). The fix is a
selector that's tied to **identity**, not to styling or DOM shape.

## Use `data-testid`, not CSS classes or text

| Selector | Survives a refactor? | Why |
|---|---|---|
| `.btn.btn-primary` | ✗ | classes change with styling |
| `button:nth-child(3)` | ✗ | DOM order changes |
| `text=Place order` | ⚠️ | breaks on copy/i18n changes |
| `[data-testid="cart.placeOrder"]` | ✓ | a stable, intentional test handle |

A `data-testid` is a contract: "this element is the place-order button, whatever
it looks like." Add it deliberately to the elements your tests touch.

## Namespace: `<feature>.<element>[.<state-or-index>]`

```html
<button data-testid="cart.placeOrder">Place order</button>
<button data-testid="cart.placeOrder.disabled" disabled>Place order</button>
<li     data-testid="cart.item.0">Latte</li>
<li     data-testid="cart.item.1">Bun</li>
```

- `<feature>` — the area: `cart`, `menu`, `auth`, `search`.
- `<element>` — lowerCamelCase role: `placeOrder`, `itemRemove`, `total`.
- `<state>` or **index** — optional 3rd segment for variants or collection items.

Query it:

```js
page.locator('[data-testid="cart.placeOrder"]')
page.locator('[data-testid^="cart.item."]')   // all cart items by prefix
```

(The bundled demo uses flat ids like `place-order` for brevity; the dotted
namespace above is the convention to grow into on a real app.)

## Don't testid *everything*

Only what a test asserts on or interacts with. Tagging every `<div>` is noise.
A good rule: if a spec needs to click it, read it, or wait for it, give it a
`data-testid`; otherwise leave it alone.

## i18n / dynamic content

Assert on `data-testid` for *structure*, and on visible text only when the *text
itself* is what you're verifying (e.g. "the confirmation says the order id").
That keeps a copy change from turning into a wall of red.

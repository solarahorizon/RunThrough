# Run-Through

**Playwright-style UX testing for web apps — packaged.** Drive your app in a real
browser the way a user would — open, type, click, assert what's on screen — as a
repeatable test.

Plain Playwright, packaged: the two seams that kill flakiness (mock-the-API and
seed-the-state), a dozen action/assertion helpers, and a one-command runner, as
**one file you copy into your `tests/` directory**. No test runner, no config
file, no DSL. The aim is a first green UX test in **minutes**, not a day.

> **Extracted from a real app, not invented for a README.** The pattern was worked
> out building the Playwright suite on [theDramList](https://thedramlist.com.au)
> (live), then folded into this kit so the next app — and the one after — starts
> green instead of from scratch. Same move that produced its iOS sibling,
> [Rehearsal](https://github.com/solarahorizon/Rehearsal).

> **▶ See it run first.** [`Examples/DemoApp/`](Examples/DemoApp/) is a **runnable
> demo** — `npm install && npm run demo` — and watch **two green spec files** (16
> assertions) drive the real helper file (not a copy) against a tiny café app. The
> fastest way to see what adoption looks like before you touch your own app.

<sub>Looking for "Playwright without the boilerplate", a "Cypress-style flow as plain
Playwright", or how to test a **React Native / Capacitor webview**? Same idea, as
files you copy in — no extra runtime, no runner. See
[`Docs/WEBVIEW_APPS.md`](Docs/WEBVIEW_APPS.md).</sub>

## What it is

A small, opinionated, copy-into-your-project toolkit for web UX automation built
on Microsoft's Playwright. One helper file, two documented seams, a runnable demo,
five long-form docs, and a zero-dependency static server + suite runner. No
framework, no config file, no transitive dependencies beyond Playwright itself —
just files you copy into your project's `tests/` directory.

## The problem it solves

Standing up Playwright on a new web project is the same multi-step slog every time:

- Deciding how to **stop the real backend making tests flaky** — slow responses,
  stateful data, calls that write real rows. (Run-Through: the API seam.)
- Working out how to **start a test from a known state** instead of clicking
  through setup every run. (Run-Through: the state seam.)
- Choosing a **selector convention** that survives a refactor. (Run-Through:
  `data-testid`, one doc.)
- Wiring up a way to **serve the build and run every spec** with one command and a
  clean pass/fail summary. (Run-Through: `Scripts/run-specs.mjs`.)
- Writing the dozen wrapper helpers so specs read like intent, not a pile of
  `waitForSelector(timeout)` boilerplate. (Run-Through: `Sources/runthrough.mjs`.)

Run-Through packages all of that into a template-clone repo. The
[`CHECKLIST.md`](CHECKLIST.md) walks adoption in ~9 numbered steps; most projects
hit their first green spec the same hour.

## Who it's for

- Web devs starting Playwright on a new project who want a proven shape, not a
  blank `playwright.config`.
- Devs adding UX tests to an existing site and tired of flaky-backend reruns.
- **React Native / Capacitor / Expo webview** apps where the UI is web content in
  a native shell — XCUITest can't see inside the webview, but Playwright drives the
  DOM directly. See [`Docs/WEBVIEW_APPS.md`](Docs/WEBVIEW_APPS.md).
- Anyone who'd rather copy a small focused toolkit than adopt a heavier
  framework (Cypress, the full `@playwright/test` runner) and its config surface.

## Two seams — pick by what makes your app non-deterministic

Run-Through has two ways to make a flow deterministic. Pick by where the
unpredictability lives — most apps end up using both.

| If your app… | Use | Read |
|---|---|---|
| calls an API/backend/service | **Seam A — mock the network** | [`Docs/MOCK_API_PATTERN.md`](Docs/MOCK_API_PATTERN.md) |
| keeps state on the client (localStorage, flags) | **Seam B — seed the state** | [`Docs/STATE_SEEDING_PATTERN.md`](Docs/STATE_SEEDING_PATTERN.md) |

Seam A says *"return this canned response,"* Seam B says *"boot from this exact
state."* A mocked route never reaches your server — so Seam A is also how you
safely exercise a flow that would otherwise write real data, even against
production.

## Quick start

```bash
npm install            # Playwright is the one dependency
npm run demo           # serves the demo app + runs both specs → all green
```

Then, to adopt it in your own project:

1. Copy **`Sources/runthrough.mjs`** into your project's `tests/` directory (byte-identical).
2. Copy **`Scripts/serve.mjs`** and **`Scripts/run-specs.mjs`** if you want the
   one-command serve-and-run (or point specs at your dev server with `BASE=`).
3. Add `data-testid` to the elements you'll assert on — see
   [`Docs/SELECTOR_CONVENTIONS.md`](Docs/SELECTOR_CONVENTIONS.md).
4. Write your first spec from the demo template
   ([`Examples/DemoApp/tests/order.spec.mjs`](Examples/DemoApp/tests/order.spec.mjs)).
5. Pick your seam: mock the API ([`Docs/MOCK_API_PATTERN.md`](Docs/MOCK_API_PATTERN.md))
   or seed state ([`Docs/STATE_SEEDING_PATTERN.md`](Docs/STATE_SEEDING_PATTERN.md)).
6. Run it: `node Scripts/run-specs.mjs <yourBuildDir> tests`, or
   `BASE=http://localhost:5173 node tests/your.spec.mjs` against a dev server.
7. Hit a snag? [`Docs/TROUBLESHOOTING.md`](Docs/TROUBLESHOOTING.md).

Full numbered walkthrough: [`CHECKLIST.md`](CHECKLIST.md).

## What's in scope

- **One copy-in helper file**, `Sources/runthrough.mjs` — the ✓/✗ harness,
  browser+page with console-error capture, the two seams (`mockApi` / `seedState`),
  a request `capture` helper, and ~10 action/assertion wrappers.
- **The API seam** ([`Docs/MOCK_API_PATTERN.md`](Docs/MOCK_API_PATTERN.md)) — route
  interception by method + URL glob, JSON shorthand, request capture + body asserts.
- **The state seam** ([`Docs/STATE_SEEDING_PATTERN.md`](Docs/STATE_SEEDING_PATTERN.md))
  — seed localStorage/cookies before first paint, per-context so tests don't leak.
- **Selector convention** ([`Docs/SELECTOR_CONVENTIONS.md`](Docs/SELECTOR_CONVENTIONS.md))
  — `data-testid` namespacing that survives refactors.
- **Webview-app guide** ([`Docs/WEBVIEW_APPS.md`](Docs/WEBVIEW_APPS.md)) — testing
  the web content inside a React Native / Capacitor / Expo shell.
- **Zero-dependency runner** — `Scripts/serve.mjs` (static server) +
  `Scripts/run-specs.mjs` (serve → run every `*.spec.mjs` → summary → exit code).

## What's out of scope (anti-goals)

Run-Through deliberately does NOT include:

- **A test runner.** It uses plain `node` + `process.exit`, not `@playwright/test`.
  If you want fixtures, sharding, and HTML reports, adopt `@playwright/test`
  directly — Run-Through is the no-runner option on purpose.
- **Visual / snapshot testing.** Use Playwright's own `toHaveScreenshot` or a
  snapshot tool if you want pixel diffs.
- **CI config.** No `.yml` ships here; your CI is your business (the runner already
  exits non-zero on failure, which is all CI needs).
- **Native mobile UI testing.** That's iOS XCUITest territory — see the sibling kit
  [Rehearsal](https://github.com/solarahorizon/Rehearsal). Run-Through is for the
  web layer (including the web *inside* a webview app).
- **A framework abstraction.** Not a wrapper over Cypress/Selenium. Plain Playwright.

## License

MIT — see [`LICENSE`](LICENSE). Copy it, vendor it, edit it. It's yours.

---

*A [Solara Horizon](https://thedramlist.com.au) kit. Sibling to
[Rehearsal](https://github.com/solarahorizon/Rehearsal) (iOS / XCUITest).*

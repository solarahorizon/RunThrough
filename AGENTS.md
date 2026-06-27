# AGENTS.md — adopting Run-Through as an AI coding agent

You are an AI coding agent setting up UX tests in a project, and you've been
pointed at this kit. Read this before you write anything.

Run-Through is a **copy-in kit, not a dependency**. Your job is to **reuse its
pattern, not invent your own**. You are fully capable of writing Playwright tests
from scratch — that is exactly what this kit exists to stop you from re-deciding on
every project. The value is consistency: every app this kit touches tests the same
way. If you improvise a different architecture, you destroy that value.

## The one rule

Copy `Sources/runthrough.mjs` into the target project's `tests/` directory
**unchanged**, and import from it. Do **not** rewrite its helpers, do **not** add
`@playwright/test`, do **not** introduce a `playwright.config`, do **not** swap in
a different mocking library. If a helper is missing, add a small one *next to* the
file — don't replace the file's approach.

## Adoption steps — do these in order

1. Copy `Sources/runthrough.mjs` → `<project>/tests/runthrough.mjs` (byte-identical).
2. Ensure `playwright` is a devDependency (`npm i -D playwright`). Confirm system
   Chrome exists; if not, use `launch({ channel: undefined })` and
   `npx playwright install chromium`.
3. Add `data-testid` attributes to the elements your tests will touch
   (see `Docs/SELECTOR_CONVENTIONS.md`). Never assert on CSS classes, `nth-child`,
   or visible copy text.
4. Write **one spec per user flow** as `tests/<flow>.spec.mjs`, using the skeleton
   below.
5. Make every flow deterministic with a **seam**: mock the network (Seam A) and/or
   seed client state (Seam B). A spec that calls a real, un-mocked API is a bug.
6. Run it: `node Scripts/run-specs.mjs <buildDir> tests`, or
   `BASE=<devServerUrl> node tests/<flow>.spec.mjs`.
7. End every spec asserting there were no console errors.

## Canonical spec skeleton — copy this shape

```js
import {
  run, launch, openPage, mockApi, capture, BASE,
  click, fill, isVisible, isDisabled, text, count, waitFor, realErrors,
} from './runthrough.mjs';

const { ok, section, finish } = run('<Flow name>');
const browser = await launch();

try {
  const page = await openPage(browser);

  // Seam A — mock the network (and/or pass `seed:` to openPage for Seam B)
  await mockApi(page, {
    'GET **/api/...':  { /* canned JSON */ },
    'POST **/api/...': (route) => route.fulfill({ status: 201, json: { id: 1 } }),
  });

  section('1. <what this block proves>');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await waitFor(page, '[data-testid="..."]');
  ok(await isVisible(page, '[data-testid="..."]'), 'renders');

  // ... drive the UI and assert each step with ok(condition, message) ...

  ok(realErrors(page).length === 0, 'no console errors during the flow');
} finally {
  await browser.close();
}

finish();
```

## Invariants — do NOT violate

- **Determinism via seams**, never against a live backend.
- **Register mocks and seeds BEFORE `page.goto`** — after navigation is too late.
- **No fixed `waitForTimeout` sleeps.** Wait for the observable result: an element
  (`waitFor`), an attribute, or a captured request. Sleeps are the #1 flake source.
- **One `openPage` per scenario** so state never leaks between assertions.
- **`data-testid` selectors only.**
- **No test runner, no config file, no dependency beyond Playwright.**

## Where to read before you decide

| You're about to… | Read |
|---|---|
| mock an API | `Docs/MOCK_API_PATTERN.md` |
| start from a known state | `Docs/STATE_SEEDING_PATTERN.md` |
| pick selectors | `Docs/SELECTOR_CONVENTIONS.md` |
| test a React Native / Capacitor / Expo **webview** app | `Docs/WEBVIEW_APPS.md` |
| debug a failure | `Docs/TROUBLESHOOTING.md` |

## Before you report "done"

1. Prove the kit runs in this environment: `npm install && npm run demo` →
   expect **2/2 spec files green**.
2. Run the spec(s) you wrote and report the **actual** pass/fail counts — never
   claim green you haven't observed.
3. If anything is red, fix it or report it honestly with the output. Do not delete
   or weaken an assertion to make a spec pass — a test that can't fail is worse
   than no test.

# CHECKLIST.md — adopting Run-Through

A numbered path from clone to your first green spec. Most web projects finish in
under an hour. Steps 1–2 prove the kit works before you touch your own code.

---

### 0. Prerequisites
- [ ] Node 18+ and a Chrome install on the machine (the kit drives system Chrome
      via `channel: 'chrome'`; swap to bundled Chromium with `launch({ channel: undefined })`).

### 1. See the demo go green (before touching your app)
- [ ] `npm install` (Playwright is the one dependency).
- [ ] `npm run demo` → expect **2/2 spec files green, 16 assertions**.
- [ ] Skim [`Examples/DemoApp/tests/order.spec.mjs`](Examples/DemoApp/tests/order.spec.mjs)
      — that's the shape every spec takes.

### 2. Copy the kit into your project
- [ ] Copy `Sources/runthrough.mjs` → `<yourProject>/tests/runthrough.mjs` (byte-identical).
- [ ] (Optional) Copy `Scripts/serve.mjs` + `Scripts/run-specs.mjs` for the
      one-command serve-and-run. Skip if you'll test against a running dev server.
- [ ] Add `playwright` to your devDependencies (`npm i -D playwright`).

### 3. Add selectors to the elements you'll assert on
- [ ] Tag the buttons/inputs/regions your test touches with `data-testid="..."`.
- [ ] Read [`Docs/SELECTOR_CONVENTIONS.md`](Docs/SELECTOR_CONVENTIONS.md) for the
      naming namespace that survives refactors.

### 4. Decide how the app gets a URL
- [ ] **Option A — serve a build:** `node Scripts/run-specs.mjs dist tests` (it
      serves `dist/` and runs `tests/*.spec.mjs`).
- [ ] **Option B — hit a dev server:** start your dev server, then
      `BASE=http://localhost:5173 node tests/your.spec.mjs`.

### 5. Pick your seam(s)
- [ ] App calls an API? → **Seam A**, [`Docs/MOCK_API_PATTERN.md`](Docs/MOCK_API_PATTERN.md).
- [ ] App boots from client state? → **Seam B**, [`Docs/STATE_SEEDING_PATTERN.md`](Docs/STATE_SEEDING_PATTERN.md).
- [ ] Both is normal — most flows mock the network *and* seed a starting state.

### 6. Write your first spec
- [ ] Copy the order-flow spec as a template.
- [ ] `import { run, launch, openPage, mockApi, ... } from './runthrough.mjs';`
- [ ] `const { ok, section, finish } = run('My Flow');`
- [ ] Mock/seed → `page.goto(\`${BASE}/...\`)` → drive → assert with `ok(...)` → `finish()`.

### 7. Run it
- [ ] `node Scripts/run-specs.mjs dist tests` (or `BASE=... node tests/your.spec.mjs`).
- [ ] Green? Commit it. Red? [`Docs/TROUBLESHOOTING.md`](Docs/TROUBLESHOOTING.md).

### 8. Assert there were no console errors
- [ ] End each spec with `ok(realErrors(page).length === 0, 'no console errors')`.
- [ ] A passing screenshot can hide a thrown error; this catches it. Pass ignore
      patterns for known-benign noise: `realErrors(page, [/favicon/, /api\/analytics/])`.

### 9. (Webview app?) read the webview guide
- [ ] React Native / Capacitor / Expo? [`Docs/WEBVIEW_APPS.md`](Docs/WEBVIEW_APPS.md)
      explains pointing Run-Through at the web layer (and when to reach for
      Maestro/Detox instead, for the native shell).

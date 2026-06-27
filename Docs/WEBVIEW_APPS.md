# Testing webview apps (React Native, Capacitor, Expo)

If your "app" is mostly a **web page rendered inside a native shell** — a React
Native `WebView`, a Capacitor/Cordova app, an Expo app wrapping web content — then
the part worth testing (the UI, the flows, the logic) is web. That's exactly what
Run-Through drives.

## Why native UI test kits can't see your screens

Native UI testing (iOS XCUITest, and tools built on it like
[Rehearsal](https://github.com/solarahorizon/Rehearsal)) work by reading the
**native accessibility tree** — buttons, labels, and fields that exist as native
views. A webview is, to that tree, a single opaque rectangle. Your real buttons
live in the HTML/DOM *inside* it, which XCUITest can't reach. That's not a bug in
the tooling — there's just almost no native layer there to test.

So the question isn't "which native kit drives my webview" — it's "how do I drive
the *web content*." That's a web problem, and Playwright is the web answer.

## Option 1 (recommended): test the web layer directly

If the same web app is reachable at a URL — a dev server, a preview deploy, or a
local build — point Run-Through straight at it. You're testing the identical
HTML/JS/CSS that the shell loads, just in a real browser instead of inside the
native frame:

```bash
# against your web dev server
BASE=http://localhost:5173 node tests/checkout.spec.mjs

# or serve a build and run the suite
node Scripts/run-specs.mjs dist tests
```

Everything in this kit applies unchanged — mock the API (Seam A), seed state
(Seam B), assert on `data-testid`. This is the fastest, most reliable coverage for
a webview app, and it's where the vast majority of your bugs live (logic, flows,
rendering), independent of the native wrapper.

> This is the same setup that runs on [theDramList](https://thedramlist.com.au):
> Playwright pointed at the served web app, driving the real DOM.

## Option 2: when you need it tested *inside* the native shell

Some things only exist at the seam between web and native: the bridge that lets JS
call native code (camera, push, secure storage, deep links), or a bug that only
shows up in the webview's older JS engine. Web-layer tests can't see those.

For that slice, reach for a **native-app driver** that *can* reach into a webview:
- **[Maestro](https://maestro.mobile.dev/)** — simple YAML flows; has webview support.
- **[Detox](https://wix.github.io/Detox/)** — built for React Native, drives RN + webview.

These drive the installed app on a simulator/device. They're heavier to set up than
pointing Playwright at a URL, so use them only for the genuinely native-bridge parts.

## The practical split

| What you're testing | Tool |
|---|---|
| Flows, forms, logic, rendering (most of the app) | **Run-Through** (web layer, Option 1) |
| The JS↔native bridge, device APIs, webview-engine quirks | Maestro / Detox (Option 2) |
| A truly native screen (no webview) | XCUITest / [Rehearsal](https://github.com/solarahorizon/Rehearsal) |

Most teams get 90% of the value from Option 1 alone, and add Option 2 only for the
handful of bridge-specific flows. Manual testing for the native seam while you
automate the web layer is a perfectly reasonable place to start.

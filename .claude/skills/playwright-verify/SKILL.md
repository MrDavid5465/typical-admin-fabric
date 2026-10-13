---
name: playwright-verify
description: Launch any Vite app built on typical-admin / typical-admin-fabric / per-form and drive it in a real headless Chromium through Playwright - navigate routes, click, fill forms, screenshot, and read console errors, failed requests and GraphQL errors - using a browser already on the machine (never downloads one). Use to check UI work in the running app instead of concluding browser verification isn't possible.
license: MIT
---

# Verify in a real browser

The frontend is a plain Vite web app, so a headless Chromium pointed at the
dev server renders and behaves like the real thing, against the real
backend. The bundled driver `scripts/live-check.cjs` does navigation,
clicks, form fills, a screenshot, and reports problems: page errors,
`console.error`s, failed requests, HTTP errors, and **GraphQL errors from
mutation/query responses** (the libraries don't show those in the UI).

Paths below assume the libraries live at `src/lib/`; the skill is at
`src/lib/typical-admin-fabric/.claude/skills/playwright-verify/`.

## 1. A Playwright package, but no browser download

The driver needs a Playwright Node package it can `require` from the app:
`playwright-core` (preferred), `playwright` or `@playwright/test`. Check with
`ls node_modules | grep -i playwright`. If none:

```bash
npm i -D playwright-core     # installing playwright-core never downloads browsers
```

**Never run `npx playwright install`.** The driver uses a Chromium that is
already there, found in this order:

1. `--executable /path/to/chrome` or `$CHROME_PATH`;
2. Playwright's own expected build, if present;
3. any build in a Playwright browser cache: `$PLAYWRIGHT_BROWSERS_PATH`,
   `~/.cache/ms-playwright` (Linux), `~/Library/Caches/ms-playwright` (macOS),
   `%LOCALAPPDATA%\ms-playwright` (Windows); newest first, headless shell
   preferred;
4. a system `google-chrome` / `chromium` / `chromium-browser` / `microsoft-edge`.

A cached build that doesn't match the Playwright version usually works for
Chromium; the driver prints `BROWSER: <path>` when it fell back. If nothing is
found it lists what it checked and exits 2. Then ask the user where a
Chrome/Chromium is, rather than downloading one.

## 2. Start the app

Run `npm run dev` in the background (Vite serves on `http://localhost:5173`
unless configured otherwise), then wait for it:

```bash
src/lib/typical-admin-fabric/.claude/skills/playwright-verify/scripts/wait-for-dev-server.sh [url] [timeout_s]
```

The backend (the typiql server) must be running too, or every page shows a
GraphQL network error. The driver itself checks the dev server first and
fails fast with a clear message.

## 3. Drive it

Run from the app root (so `require` finds its `node_modules`):

```bash
D=src/lib/typical-admin-fabric/.claude/skills/playwright-verify/scripts/live-check.cjs

# Screenshot a route and report problems
node $D --path /projects --screenshot /tmp/projects.png

# Open a record from the list (row text is clickable in the table view)
node $D --path /projects --click "text=Alpha" --screenshot /tmp/alpha.png

# Create a record: fill per-form fields by name, submit, read the result
node $D --path /projects/new \
  --fill "input[name=name]::Test project" --fill "input[name=priority]::3" \
  --click "button:has-text('Submit')" --wait 1500 --screenshot /tmp/created.png

# Read something out of the page
node $D --path /projects --eval "document.querySelectorAll('.ms-DetailsRow').length"
```

Flags (full list at the top of the script): `--base` (default
`http://localhost:5173`), `--path`, `--hash` (app uses `HashRouter`: opens
`<base>/#<path>`), `--url`, `--selector` (wait for it after load), `--wait`
(settle ms, default 1000), `--click`, `--fill "<selector>::<text>"`,
`--press <key>`, `--wait-for <selector>` (these four repeat and run in the
order given), `--eval <js>` (runs after the actions; may return a Promise),
`--screenshot <file>` (taken **at the end**, after all actions),
`--console-all` (print warnings and logs too), `--executable`, `--headed`,
`--keep-open`, `--strict` (exit 1 on any problem).

After a screenshot, **open the PNG with your file-reading tool and look at
it.** Don't assume the step worked because the command succeeded.

For flows the flags can't express, write a short throwaway script that copies
the top of `live-check.cjs` (the `loadPlaywright`/`launch` helpers and the
problem listeners) and add the `page.*` calls you need. Run it from the app
root, or with `NODE_PATH=<app>/node_modules`.

## Selectors that work with these libraries

- Form fields (Fabric.tsx text boxes): `input[name=<field>]`;
  `textarea[name=<field>]` for `multiline: true`.
- Submit / reset on the generated create and edit pages:
  `button:has-text('Submit')`, `button:has-text('Reset')`.
- Table rows: `.ms-DetailsRow`; clicking any cell text opens the show page.
  Per-row delete: `[title='Delete <Singular>']` (add `>> nth=N`). The confirm
  dialog's button: `.ms-Dialog-main button:has-text('Delete')`.
- Header nav icons (back/edit/add) are icon-only `IconButton`s with no
  title. Navigate by URL instead: `/<route>/new`, `/<route>/<id>/show`,
  `/<route>/<id>/edit`.
- Card view: the clickable part is the thumbnail, not the title text.
- Fluent dropdowns: click `.ms-Dropdown` (add `>> nth=N`), then the option
  `.ms-Dropdown-item:has-text('...')`.

## Gotchas

- **Never `waitUntil: 'networkidle'`.** A mounted live subscription holds a
  request open forever, so the network never idles. The driver uses
  `domcontentloaded` plus `--wait`/`--selector`.
- **"Invalid hook call" / two copies of React after you added an import**:
  Vite re-optimized its dependencies mid-session and the page mixes old and
  new bundles. Restart the dev server (`vite --force`) and reload.
- **A mutation that "does nothing"**: look at `PROBLEMS:` for
  `[graphql addX] ...`; per-form value conversions (`''` for an Int, a
  negative number sent as a string) show up there. See `form-schema`.
- **It is the real backend.** Creates and deletes are real. Use disposable
  test records, and ask before touching anything that looks like real data.
- **Headless only by default.** `--headed` needs a display.

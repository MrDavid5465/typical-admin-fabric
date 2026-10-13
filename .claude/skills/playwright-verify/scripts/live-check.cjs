#!/usr/bin/env node
// Drives a running Vite app (any app built on typical-admin / typical-admin-fabric
// / per-form) in a real headless Chromium through Playwright: navigate, click,
// fill, screenshot, and report console errors, failed requests and GraphQL
// errors. See ../SKILL.md.
//
// It NEVER downloads a browser. It needs:
//   1. a Playwright Node package it can require: `playwright-core` (preferred:
//      installing it never downloads browsers), `playwright` or
//      `@playwright/test`, found from the current directory, this script's
//      directory, or NODE_PATH; and
//   2. an existing Chromium-family browser: --executable / $CHROME_PATH, or a
//      Playwright browser cache ($PLAYWRIGHT_BROWSERS_PATH, ~/.cache/ms-playwright,
//      ~/Library/Caches/ms-playwright, %LOCALAPPDATA%\ms-playwright), or a
//      system Chrome/Chromium/Edge on PATH.
//
// Usage (run from the app's root so `require` finds its node_modules):
//   node <skill>/scripts/live-check.cjs --path /projects --screenshot /tmp/projects.png
//   node <skill>/scripts/live-check.cjs --path /projects --click "text=Alpha" --wait 800 --screenshot /tmp/alpha.png
//   node <skill>/scripts/live-check.cjs --path /projects/new --fill "input[name=name]::Alpha" --click "button:has-text('Submit')"
//
// Flags:
//   --base <url>          Origin (default: http://localhost:5173, Vite's default)
//   --path <path>         Route to open (default: /)
//   --hash                App uses HashRouter: open <base>/#<path> instead of <base><path>
//   --url <url>           Full URL; overrides --base/--path/--hash
//   --selector <sel>      Wait for this selector to be visible after navigation
//   --wait <ms>           Settle time after navigation and after each action (default: 1000)
//   --click <sel>         Click (repeatable; actions run in the order given)
//   --fill <sel>::<text>  Fill an input (repeatable)
//   --press <key>         Press a key on the focused element, e.g. Enter (repeatable)
//   --wait-for <sel>      Wait for a selector between actions (repeatable)
//   --eval <js>           Evaluate JS in the page at the end and print the result
//   --screenshot <file>   Save a full-page PNG at the end
//   --executable <path>   Browser binary to use (else $CHROME_PATH, else auto-detect)
//   --headed              Show the browser window (needs a display)
//   --keep-open           Leave the browser running (you must kill it yourself)
//   --console-all         Also print every console message (warnings, logs), not just errors
//   --strict              Exit 1 if any console error, page error or GraphQL error was seen

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ORDERED = new Set(['click', 'fill', 'press', 'wait-for']);

function parseArgs(argv) {
  const out = { actions: [] };
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    const value = next === undefined || next.startsWith('--') ? true : (i++, next);
    if (ORDERED.has(key)) out.actions.push({ kind: key, value });
    else out[key] = value;
  }
  return out;
}

function loadPlaywright() {
  const searchPaths = [process.cwd(), __dirname, ...(process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean)];
  for (const name of ['playwright-core', 'playwright', '@playwright/test']) {
    try {
      return require(require.resolve(name, { paths: searchPaths }));
    } catch { /* try the next one */ }
  }
  console.error(
    'No Playwright package found from ' + process.cwd() + '.\n' +
    'Install one in the app as a dev dependency. `playwright-core` never downloads browsers:\n' +
    '  npm i -D playwright-core\n' +
    'Do NOT run `npx playwright install`; this script uses a browser that is already on the machine.',
  );
  process.exit(2);
}

function which(cmd) {
  try {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    return execFileSync(finder, [cmd], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0].trim() || null;
  } catch {
    return null;
  }
}

// Every Chromium-family binary already on this machine, best candidates first.
function findBrowsers() {
  const found = [];
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
  ].filter(r => r && r !== '0' && fs.existsSync(r));
  const binaries = [
    ['chromium_headless_shell-', ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell',
      'chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      'chrome-headless-shell-win64/chrome-headless-shell.exe']],
    ['chromium-', ['chrome-linux64/chrome', 'chrome-linux/chrome',
      'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
      'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']],
  ];
  for (const root of roots) {
    for (const [prefix, rels] of binaries) {
      const dirs = fs.readdirSync(root)
        .filter(d => d.startsWith(prefix))
        .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop())); // newest build first
      for (const d of dirs) {
        for (const rel of rels) {
          const p = path.join(root, d, rel);
          if (fs.existsSync(p)) found.push(p);
        }
      }
    }
  }
  for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'chrome']) {
    const p = which(cmd);
    if (p) found.push(p);
  }
  return [...new Set(found)];
}

async function launch(chromium, args) {
  const headless = !args.headed;
  const explicit = typeof args.executable === 'string' ? args.executable : process.env.CHROME_PATH;
  if (explicit) return chromium.launch({ headless, executablePath: explicit });
  // Playwright's own expected build, if it happens to be installed.
  try {
    return await chromium.launch({ headless });
  } catch (e) {
    if (!/Executable doesn't exist|browserType\.launch/i.test(String(e))) throw e;
  }
  const candidates = findBrowsers();
  for (const executablePath of candidates) {
    try {
      const browser = await chromium.launch({ headless, executablePath });
      console.log('BROWSER:', executablePath);
      return browser;
    } catch { /* try the next one */ }
  }
  console.error(
    'No usable Chromium found. Pass --executable /path/to/chrome or set CHROME_PATH, or point\n' +
    'PLAYWRIGHT_BROWSERS_PATH at an existing Playwright browser cache. Checked:\n  ' +
    (candidates.join('\n  ') || '(nothing found)'),
  );
  process.exit(2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = (typeof args.base === 'string' ? args.base : 'http://localhost:5173').replace(/\/$/, '');
  const route = typeof args.path === 'string' ? (args.path.startsWith('/') ? args.path : `/${args.path}`) : '/';
  const url = typeof args.url === 'string' ? args.url : args.hash ? `${base}/#${route}` : `${base}${route}`;
  const settle = Number(args.wait) || 1000;

  // Fail fast with a clear message instead of a 30s navigation timeout.
  try {
    const res = await fetch(new URL(url).origin, { signal: AbortSignal.timeout(3000) });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`Dev server not reachable at ${new URL(url).origin} (${e.message}). Start it first (e.g. \`npm run dev\`).`);
    process.exit(1);
  }

  const { chromium } = loadPlaywright();
  const browser = await launch(chromium, args);
  const page = await browser.newPage();

  const problems = [];
  page.on('pageerror', e => problems.push(`[pageerror] ${e}`));
  page.on('console', msg => {
    if (msg.type() === 'error') problems.push(`[console.error] ${msg.text()}`);
    else if (args['console-all']) console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });
  page.on('requestfailed', req => {
    // Aborted long-lived subscription streams on navigation are expected noise.
    const failure = req.failure()?.errorText ?? '';
    if (!/ERR_ABORTED/.test(failure)) problems.push(`[requestfailed] ${req.method()} ${req.url()} ${failure}`);
  });
  page.on('response', async res => {
    const req = res.request();
    if (res.status() >= 400) problems.push(`[http ${res.status()}] ${req.method()} ${res.url()}`);
    const body = req.postData() ?? '';
    if (req.method() !== 'POST' || !body.includes('"query"')) return;
    if (!(res.headers()['content-type'] ?? '').includes('application/json')) return; // multipart = subscription stream
    try {
      const json = await res.json();
      const op = (() => { try { return JSON.parse(body).operationName; } catch { return undefined; } })();
      if (json.errors) problems.push(`[graphql ${op ?? '?'}] ${JSON.stringify(json.errors)}`);
      else console.log(`GRAPHQL OK: ${op ?? '(anonymous)'}`);
    } catch { /* not JSON after all */ }
  });

  console.log(`Navigating to ${url}`);
  // Never waitUntil 'networkidle': a mounted live-update subscription keeps a
  // request open forever, so the network never goes idle.
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (typeof args.selector === 'string') await page.waitForSelector(args.selector, { timeout: 10000 });
  await page.waitForTimeout(settle);

  let actionFailed = false;
  for (const action of args.actions) {
    if (action.value === true) throw new Error(`--${action.kind} needs a value`);
    console.log(`ACTION: ${action.kind} ${action.value}`);
    try {
      if (action.kind === 'click') await page.click(action.value, { timeout: 10000 });
      if (action.kind === 'press') await page.keyboard.press(action.value);
      if (action.kind === 'wait-for') await page.waitForSelector(action.value, { timeout: 10000 });
      if (action.kind === 'fill') {
        const at = action.value.indexOf('::');
        if (at < 0) throw new Error('--fill expects "<selector>::<text>"');
        await page.fill(action.value.slice(0, at), action.value.slice(at + 2), { timeout: 10000 });
      }
    } catch (e) {
      // Keep going to the report and screenshot: they show why it failed
      // (e.g. a disabled Submit button because the form is invalid).
      problems.push(`[action failed] ${action.kind} ${action.value}: ${String(e.message || e).split('\n')[0]}`);
      actionFailed = true;
      break;
    }
    await page.waitForTimeout(action.kind === 'wait-for' ? 0 : Math.min(settle, 600));
  }

  if (typeof args.eval === 'string' && !actionFailed) {
    console.log('EVAL_RESULT:', JSON.stringify(await page.evaluate(args.eval)));
  }
  console.log('FINAL_URL:', page.url());
  console.log('TITLE:', await page.title());
  console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : '(none)');

  if (typeof args.screenshot === 'string') {
    const out = path.resolve(process.cwd(), args.screenshot);
    await page.screenshot({ path: out, fullPage: true });
    console.log('SCREENSHOT:', out);
  }

  if (args['keep-open']) {
    console.log('--keep-open: browser left running, PID', browser.process?.()?.pid);
  } else {
    await browser.close();
  }
  if (actionFailed || (args.strict && problems.length)) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });

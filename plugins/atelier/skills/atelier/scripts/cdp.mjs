#!/usr/bin/env node
/**
 * cdp.mjs — a real-Chrome verification harness over the DevTools Protocol.
 *
 * Screenshots lie on animation-heavy pages: preview panes throttle requestAnimationFrame
 * when hidden, WebGL canvases capture black, and a shot can race the first paint. This
 * drives a real headless Chrome with real scrolling, real rAF and proper touch emulation,
 * and lets you read the DOM for facts instead of guessing from pixels.
 *
 * Two modes:
 *
 *   node cdp.mjs --sweep <url> [--mobile] [--w 390] [--h 844] [--steps 14] [--out dir]
 *       Scrolls the whole page one viewport at a time and probes at every stop:
 *       layout overflow, console errors, media state, and any element escaping the
 *       viewport without a clipping ancestor. Screenshots the first, middle and last stop.
 *       This is the fastest way to answer "does this page hold together at 390px".
 *
 *   node cdp.mjs <jobs.json> [outDir]
 *       Scripted passes. jobs.json is an array of:
 *       { name, url, w, h, mobile, settle, steps:[ ... ] }
 *       step kinds:
 *         { scroll: 1200, after: 900 }            window.scrollTo (also drives Lenis if present)
 *         { wheel: 400, times: 6, gap: 60 }       real wheel events (use when smooth-scroll intercepts scrollTo)
 *         { swipe: -300, x: 200, y: 400 }         touch drag, for carousels
 *         { key: 'PageDown', times: 3 }           keyboard
 *         { wait: 1500 }
 *         { eval: "document.title" }              returns a value into the log
 *         { shot: 'name.png' }
 *
 * Notes that cost real time to learn:
 *   - Do NOT pass --disable-gpu when measuring performance; software rasterisation inflated
 *     paint cost roughly 5x in this project and produced fake frame times.
 *   - A smooth-scroll library intercepts programmatic scrollTo. Use wheel steps, or expose
 *     a hook. This harness calls window.__lenis?.() if the page provides one.
 *   - Old headless laid mobile out ~1.3x too wide. This uses --headless=new.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/* ---------- locate Chrome ---------- */
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const CHROME = CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH to the browser binary.');
  process.exit(1);
}

/* ---------- args ---------- */
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);

const SWEEP = has('sweep');
const OUT = resolve(flag('out', SWEEP ? './sweep' : (argv[1] && !argv[1].startsWith('--') ? argv[1] : '.')));
mkdirSync(OUT, { recursive: true });

/* ---------- the probe: facts, not pixels ---------- */
const PROBE = `(() => {
  const cw = document.documentElement.clientWidth;
  const spill = [];
  document.querySelectorAll('body *').forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.right <= cw + 2 || !r.width || !r.height) return;
    if (getComputedStyle(e).position === 'fixed') return;
    // walk all the way to <html>: a root-level overflow-x:clip legitimately contains this
    let p = e.parentElement, clipped = false;
    while (p) {
      if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) { clipped = true; break; }
      p = p.parentElement;
    }
    if (!clipped) spill.push(e.tagName + '.' + String(e.className).slice(0, 30) + ' right=' + Math.round(r.right));
  });
  const media = [...document.querySelectorAll('video')].map((v) => {
    const r = v.getBoundingClientRect();
    // "onscreen" means substantially visible, not merely touching the edge — a video that is
    // half out of view during a scroll settle is legitimately paused and must not be flagged
    const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    const frac = r.height ? visible / r.height : 0;
    return (v.id || String(v.className).slice(0, 14) || 'video')
      + ':' + (frac > 0.5 ? 'onscreen' : 'off')
      + ':' + (v.paused ? 'PAUSED' : 'playing')
      + ':rs' + v.readyState;
  });
  return {
    y: Math.round(scrollY),
    innerWidth, clientWidth: cw,
    scrollWidth: document.documentElement.scrollWidth,
    zoomedOut: innerWidth > cw + 4,          // the Android zoom-out tell
    spill: spill.slice(0, 8),
    media,
    errors: (window.__cdpErrors || []).slice(0, 5)
  };
})()`;

const ERROR_HOOK = `window.__cdpErrors = window.__cdpErrors || [];
addEventListener('error', (e) => window.__cdpErrors.push(String(e.message)));
addEventListener('unhandledrejection', (e) => window.__cdpErrors.push('promise: ' + String(e.reason)));`;

/* ---------- build jobs ---------- */
let jobs;
if (SWEEP) {
  const url = argv.find((a) => /^https?:\/\//.test(a));
  if (!url) { console.error('usage: node cdp.mjs --sweep <url> [--mobile]'); process.exit(1); }
  const mobile = has('mobile');
  const w = +flag('w', mobile ? 390 : 1440);
  const h = +flag('h', mobile ? 844 : 900);
  const steps = +flag('steps', 14);
  const seq = [];
  for (let i = 0; i < steps; i++) {
    seq.push({ scroll: i * Math.round(h * 0.9), after: 850 });
    seq.push({ eval: PROBE });
    if (i === 0 || i === Math.floor(steps / 2) || i === steps - 1) seq.push({ shot: `sweep_${String(i).padStart(2, '0')}.png` });
  }
  jobs = [{ name: mobile ? 'sweep-mobile' : 'sweep-desktop', url, w, h, mobile, settle: 4000, steps: seq }];
} else {
  const file = argv.find((a) => a.endsWith('.json'));
  if (!file) { console.error('usage: node cdp.mjs <jobs.json> [outDir]   |   node cdp.mjs --sweep <url>'); process.exit(1); }
  jobs = JSON.parse(readFileSync(file, 'utf8'));
}

/* ---------- launch ---------- */
const PORT = 9333 + Math.floor(Math.random() * 600);
const profile = join(tmpdir(), 'cdp-profile-' + Date.now());
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--disable-lcd-text',                 // no colour-fringed small text in screenshots
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  '--remote-allow-origins=*',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
chrome.on('error', (e) => console.error('spawn error:', e.message));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  for (let i = 0; i < 200; i++) {
    try { return await (await fetch(url)).json(); } catch { await sleep(200); }
  }
  throw new Error('Chrome did not expose a debugging endpoint');
}

let msgId = 0;
const pending = new Map();
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++msgId; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { ws, send };
}

/* ---------- run ---------- */
const results = [];
try {
  const targets = await getJson(`http://127.0.0.1:${PORT}/json`);
  const page = targets.find((t) => t.type === 'page');
  const { ws, send } = await connect(page.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: ERROR_HOOK });

  const evalJs = async (js) => {
    const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
    return r.result?.result?.value ?? r.result?.exceptionDetails?.text;
  };

  for (const job of jobs) {
    const w = job.w || 1440, h = job.h || 900, mobile = !!job.mobile;
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: 1, mobile,
      screenOrientation: { type: mobile ? 'portraitPrimary' : 'landscapePrimary', angle: 0 },
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 });
    await send('Page.navigate', { url: job.url });
    await sleep(job.settle ?? 3000);

    const log = [];
    for (const st of job.steps || []) {
      if (st.scroll !== undefined) {
        await evalJs(`(()=>{const l=window.__lenis&&window.__lenis();if(l&&l.scrollTo)l.scrollTo(${st.scroll},{immediate:true});window.scrollTo(0,${st.scroll});return scrollY})()`);
        await sleep(st.after ?? 900);
      }
      if (st.wheel !== undefined) {
        for (let i = 0; i < (st.times || 1); i++) {
          await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: w / 2, y: h / 2, deltaX: 0, deltaY: st.wheel });
          await sleep(st.gap || 60);
        }
        await sleep(st.after ?? 900);
      }
      if (st.swipe !== undefined) {
        const x = st.x ?? Math.round(w / 2), y = st.y ?? Math.round(h / 2);
        const pt = (type, px) => send('Input.dispatchTouchEvent', {
          type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y }],
        });
        await pt('touchStart', x);
        for (let i = 1; i <= 10; i++) { await pt('touchMove', Math.round(x + (st.swipe * i) / 10)); await sleep(16); }
        await pt('touchEnd', x + st.swipe);
        await sleep(st.after ?? 900);
      }
      if (st.key) {
        for (let i = 0; i < (st.times || 1); i++) {
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: st.key, windowsVirtualKeyCode: st.code || 0 });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: st.key, windowsVirtualKeyCode: st.code || 0 });
          await sleep(st.gap || 120);
        }
        await sleep(st.after ?? 600);
      }
      if (st.wait) await sleep(st.wait);
      if (st.eval) log.push({ v: await evalJs(st.eval) });
      if (st.shot) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, st.shot), Buffer.from(r.result.data, 'base64'));
        log.push({ shot: st.shot });
      }
    }
    results.push({ job: job.name, log });
  }
  ws.close();
} finally {
  chrome.kill();
}

/* ---------- report ---------- */
for (const r of results) {
  console.log('\n=== ' + r.job);
  let worstSpill = 0, anyZoom = false, errs = new Set(), paused = new Set();
  for (const e of r.log) {
    if (e.shot) { console.log('  shot ' + e.shot); continue; }
    const v = e.v;
    if (v && typeof v === 'object' && 'scrollWidth' in v) {
      if (v.zoomedOut) anyZoom = true;
      worstSpill = Math.max(worstSpill, v.spill.length);
      (v.errors || []).forEach((x) => errs.add(x));
      (v.media || []).forEach((m) => { if (m.includes('onscreen:PAUSED')) paused.add(m); });
      console.log(`  y=${String(v.y).padStart(5)} w=${v.innerWidth}/${v.clientWidth}/${v.scrollWidth}`
        + (v.spill.length ? '  SPILL: ' + v.spill.join(' | ') : '')
        + (v.zoomedOut ? '  ZOOMED-OUT' : ''));
    } else {
      console.log('  ' + JSON.stringify(v));
    }
  }
  console.log('  ---');
  console.log('  horizontal overflow : ' + (worstSpill ? `${worstSpill} unclipped element(s)` : 'none'));
  console.log('  layout-viewport zoom: ' + (anyZoom ? 'WIDENED — see responsive.md §2' : 'ok'));
  console.log('  console errors      : ' + (errs.size ? [...errs].join(' | ') : 'none'));
  console.log('  media paused onscreen: ' + (paused.size ? [...paused].join(' | ') : 'none'));
}
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log('\nwrote ' + join(OUT, 'results.json'));

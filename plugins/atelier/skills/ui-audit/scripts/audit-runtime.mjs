#!/usr/bin/env node
/**
 * audit-runtime.mjs - the measurements a browser can make that source cannot.
 *
 *   node audit-runtime.mjs http://localhost:3000 [options]
 *
 * Options
 *   --out ./audit            write runtime.json + runtime.md + captures here (default ./audit)
 *   --viewports 1440x900,390x844,768x1024    (default those three)
 *   --wait 4500              settle time per viewport before measuring, ms
 *   --idle 5000              length of the idle-cost window, ms
 *   --dismiss                hide fixed overlays (cookie banners) before capture. Sets
 *                            display:none only - it never clicks Accept, so no consent is
 *                            given on the user's behalf.
 *   --keep                   leave the browser open on exit (debugging)
 *
 * This deliberately does NOT repeat atelier's audit.mjs, which already covers palette, type
 * inventory, asset weight, contrast, tap targets and template tells on a live URL. Run both.
 * What lives here is the four things that script cannot see:
 *
 *   1. COMPOSITION   how much of the viewport the subject actually occupies, and where the
 *                    page is empty. "It feels thin" is an argument; "the primary object is
 *                    4.7% of viewport height" ends it.
 *   2. FROZEN FRAME  a capture with every animation and transition disabled. If the
 *                    composition collapses without motion, the motion was carrying it.
 *   3. IDLE COST     layouts, style recalcs, rAF callbacks and main-thread time per second
 *                    while nobody is touching the page. Most sites never measure this and
 *                    many burn a third of a core doing nothing.
 *   4. MOTION AT REST what is still animating once the page has settled.
 *
 * Requires Node 22+ (global WebSocket) and a local Chrome. No dependencies.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import zlib from 'node:zlib';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const URL_ARG = argv.find((a) => /^https?:\/\//.test(a));
if (!URL_ARG) { console.error('usage: node audit-runtime.mjs <url> [--out ./audit] [--viewports 1440x900,390x844]'); process.exit(1); }
const OUT = resolve(flag('out', './audit'));
const WAIT = +flag('wait', 4500);
const IDLE = +flag('idle', 5000);
const VIEWPORTS = (flag('viewports', '1440x900,768x1024,390x844')).split(',').map((v) => {
  const [w, h] = v.toLowerCase().split('x').map(Number);
  return { w, h, label: `${w}x${h}`, mobile: w < 768 };
});

if (typeof WebSocket === 'undefined') {
  console.error('This script needs Node 22+ (global WebSocket). Your Node: ' + process.version);
  process.exit(1);
}

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH to the executable.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ minimal PNG reader
   Bounding boxes are defeated by full-bleed transparent overlays: a page whose hero is a
   thin ribbon under an inset:0 overlay measures as "100% of the viewport" and the number is
   worthless. Pixels cannot be fooled. zlib is built into Node, so decoding the screenshot
   ourselves costs no dependency. 8-bit RGB/RGBA only, which is what Chrome emits. */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let p = 8, w = 0, h = 0, depth = 0, type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), tag = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (tag === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; }
    else if (tag === 'IDAT') idat.push(data);
    else if (tag === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`unsupported png (depth ${depth}, colour type ${type})`);
  const ch = type === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * ch);
  const stride = w * ch;
  let q = 0;
  const paeth = (a, b, c) => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const row = q, prev = (y - 1) * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[row + i];
      const a = i >= ch ? out[y * stride + i - ch] : 0;
      const b = y > 0 ? out[prev + i] : 0;
      const c = (i >= ch && y > 0) ? out[prev + i - ch] : 0;
      out[y * stride + i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + b : f === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 0xff;
    }
    q += stride;
  }
  return { w, h, ch, px: out };
}

/* True ink coverage: the modal colour is the ground, everything far enough from it is ink. */
function analyseInk(img, threshold = 26) {
  const { w, h, ch, px } = img;
  const key = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const hist = new Map();
  const step = Math.max(1, Math.floor(Math.min(w, h) / 400));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * ch;
    const k = key(px[i], px[i + 1], px[i + 2]);
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  let bgKey = 0, best = -1;
  for (const [k, n] of hist) if (n > best) { best = n; bgKey = k; }
  const bg = { r: ((bgKey >> 10) & 31) << 3, g: ((bgKey >> 5) & 31) << 3, b: (bgKey & 31) << 3 };
  const rows = new Array(h).fill(0);
  const cols = new Array(w).fill(0);
  let ink = 0, total = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch;
    total++;
    if (Math.abs(px[i] - bg.r) + Math.abs(px[i + 1] - bg.g) + Math.abs(px[i + 2] - bg.b) > threshold) { ink++; rows[y]++; cols[x]++; }
  }
  const minRow = w * 0.004, minCol = h * 0.004;      /* ignore hairlines when finding the box */
  const firstRow = rows.findIndex((n) => n > minRow), lastRow = rows.length - 1 - [...rows].reverse().findIndex((n) => n > minRow);
  const firstCol = cols.findIndex((n) => n > minCol), lastCol = cols.length - 1 - [...cols].reverse().findIndex((n) => n > minCol);
  /* largest run of rows with essentially no ink */
  let gap = { size: 0, from: 0, to: 0 }, run = 0;
  for (let y = 0; y <= h; y++) {
    const empty = y < h && rows[y] <= minRow;
    if (empty) run++;
    else { if (run > gap.size) gap = { size: run, from: y - run, to: y }; run = 0; }
  }
  return {
    background: `rgb(${bg.r},${bg.g},${bg.b})`,
    inkPct: +(100 * ink / total).toFixed(2),
    inkBox: firstRow < 0 ? null : {
      topPct: +(100 * firstRow / h).toFixed(1), bottomPct: +(100 * lastRow / h).toFixed(1),
      heightPct: +(100 * (lastRow - firstRow + 1) / h).toFixed(1),
      widthPct: firstCol < 0 ? 0 : +(100 * (lastCol - firstCol + 1) / w).toFixed(1),
    },
    largestEmptyBand: { pct: +(100 * gap.size / h).toFixed(1), fromPct: +(100 * gap.from / h).toFixed(1), toPct: +(100 * gap.to / h).toFixed(1) },
  };
}

const PORT = 9500 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), 'atelier-runtime-' + Date.now());
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--enable-gpu', '--use-angle=default',
  'about:blank',
], { stdio: 'ignore' });

const getJson = async (u) => { for (let i = 0; i < 200; i++) { try { return await (await fetch(u)).json(); } catch { await sleep(200); } } throw new Error('devtools did not come up'); };

/* ------------------------------------------------------------------ probes (run in-page) */

/* Composition: what does the page actually put on screen, and where is it empty?
   Uses bounding boxes rather than pixels so it is exact and cheap. */
const PROBE_COMPOSITION = `(() => {
  const vw = innerWidth, vh = innerHeight, area = vw * vh;
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  };
  const clampRect = (r) => ({
    top: Math.max(0, r.top), left: Math.max(0, r.left),
    bottom: Math.min(vh, r.bottom), right: Math.min(vw, r.right),
  });
  const rectArea = (r) => Math.max(0, r.bottom - r.top) * Math.max(0, r.right - r.left);

  // The largest piece of media on screen - the usual subject of a hero. Full-bleed,
  // non-interactive layers are chrome (grain, overlays, leader-line canvases), not subjects,
  // and replaced media with a real intrinsic size outranks an empty svg or canvas.
  const isOverlay = (el, r) => {
    const cs = getComputedStyle(el);
    const covers = (r.right - r.left) >= vw * 0.95 && (r.bottom - r.top) >= vh * 0.95;
    return covers && (cs.pointerEvents === 'none' || cs.position === 'fixed' || el.tagName === 'SVG' || el.tagName === 'svg');
  };
  const intrinsic = (el) => (el.naturalWidth || el.videoWidth || el.width || 0) > 0;
  let media = [...document.querySelectorAll('img,video,canvas,svg,picture')].filter(vis)
    .filter((el) => !isOverlay(el, clampRect(el.getBoundingClientRect())));
  const withIntrinsic = media.filter(intrinsic);
  if (withIntrinsic.length) media = withIntrinsic;      // prefer real images/video over empty svg
  let subject = null;
  for (const el of media) {
    const r = clampRect(el.getBoundingClientRect());
    const a = rectArea(r);
    if (!subject || a > subject.area) subject = {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40) || null,
      area: a, rect: r,
      wPct: +(100 * (r.right - r.left) / vw).toFixed(1),
      hPct: +(100 * (r.bottom - r.top) / vh).toFixed(1),
      areaPct: +(100 * a / area).toFixed(1),
    };
  }

  // union of everything that carries content, and the biggest empty horizontal band
  const contentEls = [...document.body.querySelectorAll('*')].filter((el) => {
    if (!vis(el)) return false;
    if (el.children.length && !el.matches('img,video,canvas,svg,picture,input,button,textarea,select')) {
      // a wrapper counts only if it has its own direct text
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!own) return false;
    }
    return true;
  });
  const bands = [];
  let union = null;
  for (const el of contentEls) {
    const r = clampRect(el.getBoundingClientRect());
    if (rectArea(r) <= 0) continue;
    bands.push([r.top, r.bottom]);
    union = union ? { top: Math.min(union.top, r.top), left: Math.min(union.left, r.left), bottom: Math.max(union.bottom, r.bottom), right: Math.max(union.right, r.right) } : r;
  }
  bands.sort((a, b) => a[0] - b[0]);
  let gap = { size: 0, from: 0, to: 0 }, cursor = 0;
  for (const [t, b] of bands) {
    if (t - cursor > gap.size) gap = { size: t - cursor, from: cursor, to: t };
    cursor = Math.max(cursor, b);
  }
  if (vh - cursor > gap.size) gap = { size: vh - cursor, from: cursor, to: vh };

  return {
    viewport: { vw, vh },
    subject,
    contentElements: contentEls.length,
    contentUnionPct: union ? +(100 * rectArea(union) / area).toFixed(1) : 0,
    largestEmptyBand: { pct: +(100 * gap.size / vh).toFixed(1), fromPx: Math.round(gap.from), toPx: Math.round(gap.to) },
    documentHeightVh: +(document.documentElement.scrollHeight / vh).toFixed(2),
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
    scrollWidth: document.documentElement.scrollWidth,
  };
})()`;

/* What is still moving after the page has settled, and are custom properties actually resolving */
const PROBE_REST = `(() => {
  const anims = (document.getAnimations ? document.getAnimations() : []).map((a) => {
    const t = a.effect && a.effect.target;
    return {
      name: a.animationName || (a.constructor && a.constructor.name) || 'animation',
      state: a.playState,
      infinite: !!(a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming().iterations === Infinity),
      target: t ? (t.id || (t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className) || t.tagName || '?').toString().slice(0, 40) : null,
    };
  });
  const rootStyle = getComputedStyle(document.documentElement);
  const declared = [];
  for (let i = 0; i < rootStyle.length; i++) { const p = rootStyle[i]; if (p.startsWith('--')) declared.push(p); }
  const unresolved = declared.filter((p) => !rootStyle.getPropertyValue(p).trim());
  const videos = [...document.querySelectorAll('video')].map((v) => ({
    src: (v.currentSrc || v.src || '').split('/').pop(), paused: v.paused, autoplay: v.autoplay, muted: v.muted, loop: v.loop,
  }));
  return {
    runningAnimations: anims.filter((a) => a.state === 'running'),
    infiniteAnimations: anims.filter((a) => a.infinite && a.state === 'running').length,
    totalAnimations: anims.length,
    rootCustomProperties: declared.length,
    unresolvedCustomProperties: unresolved,
    videos,
    prefersReducedMotionHonoured: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
})()`;

/* Count rAF callbacks over a window - a page at rest should schedule none */
const PROBE_RAF_ARM = `(() => { window.__rafN = 0; const o = requestAnimationFrame; window.__rafRestore = o;
  window.requestAnimationFrame = function (cb) { window.__rafN++; return o.call(window, cb); }; return 'armed'; })()`;
const PROBE_RAF_READ = `(() => { const n = window.__rafN; if (window.__rafRestore) window.requestAnimationFrame = window.__rafRestore; return n; })()`;

const FREEZE_CSS = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:-1ms!important;animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important}`;

const DISMISS = `(() => { let n = 0;
  const rx = /cookie|consent|gdpr|privacy|banner|overlay|modal|newsletter|popup/i;
  for (const el of document.querySelectorAll('div,section,aside,dialog,[role="dialog"]')) {
    const cs = getComputedStyle(el);
    if ((cs.position === 'fixed' || cs.position === 'sticky') && +cs.zIndex > 50) {
      const id = (el.id || '') + ' ' + (el.className || '');
      if (rx.test(id) || el.getBoundingClientRect().height > innerHeight * 0.25) { el.style.display = 'none'; n++; }
    }
  }
  return n; })()`;

/* ------------------------------------------------------------------ drive */

const results = { url: URL_ARG, when: new Date().toISOString(), viewports: [], verify: [] };
const note = (s) => { if (!results.verify.includes(s)) results.verify.push(s); };

const list = await getJson(`http://127.0.0.1:${PORT}/json/list`);
const page = list.find((t) => t.type === 'page') || list[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });

let id = 0; const pending = new Map();
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, (d) => d.error ? rej(new Error(method + ': ' + JSON.stringify(d.error))) : res(d.result));
  ws.send(JSON.stringify({ id: i, method, params }));
});
const ev = async (js) => {
  const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return r.result?.value;
};
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');

for (const vp of VIEWPORTS) {
  process.stderr.write(`  ${vp.label} … `);
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile });
  /* maxTouchPoints must be 1-16 even when disabling, so it is always sent as a valid value */
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile, maxTouchPoints: vp.mobile ? 5 : 1 });
  await send('Emulation.setEmulatedMedia', { features: [
    { name: 'pointer', value: vp.mobile ? 'coarse' : 'fine' },
    { name: 'hover', value: vp.mobile ? 'none' : 'hover' },
  ] });
  await send('Page.navigate', { url: URL_ARG });
  await sleep(WAIT);
  if (has('dismiss')) { const n = await ev(DISMISS); if (n) note(`${n} fixed overlay(s) were hidden at ${vp.label} before capture (never accepted)`); }

  const composition = await ev(PROBE_COMPOSITION);
  const rest = await ev(PROBE_REST);

  /* Idle cost: nothing is touched during this window. An intro sequence that is still
     running would be counted as idle work, so the window is only honest once the page has
     settled - the report says so when animations were live throughout. */
  await ev(PROBE_RAF_ARM);
  const m1 = await metrics();
  await sleep(IDLE);
  const m2 = await metrics();
  const rafN = await ev(PROBE_RAF_READ);
  const restAfter = await ev(PROBE_REST);
  const stillAnimating = (restAfter?.runningAnimations || []).filter((a) => !a.infinite).length;
  if (stillAnimating) note(`at ${vp.label} a non-looping animation was still running at the end of the idle window - the idle figures include an intro in progress, so raise --wait (e.g. --wait 12000) for a true at-rest reading`);
  const per = (k) => +(((m2[k] || 0) - (m1[k] || 0)) / (IDLE / 1000)).toFixed(2);
  const idle = {
    windowMs: IDLE,
    layoutsPerSecond: per('LayoutCount'),
    styleRecalcsPerSecond: per('RecalcStyleCount'),
    scriptSecondsPerSecond: per('ScriptDuration'),
    taskSecondsPerSecond: per('TaskDuration'),
    rafCallbacksPerSecond: +((rafN || 0) / (IDLE / 1000)).toFixed(1),
  };

  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const buf = Buffer.from(r.data, 'base64');
    writeFileSync(join(OUT, file), buf);
    return { file, buf };
  };
  const liveShot = await shot(`${vp.label}-live.png`);
  const live = liveShot.file;
  let ink = null;
  try { ink = analyseInk(decodePng(liveShot.buf)); }
  catch (e) { note(`pixel analysis failed at ${vp.label} (${e.message}) - subject coverage falls back to bounding boxes`); }
  await send('Runtime.evaluate', { expression: `(() => { const s = document.createElement('style'); s.id='__freeze'; s.textContent = ${JSON.stringify(FREEZE_CSS)}; document.head.appendChild(s); return 1; })()` });
  await sleep(350);
  const frozen = (await shot(`${vp.label}-frozen.png`)).file;

  if (composition?.error) note(`composition probe failed at ${vp.label}: ${composition.error}`);
  if (!composition?.subject) note(`no img/video/canvas/svg was visible at ${vp.label}, so no subject coverage could be measured - if the hero is a CSS background image, measure it by eye`);

  results.viewports.push({ viewport: vp.label, composition, ink, rest, idle, captures: { live, frozen } });
  process.stderr.write('ok\n');
}

if (!has('keep')) { try { ws.close(); } catch {} chrome.kill(); }

/* ------------------------------------------------------------------ report */

const L = [];
L.push(`# Runtime audit — ${URL_ARG}`, '', `_${results.when}_`, '');

for (const v of results.viewports) {
  const c = v.composition || {}, r = v.rest || {}, i = v.idle;
  L.push(`## ${v.viewport}`, '');
  if (c.subject) {
    L.push(`**Subject** \`<${c.subject.tag}${c.subject.id ? ' #' + c.subject.id : ''}>\` — ` +
      `**${c.subject.hPct}% of viewport height**, ${c.subject.wPct}% of width, ${c.subject.areaPct}% of area.`, '');
  }
  if (v.ink) {
    L.push(`**Painted pixels** ${v.ink.inkPct}% of the viewport carries ink over a ${v.ink.background} ground. ` +
      (v.ink.inkBox ? `Everything drawn sits between ${v.ink.inkBox.topPct}% and ${v.ink.inkBox.bottomPct}% of the height — a band **${v.ink.inkBox.heightPct}% tall** and ${v.ink.inkBox.widthPct}% wide. ` : '') +
      `Largest empty band: **${v.ink.largestEmptyBand.pct}% of the height** (${v.ink.largestEmptyBand.fromPct}%–${v.ink.largestEmptyBand.toPct}%).`, '');
  }
  L.push(`DOM content spans ${c.contentUnionPct}% of the viewport across ${c.contentElements} elements. ` +
    `Document is ${c.documentHeightVh}× the viewport.` + (c.horizontalOverflow ? `  **Horizontal overflow: scrollWidth ${c.scrollWidth} > ${c.viewport?.vw}.**` : ''), '');
  L.push(`**At rest** ${r.totalAnimations} animations (${(r.runningAnimations || []).length} running, ${r.infiniteAnimations} infinite) · ` +
    `${r.rootCustomProperties} root custom properties${(r.unresolvedCustomProperties || []).length ? `, ${r.unresolvedCustomProperties.length} unresolved` : ''}` +
    ((r.videos || []).length ? ` · ${r.videos.length} video(s), ${r.videos.filter((x) => !x.paused).length} playing` : ''), '');
  L.push(`**Idle cost per second** ${i.layoutsPerSecond} layouts · ${i.styleRecalcsPerSecond} style recalcs · ` +
    `${i.rafCallbacksPerSecond} rAF callbacks · ${i.taskSecondsPerSecond}s main thread` +
    (i.layoutsPerSecond === 0 && i.rafCallbacksPerSecond === 0 ? '  — the page does nothing when nothing happens.' : ''), '');
  if ((r.runningAnimations || []).length) {
    L.push('Running at rest: ' + r.runningAnimations.slice(0, 8).map((a) => `\`${a.name}\`${a.target ? ' on ' + a.target : ''}${a.infinite ? ' (infinite)' : ''}`).join(' · '), '');
  }
  L.push(`Captures: \`${v.captures.live}\` and \`${v.captures.frozen}\` (animations disabled).`, '');
}

L.push('## How to read this', '',
  '- **Subject height %** is the honest version of "the hero feels small". Compare it across breakpoints; a subject that is 40% on a phone and 6% on desktop has a desktop composition problem, not a scale problem.',
  '- **Largest empty band** finds dead space. A large band is only a fault if nothing is meant to be there.',
  '- **The frozen capture** is the real test: open it. If the page collapses without motion, motion was doing the design\'s job.',
  '- **Idle cost** should be at or near zero. Anything above ~200 layouts/s at rest is a page animating something nobody asked for.', '');

if (results.verify.length) {
  L.push('## Verify manually', '');
  for (const v of results.verify) L.push(`- ${v}`);
  L.push('');
}

writeFileSync(join(OUT, 'runtime.md'), L.join('\n'));
writeFileSync(join(OUT, 'runtime.json'), JSON.stringify(results, null, 2));
console.log('wrote ' + join(OUT, 'runtime.md'));
console.log('wrote ' + join(OUT, 'runtime.json'));
console.log('captures in ' + OUT);

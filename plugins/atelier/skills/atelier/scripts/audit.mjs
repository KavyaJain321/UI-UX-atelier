#!/usr/bin/env node
/**
 * audit.mjs - evidence-gathering pass over an existing site.
 *
 *   node audit.mjs https://example.com [options]
 *
 * Options
 *   --pages a,b,c      also audit these paths (no leading slash - some shells rewrite it) or
 *                      full URLs. On a shop or product site the commercial defects live on a
 *                      product page, not the home page, so always audit at least one product
 *                      page and the highest-value interactive page (configurator, booking,
 *                      search). That is where the findings that win a pitch actually live.
 *   --out ./audit      output directory (default ./audit)
 *   --wait 4000        settle time per page in ms
 *   --dismiss          hide cookie/consent overlays before capture. This only sets
 *                      display:none on the overlay - it never clicks Accept, so no consent is
 *                      given on the user's behalf. Without it, a banner may obscure captures
 *                      and the report will say so.
 *   --quiet            skip screenshots; write data.json + report.md only (for sweeping
 *                      several competitors)
 *
 * Writes report.md, data.json, and per-page captures at several scroll depths.
 *
 * It reports what can be measured, not what can be argued about. Taste is your job; this
 * removes the guesswork under it. Findings that cannot be asserted safely - contrast over a
 * background image, a link with a click handler - are reported as "verify manually" rather
 * than as failures, because a headline count that inflates is worse than no count.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.error('Chrome not found; set CHROME_PATH'); process.exit(1); }

const argv = process.argv.slice(2);
const ROOT = argv.find((a) => /^https?:\/\//.test(a));
if (!ROOT) { console.error('usage: node audit.mjs <url> [--pages /a,/b] [--out ./audit] [--dismiss] [--quiet]'); process.exit(1); }
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const OUT = resolve(flag('out', './audit'));
const WAIT = +flag('wait', 4000);
const DISMISS = has('dismiss');
const QUIET = has('quiet');
mkdirSync(OUT, { recursive: true });

const origin = new URL(ROOT).origin;
const PAGES = [ROOT, ...(flag('pages', '') ? flag('pages', '').split(',').map((p) => p.trim()).filter(Boolean)
  .map((p) => {
    if (/^https?:\/\//.test(p)) return p;
    // Git Bash / MSYS rewrites a leading-slash argument into a Windows path before Node sees
    // it, so "/collections/all" arrives as "D:/Git/collections/all". Catch that rather than
    // silently requesting a nonsense URL.
    if (/^[A-Za-z]:[\\/]/.test(p)) {
      console.error(`\n--pages received "${p}", which the shell rewrote into a local path.`);
      console.error('Pass paths WITHOUT a leading slash (--pages collections/all,products/x)');
      console.error('or pass full URLs.\n');
      process.exit(1);
    }
    return origin + (p.startsWith('/') ? p : '/' + p);
  }) : [])];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
  '--remote-allow-origins=*', `--user-data-dir=${join(tmpdir(), 'audit-' + Date.now())}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore'] });

async function getJson(u) { for (let i = 0; i < 200; i++) { try { return await (await fetch(u)).json(); } catch { await sleep(200); } } throw new Error('no devtools'); }
let mid = 0; const pending = new Map();

/* ------------------------------------------------------------------ injected on every page */

const BOOT = `
window.__e = [];
addEventListener('error', (e) => window.__e.push(String(e.message)));
addEventListener('unhandledrejection', (e) => window.__e.push('promise: ' + String(e.reason)));
window.__perf = { lcp: 0, cls: 0 };
try {
  new PerformanceObserver((l) => { const es = l.getEntries(); window.__perf.lcp = es[es.length - 1].startTime; })
    .observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; })
    .observe({ type: 'layout-shift', buffered: true });
} catch (e) {}
`;

/* ------------------------------------------------------------------ page-side probes */

const P_PALETTE = `(() => {
  const count = {};
  const bump = (c, w) => { if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return; count[c] = (count[c] || 0) + w; };
  document.querySelectorAll('body *').forEach((e) => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    const s = getComputedStyle(e);
    bump(s.backgroundColor, Math.round(r.width * r.height / 1000));
    bump(s.color, 1);
    if (s.borderTopWidth !== '0px') bump(s.borderTopColor, 1);
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 18);
})()`;

const P_TYPE = `(() => {
  const fams = {}, sizes = {}, samples = [];
  document.querySelectorAll('body *').forEach((e) => {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) return;
    const s = getComputedStyle(e);
    const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fams[fam] = (fams[fam] || 0) + 1;
    const px = Math.round(parseFloat(s.fontSize));
    sizes[px] = (sizes[px] || 0) + 1;
    if (samples.length < 40) samples.push({ tag: e.tagName, fam, px, weight: s.fontWeight,
      tracking: s.letterSpacing, text: e.textContent.trim().slice(0, 40) });
  });
  return { families: Object.entries(fams).sort((a,b)=>b[1]-a[1]),
           sizes: Object.entries(sizes).map(([k,v])=>[+k,v]).sort((a,b)=>a[0]-b[0]), samples };
})()`;

// contrast: only ASSERT a failure where the background is genuinely a flat colour.
// Text over an image is flagged separately as needing a human eye - asserting a ratio there
// produces false failures, and a false headline number is worse than no number.
const P_CONTRAST = `(() => {
  const lum = (c) => {
    const m = c.match(/[\\d.]+/g); if (!m) return null;
    if (m.length >= 4 && parseFloat(m[3]) < 0.9) return null;              // translucent: cannot assert
    const [r, g, b] = m.slice(0, 3).map((v) => { v = v / 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
    return .2126*r + .7152*g + .0722*b;
  };
  const bgOf = (el) => {
    let e = el;
    while (e && e !== document.documentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return { image: true };
      const c = s.backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
        const m = c.match(/[\\d.]+/g);
        if (m && m.length >= 4 && parseFloat(m[3]) < 0.9) return { image: true };  // translucent layer
        return { colour: c };
      }
      e = e.parentElement;
    }
    return { colour: getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)' };
  };
  const fail = [], review = [];
  document.querySelectorAll('body *').forEach((e) => {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
    if (t.length < 3) return;                                             // trim BEFORE the length test
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity === 0) return;
    const px = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const bg = bgOf(e);
    if (bg.image) { if (review.length < 20) review.push({ text: t.slice(0,44), px: Math.round(px) }); return; }
    const l1 = lum(s.color), l2 = lum(bg.colour); if (l1 === null || l2 === null) return;
    const ratio = (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    // ~1:1 means the computed background equals the text colour, which nobody ships on
    // purpose - the real background is an <img>, a pseudo-element or a sibling layer this
    // walk cannot see. Send it for human review rather than asserting a failure.
    if (ratio < 1.15) { if (review.length < 20) review.push({ text: t.slice(0,44), px: Math.round(px) }); return; }
    if (ratio < need) fail.push({ text: t.slice(0,44), px: Math.round(px), ratio: +ratio.toFixed(2), need, color: s.color });
  });
  return { fail, review };
})()`;

const P_STRUCTURE = `(() => {
  const cw = document.documentElement.clientWidth;
  const overlayOf = (el) => {          // is this inside a fixed overlay (consent banner, modal)?
    let e = el;
    while (e && e !== document.body) {
      const s = getComputedStyle(e);
      if ((s.position === 'fixed' || s.position === 'sticky') && (+s.zIndex > 900 || e.getAttribute('role') === 'dialog')) return true;
      e = e.parentElement;
    }
    return false;
  };
  const spill = [];
  document.querySelectorAll('body *').forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.right <= cw + 2 || !r.width || !r.height) return;
    if (getComputedStyle(e).position === 'fixed') return;
    let p = e.parentElement, clipped = false;
    while (p) { if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; }
    if (!clipped) spill.push(e.tagName + '.' + String(e.className).slice(0,30) + ' right=' + Math.round(r.right));
  });
  const small = [], smallThirdParty = [];
  document.querySelectorAll('a,button,[role=button],input,select').forEach((e) => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (r.width <= 2 || r.height <= 2) return;                            // visually-hidden skip links etc
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || +s.opacity === 0 || s.clipPath === 'inset(50%)') return;
    if (r.height >= 40 && r.width >= 24) return;
    // innerText, not textContent: textContent picks up <noscript> markup as literal text
    const txt = (e.innerText || e.getAttribute('aria-label') || e.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    const label = e.tagName + ' "' + txt.slice(0,24) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height);
    (overlayOf(e) ? smallThirdParty : small).push(label);
  });
  const imgs = [...document.images].map((i) => {
    const r = i.getBoundingClientRect();
    return { src: (i.currentSrc||i.src||'').split('/').pop().slice(0,50),
      natural: i.naturalWidth + 'x' + i.naturalHeight,
      shown: Math.round(r.width) + 'x' + Math.round(r.height),
      oversized: i.naturalWidth > r.width * 2.2 && r.width > 0,
      alt: i.getAttribute('alt'), lazy: i.loading === 'lazy' };
  });
  // consent / cookie overlay detection - it will ruin the captures if present
  let consent = null;
  document.querySelectorAll('body *').forEach((e) => {
    if (consent) return;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (s.position !== 'fixed' || r.width * r.height < innerWidth * innerHeight * 0.06) return;
    if (+s.zIndex < 100 && s.zIndex !== 'auto') return;
    if (/cookie|consent|privacy|gdpr|accept all|manage preferences/i.test((e.textContent||'').slice(0,400)))
      consent = e.tagName + '.' + String(e.className).slice(0,40);
  });
  return {
    innerWidth, clientWidth: cw, scrollWidth: document.documentElement.scrollWidth,
    fullHeight: document.documentElement.scrollHeight,
    zoomedOut: innerWidth > cw + 4,
    spill: spill.slice(0, 12), smallTargets: small.slice(0, 15), smallTargetCount: small.length,
    smallThirdParty: smallThirdParty.slice(0, 6), smallThirdPartyCount: smallThirdParty.length,
    images: imgs, noAlt: imgs.filter((i) => i.alt === null).length,
    consent,
    headings: [...document.querySelectorAll('h1,h2,h3')].map((h)=>h.tagName+': '+h.textContent.trim().slice(0,60)).slice(0,25),
    h1count: document.querySelectorAll('h1').length,
    lang: document.documentElement.lang || null,
    title: document.title,
    metaDesc: document.querySelector('meta[name=description]')?.content || null,
    perf: window.__perf || null,
    nav: (() => { const n = performance.getEntriesByType('navigation')[0];
      return n ? { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null; })()
  };
})()`;

const P_MOTION = `(() => {
  const trans = {}, anims = {};
  let transitionAll = 0;
  document.querySelectorAll('body *').forEach((e) => {
    const s = getComputedStyle(e);
    if (s.transitionProperty === 'all') transitionAll++;
    else if (s.transitionProperty && s.transitionProperty !== 'none')
      s.transitionProperty.split(',').forEach((p) => { p = p.trim(); trans[p] = (trans[p]||0)+1; });
    if (s.animationName && s.animationName !== 'none') anims[s.animationName] = (anims[s.animationName]||0)+1;
  });
  const nonComposited = Object.keys(trans).filter((p) => !['transform','opacity','filter','color','background-color','border-color','box-shadow','fill','stroke','outline-color'].includes(p));
  return { transitions: Object.entries(trans).sort((a,b)=>b[1]-a[1]).slice(0,14),
           animations: Object.entries(anims).sort((a,b)=>b[1]-a[1]).slice(0,10),
           transitionAll, nonComposited,
           libs: ['gsap','ScrollTrigger','Lenis','THREE','anime','Motion','barba','locomotive','ScrollMagic']
                  .filter((k) => window[k] !== undefined) };
})()`;

const P_TELLS = `(() => {
  const t = [];
  const cs = (el, p) => el ? getComputedStyle(el)[p] : '';
  if ([...document.querySelectorAll('h1,h2,h3,.logo,.brand')].some((e) =>
      /gradient/.test(cs(e,'backgroundImage')) && cs(e,'webkitTextFillColor') === 'rgba(0, 0, 0, 0)'))
    t.push('gradient-filled text (background-clip:text) - reads as generated; use a flat fill');
  const hdr = document.querySelector('header,nav');
  if (hdr) { const s = getComputedStyle(hdr);
    if (s.display === 'flex' && /center|space-between/.test(s.justifyContent) &&
        hdr.querySelectorAll('a').length >= 3 &&
        [...hdr.querySelectorAll('a,button')].some((b) => parseFloat(getComputedStyle(b).borderRadius) > 16))
      t.push('logo + centred links + pill CTA header - the universal generated masthead'); }
  // dead links: exclude anything that is actually wired (handler, role, aria, app hook)
  const dead = [...document.querySelectorAll('a')].filter((a) => {
    const h = a.getAttribute('href');
    if (!(h === '#' || h === '' || h === 'javascript:void(0)')) return false;
    if (a.onclick || a.getAttribute('role') === 'button' || a.hasAttribute('aria-controls')
        || a.hasAttribute('aria-expanded') || a.hasAttribute('data-action')) return false;
    if ([...a.attributes].some((at) => /^data-/.test(at.name))) return false;
    return true;
  });
  if (dead.length) t.push(dead.length + ' link(s) with href="#" and no visible handler - verify whether they are wired; an unwired control should be removed, a wired one should be a <button>');
  document.querySelectorAll('section,div').forEach((sec) => {
    const s = getComputedStyle(sec);
    if (s.display === 'grid' && /repeat\\(3|1fr 1fr 1fr/.test(s.gridTemplateColumns) && sec.children.length === 3) {
      const kids = [...sec.children];
      if (kids.every((k) => k.querySelector('svg,img,i') && k.textContent.trim().length < 220))
        t.push('three icon-and-two-lines feature cards - the archetypal generated section');
    }
  });
  let soft = 0, hairline = 0;
  document.querySelectorAll('body *').forEach((e) => {
    const s = getComputedStyle(e).boxShadow;
    if (!s || s === 'none' || /inset/.test(s)) return;
    const nums = (s.match(/-?[\\d.]+px/g) || []).map(parseFloat);
    if (nums.length >= 3 && nums[2] >= 8 && Math.abs(nums[1]) >= 2) soft++; else hairline++;
  });
  if (soft > 15 && soft > hairline) t.push(soft + ' elements separated by soft drop shadows - default component-library styling; hairline borders read as precision');
  if ([...document.querySelectorAll('body > *')].some((e) => { const s = getComputedStyle(e);
      return s.position === 'fixed' && parseFloat(s.opacity) > 0 && parseFloat(s.opacity) < 0.12 &&
             /url\\(/.test(s.backgroundImage) && e.getBoundingClientRect().width >= innerWidth * .98; }))
    t.push('full-viewport grain overlay at low opacity - the most common premium-dark-site tic');
  if (/[\\u{1F300}-\\u{1FAFF}]/u.test(document.body.innerText.slice(0, 6000)))
    t.push('emoji present in body copy - replace with real marks or inline SVG');
  return t;
})()`;

const HIDE_CONSENT = `(() => {
  let n = 0;
  document.querySelectorAll('body *').forEach((e) => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (s.position !== 'fixed' || r.width * r.height < innerWidth * innerHeight * 0.06) return;
    if (/cookie|consent|privacy|gdpr|accept all|manage preferences/i.test((e.textContent||'').slice(0,400))) {
      e.style.setProperty('display','none','important'); n++;
    }
  });
  return n;   // hidden only - never clicked, so no consent is given on the user's behalf
})()`;

/* ------------------------------------------------------------------ run */

const data = { root: ROOT, when: new Date().toISOString(), pages: [] };
try {
  const targets = await getJson(`http://127.0.0.1:${PORT}/json`);
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++mid; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (js) => { const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? { error: r.result?.exceptionDetails?.text }; };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: BOOT });

  for (const url of PAGES) {
    const slug = (new URL(url).pathname.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home').slice(0, 40);
    const P = { url, slug };
    events = [];

    // ---- desktop
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const t0 = Date.now();
    await send('Page.navigate', { url });
    await sleep(WAIT);
    P.loadMs = Date.now() - t0;

    P.consentHidden = DISMISS ? await ev(HIDE_CONSENT) : 0;
    P.palette  = await ev(P_PALETTE);
    P.type     = await ev(P_TYPE);
    P.contrast = await ev(P_CONTRAST);
    P.desktop  = await ev(P_STRUCTURE);
    P.motion   = await ev(P_MOTION);
    P.tells    = await ev(P_TELLS);
    P.errors   = await ev('window.__e || []');

    if (!QUIET) {
      // capture at several depths - a single viewport crop of a 7000px page shows ~12% of it
      const full = P.desktop?.fullHeight || 900;
      const depths = [...new Set([0, Math.round(full * 0.28), Math.round(full * 0.56), Math.max(0, full - 900)])];
      P.shots = [];
      for (let i = 0; i < depths.length; i++) {
        await ev(`window.scrollTo(0, ${depths[i]}); 1`);
        await sleep(700);
        const r = await send('Page.captureScreenshot', { format: 'png' });
        const name = `${slug}_desktop_${i}.png`;
        writeFileSync(join(OUT, name), Buffer.from(r.result.data, 'base64'));
        P.shots.push(name);
      }
      await ev('window.scrollTo(0,0); 1');
    }

    // ---- network for this page
    const byType = {}, requests = [];
    for (const e of events) {
      if (e.method === 'Network.responseReceived') {
        const t = e.params.type, u = e.params.response.url;
        let host = ''; try { host = new URL(u).host; } catch {}
        byType[t] = byType[t] || { count: 0, bytes: 0 };
        byType[t].count++;
        requests.push({ url: u.slice(0, 300), host, type: t, bytes: e.params.response.encodedDataLength || 0, id: e.params.requestId });
      }
      if (e.method === 'Network.loadingFinished') {
        const l = e.params.encodedDataLength || 0;
        P.totalBytes = (P.totalBytes || 0) + l;
        const rq = requests.find((x) => x.id === e.params.requestId);
        if (rq && l > rq.bytes) rq.bytes = l;
      }
    }
    for (const r of requests) if (byType[r.type]) byType[r.type].bytes += r.bytes;
    const byHost = {};
    for (const r of requests) { byHost[r.host] = byHost[r.host] || { count: 0, bytes: 0 }; byHost[r.host].count++; byHost[r.host].bytes += r.bytes; }
    P.network = byType;
    P.byHost = Object.entries(byHost).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 12);
    P.requests = requests.map(({ id, ...r }) => r).sort((a, b) => b.bytes - a.bytes).slice(0, 120);

    // ---- mobile
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Page.navigate', { url });
    await sleep(WAIT);
    if (DISMISS) await ev(HIDE_CONSENT);
    P.mobile = await ev(P_STRUCTURE);
    P.mobileContrast = await ev(P_CONTRAST);
    if (!QUIET) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      const name = `${slug}_mobile.png`;
      writeFileSync(join(OUT, name), Buffer.from(r.result.data, 'base64'));
      P.mobileShot = name;
    }
    await send('Emulation.setTouchEmulationEnabled', { enabled: false, maxTouchPoints: 0 });

    data.pages.push(P);
    console.log(`  audited ${url}`);
  }
  ws.close();
} finally { chrome.kill(); }

/* ------------------------------------------------------------------ report */

const kb = (b) => b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : b >= 1024 ? (b / 1024).toFixed(0) + ' KB' : b + ' B';
const L = [];
L.push(`# Audit - ${data.root}`, '', `_${data.when}_`, '');
if (data.pages.length > 1) L.push(`Pages audited: ${data.pages.map((p) => new URL(p.url).pathname).join(' · ')}`, '');

let totalBroken = 0;

for (const P of data.pages) {
  const path = new URL(P.url).pathname || '/';
  if (data.pages.length > 1) L.push(`---`, '', `# Page: \`${path}\``, '');

  const heavy = (P.totalBytes || 0) > 2.5e6;
  const cfail = P.contrast?.fail?.length ?? 0;
  const creview = P.contrast?.review?.length ?? 0;
  const reqs = Object.values(P.network || {}).reduce((a, t) => a + t.count, 0);

  L.push('## Verdict at a glance', '', '| Measure | Value | Note |', '|---|---|---|');
  [
    ['Page weight', kb(P.totalBytes || 0), heavy ? 'over the 2.5 MB budget' : 'within budget'],
    ['Requests', String(reqs), reqs > 120 ? 'heavy request count' : ''],
    ['LCP', P.desktop?.perf?.lcp ? Math.round(P.desktop.perf.lcp) + ' ms' : 'n/a', (P.desktop?.perf?.lcp > 2500) ? 'over the 2.5 s target' : ''],
    ['CLS', P.desktop?.perf ? P.desktop.perf.cls.toFixed(3) : 'n/a', (P.desktop?.perf?.cls > 0.1) ? 'over the 0.1 target' : ''],
    ['TTFB', P.desktop?.nav ? P.desktop.nav.ttfb + ' ms' : 'n/a', (P.desktop?.nav?.ttfb > 800) ? 'slow server response' : ''],
    ['Colours in use', String(P.palette?.length ?? 0), (P.palette?.length ?? 0) > 12 ? 'undisciplined palette' : ''],
    ['Type families', String(P.type?.families?.length ?? 0), (P.type?.families?.length ?? 0) > 3 ? 'too many' : ''],
    ['Distinct font sizes', String(P.type?.sizes?.length ?? 0), (P.type?.sizes?.length ?? 0) > 12 ? 'no scale' : ''],
    ['Contrast failures', String(cfail), cfail ? 'asserted against flat backgrounds' : ''],
    ['Contrast to verify by eye', String(creview), creview ? 'text over imagery - not asserted' : ''],
    ['Mobile horizontal overflow', P.mobile?.spill?.length ? `${P.mobile.spill.length} element(s)` : 'none', P.mobile?.zoomedOut ? 'LAYOUT VIEWPORT WIDENED' : ''],
    ['Small tap targets (site)', String(P.mobile?.smallTargetCount ?? 0), ''],
    ['Small tap targets (overlays)', String(P.mobile?.smallThirdPartyCount ?? 0), 'third-party chrome, often not fixable'],
    ['Images without alt', String(P.mobile?.noAlt ?? 0), ''],
    ['Console errors', String(P.errors?.length ?? 0), ''],
    ['Generic-template tells', String(P.tells?.length ?? 0), (P.tells?.length ?? 0) ? 'see below' : 'clean'],
  ].forEach((r) => L.push(`| ${r[0]} | ${r[1]} | ${r[2]} |`));
  L.push('');

  if (P.desktop?.consent && !P.consentHidden)
    L.push(`> **A cookie or consent overlay was detected** (\`${P.desktop.consent}\`) and may be obscuring the captures. Re-run with \`--dismiss\` to hide it before capture. The flag only sets \`display:none\`; it never clicks Accept.`, '');

  L.push('## 1. Broken - objective failures', '');
  let broken = 0;
  if (P.mobile?.zoomedOut) { broken++; L.push('- **The mobile layout viewport is wider than the visual viewport.** Something overflows horizontally and the browser has zoomed out to fit it, so fixed elements lay out at the wrong width. See `references/responsive.md` §2.'); }
  if (P.mobile?.spill?.length) { broken++; L.push(`- **${P.mobile.spill.length} element(s) escape the viewport on mobile with no clipping ancestor:**`); P.mobile.spill.forEach((s) => L.push(`  - \`${s}\``)); }
  if (cfail) { broken++; L.push(`- **${cfail} text element(s) fail WCAG AA contrast against a flat background** (showing ${Math.min(8, cfail)} of ${cfail}):`); P.contrast.fail.slice(0, 8).forEach((c) => L.push(`  - ${c.ratio}:1 (needs ${c.need}:1) - ${c.px}px "${c.text}"`)); }
  if (P.mobile?.smallTargetCount) { broken++; L.push(`- **${P.mobile.smallTargetCount} tap target(s) below 40px on mobile** (showing ${Math.min(15, P.mobile.smallTargetCount)}): ${P.mobile.smallTargets.slice(0, 6).join(', ')}`); }
  if (P.errors?.length) { broken++; L.push(`- **Console errors:** ${P.errors.slice(0, 5).join(' · ')}`); }
  if (heavy) { broken++; L.push(`- **Page weight ${kb(P.totalBytes)}** exceeds a 2.5 MB first-load budget.`); }
  if (P.desktop?.perf?.lcp > 2500) { broken++; L.push(`- **LCP ${Math.round(P.desktop.perf.lcp)} ms** against a 2500 ms target.`); }
  const over = (P.desktop?.images || []).filter((i) => i.oversized);
  if (over.length) { broken++; L.push(`- **${over.length} image(s) served far larger than displayed:** ${over.slice(0, 5).map((i) => `${i.src} (${i.natural} shown at ${i.shown})`).join(', ')}`); }
  if (P.mobile?.noAlt) { broken++; L.push(`- **${P.mobile.noAlt} image(s) with no alt attribute.**`); }
  if (P.desktop?.h1count !== 1) { broken++; L.push(`- **${P.desktop?.h1count} \`<h1>\` elements** - there should be exactly one.`); }
  if (!P.desktop?.lang) { broken++; L.push('- **No `lang` attribute** on the html element.'); }
  if (!broken) L.push('_Nothing objectively broken was found._');
  totalBroken += broken;
  L.push('');

  if (creview) {
    L.push('### Needs a human eye', '');
    L.push(`${creview} text element(s) sit over a background image or translucent layer, so a contrast ratio cannot be asserted. Check these against the captures rather than treating them as failures:`);
    P.contrast.review.slice(0, 8).forEach((c) => L.push(`- ${c.px}px "${c.text}"`));
    L.push('');
  }

  L.push('## 2. Generic - where it matches the sector template', '');
  if (P.tells?.length) P.tells.forEach((t) => L.push(`- ${t}`));
  else L.push('_No template tells detected automatically. Still run the judgement checks in `references/anti-generic.md` §3._');
  L.push('');
  L.push('Automated detection only catches the mechanical tells. Judge these yourself:');
  L.push('- Could this palette appear unchanged on an unrelated landing page?');
  L.push('- Does the interface chrome borrow anything from this business\'s own document culture?');
  L.push('- Is there one wow moment, and does it come from what they actually make?');
  L.push('- Would a competitor be able to swap their logo in and ship this?');
  L.push('');

  L.push('## 3. Missing - what is not there', '');
  const libs = P.motion?.libs || [];
  L.push(`- Motion runtime detected: ${libs.length ? libs.join(', ') : '**none** - the page has no scroll-driven scene'}`);
  L.push(`- Declared CSS animations: ${P.motion?.animations?.length ?? 0}; distinct transition properties: ${P.motion?.transitions?.length ?? 0}`);
  if (P.motion?.transitionAll) L.push(`- \`transition: all\` on ${P.motion.transitionAll} element(s) - always enumerate properties instead`);
  if (P.motion?.nonComposited?.length) L.push(`- Transitions on non-composited properties (jank risk): ${P.motion.nonComposited.join(', ')}`);
  L.push('');

  L.push('## Palette in use', '', '| Colour | Weighted area |', '|---|---|');
  (P.palette || []).forEach(([c, n]) => L.push(`| \`${c}\` | ${n} |`));
  L.push('');
  L.push('## Type inventory', '');
  L.push('**Families:** ' + (P.type?.families || []).map(([f, n]) => `${f} (${n})`).join(', '));
  L.push('');
  L.push('**Sizes:** ' + (P.type?.sizes || []).map(([px, n]) => `${px}px×${n}`).join(', '));
  L.push('');

  L.push('## Weight by host', '', '| Host | Requests | Bytes |', '|---|---|---|');
  (P.byHost || []).forEach(([h, v]) => L.push(`| ${h || '(inline)'} | ${v.count} | ${kb(v.bytes)} |`));
  L.push('');
  L.push('## Weight by type', '', '| Type | Requests | Bytes |', '|---|---|---|');
  Object.entries(P.network || {}).forEach(([t, v]) => L.push(`| ${t} | ${v.count} | ${kb(v.bytes)} |`));
  L.push('');
  L.push('_Full request list with URLs is in `data.json` under `pages[].requests`._', '');

  L.push('## Headings', '');
  (P.desktop?.headings || []).forEach((h) => L.push(`- ${h}`));
  L.push('');
  if (P.shots) L.push(`Captures: ${P.shots.join(', ')}${P.mobileShot ? ', ' + P.mobileShot : ''} (desktop at four scroll depths).`, '');
}

L.push('---', '');
L.push('## What this tool did not check', '');
L.push('- Anything behind an interaction: forms, configurators, carts, filters, menus, modals. Open them yourself; on a commerce site the findings that win a pitch usually live there.');
L.push('- Anything below the audited pages. Only the pages listed above were loaded.');
L.push('- Real-device performance. These figures come from headless Chrome on a desktop, not a phone.');
L.push('- Whether the content is true. Numbers, claims and stock availability need a human.');
L.push('');

writeFileSync(join(OUT, 'report.md'), L.join('\n'));
writeFileSync(join(OUT, 'data.json'), JSON.stringify(data, null, 2));
console.log('\nwrote ' + join(OUT, 'report.md'));
const t0 = data.pages[0] || {};
console.log(`broken: ${totalBroken} · tells: ${t0.tells?.length ?? 0} · weight: ${kb(t0.totalBytes || 0)} · contrast fails: ${t0.contrast?.fail?.length ?? 0} (+${t0.contrast?.review?.length ?? 0} to verify by eye)`);

#!/usr/bin/env node
/**
 * palette-lab.mjs - try several palettes on the REAL running site without editing a file, and
 * produce a blind contact sheet for judging.
 *
 *   node palette-lab.mjs <url> --candidates ./candidates [--out ./palette-lab]
 *                        [--pre "js to run before capture"] [--wait 3500] [--no-baseline]
 *
 * --candidates is a folder of JSON files, one per palette:
 *
 *   {
 *     "name":   "Faithful, repaired",
 *     "source": "current tokens; muted text and accent lifted to AA",
 *     "vars":   { "--accent": "#da3435", "--text-muted": "#7a736f" },
 *     "css":    "optional extra CSS for colours the project does not expose as variables",
 *     "notes":  "why this candidate exists"
 *   }
 *
 * Values can be written as hex. If the project stores a variable as a channel triplet
 * ("193 18 31") or as shadcn-style HSL components ("0 84% 41%"), the lab converts the hex into
 * that format at runtime, so a generator does not have to know the encoding.
 *
 * For each candidate (plus the unmodified baseline) it injects the override, verifies the
 * variables actually changed, captures desktop at two depths and a phone view, and measures
 * contrast on flat backgrounds. Output:
 *
 *   contact.html        named sheet, for the person deciding
 *   blind/contact.html  letters only, shuffled, for judges; the key is mapping.json, outside blind/
 *   scores.json         measured data per candidate
 *
 * It never writes to the project. Applying the winner is a separate, deliberate edit.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';

const CHROME = [process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.error('Chrome not found; set CHROME_PATH'); process.exit(1); }

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const URL_ = argv.find((a) => /^https?:\/\//.test(a));
const CAND_DIR = flag('candidates');
if (!URL_ || !CAND_DIR) { console.error('usage: node palette-lab.mjs <url> --candidates <dir> [--out dir] [--pre js] [--wait ms]'); process.exit(1); }
const OUT = resolve(flag('out', './palette-lab'));
const WAIT = +flag('wait', 3500);
const PRE = flag('pre', '');
mkdirSync(join(OUT, 'blind'), { recursive: true });

const candidates = readdirSync(resolve(CAND_DIR)).filter((f) => f.endsWith('.json')).sort()
  .map((f) => ({ file: f, ...JSON.parse(readFileSync(join(resolve(CAND_DIR), f), 'utf8')) }));
if (!has('no-baseline')) candidates.unshift({ file: '(baseline)', name: 'Current (baseline)', source: 'the site as it is', vars: {}, css: '' });
if (candidates.length < 2) { console.error('need at least one candidate JSON in ' + CAND_DIR); process.exit(1); }

/* ---------------- in-page functions (serialised with toString, so no escaping games) */

function inPageApply(cand) {
  const rootStyle = getComputedStyle(document.documentElement);
  const before = {};
  const toRgb = (v) => {
    let m = String(v).trim().toLowerCase().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
    m = String(v).match(/^rgba?\(([^)]+)\)$/);
    if (m) return m[1].split(/[\s,/]+/).slice(0, 3).map(Number);
    return null;
  };
  const toHsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  };
  const fmt = (name, value) => {
    const cur = rootStyle.getPropertyValue(name).trim();
    const rgb = toRgb(value);
    if (!rgb) return value;
    if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(cur)) return rgb.join(' ');
    if (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/.test(cur)) { const [h, s, l] = toHsl(rgb); return `${h} ${s}% ${l}%`; }
    return value;
  };
  const vars = cand.vars || {};
  for (const k of Object.keys(vars)) before[k] = rootStyle.getPropertyValue(k).trim();
  const decl = Object.entries(vars).map(([k, v]) => `${k}:${fmt(k, v)} !important`).join(';');
  let el = document.getElementById('__palette_lab');
  if (!el) { el = document.createElement('style'); el.id = '__palette_lab'; document.head.appendChild(el); }
  // html * as well as :root, so variables redefined on inner scopes are overridden too
  el.textContent = (decl ? `html,body,html *{${decl}}` : '') + (cand.css || '');
  const after = getComputedStyle(document.documentElement);
  return {
    total: Object.keys(vars).length,
    // only variables the page actually defined count; setting an unused one changes nothing on screen
    changed: Object.keys(vars).filter((k) => before[k] !== '' && after.getPropertyValue(k).trim() !== before[k]).length,
    undefinedOnPage: Object.keys(vars).filter((k) => before[k] === ''),
  };
}

// Freeze every moving thing at the same moment for every candidate. Without this, a looping
// hero video shows a different frame in each render and judges end up scoring the photo
// instead of the palette (this happened in the first real tournament).
async function inPageFreeze() {
  // pages restart their own media (autoplay kicks on canplay, observers, loop handlers), so
  // pausing is not enough: make play() a no-op first, then pause and seek every video to the
  // same moment, and wait until that frame is actually painted
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  const vids = [...document.querySelectorAll('video')];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const target = (v) => (isFinite(v.duration) && v.duration > 0 ? Math.min(v.duration * 0.5, 25) : 0);
  // wait (without reloading - a reload re-fires the page's own seek handlers) for metadata
  vids.forEach((v) => { if (v.readyState < 1 && v.preload !== 'auto') v.preload = 'auto'; });
  for (let i = 0; i < 60 && vids.some((v) => v.readyState < 1 && v.currentSrc); i++) await sleep(100);
  // A server without HTTP range support (python http.server, many static hosts) makes a video
  // unseekable until it has fully downloaded, and seeking earlier silently lands on 0. Wait for
  // the target to become seekable - once, for all videos in parallel, with one shared budget.
  const canSeek = (v) => { const t = target(v); for (let r = 0; r < v.seekable.length; r++) if (v.seekable.start(r) <= t && v.seekable.end(r) >= t) return true; return false; };
  for (let w = 0; w < 80 && vids.some((v) => v.currentSrc && v.readyState >= 1 && !canSeek(v)); w++) await sleep(100);
  // the page may answer our seek with a seek of its own; keep correcting until every video
  // sits paused on the target frame twice in a row
  let settled = 0;
  for (let attempt = 0; attempt < 8 && settled < 2; attempt++) {
    let ok = true;
    for (const v of vids) {
      if (v.readyState < 1) continue;
      v.pause(); v.loop = false; v.autoplay = false;
      const t = target(v);
      if (!canSeek(v)) continue;                     // reported as unfrozen rather than waited on forever
      if (Math.abs(v.currentTime - t) > 0.05 || v.seeking) {
        ok = false;
        await new Promise((res) => { v.addEventListener('seeked', res, { once: true }); v.currentTime = t; setTimeout(res, 1500); });
      }
    }
    await sleep(250);
    settled = ok ? settled + 1 : 0;
  }
  // make sure the frame at the target is actually painted before anything is captured
  await Promise.all(vids.filter((v) => v.readyState >= 2 && v.requestVideoFrameCallback)
    .map((v) => new Promise((res) => { v.requestVideoFrameCallback(() => res()); setTimeout(res, 600); })));
  await sleep(200);
  let s = document.getElementById('__palette_freeze');
  if (!s) { s = document.createElement('style'); s.id = '__palette_freeze'; document.head.appendChild(s); }
  s.textContent = '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important}';
  return vids.map((v) => {
    const r = v.getBoundingClientRect();
    return { src: (v.currentSrc || '').split('/').pop().slice(0, 40), rs: v.readyState,
      t: +v.currentTime.toFixed(2), target: +target(v).toFixed(2), paused: v.paused,
      onscreen: r.width > 0 && r.bottom > 0 && r.top < innerHeight };
  });
}

function inPageContrast() {
  const lum = (c) => {
    const m = c.match(/[\d.]+/g); if (!m || (m.length >= 4 && parseFloat(m[3]) < 0.9)) return null;
    const ch = m.slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const bgOf = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = s.backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { const m = c.match(/[\d.]+/g); if (m.length >= 4 && parseFloat(m[3]) < 0.9) return null; return c; }
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
  };
  let checked = 0, fails = 0, worst = 99; const failures = [];
  document.querySelectorAll('body *').forEach((e) => {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
    if (t.length < 3) return;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity === 0) return;
    const bg = bgOf(e); if (!bg) return;
    const a = lum(s.color), b = lum(bg); if (a === null || b === null) return;
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 1.15) return;                    // background detection failed, do not assert
    checked++;
    const px = parseFloat(s.fontSize), need = (px >= 24 || (px >= 18.66 && +s.fontWeight >= 700)) ? 3 : 4.5;
    worst = Math.min(worst, ratio);
    if (ratio < need) { fails++; if (failures.length < 6) failures.push(`${ratio.toFixed(2)}:1 ${Math.round(px)}px "${t.slice(0, 30)}"`); }
  });
  return { checked, fails, worst: +worst.toFixed(2), failures };
}

/* ---------------- CDP */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9700 + Math.floor(Math.random() * 300);
// --disable-lcd-text: sub-pixel anti-aliasing paints small text with blue and orange fringes,
// which a judge reading a screenshot will (and did) mistake for off-palette colours
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-lcd-text',
  '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--remote-allow-origins=*',
  `--user-data-dir=${join(tmpdir(), 'palette-lab-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
async function getJson(u) { for (let i = 0; i < 200; i++) { try { return await (await fetch(u)).json(); } catch { await sleep(200); } } throw new Error('no devtools'); }

const results = [];
try {
  const page = (await getJson(`http://127.0.0.1:${PORT}/json`)).find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const run = async (fn, arg) => {
    const expr = arg === undefined ? `(${fn.toString()})()` : `(${fn.toString()})(${JSON.stringify(arg)})`;
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    return r.result?.result?.value ?? { error: r.result?.exceptionDetails?.text };
  };
  const evalStr = async (js) => (await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, file), Buffer.from(r.result.data, 'base64')); return file; };
  await send('Page.enable'); await send('Runtime.enable');

  const load = async (mobile) => {
    await send('Emulation.setDeviceMetricsOverride', mobile
      ? { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } }
      : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 });
    await send('Page.navigate', { url: URL_ });
    await sleep(WAIT);
    if (PRE) { await evalStr(PRE); await sleep(Math.min(WAIT, 4000)); }
  };

  // Warm-up pass, captured nowhere. On a cold cache the first candidate's media is still
  // loading when it is frozen, so it alone shows a different frame. Load both sizes once so
  // every candidate, including the first, starts from the same cache.
  await load(false); await run(inPageFreeze);
  await load(true); await run(inPageFreeze);

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const slug = 'c' + String(i).padStart(2, '0');
    const r = { slug, name: c.name, source: c.source || '', notes: c.notes || '', vars: c.vars || {}, file: c.file };

    await load(false);
    r.applied = await run(inPageApply, c);
    await sleep(700);
    r.frozenMedia = await run(inPageFreeze);
    r.contrast = await run(inPageContrast);
    r.desktop0 = await shot(`${slug}_desktop_0.png`);
    const h = await evalStr('document.documentElement.scrollHeight');
    if (h > 1400) {
      await evalStr(`window.scrollTo(0, ${Math.round(h * 0.45)}); 1`); await sleep(900);
      await run(inPageFreeze);                     // lazy media below the fold starts on scroll; freeze it too
      r.desktop1 = await shot(`${slug}_desktop_1.png`);
    }

    await load(true);
    await run(inPageApply, c);
    await sleep(700);
    await run(inPageFreeze);
    r.mobileContrast = await run(inPageContrast);
    r.mobile = await shot(`${slug}_mobile.png`);

    // only media that is actually in a captured view can make renders differ
    const unfrozen = (r.frozenMedia || []).filter((m) => m.onscreen && m.rs >= 1 && Math.abs(m.t - m.target) > 0.1);
    const warn = (r.applied.total && r.applied.changed === 0 ? '  ⚠ no variable changed' : r.applied.undefinedOnPage?.length ? `  ⚠ undefined on page: ${r.applied.undefinedOnPage.join(', ')}` : '')
      + (unfrozen.length ? `  ⚠ media not frozen on the shared frame (${unfrozen.map((m) => m.src).join(', ')}) — renders may differ by more than the palette` : '');
    console.log(`  ${slug} ${c.name.padEnd(30)} vars ${r.applied.changed}/${r.applied.total} · contrast fails ${r.contrast.fails}/${r.contrast.checked} (worst ${r.contrast.worst}:1)${warn}`);
    results.push(r);
  }
  ws.close();
} finally { chrome.kill(); }

/* ---------------- blind assignment: shuffle with a fixed seed so reruns are stable */

let seed = 7;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const order = results.map((_, i) => i).sort(() => rnd() - 0.5);
const letters = 'ABCDEFGHIJKLMNOP';
const mapping = {};
order.forEach((ri, k) => { results[ri].letter = letters[k]; mapping[letters[k]] = results[ri].name; });
for (const r of results) for (const key of ['desktop0', 'desktop1', 'mobile']) {
  if (!r[key]) continue;
  const blindName = `${r.letter}_${key}.png`;
  copyFileSync(join(OUT, r[key]), join(OUT, 'blind', blindName));
  r['blind_' + key] = blindName;
}
// the key lives OUTSIDE blind/, so a judge reading that folder cannot see it
writeFileSync(join(OUT, 'mapping.json'), JSON.stringify(mapping, null, 2));
writeFileSync(join(OUT, 'scores.json'), JSON.stringify({ url: URL_, when: new Date().toISOString(), results }, null, 2));

/* ---------------- contact sheets */

function sheet(blind) {
  const items = blind ? [...results].sort((a, b) => a.letter.localeCompare(b.letter)) : results;
  const cols = items.map((r) => {
    const sw = Object.values(r.vars).filter((v) => /^#|^rgb/.test(String(v))).slice(0, 8)
      .map((v) => `<i style="background:${v}" title="${v}"></i>`).join('');
    const im = (k) => (r[blind ? 'blind_' + k : k] ? `<img src="${r[blind ? 'blind_' + k : k]}" loading="lazy">` : '');
    const c = r.contrast || {};
    return `<section>
      <h2>${blind ? r.letter : `${r.letter} · ${esc(r.name)}`}</h2>
      ${blind ? '' : `<p class="src">${esc(r.source)}</p>`}
      <div class="sw">${sw || '<em>unchanged</em>'}</div>
      <p class="m">contrast fails: <b>${c.fails ?? '?'}</b> of ${c.checked ?? '?'} checked · worst ${c.worst ?? '?'}:1 · phone fails ${r.mobileContrast?.fails ?? '?'}</p>
      ${im('desktop0')}${im('desktop1')}<div class="ph">${im('mobile')}</div>
      ${!blind && r.notes ? `<p class="n">${esc(r.notes)}</p>` : ''}
    </section>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${blind ? 'Palette lab — blind' : 'Palette lab'}</title>
<style>
  body{margin:0;background:#3a3a3a;color:#f2f2f2;font:14px/1.45 system-ui,sans-serif}
  header{padding:20px 24px;border-bottom:1px solid #555}
  header h1{margin:0 0 4px;font-size:18px} header p{margin:0;color:#c8c8c8}
  main{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;padding:18px}
  section{background:#2c2c2c;border:1px solid #555;padding:14px}
  h2{margin:0 0 6px;font-size:16px} .src,.n{color:#cfcfcf;font-size:12.5px;margin:4px 0}
  .sw{display:flex;gap:4px;margin:8px 0} .sw i{width:26px;height:26px;border:1px solid #777;display:block}
  .m{font-size:12px;color:#ddd;margin:6px 0 10px} img{width:100%;display:block;margin-bottom:8px;border:1px solid #555}
  .ph{max-width:200px}
</style>
<header><h1>${blind ? 'Blind comparison' : 'Palette lab'}</h1>
<p>${esc(URL_.replace(/([?&](t|token|key|auth)=)[^&]+/gi, '$1…'))} · ${results.length} candidates · neutral grey surround so no candidate is favoured by the page around it</p></header>
<main>${cols}</main>`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
writeFileSync(join(OUT, 'contact.html'), sheet(false));
writeFileSync(join(OUT, 'blind', 'contact.html'), sheet(true));
console.log(`\nwrote ${join(OUT, 'contact.html')}\n      ${join(OUT, 'blind', 'contact.html')}  (judges see letters only; the key is mapping.json, outside blind/)`);

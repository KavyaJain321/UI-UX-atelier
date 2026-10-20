#!/usr/bin/env node
/**
 * scan.mjs - static scan of a project's SOURCE CODE for its colour system and UI/UX problems.
 *
 *   node scan.mjs <project-dir> [--out ./scan]
 *
 * Where audit.mjs measures a running page, this reads the repo, so every finding comes with a
 * file and line you can fix. It answers four questions:
 *
 *   1. What is the stack, and how do I run it?
 *   2. What is the colour system? Every colour token, where it is defined, and in which scope.
 *   3. Where is the system being bypassed? Hardcoded colours, classified as near-duplicates of
 *      an existing token (replace with var(...)) or genuinely off-system.
 *   4. What UI/UX smells are in the source? Removed focus rings, ungated hover, transition:all,
 *      missing alt, dead links, disabled zoom, tiny type, 100vh traps, gradient text...
 *
 * Writes report.md and scan.json. No dependencies. Heuristic by nature: it reads lines, not an
 * AST, so treat every finding as a pointer to look at, and say so when you report it.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, extname, resolve, basename } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const ROOT = resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out') || '.');
const OUT = resolve(flag('out', './scan'));
if (!existsSync(ROOT)) { console.error('no such directory: ' + ROOT); process.exit(1); }
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ collect files */

const SKIP = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'vendors',
  '__pycache__', 'venv', '.venv', 'public/build', 'storybook-static', 'tmp', 'temp']);
const STYLE = new Set(['.css', '.scss', '.sass', '.less', '.pcss']);
const MARKUP = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.mdx']);
const SCRIPT = new Set(['.js', '.ts', '.mjs', '.cjs']);
const files = [];
(function walk(dir, depth) {
  if (depth > 14) return;
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      walk(p, depth + 1); continue;
    }
    const x = extname(e.name).toLowerCase();
    if (!STYLE.has(x) && !MARKUP.has(x) && !SCRIPT.has(x)) continue;
    if (/\.min\.(js|css)$|\.bundle\.|\.chunk\.|-[A-Za-z0-9_]{8}\.(js|css)$/.test(e.name)) continue;
    let st; try { st = statSync(p); } catch { continue; }
    if (st.size > 600_000) continue;
    files.push(p);
  }
})(ROOT, 0);

const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

/* ------------------------------------------------------------------ colour maths */

function parseColour(raw) {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  let m;
  if ((m = v.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const out = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    out.a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return out;
  }
  if ((m = v.match(/^rgba?\(([^)]+)\)$/))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const p = parts.slice(0, 3).map((x) => (x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x)));
    if (p.length !== 3 || p.some((n) => isNaN(n))) return null;
    const out = p.map((n) => Math.round(n));
    const a4 = parts[3];
    out.a = a4 === undefined ? 1 : (a4.endsWith('%') ? parseFloat(a4) / 100 : parseFloat(a4));
    return out;
  }
  if ((m = v.match(/^hsla?\(([^)]+)\)$/)) || (m = v.match(/^(-?[\d.]+(?:deg)?\s+[\d.]+%\s+[\d.]+%)$/))) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => parseFloat(x));
    if (p.length < 3 || p.some(isNaN)) return null;
    return hslToRgb(p[0], p[1], p[2]);
  }
  // space-separated channel triplets used by Tailwind-style tokens: "193 18 31"
  if ((m = v.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/))) {
    const p = m.slice(1, 4).map(Number);
    return p.every((n) => n <= 255) ? p : null;
  }
  return null;
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
}
const hex = (rgb) => '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('');
function toLab([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a, b) => { const A = toLab(a), B = toLab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g;

/* ------------------------------------------------------------------ stack */

const stack = { kind: 'unknown', frameworks: [], run: null, build: null, tailwind: false, packageJson: null };
for (const cand of ['package.json', ...readdirSafe(ROOT).filter((d) => !d.startsWith('.')).map((d) => join(d, 'package.json'))]) {
  const p = join(ROOT, cand);
  if (!existsSync(p)) continue;
  try {
    const pkg = JSON.parse(readFileSync(p, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const has = (k) => Object.keys(deps).some((d) => d === k || d.startsWith(k + '/'));
    stack.packageJson = rel(p);
    stack.frameworks = ['next', 'react', 'vue', 'nuxt', 'svelte', '@sveltejs/kit', 'astro', 'solid-js', 'vite',
      'tailwindcss', 'styled-components', '@emotion/react', 'sass', 'gsap', 'lenis', '@studio-freight/lenis',
      'three', '@react-three/fiber', 'framer-motion', 'motion', '@livekit/components-react', 'shadcn', '@radix-ui/react-slot']
      .filter(has);
    stack.tailwind = has('tailwindcss');
    const s = pkg.scripts || {};
    stack.run = s.dev ? 'npm run dev' : s.start ? 'npm start' : s.serve ? 'npm run serve' : null;
    stack.build = s.build ? 'npm run build' : null;
    stack.lint = s.lint ? 'npm run lint' : null;
    stack.typecheck = s.typecheck ? 'npm run typecheck' : (s['type-check'] ? 'npm run type-check' : null);
    stack.test = s.test && !/no test specified/.test(s.test) ? 'npm test' : null;
    stack.kind = 'node';
    break;
  } catch {}
}
if (stack.kind === 'unknown' && files.some((f) => /\.html?$/.test(f))) {
  stack.kind = 'static';
  stack.run = 'python -m http.server 5800   (from the folder holding index.html)';
}
function readdirSafe(d) { try { return readdirSync(d); } catch { return []; } }

/* ------------------------------------------------------------------ scan */

const tokens = [];        // { name, value, rgb, file, line, scope }
const tokenRefs = new Map(); // token name -> number of references anywhere in the source
const literals = [];      // { value, rgb, file, line }
const families = new Map();
const sizes = new Map();
const smells = {};
const smell = (key, file, line, text) => {
  (smells[key] = smells[key] || []).push({ at: `${rel(file)}:${line}`, text: (text || '').trim().slice(0, 110) });
};
let hoverRules = 0, hoverGates = 0, reducedMotion = 0, motionDecls = 0, important = 0;
const zIndexes = new Set();

for (const f of files) {
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const x = extname(f).toLowerCase();
  const isStyle = STYLE.has(x);
  const isMarkup = MARKUP.has(x);
  const lines = src.split(/\r?\n/);
  const fileHasFocusVisible = /focus-visible/.test(src);
  const fileHasDvh = /\d(dvh|svh|lvh)\b/.test(src);
  // style blocks inside markup files (html <style>, vue/svelte <style>) are scanned as style too
  let inStyleBlock = false;
  let scope = '';

  lines.forEach((ln, i) => {
    const n = i + 1;
    if (isMarkup) {
      if (/<style[\s>]/i.test(ln)) inStyleBlock = true;
      if (/<\/style>/i.test(ln)) inStyleBlock = false;
    }
    const styleLike = isStyle || inStyleBlock || /styled\.|css`|createGlobalStyle|sx=\{|style=\{\{/.test(ln);

    // track the nearest selector so we know which scope a token belongs to
    if (styleLike && ln.includes('{')) {
      const sel = ln.slice(0, ln.indexOf('{')).trim();
      if (sel && !sel.startsWith('@media') && !sel.startsWith('@supports')) scope = sel.slice(0, 60);
    }

    // ---- colour tokens
    const tokRe = /(--[\w-]+)\s*:\s*([^;}{]+)/g; let m;
    let isTokenLine = false;
    while ((m = tokRe.exec(ln))) {
      const rgb = parseColour(m[2].replace(/!important/, '').trim());
      if (rgb) { tokens.push({ name: m[1], value: m[2].trim(), rgb, file: rel(f), line: n, scope }); isTokenLine = true; }
      else if (/var\(--/.test(m[2])) isTokenLine = true;   // alias token: --x: var(--y)
    }

    // ---- references to tokens: var(--x), and '--x' strings used from JS (setProperty etc.)
    for (const r of ln.matchAll(/var\(\s*(--[\w-]+)|['"`](--[\w-]+)['"`]/g)) {
      const name = r[1] || r[2]; tokenRefs.set(name, (tokenRefs.get(name) || 0) + 1);
    }

    // ---- hardcoded colour literals (outside token definitions)
    if (!isTokenLine && !/querySelector|getElementById|href=|location|url\(/.test(ln)) {
      const found = ln.match(COLOUR_LITERAL) || [];
      for (const lit of found) {
        if (lit.startsWith('#') && !(styleLike || /color|colour|fill|stroke|bg|background|border|shadow|#[0-9a-f]{6}/i.test(ln))) continue;
        const rgb = parseColour(lit);
        if (rgb) literals.push({ value: lit, rgb, file: rel(f), line: n });
      }
    }

    // ---- tailwind arbitrary colours
    const tw = ln.match(/\b(?:bg|text|border|from|via|to|fill|stroke|ring|outline|decoration|shadow|caret|accent)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]+\))\]/g);
    if (tw) tw.forEach((t) => smell('tailwind-arbitrary-colour', f, n, t));

    // ---- type
    if (styleLike) {
      const ff = ln.match(/font-family\s*:\s*([^;}{]+)/);
      if (ff) { const fam = ff[1].split(',')[0].replace(/["']/g, '').trim(); if (!/var\(/.test(fam)) families.set(fam, (families.get(fam) || 0) + 1); }
      const fs = [...ln.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em)\b/g)];
      for (const s of fs) {
        const px = s[2] === 'px' ? +s[1] : +s[1] * 16;
        sizes.set(Math.round(px), (sizes.get(Math.round(px)) || 0) + 1);
        if (px < 12 && px > 0) smell('text-under-12px', f, n, ln);
      }
    }

    // ---- style smells
    if (styleLike) {
      if (/outline\s*:\s*(none|0)\b/.test(ln) && !fileHasFocusVisible) smell('focus-ring-removed', f, n, ln);
      if (/transition\s*:[^;]*\ball\b/.test(ln) || /transition-property\s*:\s*all/.test(ln)) smell('transition-all', f, n, ln);
      if (/background-clip\s*:\s*text/.test(ln)) smell('gradient-text', f, n, ln);
      if (/\b100vh\b/.test(ln) && !fileHasDvh && !/\d(dvh|svh|lvh)\b/.test(ln)) smell('100vh-without-dvh', f, n, ln);
      if (/overflow-x\s*:\s*hidden/.test(ln) && /\b(html|body)\b/.test(scope)) smell('root-overflow-hidden', f, n, `${scope} { ${ln.trim()} }`);
      if (/:hover\b/.test(ln)) hoverRules++;
      if (/hover\s*:\s*hover/.test(ln)) hoverGates++;
      if (/prefers-reduced-motion/.test(ln)) reducedMotion++;
      if (/@keyframes|animation\s*:|transition\s*:/.test(ln)) motionDecls++;
      if (/!important/.test(ln)) important++;
      const z = ln.match(/z-index\s*:\s*(-?\d+)/); if (z) zIndexes.add(+z[1]);
      if (/user-select\s*:\s*none/.test(ln) && /\b(body|html|\*)\b/.test(scope)) smell('text-selection-disabled', f, n, ln);
    }

    // ---- markup smells
    if (isMarkup || SCRIPT.has(x)) {
      if (/<img\b/i.test(ln)) {
        const tag = (lines.slice(i, i + 6).join(' ').match(/<img\b[^>]*>/i) || [''])[0];
        if (tag && !/\balt\s*=/.test(tag)) smell('img-without-alt', f, n, tag);
      }
      if (/href\s*=\s*["'](#|javascript:[^"']*)["']/.test(ln)) smell('dead-link', f, n, ln);
      if (/<(div|span|li|td|img)\b[^>]*\bonClick\s*=/.test(ln) && !/\brole\s*=/.test(ln)) smell('click-on-non-button', f, n, ln);
      if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(ln)) smell('zoom-disabled', f, n, ln);
      if (/<html\b/i.test(ln) && /\.html?$/.test(f) && !/\blang\s*=/.test(ln)) smell('html-missing-lang', f, n, ln);
      if (/<a\b[^>]*target\s*=\s*["']_blank["']/.test(ln) && !/rel\s*=/.test(ln)) smell('blank-target-without-rel', f, n, ln);
      if (/<input\b/i.test(ln) && /placeholder=/.test(ln) && !/aria-label|id\s*=/.test(ln)) smell('input-placeholder-as-label', f, n, ln);
    }
  });
}

/* tailwind config colours count as tokens */
for (const name of readdirSafe(ROOT).filter((n) => /^tailwind\.config\.(js|cjs|mjs|ts)$/.test(n))) {
  const src = readFileSync(join(ROOT, name), 'utf8');
  src.split(/\r?\n/).forEach((ln, i) => {
    const m = ln.match(/['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/);
    if (m) { const rgb = parseColour(m[2]); if (rgb) tokens.push({ name: 'tw:' + m[1], value: m[2], rgb, file: name, line: i + 1, scope: 'tailwind theme' }); }
  });
}

/* ------------------------------------------------------------------ classify literals */

const rootTokens = tokens.filter((t) => /:root|html|^$|tailwind/.test(t.scope) || !t.scope);
const refTokens = rootTokens.length ? rootTokens : tokens;
const translucent = new Map(); // tints such as rgba(255,255,255,.14): not duplicates, derivatives
const nearDup = new Map();   // literal hex -> { token, n, at[] }
const offSystem = new Map(); // literal hex -> { n, at[] }
for (const l of literals) {
  const h = hex(l.rgb);
  let best = null, bestD = Infinity;
  for (const t of refTokens) { const d = deltaE(l.rgb, t.rgb); if (d < bestD) { bestD = d; best = t; } }
  if ((l.rgb.a ?? 1) < 1) {
    const pct = Math.round((l.rgb.a ?? 1) * 100);
    const k = h + '@' + pct;
    const e = translucent.get(k) || { value: l.value.replace(/\s+/g, ''), alpha: pct, token: best && bestD < 6 ? best.name : null, n: 0, at: [] };
    e.n++; if (e.at.length < 4) e.at.push(`${l.file}:${l.line}`); translucent.set(k, e);
    continue;
  }
  if (best && bestD < 6) {
    const k = h + '→' + best.name;
    const e = nearDup.get(k) || { value: h, token: best.name, tokenValue: best.value, dE: +bestD.toFixed(1), n: 0, at: [] };
    e.n++; if (e.at.length < 6) e.at.push(`${l.file}:${l.line}`); nearDup.set(k, e);
  } else {
    const e = offSystem.get(h) || { value: h, nearest: best ? best.name : null, dE: best ? +bestD.toFixed(1) : null, n: 0, at: [] };
    e.n++; if (e.at.length < 6) e.at.push(`${l.file}:${l.line}`); offSystem.set(h, e);
  }
}

/* ------------------------------------------------------------------ report */

for (const t of tokens) t.refs = tokenRefs.get(t.name) || 0;
const deadTokens = tokens.filter((t) => t.refs === 0 && !t.name.startsWith('tw:'));

const data = {
  root: ROOT, when: new Date().toISOString(), filesScanned: files.length, stack,
  tokens, tokenScopes: [...new Set(tokens.map((t) => t.scope || '(none)'))],
  deadTokens: deadTokens.map((t) => ({ name: t.name, value: t.value, at: `${t.file}:${t.line}` })),
  hardcoded: { occurrences: literals.length, distinct: new Set(literals.map((l) => hex(l.rgb))).size,
    nearDuplicates: [...nearDup.values()].sort((a, b) => b.n - a.n),
    translucent: [...translucent.values()].sort((a, b) => b.n - a.n),
    offSystem: [...offSystem.values()].sort((a, b) => b.n - a.n) },
  type: { families: [...families.entries()].sort((a, b) => b[1] - a[1]), sizes: [...sizes.entries()].sort((a, b) => a[0] - b[0]) },
  motion: { hoverRules, hoverGates, reducedMotion, motionDecls },
  important, zIndexes: [...zIndexes].sort((a, b) => a - b),
  smells,
};
writeFileSync(join(OUT, 'scan.json'), JSON.stringify(data, null, 2));

const SMELL_INFO = {
  'focus-ring-removed': ['Broken', 'Focus outline removed with no :focus-visible replacement in that file; keyboard users lose their place'],
  'img-without-alt': ['Broken', '<img> with no alt; give it a real description, or alt="" if decorative'],
  'zoom-disabled': ['Broken', 'Viewport blocks pinch-zoom; remove user-scalable=no / maximum-scale=1'],
  'html-missing-lang': ['Broken', '<html> without lang; screen readers guess the language'],
  'dead-link': ['Broken', 'href="#" or javascript:; wire it, make it a <button>, or remove it'],
  'click-on-non-button': ['Broken', 'onClick on a non-interactive element with no role; unreachable by keyboard'],
  'input-placeholder-as-label': ['Broken', 'Input labelled only by its placeholder; add a real label or aria-label'],
  'root-overflow-hidden': ['Broken', 'overflow-x:hidden on html/body; use overflow-x:clip (hidden breaks sticky and Android still zooms out)'],
  'text-under-12px': ['Review', 'Text under 12px. Acceptable for a deliberate uppercase metadata voice; wrong for anything people must actually read. Check which each one is'],
  'transition-all': ['Generic', 'transition: all; enumerate the properties (usually transform, opacity, colour)'],
  'gradient-text': ['Generic', 'background-clip:text gradient type; the most common generated-design tell'],
  '100vh-without-dvh': ['Broken', '100vh with no dvh/svh alternative; wrong height on mobile browsers. Add height:100dvh after it'],
  'tailwind-arbitrary-colour': ['Generic', 'Arbitrary colour in a class; the system is being bypassed'],
  'blank-target-without-rel': ['Minor', 'target=_blank without rel="noopener"'],
  'text-selection-disabled': ['Minor', 'user-select:none on the whole page; people cannot copy your content'],
};

const L = [];
L.push(`# Source scan — ${basename(ROOT)}`, '', `_${data.when} · ${files.length} source files read_`, '');
L.push('## Stack', '');
L.push(`- Kind: **${stack.kind}**${stack.packageJson ? ` (\`${stack.packageJson}\`)` : ''}`);
L.push(`- Detected: ${stack.frameworks.length ? stack.frameworks.join(', ') : 'nothing recognisable — plain HTML/CSS/JS'}`);
L.push(`- Run it: \`${stack.run || 'no dev script found — ask, or serve the folder statically'}\``);
if (stack.build) L.push(`- Build check: \`${stack.build}\`${stack.lint ? ` · lint: \`${stack.lint}\`` : ''}${stack.typecheck ? ` · types: \`${stack.typecheck}\`` : ''}${stack.test ? ` · tests: \`${stack.test}\`` : ''}`);
L.push('');

L.push('## Colour system', '');
if (!tokens.length) {
  L.push('**No colour tokens found.** Every colour is hardcoded. Before changing the palette, introduce tokens; otherwise a palette change is a find-and-replace across the whole codebase.', '');
} else {
  L.push(`${tokens.length} colour token definitions across ${data.tokenScopes.length} scope(s): ${data.tokenScopes.slice(0, 8).map((s) => `\`${s}\``).join(', ')}`, '');
  L.push('| Token | Value | Scope | Uses | Defined at |', '|---|---|---|---|---|');
  tokens.slice(0, 60).forEach((t) => L.push(`| \`${t.name}\` | \`${t.value.slice(0, 28)}\` ${hex(t.rgb)} | \`${t.scope || ''}\` | ${t.refs} | ${t.file}:${t.line} |`));
  if (tokens.length > 60) L.push(`| … | ${tokens.length - 60} more in scan.json | | | |`);
  L.push('');
  if (deadTokens.length) {
    L.push(`**${deadTokens.length} of ${tokens.length} colour tokens are never referenced:** ${deadTokens.slice(0, 30).map((t) => '`' + t.name + '`').join(', ')}${deadTokens.length > 30 ? ', …' : ''}`, '');
    L.push('Dead tokens make the system look bigger than it is and mislead anyone changing the palette. For a palette change, the tokens with uses are the real role map.', '');
  }
}
L.push(`**Hardcoded colours:** ${data.hardcoded.occurrences} literal(s), ${data.hardcoded.distinct} distinct.`, '');
if (data.hardcoded.nearDuplicates.length) {
  L.push(`### Near-duplicates of an existing token (replace with the token)`, '');
  L.push('| Literal | Use instead | ΔE | Count | Where |', '|---|---|---|---|---|');
  data.hardcoded.nearDuplicates.slice(0, 25).forEach((d) => L.push(`| \`${d.value}\` | \`var(${d.token})\` | ${d.dE} | ${d.n} | ${d.at.join(', ')} |`));
  L.push('');
}
if (data.hardcoded.translucent.length) {
  L.push(`### Translucent tints (${data.hardcoded.translucent.reduce((a, d) => a + d.n, 0)} uses)`, '');
  L.push('Not duplicates; tints. Where one derives from a token, express it from the token so a palette change carries it: `color-mix(in srgb, var(--token) 14%, transparent)`, or `rgb(var(--token) / .14)` when tokens are channel triplets.', '');
  L.push('| Literal | Alpha | From token | Count | Where |', '|---|---|---|---|---|');
  data.hardcoded.translucent.slice(0, 15).forEach((d) => L.push(`| \`${d.value}\` | ${d.alpha}% | ${d.token ? '`' + d.token + '`' : '—'} | ${d.n} | ${d.at.join(', ')} |`));
  L.push('');
}
if (data.hardcoded.offSystem.length) {
  L.push(`### Off-system colours (not close to any token)`, '');
  L.push('Each one is either a missing token or a mistake. Decide which before fixing.', '');
  L.push('| Colour | Nearest token | ΔE | Count | Where |', '|---|---|---|---|---|');
  data.hardcoded.offSystem.slice(0, 25).forEach((d) => L.push(`| \`${d.value}\` | ${d.nearest ? '`' + d.nearest + '`' : '—'} | ${d.dE ?? '—'} | ${d.n} | ${d.at.join(', ')} |`));
  L.push('');
}

L.push('## Type', '');
L.push(`**Families:** ${data.type.families.map(([f, n]) => `${f} (${n})`).join(', ') || 'none declared in source'}`);
L.push('');
L.push(`**Literal font sizes:** ${data.type.sizes.length} distinct — ${data.type.sizes.map(([p, n]) => `${p}px×${n}`).join(', ')}`);
if (data.type.sizes.length > 12) L.push('', '_More than a dozen distinct sizes means there is no type scale. Consolidate into a clamp() scale in `systems.md`._');
L.push('');

L.push('## Motion and interaction', '');
L.push(`- \`:hover\` rules: ${hoverRules}; gated behind \`@media (hover:hover)\`: ${hoverGates}${hoverRules && !hoverGates ? ' — **hover states will stick after a tap on touch devices**' : ''}`);
L.push(`- Motion declarations: ${motionDecls}; \`prefers-reduced-motion\` blocks: ${reducedMotion}${motionDecls > 10 && reducedMotion === 0 ? ' — **no reduced-motion path at all**' : ''}`);
L.push(`- \`!important\`: ${important}${important > 40 ? ' — specificity is being fought rather than designed' : ''}`);
L.push(`- Distinct z-index values: ${data.zIndexes.length}${data.zIndexes.length > 10 ? ` (${data.zIndexes.join(', ')}) — define a z-index scale` : ''}`);
L.push('');

L.push('## Source smells', '');
const ORDER = { Broken: 0, Generic: 1, Review: 2, Minor: 3 };
const keys = Object.keys(smells).sort((a, b) => (ORDER[SMELL_INFO[a]?.[0]] ?? 9) - (ORDER[SMELL_INFO[b]?.[0]] ?? 9));
if (!keys.length) L.push('_None found._');
for (const k of keys) {
  const [tier, why] = SMELL_INFO[k] || ['Minor', k];
  L.push(`### ${tier}: ${k} (${smells[k].length})`, '', why, '');
  smells[k].slice(0, 10).forEach((s) => L.push(`- \`${s.at}\` — ${s.text.replace(/\|/g, '\\|')}`));
  if (smells[k].length > 10) L.push(`- …${smells[k].length - 10} more in scan.json`);
  L.push('');
}

L.push('---', '', '## Limits of this scan', '');
L.push('- It reads source lines, not a syntax tree, so expect some false positives. Open each location before changing it.');
L.push('- Colours computed at runtime, injected by libraries, or set from JavaScript objects are only partly visible here. Pair this with `audit.mjs` on the running site.');
L.push('- Minified, bundled and vendored files are skipped on purpose; they are not yours to fix.');

writeFileSync(join(OUT, 'report.md'), L.join('\n'));
console.log(`scanned ${files.length} files → ${join(OUT, 'report.md')}`);
console.log(`stack: ${stack.kind}${stack.frameworks.length ? ' (' + stack.frameworks.join(', ') + ')' : ''} · tokens: ${tokens.length} · hardcoded colours: ${literals.length} (${data.hardcoded.nearDuplicates.reduce((a, d) => a + d.n, 0)} near-duplicates of tokens) · smell types: ${keys.length}`);

#!/usr/bin/env node
/**
 * contrast.mjs - check WCAG contrast, and repair a failing colour without changing its character.
 *
 *   node contrast.mjs "#c1121f" "#000"                 ratio + AA/AAA verdicts
 *   node contrast.mjs "#6e6764" "#000" --fix 4.5       nearest colour that reaches 4.5:1
 *   node contrast.mjs --matrix "#000,#fff,#c1121f,#bdbdbd"
 *
 * Accepts #hex, rgb()/rgba(), hsl(), and channel triplets such as "193 18 31".
 *
 * --fix moves ONLY the lightness, in OKLCH, so the hue survives and the colour still reads as
 * itself. That is the difference between repairing a token and replacing it: a muted grey
 * becomes a slightly lighter muted grey, not a different grey, and a brand red stays the same
 * red. If the target is unreachable at that hue (very saturated colours near black), chroma is
 * reduced last, and the output says so.
 */
const argv = process.argv.slice(2);

function parse(raw) {
  const v = String(raw).trim().toLowerCase();
  let m;
  if ((m = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/))) {
    let h = m[1]; if (h.length === 3) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  if ((m = v.match(/^rgba?\(([^)]+)\)$/))) return m[1].split(/[\s,/]+/).slice(0, 3).map((x) => Math.round(x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x)));
  if ((m = v.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/))) return m.slice(1, 4).map(Number);
  if ((m = v.match(/^hsla?\(([^)]+)\)$/))) {
    const [h, s, l] = m[1].split(/[\s,/]+/).map(parseFloat); const S = s / 100, Lx = l / 100;
    const k = (n) => (n + h / 30) % 12, a = S * Math.min(Lx, 1 - Lx);
    return [0, 8, 4].map((n) => Math.round(255 * (Lx - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))));
  }
  throw new Error('cannot parse colour: ' + raw);
}
const toHex = (rgb) => '#' + rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const unlin = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const lum = (rgb) => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// OKLab / OKLCH (Björn Ottosson)
function toOklch(rgb) {
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function fromOklch([L, C, H]) {
  const A = C * Math.cos(H), B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return { rgb: [r, g, b].map(unlin), inGamut: [r, g, b].every((c) => c >= -1e-4 && c <= 1 + 1e-4) };
}
function verdict(r) {
  return `${r.toFixed(2)}:1  ` +
    `body AA ${r >= 4.5 ? 'pass' : 'FAIL'} · large AA ${r >= 3 ? 'pass' : 'FAIL'} · body AAA ${r >= 7 ? 'pass' : 'fail'} · UI 3:1 ${r >= 3 ? 'pass' : 'FAIL'}`;
}

function fix(fg, bg, target) {
  const [L0, C0, H] = toOklch(fg);
  const darkBg = lum(bg) < 0.18;
  // walk lightness away from the background until the ratio is met; keep hue, keep chroma if possible
  for (let C = C0; C >= 0; C -= Math.max(0.005, C0 / 20)) {
    let lo = darkBg ? L0 : 0, hi = darkBg ? 1 : L0;
    if (ratio(clampRgb(fromOklch([darkBg ? 1 : 0, C, H]).rgb), bg) < target) continue;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const ok = ratio(clampRgb(fromOklch([mid, C, H]).rgb), bg) >= target;
      if (darkBg) { if (ok) hi = mid; else lo = mid; } else { if (ok) lo = mid; else hi = mid; }
    }
    const Lf = darkBg ? hi : lo;
    const out = fromOklch([Lf, C, H]);
    if (!out.inGamut && C > 0) continue;
    const rgb = clampRgb(out.rgb);
    if (ratio(rgb, bg) >= target) return { rgb, dL: Lf - L0, chromaKept: C / (C0 || 1) };
  }
  return null;
}
const clampRgb = (rgb) => rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))));

try {
  if (argv[0] === '--matrix') {
    const list = argv[1].split(',').map((s) => s.trim());
    const cols = list.map(parse);
    const w = 11;
    console.log(''.padEnd(w) + list.map((s) => toHex(parse(s)).padStart(w)).join(''));
    cols.forEach((a, i) => console.log(toHex(a).padEnd(w) + cols.map((b) => {
      const r = ratio(a, b); return (r.toFixed(1) + (r >= 4.5 ? '*' : r >= 3 ? ':' : ' ')).padStart(w);
    }).join('')));
    console.log('\n  * body text AA (4.5:1)   : large text / UI only (3:1)');
  } else if (argv.length >= 2) {
    const fg = parse(argv[0]), bg = parse(argv[1]);
    const r = ratio(fg, bg);
    console.log(`${toHex(fg)} on ${toHex(bg)}: ${verdict(r)}`);
    const ti = argv.indexOf('--fix');
    if (ti !== -1) {
      const target = parseFloat(argv[ti + 1] || '4.5');
      if (r >= target) { console.log(`already meets ${target}:1, nothing to change`); }
      else {
        const res = fix(fg, bg, target);
        if (!res) console.log(`cannot reach ${target}:1 against ${toHex(bg)} at any lightness; change the background instead`);
        else {
          const h = toHex(res.rgb);
          console.log(`fixed: ${h}  (${ratio(res.rgb, bg).toFixed(2)}:1, lightness ${res.dL >= 0 ? '+' : ''}${(res.dL * 100).toFixed(1)}%` +
            `${res.chromaKept < 0.98 ? `, chroma reduced to ${(res.chromaKept * 100).toFixed(0)}% to stay in gamut` : ', hue and chroma kept'})`);
          console.log(`as triplet: ${res.rgb.join(' ')}`);
        }
      }
    }
  } else {
    console.log('usage: node contrast.mjs <fg> <bg> [--fix 4.5]   |   node contrast.mjs --matrix "#a,#b,#c"');
  }
} catch (e) { console.error(e.message); process.exit(1); }

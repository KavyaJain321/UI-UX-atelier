#!/usr/bin/env node
/**
 * audit-source.mjs - static evidence pass over a repository's UI code.
 *
 *   node audit-source.mjs [repoPath] [options]
 *
 * Options
 *   --out ./audit        write source.json + source.md here (default: stdout only)
 *   --max 4000           maximum files to read (default 4000)
 *   --include a,b        extra directories to scan that are skipped by default
 *   --json               print the JSON to stdout instead of the summary
 *
 * This is the half of a UI audit that a browser cannot see: whether a token system exists
 * and whether anyone obeys it, how many distinct colours and type sizes are really in play,
 * what animates and what drives it, and which mechanical tells of a generated design are
 * present in the source.
 *
 * It reports what can be counted, never what can be argued about. Anything that a regex
 * cannot settle safely - a class name assembled at runtime, a colour that only appears
 * inside a comment, a contrast pair that depends on a background image - is emitted under
 * `verify` rather than as a finding, because a count that inflates is worse than no count.
 *
 * No dependencies. Node 18+.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative, extname, basename, sep } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const ROOT = resolve(argv.find((a) => !a.startsWith('--') && !argv[argv.indexOf(a) - 1]?.startsWith('--')) || '.');
const OUT = flag('out', null);
const MAX = +flag('max', 4000);
const EXTRA = (flag('include', '') || '').split(',').filter(Boolean);

const SKIP = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', 'dist', 'build', 'out',
  'coverage', '.cache', '.turbo', '.vercel', '.output', 'vendor', 'venv', '.venv', '__pycache__',
  'target', 'Pods', 'DerivedData', '.idea', '.vscode']);
for (const e of EXTRA) SKIP.delete(e);

const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro']);
const STYLE = new Set(['.css', '.scss', '.sass', '.less', '.styl', '.pcss']);
const MARKUP = new Set(['.html', '.htm']);
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico']);
const VIDEO = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const FONT = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot']);

/* ---------------------------------------------------------------- walk */

const files = [];
let skipped = 0;
(function walk(dir, depth) {
  if (depth > 12) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (files.length >= MAX) { skipped++; continue; }
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p, depth + 1); continue; }
    if (!e.isFile()) continue;
    let size = 0;
    try { size = statSync(p).size; } catch { continue; }
    files.push({ path: p, rel: relative(ROOT, p).split(sep).join('/'), ext: extname(e.name).toLowerCase(), size });
  }
})(ROOT, 0);

const read = (f) => { try { return readFileSync(f.path, 'utf8'); } catch { return ''; } };
const byExt = (set) => files.filter((f) => set.has(f.ext));
const codeFiles = byExt(CODE), styleFiles = byExt(STYLE), markupFiles = byExt(MARKUP);
/* source we scan for UI facts: code + styles + markup, skipping anything enormous or minified */
const sourceFiles = [...codeFiles, ...styleFiles, ...markupFiles]
  .filter((f) => f.size < 600_000 && !/\.min\.(js|css)$/.test(f.rel) && !/[-.]min\./.test(basename(f.rel)));
const texts = new Map();
for (const f of sourceFiles) texts.set(f.rel, read(f));
const allSource = [...texts.values()].join('\n');
const styleText = styleFiles.filter((f) => texts.has(f.rel)).map((f) => texts.get(f.rel)).join('\n');

/* strip comments and string-literal noise before counting, so a hex inside a comment
   is not reported as a hardcoded colour */
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const styleClean = decomment(styleText);
const sourceClean = decomment(allSource);

const uniq = (a) => [...new Set(a)];
const count = (re, s = sourceClean) => (s.match(re) || []).length;
const tally = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return m; };
const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, n: v }));

const verify = [];   /* things a human or a browser must settle */
const note = (what) => verify.push(what);

/* ---------------------------------------------------------------- stack */

let pkg = {};
const pkgPath = join(ROOT, 'package.json');
if (existsSync(pkgPath)) { try { pkg = JSON.parse(readFileSync(pkgPath, 'utf8')); } catch { note('package.json exists but did not parse'); } }
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const dep = (n) => Object.prototype.hasOwnProperty.call(deps, n);

const framework =
  dep('next') ? 'Next.js' : dep('nuxt') || dep('nuxt3') ? 'Nuxt' : dep('@remix-run/react') ? 'Remix' :
  dep('@sveltejs/kit') ? 'SvelteKit' : dep('astro') ? 'Astro' : dep('gatsby') ? 'Gatsby' :
  dep('vue') ? 'Vue' : dep('svelte') ? 'Svelte' : dep('react') ? 'React' :
  markupFiles.length ? 'static HTML' : 'unknown';

const cssApproach = [
  dep('tailwindcss') && 'Tailwind',
  (dep('styled-components') || dep('@emotion/react') || dep('@emotion/styled')) && 'CSS-in-JS',
  files.some((f) => /\.module\.(css|scss)$/.test(f.rel)) && 'CSS Modules',
  (dep('sass') || styleFiles.some((f) => f.ext === '.scss' || f.ext === '.sass')) && 'Sass',
  styleFiles.some((f) => f.ext === '.css') && 'plain CSS',
].filter(Boolean);

/* Libraries are detected three ways, because a buildless site vendors them and a CDN site
   links them - looking only at package.json reports "no motion library" for a page that is
   driven entirely by GSAP. */
const LIB_SIGNATURES = [
  ['GSAP', ['gsap'], /\bgsap\.(to|from|timeline|registerPlugin|ticker)\b|gsap(\.min)?\.js|from ['"]gsap['"]/],
  ['ScrollTrigger', ['gsap'], /\bScrollTrigger\b/],
  ['Lenis', ['lenis', '@studio-freight/lenis'], /\bnew\s+Lenis\b|lenis(\.min)?\.js|from ['"]@?[\w/-]*lenis['"]/],
  ['Locomotive Scroll', ['locomotive-scroll'], /\bLocomotiveScroll\b|locomotive-scroll/],
  ['Framer Motion', ['framer-motion'], /from ['"]framer-motion['"]|\bmotion\.(div|section|span)\b/],
  ['Three.js', ['three'], /\bTHREE\.\w|from ['"]three['"]|three(\.min)?\.js/],
  ['React Three Fiber', ['@react-three/fiber'], /@react-three\/fiber/],
  ['Lottie', ['lottie-web', 'lottie-react'], /\blottie\b/i],
  ['Anime.js', ['animejs'], /\banime\s*\(|animejs/],
  ['React Spring', ['react-spring', '@react-spring/web'], /react-spring/],
  ['AOS', ['aos'], /\bAOS\.init\b|aos\.js/],
  ['Swiper', ['swiper'], /\bnew\s+Swiper\b|swiper(\.min)?\.js/],
  ['Embla', ['embla-carousel'], /embla-carousel/],
  ['Barba', ['barba.js', '@barba/core'], /\bbarba\b/i],
  ['Splitting/SplitType', ['splitting', 'split-type'], /\bSplitType\b|\bSplitting\b/],
];
/* filenames of vendored copies, e.g. js/vendor/gsap.min.js - matched exactly, so a project's
   own system/motion.js is never mistaken for the `motion` package */
const vendoredNames = new Set(files.map((f) => basename(f.rel).toLowerCase()));
const isVendored = (pkg) => {
  const stem = pkg.split('/').pop();
  return vendoredNames.has(stem + '.js') || vendoredNames.has(stem + '.min.js');
};
const detectLib = ([label, pkgs, re]) => {
  const via = [];
  if (pkgs.some(dep)) via.push('dependency');
  if (re.test(sourceClean)) via.push('source');
  if (pkgs.some(isVendored)) via.push('vendored file');
  return via.length ? { name: label, via: uniq(via) } : null;
};
const motionLibDetail = LIB_SIGNATURES.map(detectLib).filter(Boolean);
const motionLibs = motionLibDetail.map((l) => l.name);

const stack = {
  framework,
  typescript: dep('typescript') || files.some((f) => f.ext === '.ts' || f.ext === '.tsx'),
  cssApproach: cssApproach.length ? cssApproach : ['none detected'],
  motionLibraries: motionLibs,
  motionLibraryDetail: motionLibDetail,
  dependencyCount: Object.keys(deps).length,
  packageName: pkg.name || null,
};

/* ---------------------------------------------------------------- tokens */

const declaredTokens = uniq((styleClean.match(/--[a-zA-Z0-9-_]+\s*:/g) || []).map((s) => s.replace(/\s*:$/, '')));
const usedTokens = uniq((sourceClean.match(/var\(\s*(--[a-zA-Z0-9-_]+)/g) || []).map((s) => s.replace(/var\(\s*/, '')));
const unusedTokens = declaredTokens.filter((t) => !usedTokens.includes(t));
const undeclaredTokens = usedTokens.filter((t) => !declaredTokens.includes(t));
if (undeclaredTokens.length) note(`${undeclaredTokens.length} custom properties are used but not declared in any scanned stylesheet - they may come from a library, an inline style, or JS`);

/* Tailwind theme config counts as a token system too */
const twConfig = files.find((f) => /^tailwind\.config\.(js|cjs|mjs|ts)$/.test(basename(f.rel)));
const twTheme = twConfig ? (texts.get(twConfig.rel) || read(twConfig)) : '';
const twExtends = twTheme ? uniq((twTheme.match(/\b(colors|fontFamily|fontSize|spacing|borderRadius|screens)\b\s*:/g) || []).map((s) => s.replace(/\s*:$/, ''))) : [];

/* ---------------------------------------------------------------- colour */

const hexes = (sourceClean.match(/#[0-9a-fA-F]{3,8}\b/g) || [])
  .map((h) => h.toLowerCase())
  .filter((h) => h.length === 4 || h.length === 7 || h.length === 9);
const rgbs = sourceClean.match(/\brgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+/g) || [];
const hsls = sourceClean.match(/\bhsla?\(\s*[\d.]+/g) || [];
const oklch = sourceClean.match(/\boklch\(/g) || [];
const hexTally = tally(hexes);

/* a hardcoded colour is one that sits in a style file but not inside a custom-property declaration */
const tokenDeclLines = styleClean.split('\n').filter((line) => /--[a-zA-Z0-9-_]+\s*:/.test(line));
const hexesInTokens = ((tokenDeclLines.join('\n').match(/#[0-9a-fA-F]{3,8}\b/g)) || []).length;

const colour = {
  distinctHex: hexTally.size,
  totalHexOccurrences: hexes.length,
  hexInsideTokenDeclarations: hexesInTokens,
  hexOutsideTokenDeclarations: Math.max(0, hexes.length - hexesInTokens),
  rgbFunctions: rgbs.length,
  hslFunctions: hsls.length,
  oklchFunctions: oklch.length,
  mostUsed: top(hexTally, 14),
};

/* ---------------------------------------------------------------- type */

const fontFamilies = uniq((sourceClean.match(/font-family\s*:\s*[^;{}]+/gi) || [])
  .map((s) => s.replace(/font-family\s*:\s*/i, '').trim().replace(/["']/g, '').split(',')[0].trim())
  .filter((s) => s && !s.startsWith('var(') && s.length < 60));
const googleFonts = uniq((allSource.match(/fonts\.googleapis\.com\/css2\?family=([^"'&)]+)/g) || [])
  .map((s) => decodeURIComponent(s.split('family=')[1]).split(':')[0].replace(/\+/g, ' ')));
const nextFonts = uniq((allSource.match(/from\s+['"]next\/font\/google['"][\s\S]{0,400}?\b([A-Z][A-Za-z_]+)\s*\(/g) || [])
  .map((s) => (s.match(/\b([A-Z][A-Za-z_]+)\s*\($/) || [])[1]).filter(Boolean));
const fontSizes = (styleClean.match(/font-size\s*:\s*([^;{}]+)/gi) || [])
  .map((s) => s.replace(/font-size\s*:\s*/i, '').trim())
  .filter((s) => !s.startsWith('var(') && !s.startsWith('inherit'));
const fontFileCount = byExt(FONT).length;
const type = {
  familiesDeclared: fontFamilies.slice(0, 20),
  googleFontsLinked: googleFonts,
  nextFontImports: nextFonts,
  selfHostedFontFiles: fontFileCount,
  distinctFontSizeValues: uniq(fontSizes).length,
  fontSizeValues: top(tally(fontSizes), 20),
  usesClamp: count(/font-size\s*:\s*clamp\(/gi, styleClean),
};

/* ---------------------------------------------------------------- spacing + radius */

const spacingValues = (styleClean.match(/\b(?:margin|padding|gap)(?:-(?:top|right|bottom|left|inline|block))?\s*:\s*([^;{}]+)/gi) || [])
  .map((s) => s.split(':')[1].trim()).filter((s) => !s.startsWith('var('));
const radii = (styleClean.match(/border-radius\s*:\s*([^;{}]+)/gi) || []).map((s) => s.split(':')[1].trim());
const radiusTally = tally(radii);

/* ---------------------------------------------------------------- css health */

const importants = count(/!important/g, styleClean);
const keyframes = uniq((styleClean.match(/@keyframes\s+([a-zA-Z0-9_-]+)/g) || []).map((s) => s.split(/\s+/)[1]));
const mediaQueries = (styleClean.match(/@media[^{]+/g) || []).map((s) => s.replace(/\s+/g, ' ').trim());
const breakpoints = uniq((mediaQueries.join(' ').match(/\b\d{2,4}px\b/g) || []));
const idSelectors = count(/^\s*#[a-zA-Z][\w-]*\s*[,{]/gm, styleClean);

/* declared class names that never appear in any code/markup file - a heuristic, not a fact */
const declaredClasses = uniq((styleClean.match(/(^|[\s,>+~])\.(-?[_a-zA-Z][\w-]*)/g) || [])
  .map((s) => s.trim().replace(/^[\s,>+~]+/, '').slice(1)))
  .filter((c) => c.length > 2 && !/^(is|has)-/.test(c));
const nonStyleText = [...codeFiles, ...markupFiles].filter((f) => texts.has(f.rel)).map((f) => texts.get(f.rel)).join('\n');
const possiblyUnusedClasses = declaredClasses.filter((c) => !nonStyleText.includes(c)).slice(0, 60);
if (possiblyUnusedClasses.length) note(`${possiblyUnusedClasses.length}+ CSS classes were not found as literal strings in code or markup - some may be composed at runtime, so treat as candidates, not dead code`);

const css = {
  styleFiles: styleFiles.length,
  styleBytes: styleFiles.reduce((a, f) => a + f.size, 0),
  importantCount: importants,
  idSelectorsInCss: idSelectors,
  keyframeNames: keyframes,
  distinctBreakpoints: breakpoints.sort((a, b) => parseInt(a) - parseInt(b)),
  mediaQueryCount: mediaQueries.length,
  mobileFirst: mediaQueries.filter((q) => /min-width/.test(q)).length >= mediaQueries.filter((q) => /max-width/.test(q)).length,
  possiblyUnusedClassCount: possiblyUnusedClasses.length,
  possiblyUnusedClassSample: possiblyUnusedClasses.slice(0, 20),
};

/* ---------------------------------------------------------------- motion */

const transitionProps = (styleClean.match(/transition(?:-property)?\s*:\s*([^;{}]+)/gi) || [])
  .flatMap((s) => s.split(':')[1].split(',').map((x) => x.trim().split(/\s+/)[0]))
  .filter((p) => p && p !== 'none');
const animatedProps = tally(transitionProps);
const CHEAP = new Set(['transform', 'opacity', 'filter', 'backdrop-filter', 'all', 'color', 'background-color', 'border-color', 'box-shadow', 'visibility', 'fill', 'stroke', 'stroke-dashoffset', 'clip-path']);
const EXPENSIVE = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'font-size'];
const expensiveAnimated = [...animatedProps.entries()].filter(([p]) => EXPENSIVE.some((e) => p.startsWith(e)));

const motion = {
  libraries: motionLibs,
  transitionDeclarations: transitionProps.length,
  keyframeCount: keyframes.length,
  animatedProperties: top(animatedProps, 14),
  expensiveAnimatedProperties: expensiveAnimated.map(([value, n]) => ({ value, n })),
  usesWillChange: count(/will-change\s*:/gi, styleClean),
  respectsReducedMotion: /prefers-reduced-motion/.test(styleClean) || /prefers-reduced-motion/.test(sourceClean),
  scrollDrivenApis: {
    intersectionObserver: count(/new\s+IntersectionObserver/g),
    scrollListeners: count(/addEventListener\(\s*['"]scroll['"]/g),
    requestAnimationFrame: count(/requestAnimationFrame\s*\(/g),
    cssScrollTimeline: count(/animation-timeline\s*:/gi, styleClean),
  },
};
if (!motion.respectsReducedMotion && (motion.transitionDeclarations > 0 || motion.keyframeCount > 0)) {
  note('no prefers-reduced-motion rule was found anywhere, but the project animates - confirm in the browser before reporting it as absent');
}

/* ---------------------------------------------------------------- accessibility (markup level) */

const imgTags = sourceClean.match(/<img\b[^>]*>/gi) || [];
const imgNoAlt = imgTags.filter((t) => !/\balt\s*=/.test(t));
const buttonTags = sourceClean.match(/<button\b[^>]*>[\s\S]{0,200}?<\/button>/gi) || [];
const buttonEmpty = buttonTags.filter((t) => {
  const inner = t.replace(/<button\b[^>]*>/i, '').replace(/<\/button>/i, '').replace(/<[^>]+>/g, '').trim();
  return !inner && !/aria-label\s*=/.test(t) && !/aria-labelledby\s*=/.test(t);
});
const hashLinks = count(/<a\b[^>]*href\s*=\s*["']#["']/gi);
const inputTags = sourceClean.match(/<input\b[^>]*>/gi) || [];
const inputNoLabel = inputTags.filter((t) => !/aria-label/.test(t) && !/\bid\s*=/.test(t) && !/type\s*=\s*["'](hidden|submit|button)["']/.test(t));
const positiveTabindex = count(/tabindex\s*=\s*["']?[1-9]/gi);
const headings = (sourceClean.match(/<h([1-6])\b/gi) || []).map((h) => +h.slice(-1));
const h1Count = headings.filter((h) => h === 1).length;
const onClickDivs = count(/<div\b[^>]*\bonClick[= ]/gi) + count(/<div\b[^>]*\bon:click[= ]/gi) + count(/<div\b[^>]*\b@click[= ]/gi);

const a11y = {
  imgTags: imgTags.length,
  imgWithoutAlt: imgNoAlt.length,
  buttonsWithoutAccessibleName: buttonEmpty.length,
  linksToHash: hashLinks,
  inputsWithoutLabelOrId: inputNoLabel.length,
  positiveTabindex,
  h1Count,
  headingLevelsUsed: uniq(headings).sort(),
  clickHandlersOnDivs: onClickDivs,
  focusVisibleStyles: count(/:focus-visible/g, styleClean),
  outlineNoneCount: count(/outline\s*:\s*(none|0)\b/gi, styleClean),
};
if (a11y.outlineNoneCount > 0 && a11y.focusVisibleStyles === 0) note('focus outlines are removed somewhere and no :focus-visible replacement was found - confirm in the browser by tabbing');
if (a11y.imgTags === 0 && framework !== 'static HTML') note('no literal <img> tags found; this project may use a framework Image component, so alt-text coverage must be checked in the component call sites');

/* ---------------------------------------------------------------- assets */

const imgFiles = byExt(IMAGE), vidFiles = byExt(VIDEO);
const bigImages = imgFiles.filter((f) => f.size > 400_000).sort((a, b) => b.size - a.size).slice(0, 15);
const rasterFormats = tally(imgFiles.map((f) => f.ext));
const referenced = (rel) => {
  const base = basename(rel);
  return allSource.includes(base);
};
const unreferencedAssets = [...imgFiles, ...vidFiles].filter((f) => !referenced(f.rel));
if (unreferencedAssets.length) note(`${unreferencedAssets.length} image/video files are not referenced by filename anywhere in the scanned source - some may be built dynamically or served statically, so confirm before deleting`);

const assets = {
  images: imgFiles.length,
  imageBytes: imgFiles.reduce((a, f) => a + f.size, 0),
  videos: vidFiles.length,
  videoBytes: vidFiles.reduce((a, f) => a + f.size, 0),
  fontFiles: fontFileCount,
  formats: top(rasterFormats, 10),
  largestImages: bigImages.map((f) => ({ rel: f.rel, bytes: f.size })),
  apparentlyUnreferencedCount: unreferencedAssets.length,
  apparentlyUnreferencedSample: unreferencedAssets.slice(0, 15).map((f) => f.rel),
};

/* ---------------------------------------------------------------- convergence tells */

/* The mechanical signatures of a design produced without looking at the client.
   Each is a countable fact; the judgement about whether it matters is the reader's. */
const TELLS = [
  { id: 'cream-serif-terracotta', label: 'Warm-cream ground (#F4F1EA family)', re: /#f4f1ea|#faf7f2|#f5f1e8|#fdf9f3/gi },
  { id: 'acid-pop', label: 'Lone acid-green / vermilion accent on near-black', re: /#39ff14|#ccff00|#d0ff00|#00ff88|#ff3b00/gi },
  { id: 'purple-blue-gradient', label: 'Purple-to-blue gradient', re: /linear-gradient\([^)]*(#6366f1|#8b5cf6|#a855f7|#7c3aed)[^)]*(#3b82f6|#2563eb|#0ea5e9)/gi },
  { id: 'gradient-text', label: 'Gradient text (background-clip:text)', re: /background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/gi },
  { id: 'inter-space-grotesk', label: 'Inter / Space Grotesk as the display face', re: /\bInter\b|\bSpace Grotesk\b|\bPlus Jakarta\b|\bDM Sans\b/g },
  { id: 'rounded-everywhere', label: 'rounded-lg / rounded-xl utility repetition', re: /\brounded-(lg|xl|2xl)\b/g },
  { id: 'shadow-utility', label: 'shadow-lg / shadow-xl utility repetition', re: /\bshadow-(lg|xl|2xl)\b/g },
  { id: 'emoji-headings', label: 'Emoji used as a section marker in markup', re: /<(h[1-6]|li|p)[^>]*>\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu },
  { id: 'centered-everything', label: 'text-align:center / text-center repetition', re: /text-align\s*:\s*center|\btext-center\b/g },
  { id: 'glassmorphism', label: 'backdrop-blur glass panels', re: /backdrop-filter\s*:\s*blur|\bbackdrop-blur\b/gi },
  { id: 'hero-100vh', label: 'Full-viewport-height hero', re: /(min-)?height\s*:\s*100vh|\bmin-h-screen\b|\bh-screen\b/g },
  { id: 'lorem', label: 'Lorem ipsum placeholder text', re: /lorem ipsum/gi },
  { id: 'stat-triplet', label: 'Three-stat credibility band (99%, 24/7, 10k+)', re: /\b(99(\.9)?%|24\/7|\d{1,3}k\+|\d{1,3},000\+)\b/g },
  { id: 'ai-adjectives', label: 'Marketing filler ("seamless", "elevate", "unlock", "revolutionise")', re: /\b(seamless(ly)?|elevate|unlock|revolutioni[sz]e|empower|cutting-edge|game-chang\w+|transform your)\b/gi },
];
const convergence = TELLS.map((t) => ({ id: t.id, label: t.label, hits: count(t.re) })).filter((t) => t.hits > 0);
const convergenceScore = convergence.reduce((a, t) => a + Math.min(t.hits, 20), 0);

/* ---------------------------------------------------------------- components */

const componentFiles = codeFiles.filter((f) => /\/(components?|ui|blocks|sections|widgets|views|partials)\//i.test('/' + f.rel) || /\.(vue|svelte|astro)$/.test(f.rel));
const largestComponents = codeFiles.slice().sort((a, b) => b.size - a.size).slice(0, 12).map((f) => ({ rel: f.rel, bytes: f.size, lines: (texts.get(f.rel) || '').split('\n').length }));

const structure = {
  totalFilesScanned: files.length,
  truncated: skipped > 0,
  codeFiles: codeFiles.length,
  styleFiles: styleFiles.length,
  markupFiles: markupFiles.length,
  componentLikeFiles: componentFiles.length,
  largestSourceFiles: largestComponents,
};

/* ---------------------------------------------------------------- verdicts (facts only) */

const tokenSystem = declaredTokens.length > 0 || twExtends.length > 0;
const tokens = {
  cssCustomPropertiesDeclared: declaredTokens.length,
  cssCustomPropertiesUsed: usedTokens.length,
  declaredButUnused: unusedTokens.length,
  usedButUndeclared: undeclaredTokens.length,
  tailwindThemeKeysExtended: twExtends,
  hasTokenSystem: tokenSystem,
  sample: declaredTokens.slice(0, 30),
};

const spacing = {
  distinctSpacingValues: uniq(spacingValues).length,
  distinctRadiusValues: radiusTally.size,
  radiusValues: top(radiusTally, 8),
};

const data = {
  root: ROOT.split(sep).join('/'),
  when: new Date().toISOString(),
  stack, structure, tokens, colour, type, spacing, css, motion, a11y, assets,
  convergence: { score: convergenceScore, tells: convergence },
  verify,
};

/* ---------------------------------------------------------------- report */

const kb = (b) => b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : b >= 1024 ? (b / 1024).toFixed(0) + ' KB' : b + ' B';
const L = [];
L.push(`# Source audit — ${basename(ROOT)}`, '', `_${data.when}_`, '');
L.push(`**Stack** ${stack.framework}${stack.typescript ? ' · TypeScript' : ''} · ${stack.cssApproach.join(', ')}` +
  (motionLibs.length ? ` · motion: ${motionLibDetail.map((l) => `${l.name} (${l.via.join('+')})`).join(', ')}` : ' · no motion library detected'), '');
L.push(`${structure.codeFiles} code · ${structure.styleFiles} style · ${structure.markupFiles} markup files scanned${structure.truncated ? ` (truncated at --max ${MAX})` : ''}`, '');

L.push('## Token system', '');
if (tokenSystem) {
  L.push(`${tokens.cssCustomPropertiesDeclared} custom properties declared, ${tokens.cssCustomPropertiesUsed} used.` +
    (tokens.declaredButUnused ? ` ${tokens.declaredButUnused} declared but never referenced.` : '') +
    (twExtends.length ? ` Tailwind theme extends: ${twExtends.join(', ')}.` : ''), '');
} else {
  L.push('**No token system found.** No CSS custom properties and no extended Tailwind theme.', '');
}
L.push(`Colour values in source: ${colour.distinctHex} distinct hex (${colour.totalHexOccurrences} occurrences), ` +
  `${colour.hexOutsideTokenDeclarations} of them outside a custom-property declaration; ` +
  `${colour.rgbFunctions} rgb(), ${colour.hslFunctions} hsl(), ${colour.oklchFunctions} oklch().`, '');
if (colour.mostUsed.length) L.push('Most repeated: ' + colour.mostUsed.map((c) => `\`${c.value}\`×${c.n}`).join(' · '), '');

L.push('', '## Type', '');
L.push(`Families declared: ${type.familiesDeclared.length ? type.familiesDeclared.join(', ') : 'none found'}` +
  (type.googleFontsLinked.length ? ` · Google Fonts: ${type.googleFontsLinked.join(', ')}` : '') +
  (type.nextFontImports.length ? ` · next/font: ${type.nextFontImports.join(', ')}` : '') +
  ` · ${type.selfHostedFontFiles} self-hosted font files`, '');
L.push(`${type.distinctFontSizeValues} distinct font-size values${type.usesClamp ? `, ${type.usesClamp} using clamp()` : ''}.`, '');

L.push('', '## Spacing and shape', '');
L.push(`${spacing.distinctSpacingValues} distinct margin/padding/gap values · ${spacing.distinctRadiusValues} distinct border-radius values` +
  (spacing.radiusValues.length ? ` (${spacing.radiusValues.map((r) => `${r.value}×${r.n}`).join(', ')})` : ''), '');

L.push('', '## CSS health', '');
L.push(`${kb(css.styleBytes)} across ${css.styleFiles} files · ${css.importantCount} \`!important\` · ${css.idSelectorsInCss} id selectors · ` +
  `${css.mediaQueryCount} media queries (${css.mobileFirst ? 'mobile-first' : 'desktop-first'}) at ${css.distinctBreakpoints.join(', ') || 'no px breakpoints'}`, '');
if (css.possiblyUnusedClassCount) L.push(`${css.possiblyUnusedClassCount} classes not found as literal strings in code/markup — candidates only, see \`verify\`.`, '');

L.push('', '## Motion', '');
L.push(`${motion.transitionDeclarations} transition declarations · ${motion.keyframeCount} @keyframes · ` +
  `${motion.scrollDrivenApis.requestAnimationFrame} rAF calls · ${motion.scrollDrivenApis.scrollListeners} scroll listeners · ` +
  `${motion.scrollDrivenApis.intersectionObserver} IntersectionObservers`, '');
L.push(`Reduced motion respected in source: **${motion.respectsReducedMotion ? 'yes' : 'not found'}**`, '');
if (motion.expensiveAnimatedProperties.length) {
  L.push(`Animating layout-triggering properties: ${motion.expensiveAnimatedProperties.map((p) => `\`${p.value}\`×${p.n}`).join(', ')} — these cannot be composited.`, '');
}

L.push('', '## Accessibility (markup level)', '');
L.push(`${a11y.imgTags} \`<img>\`, ${a11y.imgWithoutAlt} without alt · ${a11y.buttonsWithoutAccessibleName} buttons with no accessible name · ` +
  `${a11y.linksToHash} links to \`#\` · ${a11y.clickHandlersOnDivs} click handlers on non-interactive elements · ` +
  `${a11y.positiveTabindex} positive tabindex · ${a11y.h1Count} \`<h1>\` · ${a11y.focusVisibleStyles} \`:focus-visible\` rules vs ${a11y.outlineNoneCount} \`outline:none\``, '');

L.push('', '## Assets', '');
L.push(`${assets.images} images (${kb(assets.imageBytes)}) · ${assets.videos} videos (${kb(assets.videoBytes)}) · ${assets.fontFiles} font files`, '');
if (assets.largestImages.length) L.push('Largest: ' + assets.largestImages.slice(0, 6).map((f) => `${f.rel} ${kb(f.bytes)}`).join(' · '), '');
if (assets.apparentlyUnreferencedCount) L.push(`${assets.apparentlyUnreferencedCount} media files not referenced by name in source — candidates only.`, '');

L.push('', '## Convergence tells', '');
if (!convergence.length) L.push('None of the tracked mechanical tells were found.', '');
else {
  L.push(`Score ${convergenceScore} (sum of hits, each capped at 20). Higher means the source carries more of the signatures of a design produced without looking at this client.`, '');
  for (const t of convergence) L.push(`- **${t.label}** — ${t.hits}`);
  L.push('');
}

if (verify.length) {
  L.push('', '## Verify manually', '', 'These could not be settled from source alone:', '');
  for (const v of verify) L.push(`- ${v}`);
  L.push('');
}

const md = L.join('\n');
if (OUT) {
  mkdirSync(resolve(OUT), { recursive: true });
  writeFileSync(join(resolve(OUT), 'source.json'), JSON.stringify(data, null, 2));
  writeFileSync(join(resolve(OUT), 'source.md'), md);
  console.log('wrote ' + join(resolve(OUT), 'source.md'));
  console.log('wrote ' + join(resolve(OUT), 'source.json'));
} else if (has('json')) {
  console.log(JSON.stringify(data, null, 2));
} else {
  console.log(md);
}

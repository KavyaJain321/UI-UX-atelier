# Build: implementation patterns

Working patterns for scroll-driven sites, with the failure modes that produced them. The
stack assumed here is vanilla HTML/CSS/JS with GSAP + ScrollTrigger for scroll binding,
Lenis for smooth scroll, and three.js only where interactivity earns it. Nothing here needs
a framework; three static pages do not justify one.

---

## 1. Scene architecture: one progress number

Every scrubbed scene is a **pure function of one number**. This is the single most valuable
structural decision — it makes scenes reversible, testable without scrolling, and cheap to
debug.

```js
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
// map a sub-range of the scene onto 0..1, so phases can overlap
const phase = (p, a, b) => clamp01((p - a) / (b - a));

function render(p) {
  const draw  = phase(p, 0.00, 0.45);
  const lift  = phase(p, 0.55, 0.75);
  const mark  = phase(p, 0.82, 0.96);

  stage.style.setProperty('--draw', draw.toFixed(4));
  steel.style.transform = `translate3d(0,${lerp(0, -120, lift)}px,0)`;
  word.style.opacity = mark.toFixed(3);
}

window.__scene = render;                 // QA hook: window.__scene(0.55)
render(0);                               // paint the rest state; scrub won't fire until scroll
```

That last line matters. A ScrollTrigger `onUpdate` does not fire until the first scroll, so
without an explicit initial call the rest state can be blank — which was rejected as a
*"dull, near-empty first frame"*.

Bind it:

```js
ScrollTrigger.create({
  trigger: '#scene', start: 'top top', end: '+=480%',
  pin: '.scene-pin', scrub: 1.2,
  onUpdate: (s) => render(s.progress),
});
```

`scrub: 0.7–1.4` gives a pleasant lag. `scrub: true` is rigid and feels mechanical.

---

## 2. Smooth scroll

```js
const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.95 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
window.__lenis = () => lenis;            // so test harnesses can drive it
```

**Do not stack two smoothing filters.** A scrub lag *plus* a smooth-scroll lerp is two
filters in series and feels soupy. Pick one and tune it.

Disable it entirely under reduced motion.

---

## 3. Pinned scenes and trigger order

The most expensive scroll bug in this project: a pinned trigger created *after* other
triggers had already measured their positions shifted everything below it by the pin
distance, so later reveals fired early and invisibly.

```js
// any pinned trigger must be created before, or prioritised above, the triggers below it
ScrollTrigger.create({ trigger: '#globe', pin: true, refreshPriority: 10, /* ... */ });
ScrollTrigger.sort();
ScrollTrigger.refresh();
```

Rule: **create pins first, or give them a higher `refreshPriority`, then sort and refresh.**

---

## 4. The reveal system

Assign motion by *kind of element*, not by taste, so forty elements share three ideas.

```css
[data-reveal]{ opacity:0; transform:translate3d(0,38px,0);
  transition:opacity 1.3s var(--ease-reveal), transform 1.3s var(--ease-reveal); }
[data-reveal="clip"]{ transform:none; clip-path:inset(0 0 100% 0); transition:clip-path 1.5s var(--ease-reveal); }
[data-reveal="line"]{ transform:scaleX(0); transform-origin:left; }
[data-reveal].in{ opacity:1; transform:none; clip-path:inset(0 0 0 0); }
```

```js
// tag elements by kind once, at the end of setup, after generated content exists
const KIND = { 'figure,.frame,.media': 'clip', '.rule,.divider': 'line' };
document.querySelectorAll('section :is(h2,h3,p,li,.card,.stat)').forEach((el) => el.dataset.reveal = '');
for (const [sel, kind] of Object.entries(KIND))
  document.querySelectorAll(sel).forEach((el) => el.dataset.reveal = kind);

document.querySelectorAll('[data-reveal]').forEach((el, i, all) => {
  // stagger siblings, capped so a long list does not crawl
  const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
  el.style.transitionDelay = Math.min(sibs.indexOf(el) * 70, 560) + 'ms';
  ScrollTrigger.create({
    trigger: el, start: 'top 88%',
    onEnter:     () => el.classList.add('in'),
    onLeaveBack: () => el.classList.remove('in'),   // NOT once:true — reveals must replay
  });
});
```

`onLeaveBack` rather than `once: true` is a real bug fix: a visitor scrolling back up to a
dead section notices immediately.

---

## 5. The gate

A loading screen is usually wrong — the first frame should already be the content. A **gate**
is different: it converts waiting into a ritual and it earns its place only when there is
real footage behind it.

```html
<body>
  <!-- FIRST in the body, so the page beneath can never flash before it -->
  <div class="gate" id="gate">
    <video class="gate-v" id="gateV" muted playsinline autoplay loop preload="auto"
           poster="./assets/gate_poster.jpg?v=2" src="./assets/gate.mp4?v=2"></video>
    <div class="gate-ui">
      <span class="gate-k">Maker · Place · est. 1943</span>
      <button class="gate-cta" id="gateCta" type="button" disabled>Forging</button>
      <span class="gate-bar"><i id="gateBar"></i></span><span id="gateN">000 %</span>
    </div>
  </div>
```

```html
<!-- in <head>: cover instantly, and let a returning visitor skip -->
<style>.gate{position:fixed;inset:0;z-index:1000;background:#000}.nogate .gate{display:none}</style>
<script>try{ if(sessionStorage.getItem('entered')==='1' && !/[?&]gate=1/.test(location.search))
  document.documentElement.classList.add('nogate'); }catch(e){}</script>
```

Three details, each of which was a bug first:

- **The poster must be the film's own first frame.** A poster taken from elsewhere flashes a
  different image for a millisecond, and clients screenshot exactly that.
- **Arm the button on readiness, with a timeout fallback** — never leave a visitor stuck
  behind a video that failed to buffer: `setTimeout(() => arm(), 7000)`.
- **Phones get their own encode** (`gate_m.mp4`, ~720p) chosen at runtime.

Write the counter in the client's own vocabulary — *Forging · Forged*, not *Loading*.

---

## 6. Horizontal track: pinned on desktop, native swipe on phones

Driving a horizontal track from vertical scroll is right on desktop and wrong on touch.

```js
function layout(){
  if (small()) { rec.style.height = ''; track.style.transform = ''; return; }
  const over = track.scrollWidth - innerWidth + 120;      // distance the track must travel
  rec.style.height = (innerHeight - BAR + Math.max(0, over)) + 'px';
}
function step(){
  const W = track.scrollWidth, vis = small() ? track.clientWidth : innerWidth;
  let f;
  if (small()) f = track.scrollLeft / Math.max(1, W - vis);   // the user drives it
  else {
    const r = rec.getBoundingClientRect(), travel = rec.offsetHeight - (innerHeight - BAR);
    f = travel > 0 ? clamp01((BAR - r.top) / travel) : 0;
    track.style.transform = `translate3d(${(-f * Math.max(0, W - vis + 120)).toFixed(1)}px,0,0)`;
  }
  fill.style.width = (f * 100).toFixed(2) + '%';
  requestAnimationFrame(step);
}
```

The mobile CSS matters as much as the JS — see `responsive.md` §3 for
`scroll-snap-type: x proximity`, `overscroll-behavior-x: contain`, and
`touch-action: pan-x pan-y`, each of which fixed a real phone bug.

---

## 7. Media

**Lazy video, paused off-screen:**

```js
document.querySelectorAll('video[data-lazy]').forEach((v) => {
  v.src = isMobile() ? v.dataset.m : v.dataset.d;
  ScrollTrigger.create({ trigger: v, start: 'top bottom', end: 'bottom top',
    onToggle: (s) => { if (s.isActive) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(()=>{}); } else v.pause(); } });
  // belt and braces: the scroll toggle can miss the first entry on phones
  new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && v.paused) v.play().catch(()=>{}); }),
    { threshold: 0.15 }).observe(v);
});
```

**Playing only a window of a longer film, on loop:**

```js
const IN = 24, OUT = 36; let seeking = false;
const toIn = () => { if (seeking || v.readyState < 1) return; seeking = true; v.currentTime = IN; };
v.addEventListener('seeked', () => { seeking = false; });     // the guard prevents a seek storm
v.addEventListener('loadedmetadata', toIn);
v.addEventListener('timeupdate', () => {
  const end = Math.min(OUT, (v.duration || OUT) - 0.05);
  if (v.currentTime >= end) toIn();
});
```

**Scrub a frame sequence, not a `<video>`.** `currentTime` scrubbing stutters in many
browsers. Budget roughly 96 WebP/AVIF frames at 1280 wide, about 2 MB, drawn to a canvas.

```js
const frames = []; let loaded = 0;
for (let i = 0; i < N; i++) {
  const img = new Image();
  img.onload = () => { if (++loaded === N) ready(); };
  img.src = `frames/f_${String(i).padStart(4,'0')}.webp`;
  frames.push(img);
}
const draw = (p) => {
  const f = frames[Math.round(clamp01(p) * (N - 1))];
  if (f && f.complete) ctx.drawImage(f, 0, 0, cv.width, cv.height);
};
```

Encoding recipes are in `assets.md`.

---

## 8. Three.js, only where it earns its place

Use 3D when the visitor can *interact* with the object. If the interaction is only "it turns
as you scroll", a photographic frame sequence is lighter, sharper and safer.

**The hard rule: real steel or a line.** Low-fidelity or untextured 3D standing in for a real
product reads as a toy — it was rejected in exactly those words. If you cannot make it
photoreal with real photographed maps, draw the object as a line instead.

**Lazy-load the library** so it never touches first paint:

```js
new IntersectionObserver((es) => {
  if (!es.some((e) => e.isIntersecting)) return;
  io.disconnect();
  loadScript('js/vendor/three.min.js').then(() => import('./scene3d.js'));
}, { rootMargin: '200%' }).observe(document.querySelector('#scene3d'));
```

**Mobile level-of-detail**, which is the difference between 60 fps and unusable:

```js
const SMALL = innerWidth < 900 || innerHeight > innerWidth;
renderer.setPixelRatio(Math.min(devicePixelRatio, SMALL ? 1.25 : 2));
const model = SMALL ? 'model_m.glb' : 'model.glb';        // ~28k vs ~70k triangles
const mat = SMALL ? new THREE.MeshStandardMaterial(o)     // no clearcoat on phones
                  : new THREE.MeshPhysicalMaterial(o);
```

**Anchor 3D to DOM coordinates** when the object must line up with layout:

```js
// the 2D rig owns the layout; the 3D scene follows it
window.__anchor = ({ gx, gy, px, py, alpha }) => {
  group.position.set(...screenToWorld(gx, gy));
  group.rotation.z = Math.atan2(py - gy, px - gx);
  group.visible = alpha > 0.01;
};
```

Pause the renderer when off-screen and when the tab is hidden. A rAF loop running behind a
hidden tab is a battery complaint waiting to happen.

---

## 9. Performance

- **Preload the few things the first screen truly needs**, and nothing else:
  `<link rel="preload" as="image" href="hero.webp">`
- **Defer every library** that is not needed for first paint.
- **One rAF loop.** Components that each start their own compound badly.
- **Pause off-screen work** — canvases, videos, observers.
- **Measure only on mount, resize and `document.fonts.ready`.** Reading `offsetWidth` inside a
  frame callback after a write forces synchronous layout and will cost you the frame budget.
- **Text in a masked or composited layer can raster blank before fonts load** — gate on
  `document.fonts.ready` with a timeout fallback, then re-raster.
- Serve immutable caching on hashed assets, and bust with a query string when you replace a
  file under the same name.

Budgets: initial JS under about 80 KB, first load under 2.5 MB, LCP under 2 s, scroll loop
under 4 ms per frame, 60 fps on a mid-range Android.

---

## 10. Set pieces worth stealing

### Real specular light on a flat photograph

The highest-value trick in the source project. A studio lamp rakes across a metal object as
it moves — a genuine specular roll with dark flanks, not a white gradient sliding over an
image. The lamp is fixed in the "studio"; the object passes under it.

```css
.light-band{
  position:absolute; left:0; top:0; width:900px; height:100%;
  mix-blend-mode:overlay; opacity:.9; will-change:transform;
  /* the subject's own image is the alpha mask, COUNTER-POSITIONED so it stays glued to the
     object while the band itself travels */
  mask-image:url(../assets/subject.webp);
  mask-size:5585px 700px; mask-repeat:no-repeat;
  mask-position:calc(-1 * var(--lx,-2000px)) 0;
  background-image:linear-gradient(93deg,
    rgba(128,128,128,0) 0%,  rgba(44,44,44,.75) 30%, rgba(196,196,196,.75) 46%,
    rgba(240,240,240,.9) 50%,
    rgba(196,196,196,.75) 54%, rgba(44,44,44,.75) 70%, rgba(128,128,128,0) 100%);
  transform:translateX(var(--lx,-2000px));
}
```

```js
const lightX = LIGHT_W + 0.45 * objectX + drift;      // lamp drifts at 45% of object speed
el.style.setProperty('--lx', (lightX - objectX - 450).toFixed(1) + 'px');
```

Two things make it work:

- **`mix-blend-mode: overlay` with mid-grey as neutral.** A `screen`-blended white gradient
  can only brighten; `overlay` darkens the flanks too, which is what reads as the reflection
  of a dark room.
- **The blend and mask live on the band, not on a parent.** A mask or blend on a *parent*
  stops the browser compositing its children. On the band itself they are free, and the
  repaint is limited to the band.

### Self-drawing line art that dissolves into the photograph

Registration is perfect because the outline is edge-detected *from* the photo — see
`assets.md` for the ffmpeg recipe.

```css
.ink{ position:absolute; inset:0; pointer-events:none;
      mask-image:url(../assets/ink.png); mask-size:cover; mask-repeat:no-repeat; }
/* everything behind the leading edge */
.ink-w{ background:#fff;
  mask-image:linear-gradient(123deg,#000 calc(var(--draw,0%) - 9%),transparent var(--draw,0%)); }
/* a narrow accent band riding the leading edge, like a pen tip */
.ink-r{ background:var(--accent); filter:drop-shadow(0 0 7px rgba(255,15,31,.9));
  mask-image:linear-gradient(123deg,transparent calc(var(--draw,0%) - 11%),
    #000 calc(var(--draw,0%) - 5%), #000 var(--draw,0%), transparent calc(var(--draw,0%) + 4%)); }
```

- The gradient angle must equal **90° plus the object's on-screen tilt**, or the line draws
  across the object instead of along it.
- Drive `--draw` to **112%, not 100%** — the feather means the last pixels are still fading
  at 100%.

For a pure-CSS version, animate the custom property directly. `@property` is required, or it
will not animate at all:

```css
@property --dw{ syntax:'<percentage>'; inherits:false; initial-value:0% }
.line{ mask-image:linear-gradient(90deg,#000 0 var(--dw),transparent var(--dw)); }
.card.in .line{ animation:draw 1.3s cubic-bezier(.2,.7,.2,1) forwards }
@keyframes draw{ to{ --dw:100% } }
```

### A motion token, so reduced motion is a design not a disable

```css
:root{ --motion:1 }
@media (prefers-reduced-motion:reduce){ :root{ --motion:0 } }
```

Multiply travel distances by `var(--motion)` and read it in JS to select the designed end
state. This makes "no motion" a state you author rather than a set of transitions you
suppress.

### Idle sleep

A scroll engine that keeps running when nothing is happening is a battery complaint. Leave
the ticker entirely once everything has settled, and wake on any input:

```js
function tick(){ /* ... */ if (isIdle()) { if (++idle > 30) sleep(); } else idle = 0; }
const wake  = () => { idle = 0; if (sleeping) { sleeping = false; gsap.ticker.add(tick); } };
const sleep = () => { if (!sleeping) { sleeping = true; gsap.ticker.remove(tick); } };
```

With no listeners left, the ticker stops its own `requestAnimationFrame`.

---

## 11. Gotchas worth knowing before you hit them

| Symptom | Cause | Fix |
|---|---|---|
| Reveals below a pinned section fire early or never | Pin created after the triggers below measured | Create pins first or `refreshPriority`, then `sort()` + `refresh()` |
| Programmatic `scrollTo` does nothing in tests | Smooth-scroll library intercepts it | Dispatch real wheel events, or expose the instance |
| Motion feels soupy | Scrub lag plus smooth-scroll lerp | Pick one filter |
| Everything below one line of JS is dead | Temporal dead zone in a single large script | Define shared constants before their first use |
| A masked element's children refuse to composite | Mask/blend on the parent | Give the child its own mask and blend, counter-positioned |
| Scene blank until first scroll | `onUpdate` has not fired | Call `render(0)` at setup |
| Phone layout zoomed out, fixed header broken | Horizontal overflow lets Android zoom out | `overflow-x: clip` on `html, body` — see `responsive.md` §2 |
| Sticky pin stops working after an overflow fix | `overflow: hidden` creates a scroll container | Use `overflow: clip` instead |
| A named utility class silently breaks a scene | Collision with a primitive name | Reserve the signature mechanic's names |
| Stale CSS on one page only | Two pages share a stylesheet, one bust bumped | Bump the query string in both |
| A section index misreads position | ScrollTrigger cannot see past a pin for `end` values | Measure live bounding rects instead |
| A gate or transition traps the visitor | rAF stops in a hidden tab, so the completion callback never runs | Give every timed transition a `setTimeout` escape hatch |
| A preloader never finishes | One asset 404s and the counter never reaches its total | `onerror` must resolve, not reject; add a hard timeout around 7 s |
| Frame rate degrades over time | Allocating vectors or matrices inside the render loop | Hoist every scratch object to module scope |
| Gradient text ignores its colour | `background-clip:text` is controlled by `-webkit-text-fill-color` | Set that property, including on nested exceptions |
| Fit-to-viewport type is the wrong size on load | Measured before the webfont arrived | Re-fit after `document.fonts.ready` |
| A newly added asset 404s forever | Immutable caching cached the 404 | Bump the asset's query string, on every page that links it |
| Custom property refuses to animate | Untyped custom properties are not interpolable | Declare it with `@property` |

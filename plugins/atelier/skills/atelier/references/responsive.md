# Responsive: phones are a different composition

The failure mode is treating the phone as the desktop scaled down. A hero built as a wide
diagonal composition becomes an unreadable slab at 390 px. A pinned horizontal scroll
becomes a trap. The fix is not smaller type — it is a *second composition* for the same
idea.

---

## 1. Design the phone version as its own layout

For the signature scene especially, ask: what is the equivalent gesture on a phone?

> Case: a hero where a sword lies diagonally across a wide screen, drawn by scroll. On a
> phone the same sword **stands vertical**, with a separately prepared portrait asset
> (rotated and re-cropped from the same source photograph), labels alternating left and
> right of the blade, and its own set of scroll phases. Same idea, different composition,
> different assets.

That is more work than a media query, and it is the difference between a site that works on
a phone and one that merely does not break.

**Decide the mode live, not at load.** Evaluate the media query on every render rather than
once at startup, so that rotating the device or toggling the device toolbar does not leave a
dead scene:

```js
const MQ = matchMedia('(max-width: 760px), (orientation: portrait) and (max-width: 900px)');
const isMobile = () => MQ.matches;
MQ.addEventListener('change', () => {
  dispatchEvent(new Event('resize'));
  ScrollTrigger.refresh();
  render(lastProgress);        // re-render the current state in the new mode
});
```

Build both stages and switch between them; do not tear down and rebuild.

---

## 2. The Android zoom-out bug

This one is worth knowing by name because it produces symptoms that look like several
unrelated bugs at once.

**Symptom.** On a real Android phone the page appears zoomed out, drifts on its own, the
fixed header collapses to just the logo with its other cells pushed off-screen, and a
horizontal carousel glitches. Desktop and emulator look fine.

**Cause.** Something overflows horizontally — often a decorative element sized in `vw` with
a negative offset. `overflow-x: hidden` on `body` alone does not stop Android Chrome from
letting the user zoom out to fit that overflow, and once it does, it **widens the layout
viewport**. Any `position: fixed` element then lays out at the wider width.

**Diagnosis.** Compare the two widths. If they differ, this is the bug:

```js
({ inner: innerWidth, client: document.documentElement.clientWidth,
   scroll: document.documentElement.scrollWidth })
// healthy: 390 / 390 / 390     broken: 1501 / 375 / 375
```

**Fix.** Clip at the root, and clip the offending section:

```css
@supports (overflow-x: clip) { html, body { overflow-x: clip; } }
.section-with-ornament { overflow: clip; }
```

Use `clip`, not `hidden`. `overflow: hidden` creates a scroll container, which breaks
`position: sticky` on descendants — so it silently disables pinned scroll scenes.

**Prevention.** Any element positioned with a negative offset or sized above `100vw` must
have a clipping ancestor. Audit for them:

```js
const cw = document.documentElement.clientWidth;
[...document.querySelectorAll('body *')].filter(e => {
  const r = e.getBoundingClientRect();
  if (r.right <= cw + 2 || !r.width) return false;
  if (getComputedStyle(e).position === 'fixed') return false;
  let p = e.parentElement;
  while (p && p !== document.body) {
    if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) return false;
    p = p.parentElement;
  }
  return true;
}).map(e => e.tagName + '.' + e.className);
```

---

## 3. Horizontal scrollers on touch

A horizontal track that is scroll-driven on desktop should become a *native swipe* on
phones — driving it from vertical scroll on a touch device fights the user.

```css
@media (max-width: 900px) {
  .track-pin  { position: static; height: auto; overflow: visible; }
  .track {
    overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x proximity;      /* proximity, not mandatory — see below */
    overscroll-behavior-x: contain;     /* don't chain to page/browser navigation */
    touch-action: pan-x pan-y;          /* allow both; never lock to one axis */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .track::-webkit-scrollbar { display: none; }
  .track > * { width: 80vw; scroll-snap-align: start; }
}
```

Three details that each caused a real bug:

- **`proximity`, not `mandatory`.** Mandatory snap fights momentum and can trap the user
  between items, which reads as the page "moving by itself".
- **`overscroll-behavior-x: contain`.** Without it, swiping past the end triggers browser
  back-navigation or bounces the whole page.
- **`touch-action: pan-x pan-y`.** Locking to `pan-x` prevents the user from scrolling the
  page vertically while their finger is on the carousel.

---

## 4. Media queries and breakpoints

Use content-driven breakpoints, not device names. A useful default set:

| Width | What changes |
|---|---|
| `< 520` | Single column, drop non-essential metadata, stack all pairs |
| `< 760` | Phone composition for signature scenes, condensed header |
| `< 900` | Horizontal scroll becomes native swipe, sticky index becomes pills |
| `< 1100` | Multi-column grids reduce span, secondary nav labels hide |
| `< 1380` | Wide editorial layouts tighten |

Prefer hiding *labels* over shrinking type. A navigation cell showing only its number at
900 px is better than one with 8 px text.

---

## 5. Touch ergonomics

```css
@media (max-width: 900px) {
  a:not(.btn), button, .clickable { min-height: 40px; display: inline-flex; align-items: center; }
}
```

- 40 px minimum on every tap target; 44 px where it can be afforded.
- Never rely on hover to reveal information. If a caption appears on hover, it must be
  permanently visible on touch.
- Keep interactive elements out of the bottom 60 px where browser chrome and the home
  indicator sit.
- Avoid `100vh` for full-screen sections — mobile browser chrome makes it wrong. Use `100dvh`
  with a `100vh` fallback.

```css
.full { height: 100vh; height: 100dvh; }
```

---

## 6. Asset variants

Phones should not download desktop media. Prepare and select variants:

- Video: a `_m` encode at 720p, typically a quarter of the desktop file size.
- Images: WebP/AVIF at phone dimensions; portrait crops where the composition changes.
- 3D: a lower-poly model, a capped `devicePixelRatio` (1.25), and simpler materials.

Select at runtime rather than with `<source media>` when the decision depends on more than
width:

```js
video.src = isMobile() ? 'assets/film_m.mp4' : 'assets/film.mp4';
```

---

## 7. Verification

Emulators lie in both directions. Old headless Chrome lays mobile out roughly 1.3× too wide;
the browser pane pauses `requestAnimationFrame` when hidden, so animations appear frozen and
autoplay may not fire.

So verify in this order:

1. **DOM probes over screenshots** — `scrollWidth`, `clientWidth`, bounding rects, computed
   styles, video `paused`/`readyState`. Facts, not pictures.
2. **The headless harness** (`scripts/cdp.mjs`) for scripted passes at 390×844 with touch
   emulation, stepping the page and probing at each stop.
3. **A real device**, always, before calling it done. Every bug in this file was found on a
   real phone after the emulator passed.

See `qa.md` for the harness and the full checklist.

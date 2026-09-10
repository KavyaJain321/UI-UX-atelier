# QA: verifying work that moves

Animation-heavy pages defeat casual verification. A screenshot can race the first paint, a
WebGL canvas can capture black, a preview pane throttles `requestAnimationFrame` to nothing
when it is hidden, and autoplay may silently not fire. Several hours were lost in the source
project to trusting pictures. The doctrine below replaces looking with measuring.

---

## 1. Make every scene testable by design

Two conventions, adopted early, that make everything afterwards cheap.

**A scrubbed scene is a pure function of one progress number.** All state derives from `p`,
so reversing the scroll reverses the scene exactly, and any state can be reproduced without
scrolling.

```js
function render(p){                    // p in 0..1, the ONLY input
  stage.style.transform = `translate3d(0,${lerp(0,-240,clamp01((p-.2)/.5))}px,0)`;
  label.style.opacity   = String(clamp01((p-.55)/.15));
}
window.__scene = render;               // the QA hook
```

**Expose query hooks** so any state is one URL away:

| Hook | Effect |
|---|---|
| `?p=0.55` | Render the hero at 55% without scrolling |
| `?hide=record,shops` | Hide named sections so the target sits at scroll 0 |
| `?rm=1` | Force the reduced-motion path |
| `?engine=live` / `?legacy=1` | Switch between a new and an old implementation |
| `window.__report()` | Dump internal state — frame times, layout counts, checksums |

These cost minutes to add and save hours on every subsequent check.

---

## 2. The harness

```bash
# whole-page sweep, phone size, probing at every stop
node scripts/cdp.mjs --sweep https://example.com --mobile

# desktop
node scripts/cdp.mjs --sweep https://example.com --steps 16

# scripted passes
node scripts/cdp.mjs jobs.json ./out
```

The sweep reports, at every scroll stop: layout width versus visual width, horizontal
overflow with no clipping ancestor, console errors, and every video's on-screen and paused
state. It ends with a summary naming the failures.

A jobs file for anything more specific:

```json
[{ "name": "record-swipe", "url": "https://example.com/works",
   "w": 390, "h": 844, "mobile": true, "settle": 4000,
   "steps": [
     { "eval": "document.getElementById('rec').scrollIntoView(); 1" },
     { "swipe": -300, "x": 200, "y": 500 },
     { "eval": "document.getElementById('recTrack').scrollLeft" },
     { "shot": "after-swipe.png" }
   ]}]
```

Step kinds: `scroll`, `wheel`, `swipe`, `key`, `wait`, `eval`, `shot`.

**Use `wheel` rather than `scroll` when a smooth-scroll library is present** — it intercepts
programmatic `window.scrollTo`. The harness calls `window.__lenis?.()` if the page exposes
it, but real wheel events are the reliable path.

**Do not disable the GPU when measuring performance.** Software rasterisation inflated paint
cost roughly fivefold in this project and produced entirely fake frame times.

---

## 3. Probe, do not photograph

The highest-value checks return facts.

```js
// the Android zoom-out tell — see responsive.md §2
({ inner: innerWidth, client: document.documentElement.clientWidth,
   scroll: document.documentElement.scrollWidth })

// what is actually on top at a point (for "the header disappeared")
document.elementFromPoint(200, 30)

// is the media really playing
[...document.querySelectorAll('video')].map(v =>
  [v.currentSrc.split('/').pop(), v.readyState, v.paused, +v.currentTime.toFixed(1)])

// did the reveal classes actually apply
document.querySelectorAll('[data-reveal].in').length

// is a specific element where it should be
document.querySelector('.hero').getBoundingClientRect()
```

When a screenshot comes back black or empty, do not conclude the page is broken. Reshoot,
then verify through the DOM. A single shot racing first paint is the most common false
alarm.

If the page is pinned and you need a scrolled state, either drive it through the QA hook, or
`display:none` the sections above it so the target sits at scroll 0 — and remember to hide
the pin spacer as well, or the layout will not collapse.

---

## 4. The test matrix

Five viewports across nine inputs. This was handed over as an explicit expectation:

| Viewports | Inputs |
|---|---|
| 1440×900, 1280×800, 768×1024, 430×932, 390×844 | slow scroll · normal scroll · very fast scroll · reverse scroll · pointer drag · touch drag · keyboard · reload mid-scene · reduced motion |

Fast and reverse scrolling find the bugs. Anything that assumes monotonic forward progress
breaks under them, and reveals that fire once are exposed immediately by scrolling back.

Report a frame-rate figure. Around 60 fps during a scrub is the bar.

---

## 5. Pre-handover checklist

**Correctness**
- [ ] No console errors on any page
- [ ] No horizontal overflow at any viewport, and `innerWidth === clientWidth` on phones
- [ ] Every link resolves; no `#` controls
- [ ] Images have real `alt`; exactly one `h1`; `lang` set
- [ ] Reduced-motion path delivers the complete site
- [ ] Reveals replay on scroll-back; fast and reverse scroll leave no dead sections
- [ ] Reload mid-scene recovers correctly

**Craft**
- [ ] Every scene holds as a frozen still
- [ ] Poster frames match the first frame of their video, so nothing flashes
- [ ] No visible seam where one section hands off to the next — the last frame and the first
      frame must match in size, position and background
- [ ] No halo or rough edge on any cutout
- [ ] No label crossing the object it names

**Performance**
- [ ] First load under about 2.5 MB, hero image under 400 KB
- [ ] 60 fps during the signature scene on a mid-range phone
- [ ] Off-screen canvases, videos and rAF loops are paused
- [ ] Phone variants served for video, imagery and 3D

**Honesty**
- [ ] Every number traceable to a source
- [ ] Borrowed imagery labelled; designed treatments disclosed
- [ ] No fake forms or invented contact details

**Verified**
- [ ] On a real device, page by page
- [ ] On the live URL after deploying, not the local one

---

## 6. Reporting

Say what you verified, how, and at what sizes. Then say what you did not verify — an
untested claim discovered later costs more than an admitted gap.

The finishing defects are what clients actually catch, and they catch them by screenshotting
single frames: a poster flashing for a millisecond before video, a one-pixel gap at a joint,
an inverted mirrored texture, a label crossing its subject. Look for those specifically
before handing over, because someone else will.

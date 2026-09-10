# Motion: the rulebook

Motion is where most builds lose credibility. Not because the animations are missing, but
because they are arbitrary — every element moving a different distance over a different
duration with a different curve. Coherent motion reads as design; varied motion reads as a
demo reel.

The rules below are numeric on purpose. Set them once, globally, and stop deciding.

---

## 1. Timing

| Class | Duration | Used for |
|---|---|---|
| Micro | 100–200 ms | Hover, focus, toggle, button press, tooltip |
| Standard | 200–300 ms | Dropdown, accordion, card lift, filter change |
| Page | 300–400 ms | Route change, modal, drawer, overlay |
| Reveal | 800–1400 ms | Scroll-triggered entrances, hero elements |
| Scene | Scroll-linked | Pinned sequences, scrubs — governed by distance, not time |

Anything over 400 ms that is *not* scroll-linked or a deliberate reveal will feel broken.
Anything under 100 ms is invisible.

## 2. Easing

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);      /* default for everything entering */
--ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1); /* movement between two on-screen states */
--ease-reveal: cubic-bezier(0.16, 1, 0.30, 1);       /* long scroll reveals, very soft landing */
```

Rules that matter more than the exact numbers:

- **Never ease-in on an entrance.** Something arriving should decelerate, not accelerate.
- **Ease-out is the default.** When in doubt, use it.
- **Spring bounce stays subtle** (0.1–0.2 overshoot). Playful bounce dates a site instantly
  and is wrong for anything premium.
- **`steps()` is a deliberate style choice** — terminal, zine, mechanical themes. Elsewhere
  it reads as a bug.

Set the defaults globally so nothing has to decide locally:

```js
gsap.defaults({ duration: 0.3, ease: 'power3.out' });
```

## 3. Animate transform and opacity. Nothing else.

`transform` and `opacity` are the only properties the compositor can animate without
recalculating layout or repainting. Animating `top`, `left`, `width`, `height`, `margin`, or
`filter` on scroll produces jank, and jank reads as amateur regardless of how good the taste
is.

Where a layout change is genuinely needed, animate a transform that *looks* like it — scale
instead of width, translate instead of top, a clip-path instead of height.

```css
/* good */  transform: translate3d(0, 38px, 0); opacity: 0;
/* bad  */  top: 38px; height: 0;
```

Add `will-change: transform` only to elements that are actually about to animate, and remove
it afterwards — a permanent `will-change` on many elements costs more than it saves.

## 4. Three motions, repeated

Pick three motion ideas for the whole site and reuse them. A site with three motions applied
consistently to forty elements reads as designed. A site with forty motions reads as a
showcase.

A set that has worked well:

1. **Rise** — `translateY(38px)` + opacity, for text, cards, and statistics.
2. **Shutter** — a `clip-path` or `scaleY` open, for images, frames, and media.
3. **Rule** — `scaleX` from 0, for hairlines, dividers, and progress.

Assign by *kind of element*, not by taste, and stagger siblings by 60–80 ms with the total
capped around 500 ms so a long list does not crawl.

## 5. Scroll-linked motion

Two distinct tools, often confused:

- **Reveal** — a one-shot trigger when an element enters. Cheap, use it liberally.
- **Scrub** — progress is bound to scroll position. Expensive and powerful; reserve it for
  the wow moment and at most one or two other scenes.

For scrubs, `scrub: 0.7–1.4` adds a pleasant lag. `scrub: true` is rigid and feels
mechanical. Longer scenes want more scrub.

**Reveals should replay.** Use `onEnter` to add the class and `onLeaveBack` to remove it
rather than `once: true`; a visitor who scrolls back up to a dead section notices.

## 6. Pointer motion

- Gate every hover behind `@media (hover: hover)`. On touch devices a hover state that
  sticks after a tap looks broken.
- Pointer-follow effects (a sheen, a lens, a light) should **lerp toward the pointer**
  (factor 0.08–0.15 per frame), never snap to it.
- Custom cursors are a commitment: they must work over every element, including form fields
  and links, and they must not hide the caret. Usually not worth it.

## 7. Reduced motion is a real design, not a fallback

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

That global reset is the floor, not the goal. For a site whose spine is a scroll-driven
scene, the reduced-motion version needs the *content* of that scene presented statically —
the stations as a list, the sequence as stills. Someone who cannot tolerate the animation
must still get the whole site.

Also disable smooth-scroll libraries under the query, and skip the WebGL scenes entirely.

## 8. Performance discipline

- **60 fps or cut it.** Profile the scroll on a mid-range phone, not on the desktop you
  built it on.
- **One rAF loop**, not one per component. Libraries that each start their own loop compound
  badly.
- **Pause off-screen work.** Any canvas, video, or rAF loop that is not visible should stop —
  use an `IntersectionObserver` or the ScrollTrigger `onToggle` callback.
- **Pause on hidden tabs.** `document.visibilityState` gates continuous animation.
- **Never animate during a scroll on the main thread if it can be avoided.** Prefer
  transforms driven by a single progress value.

## 9. The motion self-check

- [ ] Do all animations reduce to three ideas?
- [ ] Is every duration from the table in §1?
- [ ] Is anything easing in on entrance?
- [ ] Is anything other than transform/opacity being animated on scroll?
- [ ] Is there exactly one scrub-driven scene carrying the wow moment?
- [ ] Do reveals replay on scroll-back?
- [ ] Are hovers gated behind `@media (hover: hover)`?
- [ ] Does `prefers-reduced-motion` still deliver a complete site?
- [ ] Does it hold 60 fps on a real phone?

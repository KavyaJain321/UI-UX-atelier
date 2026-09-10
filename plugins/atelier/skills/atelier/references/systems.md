# Design systems: tokens, type, space, colour

A design system is what stops the fortieth section from looking like a different site. Build
it once, up front, and prove it on a **style lab** page before building any real page — the
exit test used in this project was *"a static style-sheet page renders every token and every
state."* A client approved that page before a single real page existed, which is exactly the
right order.

---

## 1. Token architecture

Everything is a custom property. Nothing is a literal value in a component.

```css
:root{
  /* ---- colour: derived from a real reference, never invented ---- */
  --black:#000;  --panel:#0a0a0a;
  --chrome:#fff; --silver:#ececec; --steel:#bdbdbd; --gun:#6f6f6f;
  --accent:#ff0f1f;                 /* exactly one; reserved for state */
  --edge:rgba(255,255,255,.14);     /* hairlines instead of shadows */
  --edge-2:rgba(255,255,255,.08);

  /* ---- type ---- */
  --sans:'Archivo',system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;

  /* ---- space: one scale, no ad-hoc values ---- */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px;
  --s-6:32px; --s-7:48px; --s-8:64px; --s-9:96px; --s-10:144px;

  /* ---- motion ---- */
  --ease-out:cubic-bezier(.23,1,.32,1);
  --ease-reveal:cubic-bezier(.16,1,.30,1);
  --d-micro:150ms; --d-std:260ms; --d-page:360ms; --d-reveal:1200ms;

  /* ---- structure ---- */
  --bar:66px;                        /* masthead height, referenced everywhere */
  --gutter:clamp(20px,4vw,64px);
  --measure:68ch;
}
```

Two rules that matter more than the values:

- **If a value appears twice, it is a token.** Especially the header height — sticky offsets,
  pinned scenes and scroll margins all depend on it, and a hard-coded copy will drift.
- **Name tokens by role, not by appearance.** `--accent`, not `--red`; `--edge`, not
  `--grey-14`. Roles survive a palette change; appearances do not.

---

## 2. Colour

### Derive, never invent

Take the palette from a real artefact: the client's reference image, their product
photography, their packaging, a material sample. Extract three or four colours and use them
**all at full weight**. "One dominant plus a timid accent" reads as a template with a theme
variable swapped.

```bash
python scripts/palette.py reference.jpg --n 6
```

It prints the dominant colours as hex with coverage percentages, plus contrast ratios
between them, so you can see immediately which pairs are usable for text.

### Enforce it on the imagery

A palette that governs the UI but not the photography is not a system. If the photographs
fight the palette, treat the photographs:

```css
.media img, .media video{ filter:grayscale(1) contrast(1.4); }
```

This single move is what made a three-colour system read as three colours in this project.
Grade the video at encode time as well, so the phone variant matches.

**But separate the world from the objects.** A late and important correction: the environment
may be monochrome while the *products themselves* must show their real material. The
resolution reached was *"the home page is the drawing; the catalogue is the object."* If a
customer needs to know what something actually looks like, do not stylise it.

### Contrast

- Body text on its background: **at least 4.5:1**. Large display text: at least 3:1.
- Push the extremes rather than settling in the middle. A real instruction from this project:
  *"black should be blacker, white whiter, and the accent brighter."* Tasteful near-black and
  soft greys read as timid, and they collapse on cheap screens.
- Keep the greys out of the mid-range if you want three colours to read as three.
- Never carry meaning in colour alone — pair it with a label, a shape, or a position.

### The accent is a state, not a decoration

Reserve the single accent for one class of thing: the live navigation item, the progress
rail, registration marks, the mark on a card. The moment it becomes a generic button fill it
stops signalling anything.

---

## 3. Typography

### Pairing

One display family plus one metadata family. Two, occasionally three, never more.

- **Display** — an extended or variable grotesque carries weight and width axes that make a
  page look designed rather than typeset. `font-stretch: 108–125%` with `font-weight: 800–900`
  and negative tracking at large sizes.
- **Metadata** — a monospace or a technical sans, doing a *job*: captions, figure numbers,
  dates, coordinates, dimensions. Giving it a job is what makes it read as an information
  system rather than a font choice.

Self-host both. Subset them. Two families at two weights each is a reasonable budget.

A real rejection list from this project, as an illustration of how narrow the final choice
should be: *kept Archivo and IBM Plex Mono; rejected Martian Mono, JetBrains Mono, Space
Mono, Inter, Bricolage, and all serifs.* Decide once, then stop reconsidering.

### Scale

Use `clamp()` so the scale is fluid and there are no breakpoint jumps:

```css
--t-display: clamp(2.6rem, 7vw, 7.5rem);
--t-h1:      clamp(2.0rem, 4.2vw, 3.6rem);
--t-h2:      clamp(1.4rem, 2.4vw, 2.1rem);
--t-h3:      clamp(1.05rem,1.45vw,1.35rem);
--t-body:    clamp(1rem,  1.1vw, 1.08rem);
--t-meta:    clamp(9px,   .85vw, 11px);
```

**Scale contrast is the whole game.** Something should be enormous and something tiny. Even
spacing and even sizing everywhere is not restraint, it is absence of decision.

### Details that separate typeset from designed

```css
.display{ letter-spacing:-.035em; line-height:.95; }        /* tighten as size grows */
.meta   { letter-spacing:.22em; text-transform:uppercase; } /* open the small stuff */
.num    { font-variant-numeric:tabular-nums; }              /* always, for any figure */
p       { max-width:var(--measure); text-wrap:pretty; }
h1,h2,h3{ text-wrap:balance; }
```

- Tabular numerals on every number that might change or align.
- A measure of 60–75 characters; wider is genuinely harder to read.
- Flush left, ragged right. Justified text on the web produces rivers.
- No gradient fills on type. Flat colour, always, especially on the wordmark.

---

## 4. Space and grid

One spacing scale, used everywhere. Ad-hoc values are how a system dies.

```css
.sheet{ padding:var(--s-9) var(--gutter); }
.stack > * + * { margin-top:var(--s-5); }
```

A twelve-column grid handles most editorial layouts. Define spans as tokens so sections stay
related:

```css
.grid{ display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:var(--s-5); }
.col-wide{ grid-column:span 8; }
.col-side{ grid-column:span 4; }
@media(max-width:900px){ .col-wide,.col-side{ grid-column:1/-1; } }
```

Two habits worth keeping:

- **Hairlines, not shadows.** `box-shadow:0 0 0 1px var(--edge)` reads as precision;
  soft drop shadows read as a component library.
- **Vertical rhythm comes from a few large intervals**, not many small ones. Sections
  separated by `--s-9` or `--s-10` with tight internal spacing look composed; everything at
  `--s-6` looks like a form.

---

## 5. States

Every interactive element needs five, and the style lab should show all of them:

```css
.btn{ transition:background var(--d-micro) var(--ease-out), color var(--d-micro) var(--ease-out); }
.btn:focus-visible{ outline:2px solid var(--accent); outline-offset:3px; }
.btn[disabled]{ opacity:.4; pointer-events:none; }
@media(hover:hover){ .btn:hover{ background:var(--chrome); color:var(--black); } }
```

- **Never remove the focus ring.** Restyle it if it clashes; removing it makes the site
  unusable by keyboard.
- **Gate hover behind `@media (hover:hover)`** so a tap does not leave a stuck hover state.
- Loading, empty and error states are design work, not engineering leftovers. An empty
  register must look intentional — otherwise the layout will pressure someone into inventing
  content to fill it.

---

## 6. The style lab

Build one page that renders every token and every state: the palette with contrast ratios,
the type scale in situ, the spacing scale, every component in all five states, the motion
primitives, and the imagery treatment.

It costs a day and it pays for itself immediately — it is reviewable before any real page
exists, it catches contrast failures early, and it becomes the reference that stops
divergence later. Ship it at `/lab` and keep it out of the sitemap.

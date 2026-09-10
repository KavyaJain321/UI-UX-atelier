# Anti-Generic: how to not look AI-made

The single most common failure is not ugliness. It is *plausibility* — a page that looks
like every other page produced by a language model. Clients recognise it instantly and
they use the word "AI" as an insult. This file is the accumulated evidence of what
triggers that reaction and what earns the opposite response.

Read this before you choose a palette, a typeface, a hero layout, or a nav bar.

---

## 1. The tells

These are the patterns that get a build rejected on sight. Each one is here because a real
client rejected it, not because it is theoretically weak.

### Palette tells

| Tell | Why it reads as generated |
|---|---|
| Dark background + warm glow + one cool accent (e.g. black + molten orange + teal) | The default "premium tech" gradient of every generated landing page. Justifying it with a story ("heat of the forge") does not save it — the eye recognises the combination before it reads the rationale. |
| Purple→blue or indigo→violet gradients | The single most over-produced palette on the web. |
| A "story palette" you invented (temperature, energy, seasons) | Invented palettes converge on the same handful of combinations. Derived palettes do not. |
| Black plus one accent, where the accent appears only in small doses | Reads as a template with a theme variable swapped. |
| Six or more hues | Undisciplined. Real design systems are ruthless. |

**What works instead:** take the palette from a real artefact — the client's reference
image, their product photography, their packaging, their existing printed material, a
material sample. Extract three or four colours and use them *all at full weight*, not one
dominant plus timid accents. Then enforce the palette on the imagery too (grade photos and
video to match) so the system holds everywhere instead of being contradicted by a
full-colour photo.

> Case: a "black + molten orange + teal + gradient italic serif" direction was rejected as
> AI-looking. Replaced by true black + chrome white/silver + one saturated red taken from
> the client's own reference image, with every photo and video graded monochrome so the
> three colours read as exactly three. Approved.

### Typography tells

| Tell | Fix |
|---|---|
| Gradient-filled italic serif display type | Pick one disciplined family and commit. An extended grotesque at heavy weight reads as designed; a gradient italic serif reads as generated. |
| Gradient text on the wordmark/logo | Flat, solid colour. Always. |
| Inter / Poppins / Montserrat as the display face with default tracking | Either use a distinctive face, or use a common one *with real typographic work*: variable font-stretch, negative tracking on display sizes, tabular numerals, optical sizing. |
| An "eyebrow" label above every heading | Use at most one, as a structural device with a real function (section numbering, a sheet reference), not as decoration on every block. |
| Everything centred | Asymmetry, a real grid, and edge alignment read as designed. |

**Type pairing that works:** one display family (used at 2–3 weights, wide tracking range)
plus one UI/mono family for labels, numerals, and metadata. Two families, maximum three.
Give the metadata family a *job* — captions, figure numbers, coordinates, dates — so it
looks like an information system rather than a font choice.

### Layout and chrome tells

| Tell | Why |
|---|---|
| Centred logo, centred nav links, pill-shaped CTA on the right | The universal generated header. A client called exactly this "AI-looking". |
| Three feature cards with an icon, a bold line, and two lines of grey text | The generated features section. |
| Rounded corners everywhere at the same radius, soft shadows, glassmorphism | Default component-library styling with no point of view. |
| Full-width hero with centred headline, subhead, two buttons | The single most generated layout in existence. |
| Emoji as icons | Instantly cheap. |
| Stock photography, or 3D renders standing in for a real product | If the client has real assets, using fake ones is the loudest possible signal that nobody looked. |

**What works instead — the vernacular principle.** Every business already has a document
culture: the drawings, forms, labels, stamps, ledgers, packaging, or instruments it
actually uses. Build the interface chrome out of *that*, not out of web conventions.

> Case: for a swordmaker with a real drawing office, the site header was rebuilt as a
> **drawing-office title block** — a bar of bordered cells holding the maker's mark, a
> sheet number, a live section name, numbered index cells, and one solid commission cell.
> It performs exactly the same navigation function as the rejected centred nav, but it
> belongs to the client and could not have been generated from a prompt about swords.

Other vernaculars to reach for: a laboratory specimen label, an architectural title block,
a shipping manifest, an index card / card catalogue, a patent drawing, a legal docket, a
tide table, a score sheet, an exhibition wall label, an equipment nameplate, a film slate,
a chart of accounts.

**A modern business has a document culture too, and it is usually digital.** The list above
skews analogue because it came from a heritage manufacturer, and reaching for a herbarium
sheet on behalf of a direct-to-consumer brand reproduces the derived-from-nothing failure in
a more tasteful costume. For a newer business, look at: the product spec block, the size or
fit chart, the order confirmation and shipping notification, the packing slip, the care card,
the unboxing sequence, the changelog, the status page, the API reference, the stream overlay,
the comparison table they already publish. These are real artefacts their customers already
recognise, which is the whole point.

Pick the one the client's own world would recognise, whichever century it comes from.

### Motion tells

| Tell | Why |
|---|---|
| Fifty animations, all different | Reads as a showcase, not a design. Three intentional motions, repeated, read as a system. |
| Fade-up on every element with the same 0.6 s ease | The default. Vary distance and stagger by *kind* of element, or don't animate it. |
| A borrowed effect used exactly as shipped in its demo | Change more than one property so it stops reading as a stock component. |
| Animating `top`, `left`, `width`, `height`, `filter` on scroll | Janky, and jank reads as amateur regardless of taste. |
| Ease-in on entrances | Things that start slow and end fast feel wrong entering. Use ease-out. |
| A hover effect that fires on touch devices | Gate hover behind `@media (hover:hover)`. |

### The rapid tell audit

Scan any page against this list. Each item was recorded as a real tell during this project,
either from a client rejection or from published critiques of generated design.

**Structural**
- A near-empty first frame that only makes sense once animation runs
- A loading screen on a page whose first frame is already the content
- A centred logo, centred nav links, and a pill CTA
- A three-column icon-and-two-lines feature grid, especially inside the hero
- A statistics band rendered as a band
- A five-column card grid indistinguishable from a template
- Rounded filter pills with icons
- "Container soup" — nested boxes with no structural reason
- Buttons that link to `#`, and links promising more that lead nowhere

**Surface**
- Gradient `background-clip: text` on headlines or the wordmark
- A default serif headline paired with a default geometric sans
- One italicised emphasis word in a headline
- An eyebrow tag above every single section
- Ornament glyphs (✦ ◆ ✧) used as decoration
- An accent bar to the left of every card
- Per-card radial glow
- A full-viewport grain overlay at low opacity — the most common "premium dark site" tic
- Glass cards, uniform rounded corners, soft shadows everywhere
- A teal or purple accent applied to everything
- A blinking status dot
- `transition: all`

**Substance**
- Primitive procedural 3D standing in for a real product
- CSS silhouettes where real product photography exists
- Invented dossier or catalogue copy
- Stock photography in a business that has its own

The distinction that makes this usable: **drawn density is fine, decorated density is not.**
Dimension lines, labels, sheet borders, figure numbers and rules are density that carries
information. Ornaments, glows and badges are density that carries nothing. Restraint should
be *directed stillness inside a dense system*, not emptiness.

A useful corollary: **every effect should be nameable in the client's own vocabulary.** If a
motion can only be described as "a nice reveal", it is decoration. If it can be called *the
draw*, *the cut*, *the register*, *the plate*, *the temper*, then it belongs.

---

## 2. The counter-doctrine

Five principles, each of which independently survived client review.

### One wow moment

A site earns its reputation on a single mechanism the visitor has not seen before. Choose
one, make it the spine of the home page, and let everything else be quiet and excellent.
Three sites' worth of effects on one page cancel each other out.

The wow moment must come from *what the client actually makes*. Not from a library of
effects. See `direction.md` for the derivation method.

### Derive, never invent

Every aesthetic decision should be traceable to a real source: the client's reference
image, their product, their premises, their documents, their photography, their history.
When you can answer "where did this red come from?" with "the mark on their scabbards",
the design has a spine. When the answer is "it felt right for a heritage brand", it
doesn't.

### Enforce the system everywhere

A palette that governs the UI but not the photography is not a system. Grade the imagery.
Convert the video. Tint the 3D. If a photograph fights the palette, treat the photograph.

### Real assets beat generated ones

If the client has footage, photography, drawings, or products, build the site out of those.
Extract line art *from the actual photograph* so a drawing-to-photo morph registers
perfectly. Photograph the product rather than modelling it. Reserve generation for genuine
gaps, and record those gaps as a shoot list to be filled later.

### Restraint reads as confidence

Two typefaces. Three colours. Three motions. One wow moment. Hairline borders instead of
shadows. Flat instead of gradient. The generated look is *additive*; the designed look is
*subtractive*.

---

## 3. The self-check

Before showing any build, run this list. Any "yes" in the first block is a rework.

**Hard fails**
- [ ] Could this palette appear unchanged on a crypto landing page?
- [ ] Is the header a centred logo with centred links and a pill CTA?
- [ ] Is there gradient text anywhere, especially on the wordmark?
- [ ] Are there three icon-and-two-lines feature cards?
- [ ] Is any photography stock, or any hero object a render standing in for a real product the client owns?
- [ ] Is there an invented number, statistic, testimonial, or contact detail anywhere?

**Quality checks**
- [ ] Can I name the real-world source of every colour?
- [ ] Does the interface chrome borrow the client's own document vernacular?
- [ ] Is there exactly one wow moment, and does it come from what they make?
- [ ] Do the animations reduce to three repeated ideas?
- [ ] Does the palette hold on the imagery as well as the UI?
- [ ] Would a competitor be unable to swap their logo in and ship this?

That last one is the real test. If the page would work for any company in the sector with
a logo swap, it is a template, however polished.

---

## 4. When the client says "it looks AI"

They are rarely objecting to a single element. They are reacting to convergence — the sense
that this could have been produced without looking at them. Do not defend the rationale.
Instead:

1. Ask for references they love, and for one image of something they already own.
2. Open the references and name the *mechanism* behind each, not the mood. See `research.md`.
3. Rebuild the palette and the chrome from their own material.
4. Show the reasoning before the build: what they sell, what the visitor asks, what the one
   moment is. Approval comes from the reasoning; the build only has to execute it.

---
name: atelier
description: >
  Research-led frontend design system for building or improving websites that look
  deliberately designed rather than generated. Use this whenever the work touches how a site
  looks, moves, or feels - building a landing page, marketing site, portfolio or product
  page; redesigning or "making better" an existing site; choosing a palette, typography,
  layout or theme; adding scroll animation, motion, transitions, or 3D; auditing a
  competitor or a site the user owns; or responding to feedback like "it looks generic",
  "it looks AI-made", "it's boring", "no wow factor", "make it more premium", or "make it
  work on mobile". Also use it for design research - finding references, analysing
  competitors, deriving a creative direction - and for verifying a build on real devices.
  Prefer this skill over generic frontend guidance for anything visual, and load it BEFORE
  choosing colours, fonts, or animation, because those decisions are hard to reverse later.
---

# Atelier

A working method for producing websites that a client will not call generic. It was
distilled from a fourteen-day heritage-manufacturer build that went through roughly fifty
recorded rejections before it was approved, and every rule here exists because something
specific failed without it.

The central problem is not ugliness. It is **convergence** — a page that looks like it could
have been produced without ever looking at this particular client. Clients recognise that
instantly and call it "AI". Everything below is aimed at avoiding it.

---

## The doctrine, in one paragraph

Derive everything from what the client actually makes. Take the palette from a real artefact
rather than inventing one. Build the interface chrome out of the client's own document
vernacular rather than web convention. Find one wow moment in the object's own physics and
let it carry the site, with two or three motions repeated everywhere else. Use real assets;
never let a render stand in for a product that exists. Refuse to draw any number you cannot
source. Then verify on a real device, because emulators lie.

---

## Pick your entry point

| The request | Start here |
|---|---|
| Build a new site or landing page | §1 Research → §2 Direction → §3 System → §4 Build |
| "Make this site better" / audit an existing site | §0 Audit first, then §1 |
| Audit a competitor, or a site you have no access to | §0, then **§0.5** — different rules apply |
| "It looks generic / AI-made" | `references/anti-generic.md`, then rebuild palette + chrome |
| "It's boring, no wow factor" | `references/direction.md` §1 — this is a mechanism problem |
| "All your options look the same" | `references/direction.md` §3 — build a concept series |
| Choose a theme or aesthetic | `references/theme-library.md` — fifteen families with recipes |
| Add animation or scroll effects | `references/motion.md`, then `references/build.md` |
| Mobile problems, phone bugs | `references/responsive.md` |
| Verify or QA a build | `references/qa.md` and `scripts/cdp.mjs` |

Do not read every reference file. Load the one the current step needs.

---

## §0 — Audit, when something already exists

Gather evidence before forming an opinion:

```bash
node scripts/audit.mjs https://example.com --out ./audit
```

All paths in this file are relative to the skill's own directory, so run the scripts with
the full path to it (they need Node 22+ for the global WebSocket, and a local Chrome; `palette.py` needs Pillow and
numpy). Write outputs into a scratch directory, never into the user's project.

This reports the palette actually in use, the type inventory, asset weights, layout
overflow, contrast failures, tap-target sizes, the motion inventory, and a scan for
mechanical template tells. Read `audit/report.md`.

Then classify every element under **KEEP / TRANSFORM / REMOVE / REINVENT / PRESERVE** and
write the critique in three tiers — broken, generic, missing. Both are in
`references/critique.md`. Lead with what works; a critique that acknowledges something is
the one that gets acted on.

Expect to find factual defects as well as design ones. Stale dates, contradictory phone
numbers and dead links are often more valuable to the client than the redesign.

**Audit more than the home page.** On a shop, a booking site or anything with a
configurator, the findings that win a pitch live on a product page and inside the
interaction, not on the home page. Pass them to the script and then open the interactive
flows yourself:

```bash
node scripts/audit.mjs https://example.com --pages products/x,collections/all --dismiss
```

---

## §0.5 — When the site is not your client's

Auditing a competitor is a different job from designing for a client, and most of the method
below assumes access you do not have: no assets to inventory, no artefact to sample a palette
from, nobody to ask. Read `references/critique.md` §7 before writing anything in this mode.

The short version:

- **You can still derive a direction**, but from the *product category and the customer's
  problem* rather than from the client's material. What is physically being sold, what the
  buyer cannot tell from a photograph, what the whole category refuses to do.
- **State the palette as a source and a method, not as hex values.** "Sampled from the blade
  in their own product photography, run through `palette.py`" is honest. Inventing hexes for
  a business you have no access to is exactly the failure this skill exists to prevent.
- **Close with what you would need**, framed as inputs rather than flaws. Three named
  assets or facts you would ask for on day one.
- **Say what you could not see.** Anything behind a login, a cart, or a form.

Two things change in the surrounding guidance when you work from outside:

**Their document culture may be digital.** The vernacular list in `anti-generic.md` is
weighted towards analogue artefacts because it came from a heritage manufacturer. A modern
direct-to-consumer brand has a real document culture too — the spec block, the size chart,
the shipping notification, the unboxing, the stream overlay, the care card. Reach for *their*
artefacts, not for a herbarium sheet, or you reproduce the derived-from-nothing failure in a
more tasteful costume.

**They are probably on a platform.** A live storefront on a hosted platform, with apps in the
checkout path, cannot take a bespoke build. A pitch that says "here is the wow moment"
without "here is how it ships as a section on your existing theme, without trading
conversion for choreography" loses. See `references/process.md` §11.

---

## §1 — Research

Read the project's own materials **before** searching the web. Then research. Then propose.
Full method in `references/research.md`.

Answer in writing: what is physically being sold · who arrives and what they must believe ·
what proof exists · the single most interesting true fact · what the client owns that has a
visual language.

Then: find what every competitor does (that is what you must not do), borrow a peer set from
*outside* the category, mine award galleries for mechanisms **and for how they judge**, and
dissect three to six references by opening them — a screenshot cannot show you a transition.

Build the benchmark table. The last column is the one that does the work:

| Reference | Underlying idea | What we take | What we must NOT copy |

If the client supplies a reference image or site, **treat it as the spec, not as
inspiration.** Every invented alternative in the source project was rejected; the palette
lifted verbatim from the client's reference was the first thing ever approved.

---

## §2 — Direction

A direction is a claim: *when you arrive, **this** happens, because the thing they make is
**that**.* Full derivation in `references/direction.md`.

The short form:

1. Inventory the real assets first — they decide hero-versus-render, and that cascades.
2. Where two asset sets disagree, the disagreement is your narrative arc.
3. Find the **physical verb the company already owns**, and make it the site's only verb.
   It gives you a kill rule: *if an animation is not that verb, it is cut.*
4. Locate the wow moment in the object's own physics, not in an effect library.
5. Write **why it cannot be transplanted**. If you can't, it's generic.
6. Name **one visual signature element** — a single graphic primitive that recurs and always
   has a job — plus a coherence test for it.
7. Write the sentence a visitor would say to a friend.

Then attack it before the client does, under the ten headings in `references/critique.md`,
answering each attack with a concrete execution change rather than a defence. Flag your own
weakest scene rather than hiding it.

**Present the reasoning before the build.** Clients approve reasoning; they only critique
pixels.

---

## §3 — System

Build the token system and prove it on a **style lab** page before building any real page.
Full detail in `references/systems.md`; theme recipes in `references/theme-library.md`.

```bash
python scripts/palette.py reference.jpg --n 6 --css
```

Non-negotiables:

- **Palette derived from a real artefact**, three or four colours used at full weight, and
  **enforced on the photography and video too** — a palette that governs the UI but not the
  imagery is not a system.
- **One accent, reserved for state** — live navigation, progress, marks. The moment it
  becomes a generic button fill it stops signalling anything.
- **Two type families**: one display, one metadata family with an actual job (captions,
  figure numbers, dates, dimensions). Flat fills, never gradient text.
- **One spacing scale.** If a value appears twice it is a token — especially the header
  height, which sticky offsets and pinned scenes all depend on.
- **Hairlines, not shadows.** `box-shadow:0 0 0 1px var(--edge)` reads as precision.
- **Push contrast to the extremes.** Tasteful near-blacks and soft greys read as timid.

---

## §4 — Build

Patterns and working code in `references/build.md`; motion rules in `references/motion.md`.

Build the **keystone scene first** and then genuinely stop and test it against the
principles. It is the cheapest scene to test, and it proves the architecture generalises —
the deciding question is whether the second scene costs a fraction of the first. Expanding a
flawed keystone multiplies the flaw by the number of sections.

Hold these while building:

- **Transform and opacity only** on anything scroll-linked. Jank reads as amateur regardless
  of taste.
- **Three motions, repeated**, assigned by kind of element. Not forty.
- **One scrub-driven scene** carrying the wow moment; reveals everywhere else.
- **Reveals must replay** on scroll-back — use `onEnter`/`onLeaveBack`, not `once`.
- **Gate hover behind `@media (hover:hover)`.**
- **`prefers-reduced-motion` is a real design**, not a disable switch. Someone who cannot
  tolerate the animation must still get the whole site.
- **Every scrubbed scene is a pure function of one progress number**, with a `window.__scene(p)`
  hook. Reversing the scroll must reverse the scene exactly.
- **Mobile is its own composition**, not a shrink. See `references/responsive.md`.

---

## §5 — Content

`references/content.md`. The rule that matters most: **unverified means undrawn.**

Put the honesty in code rather than in review — carry a `verified` flag on data and let the
renderer filter it, because a reviewer forgets and a filter does not. Derive anything
time-dependent at runtime so it cannot go stale. Blank beats invented: design the register
so it is beautiful with empty columns, or the layout itself will pressure someone into
inventing content.

No fake forms, no invented contact details, no `#` buttons, no placeholder testimonials.
Label borrowed imagery visibly. Disclose designed treatments on the page itself.

When content runs out, record the gap as a request rather than filling it. A gap you have
written down is a question; a gap you have filled is a fabrication.

---

## §6 — Verify

`references/qa.md`. Screenshots lie on animation-heavy pages: preview panes throttle
`requestAnimationFrame` when hidden, WebGL captures black, and a shot can race first paint.

```bash
node scripts/cdp.mjs --sweep https://example.com --mobile     # scroll the page, probe every stop
node scripts/cdp.mjs jobs.json ./out                          # scripted passes
```

Prefer **DOM probes over pixels** — `scrollWidth`, `clientWidth`, bounding rects, computed
styles, media `paused` and `readyState`. Then test on a **real device**. Every mobile bug
recorded in this method was found on a real phone after the emulator passed.

State what you did not verify. Never claim a device you did not test on.

---

## §7 — Ship

`references/process.md`.

**Never deploy without an explicit instruction in that message.** Not implied, not carried
over from an earlier approval. Build and verify on localhost and hand over that link. Never
overwrite a demo the client has already seen — deploy a second version to a new URL so both
can be shown. After deploying, verify the live URL rather than the local one.

Bump cache-busting query strings on CSS and JS while iterating, and remember that two pages
sharing a stylesheet both need the bump.

Never rebuild from scratch to escape a problem. Fork the thing that works and change it —
rebuilding destroys accumulated equity, and clients compare the new work unfavourably to
what they had already accepted.

---

## The self-check before showing anything

Any "yes" in the first block is a rework, not a note.

**Hard fails**
- [ ] Could this palette appear unchanged on an unrelated landing page?
- [ ] Is the header a centred logo with centred links and a pill CTA?
- [ ] Is there gradient text, especially on the wordmark?
- [ ] Is any hero object a render standing in for a real product the client owns?
- [ ] Is any number, name, testimonial or contact detail invented?
- [ ] Does any control link to `#`?
- [ ] Does the first frame look like an empty page waiting for animation?

**Quality**
- [ ] Can I name the real-world source of every colour?
- [ ] Does the chrome use the client's own document vernacular?
- [ ] Exactly one wow moment, and does it do a job?
- [ ] Do all animations reduce to three repeated ideas?
- [ ] Does the palette hold on photography and video?
- [ ] Does every scene hold as a frozen still?
- [ ] Is the phone version a composition rather than a shrink?
- [ ] Complete site under `prefers-reduced-motion`?
- [ ] Verified on a real device?

That first question is the real test. **If a competitor could swap their logo in and ship
it, it is a template**, however polished.

---

## Reference map

| File | Read it when |
|---|---|
| `references/anti-generic.md` | Before choosing palette, type, or layout — and whenever "it looks AI" comes up |
| `references/research.md` | Starting any project; finding references and competitors |
| `references/direction.md` | Deriving the concept; concept series; a rejected build |
| `references/theme-library.md` | Choosing an aesthetic — fifteen families with full recipes |
| `references/systems.md` | Building tokens, palette, type scale, spacing, states |
| `references/assets.md` | Inventorying footage and photography; encoding; commissioning generated media |
| `references/motion.md` | Any animation decision — timing, easing, what to animate |
| `references/build.md` | Implementation patterns: scroll scenes, gates, 3D, media, performance |
| `references/responsive.md` | Phone layouts, touch, and the Android zoom-out bug class |
| `references/content.md` | Writing copy; anything involving numbers or facts |
| `references/critique.md` | Attacking a concept; auditing an existing site; before showing work |
| `references/qa.md` | Verifying a build; the harness; the pre-handover checklist |
| `references/process.md` | Sequencing work, phases, migrations, deploy discipline |

| Script | Use |
|---|---|
| `scripts/audit.mjs` | Evidence pass over any live URL — palette, type, weight, overflow, contrast, tells |
| `scripts/cdp.mjs` | Real-Chrome verification: `--sweep` for a whole page, or scripted jobs |
| `scripts/palette.py` | Derive a palette from a reference image, with a contrast matrix |

---

## Working notes

Feedback on design work is often blunt. Read *"this is terrible"* as a request to stop making
the safe choice, not as a request to stop. The correct response is a specific diagnosis and a
different structural approach — not an apology and a variation.

And when you inherit anything — a codebase, a previous session's conclusions, a delivered
asset — **check what is actually there** before building on it. Open the asset rather than
counting the files. The most instructive praise in the source project was not for a build:
*"you verified the existing implementation rather than inheriting its assumptions."*

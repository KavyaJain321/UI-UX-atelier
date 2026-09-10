# Research: competitors, references, and how to read them

Design research has three jobs: find out what the field already looks like so you do not
rebuild it; collect *mechanisms* you can adapt; and learn how work in this category is
actually judged. Mood boards serve none of these. What you need is a written account of how
each reference works and what you are allowed to take from it.

Budget 20–40 minutes of tool time before proposing any direction. Skipping this is the most
common reason a first proposal is rejected.

---

## 1. Internal context first

Read what the project already holds — the client's brief, prior documents, their existing
site, their materials — **before** searching the web. Then research externally. Then propose.
Proposing from general knowledge before reading the client's own documents is the fastest
route to a wasted round.

Answer these in writing; they constrain everything downstream.

1. **What is the object or service?** Concretely. Not "premium solutions" but "hand-forged
   regulation swords, sold to defence ministries and collectors".
2. **Who arrives, and what must they believe?** A procurement officer needs proof of
   capability; a collector needs provenance and romance. These are different home pages.
3. **What proof exists?** Footage, photography, documents, dates, certifications, premises,
   people. This decides what the site can honestly be made of. See `assets.md`.
4. **What is the single most interesting true fact?** Usually this becomes the wow moment.
5. **What does the client already own that has a visual language?** Packaging, drawings,
   forms, stamps, catalogues. This becomes the interface vernacular.

If the client supplies reference sites or images, treat them as **the spec**, not as
inspiration. Extract their colours and mechanisms literally. Every invented alternative in
this project was rejected; the palette lifted verbatim from the client's reference was the
first thing ever approved.

---

## 2. Find the competitive field, in two passes

**How many.** Two to five is enough to establish the pattern. Record any that block
automated access rather than dropping them silently — "one of four refused headless
requests" is a finding, not a gap.

**Pass 1 — the actual competitors.** Search the product category in the buyer's language:
`"<category>" manufacturer`, `best <category> brands`, `<category> suppliers`, plus the
client's own name to see who they are compared against.

You are looking for what they all share, because that is what you must not do. Very often
the honest finding is decisive:

> *The pure sword and katana retail field is almost entirely stock Shopify and WooCommerce
> templates. There is no award-winning, animation-heavy site in this category — there is no
> incumbent to beat.*

A category vacuum is a strategic asset. State it as a fact in the brief; it changes how
ambitious the client will let you be.

**Pass 2 — borrow the peer set out of category.** The sites you learn from are rarely
competitors. Find categories that share the *problem*, not the product. For a heritage
maker of a precise metal object, the useful peers were Japanese knifemaking, Swiss watches,
Japanese sake, Spanish olive oil, defence technology, and premium everyday-carry — none of
them swords.

Search by the interaction rather than the industry: `scroll-driven product story site`,
`heritage manufacturer website award`, `luxury watch 3D configurator cinematic scroll`.

---

## 3. Mine the awards, including how they judge

Award galleries are the highest-yield source of mechanisms, but the real prize is the
**judging apparatus**. Crawl it deliberately.

**Galleries worth the time**

| Source | How to use it |
|---|---|
| Awwwards | Crawl the category indexes (`/websites/e-commerce/`, `/luxury/`, `/scrolling/`, `/animation/`, `/transitions/`, sites of the day/month/year, the WebGL collections). Then fetch **individual award pages for their per-category scores** — that is how you learn that one site scored 9.0 on animations and why. Also read `/about-evaluation/`, `/jury/`, `/annual-awards/`. |
| FWA, CSS Design Awards, CSSWinner | Secondary; cross-check winners. |
| Godly, Land-book, SiteInspire, Minimal.gallery, One Page Love, landing.love, httpster | Browse by mechanism keyword rather than by industry. |
| Codrops (tympanus.net) | A legitimate *technique* source. Pull techniques from open sources — three.js examples, Codrops, shader galleries — rather than cloning anyone's site. |
| 21st.dev and component galleries | Useful for a mechanism, rarely for a component. See §5. |

**Look for trend data with numbers, not opinion pieces.** Statistics reframe a project
faster than taste does. Real findings that changed this build:

- 61% of a recent quarter's Site-of-the-Day winners used 3D, up from 23% two years earlier.
- Scroll-driven narratives outscored static showcases by nearly two points.
- **Heavy video backgrounds fell below 8% of winners; hero-image-with-overlay-text below 12%.**

That last line killed a planned video-background hero. Numbers settle arguments that taste
cannot.

**A warning about search noise.** Verify that a search actually returned what you asked for.
One query for a design award returned a football writers' association and quietly polluted
the corpus with sports URLs. Broad SEO listicles ("15 web design trends") are almost always
low-yield — in this project a dozen such sites produced not one verdict that survived into
the build.

---

## 4. Build the benchmark table

Consolidate the best references into one table. The final column is the one that does the
work, because it forces you to name what you are taking *and* prevents cloning.

| Reference | Score / date | Underlying idea | What we take | What we must NOT copy |
|---|---|---|---|---|
| A knifemaker's site | SOTD, dated | Scroll-scrubbed image sequence, no WebGL | Sequence-over-video for the hero scrub | Its exact grid and palette |
| A watch site | Animations 9.0 | Explode-and-reassemble as the camera travels | Parts naming themselves along a travel | The literal explode |
| A jeweller's exhibition site | Animations 9.0 | One room per object | A dedicated space per hero object | The room metaphor itself |
| A sake maker | SOTD | Award-level with no WebGL at all | Proof that restraint can win | — |

Include at least one **counter-example** — a site that succeeds by refusing the convention.
One studio site in this project had no hero at all, and the note recorded was: *it works
because the work is the hero.* Counter-examples stop a benchmark set becoming a consensus.

---

## 5. Dissect references properly

Open them. A screenshot cannot show you a transition, and the client will ask.

> *"Go and analyse this one yourself — the images of it won't show you how amazing it is."*

Use the browser tools: navigate, screenshot at several scroll depths, read the page, inspect
what drives the motion. Note the loading ritual, the first interaction, what scroll does,
what the pointer does, how the palette is enforced.

For each reference, write four lines:

```
Site:         <url>
Mechanism:    what technically happens, in one sentence
Why it lands: what the visitor feels, and why it suits that product
Adaptation:   our equivalent, given what our client makes
```

Worked examples in the format to aim for:

```
Site:         a dark product site with a giant grey wordmark behind a floating 3D device
Mechanism:    an oversized wordmark sits behind the hero object as a background layer; the
              object floats with slow idle rotation; one acid accent for a countdown.
Why it lands: the object is the hero and the brand is scenery, so the product reads as more
              important than the marketing.
Adaptation:   our object is a real photographed blade — put the wordmark behind it and let
              the object occlude the letters.

Site:         a tribute site whose loader reads "Entering", then "Enter"
Mechanism:    a noise-cloud shader dissolve between two colour fields on click; scroll then
              drives a progress strip while the headline decomposes word by word.
Why it lands: the loader converts waiting into a ritual, so arrival feels like entry.
Adaptation:   a gate over real forge footage, its counter written in the client's own
              vocabulary, dissolving through a shader veil on enter.
```

Three to six well-dissected references beat twenty screenshots.

When a client hands you a reference and says they like it, they mean the *thinking*, not the
pixels: *"I don't need a replica — see the innovation, the idea behind it."*

---

## 6. Libraries and technique sources: adopt, reference, or skip

A useful filter: a resource that gives you **numbers** (durations, easings, scales) or
**mechanisms** is worth adopting. A resource that gives you **components** is usually worth
reading and reimplementing, so the result is not recognisable as a stock component.

Verdicts from this project, as a model for how to record them:

| Resource | Verdict | Reason |
|---|---|---|
| A free MIT component set with shipped prompts | **Adopt** the free tier | Real code, clear licence; mine its skill files for the stack |
| A motion library's timing rulebook | **Adopt the numbers only** | Set as global animation defaults; ignore the components |
| A paid effect library built on a different animation runtime | **Reference only** | Reimplement the effects in the stack you are actually using |
| A paid snippet pack advertising code "sourced from high-end websites" | **Skip** | Provenance and licensing risk. Do not ship its code |
| A timeline component gallery | **Take the mechanism** | *"The ones worth anything share one mechanism: a year that holds still while its entry passes, a line that fills as you scroll, an image per milestone. The orbital and 3D variants are toys."* |

Always check the licence before shipping anything, and prefer open technique sources over
snippet packs.

---

## 7. Auditing an existing site

When the brief is "make this better", start with evidence, not opinion:

```bash
node scripts/audit.mjs https://example.com --pages products/x --out ./audit --dismiss
```

Run it with the full path to the skill directory unless your working directory is the
skill root, and add `--pages` for a product or interactive page — on a shop the findings
that matter are rarely on the home page.

It captures screenshots at desktop and phone widths, the palette actually in use, every font
family and size, the animation inventory, overflow problems, image weights, and the load
waterfall. Read `audit/report.md`, then classify everything under
KEEP / TRANSFORM / REMOVE / REINVENT / PRESERVE and write the three-tier critique. Both are
in `critique.md`.

Expect to find factual defects as well as design ones. Auditing the client's own live site
in this project produced a seventeen-item list including broken shortcodes, stale dates, and
two contradictory phone numbers. Those findings are often more valuable to the client than
the redesign.

---

## 8. Output of the research phase

Produce a short written brief before building anything. This is what the client approves,
and approval here is what makes the build go smoothly.

```markdown
## What they sell
## Who arrives, and what they need to believe
## The proof we actually have (asset inventory + gaps)
## The field: what every competitor does — and therefore what we won't
## How this category is judged (award criteria, trend data with numbers)
## Benchmark table (reference | idea | what we take | what we must not copy)
## The direction: the one wow moment, and why it belongs to this client
## The system: palette source, type pairing, interface vernacular, signature element
## What we cannot honestly claim
```

Show the reasoning before the build. Clients approve reasoning; they only critique pixels.

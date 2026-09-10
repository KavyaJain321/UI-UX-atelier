# Critique: attack it before the client does

Every round a client spends telling you what is wrong is a round you could have spent
building. The cheapest critique is the one you run on yourself, in writing, before anyone
sees the work. This file holds two instruments: an adversarial pass on a *concept*, and an
audit taxonomy for an *existing site*.

Run the concept attack before writing code. Run it again before showing work.

---

## 1. Attack the concept

Frame it honestly: *assume a world-class agency has been briefed to beat this. Here is their
critique, answered.* Then work through ten fixed headings. The headings are fixed because
left to yourself you will skip the uncomfortable ones.

1. What is genuinely original here?
2. What is already a familiar pattern?
3. What could become gimmicky?
4. What could confuse users?
5. What could become visually repetitive?
6. What risks feeling like an expensive 3D demo?
7. What risks feeling like a museum or archive rather than a live brand?
8. What risks overwhelming the products?
9. What is the single most memorable moment?
10. What should become the visual signature of the whole site?

**Answer every attack with a concrete execution change, not a defence.** Tabulate it:

| Attack | Change |
|---|---|
| The travel could become repetitive over six stations | Each station changes one variable — light, scale, or annotation density — and two stations are deliberately still |
| The globe risks reading as an expensive demo | It carries the customer list; removing it removes information, not decoration |

The concept survives; the execution changes. If an attack can only be answered by defending
the concept, the concept is the problem.

**Flag your own weakest scene rather than hiding it.** Naming it first is what makes the
rest of the critique credible, and clients respond well to it. A real example: *"Sheet 03 is
the weakest concept here and I am flagging it rather than defending it."*

Do this repeatedly, not once. When it was skipped in this project the client noticed and
asked for it by name.

---

## 2. The four anti-generic tests, per scene

Apply to every scene, in a table, with a required answer.

| Test | Question | Required |
|---|---|---|
| **Template** | Swap the client's brand for a competitor's. Does the scene still work? | **No** |
| **Motion** | Freeze it. Does the composition hold as a still? | **Yes** |
| **Object** | Remove the hero object. Does the scene survive? | **No** |
| **Asset** | Does it use real client material? | **Yes** |

The motion test matters more than it sounds. Art direction is judged on the frozen frame,
and a rest state that looks like an empty page waiting for animation was rejected in this
project as *"dull, near-empty first frame"*. **The first frame is the poster.**

---

## 3. Auditing an existing site

When the brief is "make this better", classify every element before proposing anything.
Five buckets, and the discipline is that everything lands in exactly one:

- **KEEP** — already strong; carry it over unchanged.
- **TRANSFORM** — right idea, execution needs to be substantially better.
- **REMOVE** — actively weakens the experience.
- **REINVENT** — too conventional to fix; state it as `current → replacement`.
- **PRESERVE** — brand or client requirements that cannot be sacrificed regardless of taste.

The PRESERVE bucket is what stops an audit turning into a rebuild proposal the client will
reject. Fill it first, from their constraints, not yours.

Then present the critique in three tiers so the client can choose scope:

1. **Broken** — objective failures: overflow, contrast below AA, layout collapse on phones,
   multi-megabyte images, janking motion, dead links. Not debatable.
2. **Generic** — where the site matches the sector template. Name the specific tell from
   `anti-generic.md` and what it should become.
3. **Missing** — the absent wow moment, derived from what they sell.

Lead with what works. There is always something, and a critique that acknowledges it is the
one that gets acted on.

Gather the evidence first rather than eyeballing it:

```bash
node scripts/audit.mjs https://example.com --pages products/x --out ./audit --dismiss
```

Run it with the full path to the skill directory unless your working directory is the
skill root, and add `--pages` for a product or interactive page — on a shop the findings
that matter are rarely on the home page.

### The shape of the deliverable

The audit and the direction are two documents with two audiences — a diagnosis of a site, and
a proposal for what replaces it. When one request asks for both ("audit this and tell me how
to beat it"), keep them visibly separate and say at the top whose product the direction is
for, because that is often ambiguous and guessing it wrong wastes the whole document.

```markdown
# <Site> — audit and direction
_What was examined, at what sizes, on what date._

## What is working
Two or three specifics, named. Never skip this.

## 1. Broken
Objective failures, each with the evidence. Not debatable.

## 2. Generic
Where it matches the sector template. Name the tell, then what it should become.

## 3. Missing
The absent mechanism, and what it costs them in the customer's terms.

---

# Direction: <name>
_Assumption: this direction is for <whose product>._

**What is being sold, and what the buyer cannot tell from the page.**
**The verb.** The physical action the product performs, which the interface will perform too.
**The wow moment.** One sentence: the mechanism and the payoff.
**Why it cannot be transplanted.** One paragraph.
**The signature element.** One primitive that recurs and always has a job.
**The system.** Palette source and method, type pairing, interface vernacular.
**The beats.** A table: beat / job / mechanism.
**Attack and answer.** The ten headings, each answered with an execution change.
**Three weaknesses**, named, with the fix for each.
**How it ships.** The unit of delivery, and what it must not disturb.

## What I would need on day one
## What I could not see
```

Keep it to what a client will actually read. A tight audit plus a one-page direction beats a
thorough document nobody finishes.

---

## 4. The verification praise

The single most instructive piece of praise in this project was not for a build:

> *"You verified the existing implementation rather than inheriting its assumptions."*

When you inherit a codebase, a design, or a previous session's conclusions, **check what is
actually there** before building on it. Read the running code, measure the real values, open
the actual assets. Assumptions inherited silently are the most expensive kind of debt,
because nobody knows they are load-bearing until something built on them collapses.

Concretely: open the asset rather than counting the files. In this project two delivered
asset sets were opened, inspected and rejected in writing — one because its final sixty
frames were exactly the fantasy-glow aesthetic the brief forbade. *"I opened them rather
than counting them."*

---

## 5. Before showing any work

A short standing checklist. Any "yes" in the first block is a rework, not a note.

**Hard fails**
- [ ] Could this palette appear unchanged on an unrelated landing page?
- [ ] Is the header a centred logo with centred links and a pill CTA?
- [ ] Is there gradient text, especially on the wordmark?
- [ ] Is any hero object a render standing in for a real product the client owns?
- [ ] Is any number, name, testimonial or contact detail invented?
- [ ] Does any button link to `#`?
- [ ] Does the first frame look like an empty page waiting for animation?

**Quality**
- [ ] Can I name the real-world source of every colour?
- [ ] Does the interface chrome use the client's own document vernacular?
- [ ] Exactly one wow moment, doing a job?
- [ ] Do all animations reduce to three repeated ideas?
- [ ] Does the palette hold on photography and video too?
- [ ] Do reveals replay on the way back up?
- [ ] Does every scene hold as a frozen still?
- [ ] Is the phone version a composition, not a shrink?
- [ ] Does `prefers-reduced-motion` still deliver a complete site?
- [ ] Verified on a real device, not only an emulator?

---

## 6. Working from outside: auditing someone else's site

Most of this skill assumes a client whose materials you can read and whose people you can
ask. Auditing a competitor gives you none of that, and the honest move is to change what you
claim rather than to guess.

**What you can still conclude from outside**

- Everything measurable: weight, contrast, overflow, type inventory, palette in use, motion
  inventory, request origins, the interaction flows you can reach without logging in.
- What the whole category refuses to do. Check two to five competitors, note any that block
  automated access rather than silently dropping them, and look for the shared absence — the
  thing none of them does is usually the opening.
- What the buyer cannot learn from the site. This is the richest seam and it needs no access
  at all. On a product sold by scale, weight, feel or fit, ask what a customer who has never
  held one still does not know after reading the page.

**What you must not do**

- Invent hex values, type choices or brand facts. State the palette as a *source and a
  method* instead: "sampled from their own product photography with `palette.py`". A source
  is checkable; an invented hex is the exact failure this skill exists to prevent.
- Assert a claim about their business you cannot see: stock, margins, returns, why something
  was built the way it was.
- Present a bespoke build to a business obviously running on a hosted platform without saying
  how it ships inside that platform.

**How to write the direction without the assets**

Run the same derivation in `direction.md`, but source Step 1 from the *category and the
customer* rather than from an asset inventory, and add two sections at the end:

```markdown
## What I would need on day one
1. <asset> — because <what it unlocks>
2. <fact>  — because <what it makes honest>
3. <access> — because <what it lets us verify>

## What I could not see from outside
- Anything behind login, cart, or checkout
- <interaction you could not reach>
```

Frame those as *inputs, not flaws*. A direction that names what it still needs reads as
professional; one that quietly fills the gaps reads as invented, because it is.

---

## 7. Known limitations: the shape

Every report should end with one. Keep it to a short list under a plain heading, each line
naming what was not checked and why, so a reader knows the edge of the evidence:

```markdown
## What this did not check
- **Interactions.** Forms, cart, configurator and filters were not exercised.
- **Devices.** All figures come from headless Chrome on a desktop, not a real phone.
- **Content truth.** Numbers, claims and availability were not verified.
- **Coverage.** Only the pages listed above were loaded.
```

The rule underneath it: never claim a device you did not test on, and never let a measured
number stand in for one you estimated. An admitted gap costs nothing; a discovered one costs
the engagement.

---

## 8. Reporting honestly

Two habits that cost nothing and buy a great deal of trust.

**State what was not verified.** A "known limitations" section belongs in every report. From
this project: *"no real device has ever run this — every phone figure in this report is an
emulated viewport with a CPU throttle on a laptop GPU."* Saying that is what makes the rest
of the numbers believable.

**Correct claims downward when the evidence is thinner than the copy.** If the source
supports eighteen *nations* and the headline says eighteen *armed forces*, change the
headline. If the data lists five continents and the copy says six, fix the copy and list the
correction. Nobody has ever been embarrassed by a claim that was too careful.

# Process: how to run the work

The design lessons in this skill were expensive. The process lessons were more expensive,
because a process failure wastes a whole round rather than one element.

---

## 1. Order of work

```
inventory assets → audit what exists → research the field → derive direction
  → attack the direction → write principles + prohibitions → style lab
  → build the keystone scene → STOP AND TEST → build out → verify → hand over
```

Two of those steps are the ones habitually skipped, and both were asked for by name when
they were missing: **the adversarial pass** on the direction, and the **stop-and-test** after
the keystone scene.

---

## 2. Internal context before external research

Read what the project already has — briefs, prior docs, the client's own materials — *before*
searching the web. Then research references. Then propose. Proposing from general knowledge
before reading the project's own documents is the fastest route to a rejected round.

---

## 3. Build the keystone scene first, then stop

Pick the scene the whole concept rests on and build only that. It is chosen because:

- if it does not land, the thesis needs revision before anything else is built on it;
- it is the cheapest scene to test;
- it proves the architecture generalises — **the deciding test is whether the second scene
  costs a fraction of the first.**

Then genuinely stop and test against the principles: original? on-brand? craftsmanship?
signature moment? inevitable? 60 fps? If any answer is no, redesign before expanding.
Expanding a flawed keystone multiplies the flaw by the number of sections.

---

## 4. Phase tables with falsifiable exits

Every roadmap is a table: `Phase | Deliverable | Days | Exit test`. The exit test must be
checkable, not a feeling.

Good exit tests, all used in this project:

- a static style-sheet page renders every token and every state
- every scene function is a pure function of one progress number
- filters and search operate on data, not on CSS classes
- every entry has no invented field
- every fact links to a source line in the research document
- keyboard-only walkthrough passes; automated accessibility check is clean
- Lighthouse ≥ 90 on mobile

---

## 5. Migrate behind flags, never in place

When replacing a working system, stage it with rollback at every step:

| Phase | State |
|---|---|
| 0 | Freeze and tag the working version |
| 1 | **Shadow mode** — the new engine runs beside the old, compares, writes nothing |
| 2 | Live behind a query flag (`?engine=live`) |
| 3 | Default, with `?legacy=1` to roll back |

Shadow mode is what makes this safe: *zero geometry mismatches over ~100k channel checks;
39 of 40 screenshots byte-identical* is the kind of evidence that earns approval for phase 2.

One phase should be gated on **feel, not metrics** — the client must say "same or better".
Keep both paths switchable by query flag until they do.

---

## 6. The frozen baseline

When a redesign begins, fork and freeze. One directory is declared untouchable: checksummed,
no deploys pointed at it, and explicitly *not* the working copy. Everything happens in the
fork.

This rule was restated across four sessions in escalating language. Treat a baseline that a
client has already seen and approved as read-only, and prove **both** still run before
handing anything over.

Never rebuild from scratch to escape a problem. In this project three from-scratch concepts
were rejected outright with a comparison back to the older build — *rebuilding destroyed the
accumulated equity*. Fork the thing that works and change it.

---

## 7. Scope discipline

Open each phase brief with a numbered **DO NOT** list and end it with a hard stop. Real
examples: do not deploy · do not redesign scene 01 · do not build scene 04 · do not add
WebGL · do not remove the smooth-scroll library yet · do not change the typography, the hero
composition, the object, the inscription, the labels, the light, or the timing.

And the rule that makes the list work:

> *If something must change to enable this, **stop and report it** rather than silently
> changing the visual implementation.*

Build one thing at a time, properly, with every detail — depth over breadth. When the client
sequences the work ("start with A, then we add B"), follow the sequence exactly.

---

## 8. Deploy discipline

- **Never deploy without an explicit instruction in that message.** Not implied, not carried
  over from an earlier approval. This was the hardest standing rule in the project.
- Build and verify on localhost; hand over the local link.
- **Never overwrite a demo the client has already seen** — deploy a second version to a new
  URL so both can be shown.
- After deploying, **verify the live URL**, not the local one.
- Keep the rollback command written down. Note the trap: after a rollback, later production
  deploys build successfully but **the production alias does not move** — a promote step is
  required.
- Cache-busting is not optional while iterating. Bump `?v=N` on CSS and JS; remember the HTML
  itself may not be busted (use a page query); when replacing a same-named asset behind
  immutable headers, bump the asset's query string too; **when two pages share a stylesheet,
  bump the version in both.**

---

## 9. Ask rather than guess

- Keep a live **open questions / client decisions** list in every document, restated at the
  end. Do not guess at them.
- **Never install tools or dependencies without asking.**
- **Never use someone else's machine or shared resources without asking**, even when access
  was granted earlier for a different task.
- When an asset is missing, ask for it. If the client is the asset pipeline — *"just say the
  word with a prompt and I will generate it"* — then request the asset rather than
  substituting something worse.
- Record the gap, unblock yourself with something honest and labelled, and come back to it.

---

## 10. Carry memory across sessions

Long projects outlive their context windows. Keep a small set of documents that let any
session resume cold:

| Document | Job |
|---|---|
| `context.md` | What has been done and how |
| `SYSTEM.md` | The design system: tokens, states, components |
| `CREATIVE_BLUEPRINT.md` | The direction, the principles, the prohibitions |
| `RESEARCH.md` | References, mechanisms, fact sources |
| `SHOOT_LIST.md` | Asset gaps and how to fill them |
| `PROMPTS.md` | Generation briefs and delivery status |
| `DEPLOY.md` | URLs, commands, cache-busting, rollback |

Write to them as you go, not at the end.

---

## 11. Designing inside a platform

Much of this method assumes a bespoke build. A great deal of real work is not: it is a live
storefront on a hosted platform, with a theme, third-party apps in the checkout path, and
revenue running through it while you work. The method still applies, but three things change
and a proposal that ignores them loses.

**Say how it ships.** A pitch that ends at "here is the wow moment" without "here is how this
becomes a section in your existing theme" is incomplete. Name the unit of delivery — a theme
section, a block, an app embed, a template override — and what it replaces.

**Never trade conversion for choreography.** On a page that takes money, the hierarchy is
price, availability, delivery, trust, then everything else. A scroll scene that delays the
add-to-cart button, moves it, or pushes it below a pinned section will be measured and
removed. Put the signature moment where it *supports* the decision: showing scale, material,
fit, or what the buyer cannot tell from a photograph.

**Work with the platform's constraints, not against them.** Assume you do not control the
checkout, that apps will inject markup you did not write, that the theme's own CSS will fight
you, and that a full-page smooth-scroll library over a storefront is usually a mistake.
Prefer one strong self-contained section over a re-architecture.

The parts of this skill that survive a platform unchanged: the palette discipline, the
vernacular principle, the type system, honest content, the accessibility floor, and one
signature moment. Those are where the value is. The parts that often do not survive: pinned
multi-scene scroll rigs, custom scroll engines, and heavy 3D.

Say all of this in the proposal rather than discovering it in build. And note that §8's
deploy discipline is about demo URLs; deploying into someone's revenue-carrying storefront is
a different risk, and it needs their explicit go-ahead, a staged theme, and a rollback plan.

---

## 12. Working tone

Feedback on design work is often blunt. Read it as a request to stop making the safe choice,
not as a request to stop. The correct response to *"this is terrible"* is a specific
diagnosis and a different structural approach — not an apology and a variation.

And when reporting: say what you verified, say what you did not, and never claim a device
you did not test on.

# Direction: deriving a concept worth building

A direction is not a mood board and not a colour scheme. It is a claim of the form:

> *When you arrive, **this** happens, because the thing they make is **that**.*

If you cannot fill both blanks from what the client actually sells, you do not have a
direction — you have a template with their logo on it.

---

## 1. The derivation chain

Ten steps. They were arrived at by failing without them.

### Step 1 — Inventory the real assets before designing anything

The asset audit *is* the market research. What footage, photography, documents and products
exist decides whether the hero is real material or a render, and that decision cascades
through everything. Score the asset sets against candidate directions and let the number
choose, not taste. See `assets.md`.

### Step 2 — Let the constraint become the concept

Where two asset sets disagree, the disagreement is the narrative arc.

> *The photographs are all finished objects; the footage is all fire and process. So the
> spine writes itself: fire → object.*

A constraint you cannot remove is a structure you did not have to invent.

### Step 3 — Find the category vacuum

Survey the competitive field (see `research.md`). Very often the honest finding is that the
entire sector runs on stock templates and there is **no incumbent to beat**. State that as a
fact in the brief — it changes how ambitious the client will let you be.

### Step 4 — Find the physical verb the company already owns

The strongest concepts come from a word the client already uses about their own work, which
happens to carry several literal meanings.

> *"Drawn" carried three senses for a swordmaker: drawn in ink (the pattern), drawn from its
> scabbard (the object), drawn out across the world (the record). The thesis became:*
> ***Because they measure before they make, the site draws before it shows.***

The verb then supplies a kill rule that settles every later argument:

> *If an animation is not the blade being drawn, drawn out, or drawn upon, it is cut.*

One verb, several senses, and a rule for everything else.

### Step 5 — Locate the wow moment in the object's own physics

Not in an effect library. Ask what the object physically does, then make the *interface*
perform it.

> *The headline is inside the scabbard, and you draw the blade to read it. The act of
> reading becomes the act of drawing. Scroll is a hand.*

### Step 6 — Write why it cannot be transplanted

A mandatory paragraph. If you cannot write it, the concept is generic.

> *It requires a long, straight, mirror-polished object that lives in a sheath, photographed
> at 20 MP with its own scabbard in the same light, and a sentence that is about that
> object. A watch, a car, a perfume, a shoe cannot be drawn from anything. The scale and the
> sentence are the lock.*

### Step 7 — Name one visual signature, and make it a single element

Not the hero object — a graphic primitive that recurs and always has a job.

> *The signature is not the sword. It is **the edge**: one white hairline that is in turn the
> blade's edge, the progress line, the dimension line, the timeline, the route on the globe,
> the shelf the collection lies on, and the line that closes the page. One line, always the
> same line, always doing a job.*

Give it a coherence test you can apply per screen:

> *Any screen may contain at most one draw, one edge line, and one tick. If a screen has two
> edges, one of them is decoration.*

### Step 8 — Take primitives from references, not surfaces

For every reference, fill four columns. The fourth column is what stops you cloning.

| Reference | Underlying idea | What we take | What we must NOT copy |
|---|---|---|---|
| a watch site that explodes into parts | the camera travels and parts name themselves | parts naming themselves along a travel | the literal explode |

### Step 9 — Write the sentence a visitor says to a friend

> *You scroll and a real sword is pulled out of its scabbard across the whole site — the
> blade turns into the timeline, the map, the menu, everything.*

If you cannot write that sentence, you do not have a concept yet.

### Step 10 — Score it and publish its weaknesses

Score across criteria that matter — originality, brand specificity, emotional impact,
storytelling, motion potential, product presentation, usability, mobile, performance,
memorability — then state **the three biggest remaining weaknesses and the fix for each**.
Publishing the weaknesses is what makes the rest credible. Often the honest closing is:
*none of these is a flaw in the concept; all three are inputs we still need.*

---

## 2. Test the direction before building

- **Template test.** Swap the brand in. Does it still work? The answer must be **no**.
- **Motion test.** Freeze every scene. Does the composition hold as a still? Must be **yes** —
  art direction is judged on the frozen frame, and the first frame is the poster.
- **Object test.** Remove the hero object. Does the page survive? Must be **no**.
- **Asset test.** Is it built from real client material? Must be **yes**.
- **Function test.** Does the wow moment navigate, explain or prove — or is it decoration?
- **Phone test.** What is the *equivalent composition* on a phone? Not "scaled down".
- **Honesty test.** Does anything require inventing a number, a name or a claim?
- **Reduced-motion test.** Is there still a complete site without motion?

---

## 3. The concept series: when one direction isn't enough

If a client rejects several iterations as "all the same", you have been varying execution
inside one idea. Stop iterating. Build **three or four radically different systems**, each
with its own theme, palette and signature mechanic, as separate directories served from one
dev server so they can be compared side by side.

**Force divergence deliberately.** Name the obvious seeds out loud *so they can be beaten*;
polar-oppose the incumbent direction; and change a **different primary axis** in each
concept — light vs dark, flat vs spatial, document vs cinema, abstract vs literal. Concepts
that differ only in colour are one concept in four colourways.

**Build, do not pitch.** Ship runnable prototypes, because scroll feel is exactly what a
static comp cannot convey. One screen at real fidelity is enough to choose.

**Score multiplicatively.** Rate each on distinctiveness, brand authenticity, emotional
impact, usability, feasibility-with-our-assets and client fit, then multiply. Multiplication
punishes any single weakness, which is what you want. Expect the honest result to be *none
wins alone*.

**Write where each one breaks**, before choosing:

> *A breaks when the visitor asks "so what moves?" · B breaks when the travel is empty ·
> C breaks on the facts.*

**Then hybridise into a fourth.** The winner is usually synthesised: take B's world, draw it
with A's grammar, and let C's content arrive as a consequence rather than as its own system.

A worked example of genuinely divergent concepts for one heritage manufacturer:

| Concept | Theme | Signature mechanic | Tech |
|---|---|---|---|
| The Pattern Book | Light, draughtsman, patent drawing | Line art self-draws then morphs into the real photograph; the cursor is a lens showing steel through paper | CSS masks |
| The Armoury Atlas | Spatial, exploratory, cream | Photoreal globe; objects fly great-circle arcs from the factory and plant themselves at each customer nation | three.js |
| The Papers | Warm archival documentary | Manila folder, stamps, tape, pinned photographs; history told as documents | No WebGL |
| Damascus | Abstract art-editorial | Full-screen liquid-metal shader graded by scroll; a particle wordmark assembling from grain | GLSL |

**The exit condition matters as much as the method.** A concept series is a *divergence
phase*. The moment the client starts comparing new work unfavourably to an earlier build,
they have bonded with a lineage — stop generating concepts and deepen that one instead.
Continuing to diverge past that point reads as regression, and it will be called that.

---

## 4. The structure of the chosen build

Plan the page as a sequence of *beats*, each with one job and one mechanism. Anything
without a job gets cut. Scene logic beats page hierarchy: each section has an entrance, a
hold, and an exit.

| Beat | Job | Mechanism |
|---|---|---|
| Gate | Convert loading into arrival | Real footage, a progress counter in the client's vocabulary, a dissolve on enter |
| Hero | The wow moment; state what they make | The signature mechanic; doubles as navigation |
| Proof | Make the claim credible | Real numbers, real photographs, sourced |
| Process | Show the transformation | Film or sequence, one idea per section |
| Record | Establish continuity | A timeline; horizontal if the story is a progression |
| Range | Show what can be bought or commissioned | A filterable register |
| Approach | Convert | One clear route, no fake forms |

One mechanism per beat. When two beats want the same mechanism, one of them is redundant.
Prefer **six sections that are true over nine that are padded**.

---

## 5. Write the principles and the prohibitions before any code

Two short documents, both of which pay for themselves:

**The principles** — five to seven lines that settle future arguments. The most load-bearing
one from this project: *measure, don't decorate — every line, label, tick and number carries
a true value or a true name.*

**The what-must-NOT-be-built list** — explicit, so that good ideas that are wrong for this
project stop coming back. A real one included: a 3D scene standing in for photographs; a
material shader without photographed maps; a second smooth-scroll layer over the engine's
own inertia; scroll-jacking on text pages; particles, floating dust, breathing UI, gradient
glows, magnetic buttons, liquid distortion; per-letter typewriter effects; a loading screen
where the first frame is already the object; invented specifications; sound unless asked.

---

## 6. Presenting the direction

Present reasoning *before* the build, in this order, on one page. Clients approve reasoning;
they only critique pixels.

1. What they sell, and who arrives.
2. What every competitor is doing — and therefore what we will not do.
3. References, with mechanisms named and the do-not-copy column filled.
4. **The one moment**, in a sentence, with what it is built from.
5. The system: palette source, type, vernacular, the signature element.
6. What we need from them: shots, facts, decisions.

If it needs more than a page to justify, it is not simple enough to survive.

---

## 7. When a build is rejected

Diagnose before rebuilding — the causes need different responses.

| Verdict | Real cause | Response |
|---|---|---|
| "Looks AI / generic" | System problem | Rebuild palette and chrome from their own material (`anti-generic.md`) |
| "Boring / no wow" | Mechanism problem | One strong scroll-driven scene, not many small animations |
| "Doesn't feel like us" | Vernacular problem | Rebuild navigation and metadata from their document culture |
| "All the same" | Lineage problem | Concept series (§3) — vary the system, not the palette |
| "Worse than the old one" | Perceived-effort problem | A beautiful concept with quiet stations loses to visible choreography |
| "What does this mean?" | Legibility problem | If they have to ask what an abstract element signifies, remove it |
| "Looks like a toy" | Fidelity problem | Real photographed objects, or draw it as a line. Never low-fidelity 3D standing in for a product |

That second-to-last row is worth internalising: **concept quality and perceived effort are
different axes**, and clients pay attention to the second one. A restrained masterpiece can
lose to a busier build. The fix is not to abandon restraint but to make the restraint
*visible* — directed stillness inside a dense, drawn system, rather than emptiness.

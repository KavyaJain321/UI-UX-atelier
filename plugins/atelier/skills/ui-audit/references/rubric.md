# The audit rubric

The fixed shape of a UI audit report. Fixed on purpose: two audits of the same repo months
apart should be comparable line for line, and a reader who has seen one should know where to
look in the next.

---

## Severity

Rank every finding. The order of the report is the order of consequence, not the order of
discovery, and not the order of how easy things are to fix.

| Level | Meaning | Test |
|---|---|---|
| **Broken** | It fails for some users right now | Keyboard cannot reach it, contrast fails, it overflows, it crashes, the form does nothing |
| **Structural** | The architecture is against you | No token system, or one that exists and is bypassed; a composition that scaling cannot fix; motion carrying the layout |
| **Generic** | Nothing here is specific to this client | The convergence tells; a hero that would suit any brand |
| **Missing** | The absence is the problem | No reduced-motion design, no empty states, no focus styles, no frozen-frame integrity |
| **Note** | Worth knowing, cheap to fix | Dead CSS, unreferenced assets, stale copy |

A finding with no severity is an opinion. Give every one a level and a location.

---

## Required sections

1. **What this is** — repo, commit or branch, URL audited, viewports, date, and **what was
   not audited**. Name the gap immediately: no dev server, a page behind a login, a flow you
   could not reach.
2. **What works** — genuine strengths, specific and located. Never skip this and never pad
   it. If a strength is load-bearing for the redesign, say so.
3. **Headline findings** — at most five, ranked by consequence, each with the measurement
   under it. This is the section most people will read.
4. **Composition** — painted ink per viewport, subject coverage, empty bands, the frozen
   frame. Compare viewports against each other; the comparison is usually the finding.
5. **Design system** — tokens declared vs used; distinct colour, type, spacing, radius
   values; whether the system is real or nominal.
6. **Typography** — families, how they load, the rendered scale, whether a scale exists.
7. **Motion** — inventory, what drives it, what is composited, what runs at rest, reduced
   motion.
8. **Accessibility** — measured markup facts and the runtime checks; separate confirmed from
   "verify by tabbing".
9. **Performance** — idle cost, layout-triggering animation, asset weight, what repaints.
10. **Convergence** — the tells, with counts, and an honest judgement about whether each is a
    default or a decision.
11. **Verify manually** — every open question from both scripts, verbatim. Do not quietly
    drop the ones that would have been findings.
12. **Recommendations** — directions and constraints, ranked, with the first thing to do
    next. No hex values, no redesign.

---

## The four tests

Run each named concept, section or interaction through these. They come from a project where
roughly fifty design proposals were rejected before one was approved, and each one caught a
different failure.

**The template test.** Swap the client's name and logo for a competitor's. Does the concept
still work unchanged? If yes it is a template however polished, and the audit should say so
plainly.

**The motion test.** Freeze every animation — you have the capture. Does the composition
hold? If the page needs movement to look composed, the movement is doing the design's job
and the still frame is what most people actually see.

**The object test.** Remove the product, the photograph, the actual subject. Is the concept
essentially unchanged? Then the design is not about what this company makes.

**The asset test.** Does the work use the material this client actually owns — their
photography, their documents, their measurements — or interchangeable stock and iconography?

Report the result of each as pass, partial or fail, and **name the weakest concept rather
than defending it**. An audit that admits its own soft spot is trusted on everything else.

---

## Writing rules

- **Facts before judgements**, in that order, in the same paragraph. The reader can reject
  your conclusion without doubting your evidence.
- **Locate everything.** File and line, or element and viewport. A finding nobody can find
  is a finding nobody will fix.
- **Quantities, not adjectives.** Not "lots of colours" — "44 distinct hex values, 97 of them
  outside a token declaration".
- **One sentence per finding before the detail.** People read the first sentence of each.
- **No praise sandwich.** Strengths in their own section, findings in theirs.
- **Do not moralise.** Nobody chose to ship an inaccessible button; they ran out of time.
- **Say what would change your mind.** For any judgement resting on thin evidence, name the
  thing that would settle it.

---

## Comparing over time

When re-auditing, keep the previous `source.json` and `runtime.json` and lead with the
deltas: distinct spacing values, convergence score, idle cost, painted ink, tokens declared
versus used. Movement in those five numbers is the clearest evidence that a redesign
actually changed the thing it claimed to change — and the clearest evidence when it did not.

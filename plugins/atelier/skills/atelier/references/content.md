# Content: copy, facts, and the refusal to invent

A beautiful page carrying an invented statistic is a liability, not a deliverable. This is
the part of the work where a language model is most dangerous, because plausible copy is
exactly what it produces by default. The discipline below exists to make that impossible
rather than merely discouraged.

---

## 1. The premise that sets the voice

> *The brand doesn't need to claim authority — it has eighty-three years and a client list.
> The copy's job is to get out of the way of that evidence.*

Find the equivalent sentence for your client. Once you have it, the voice follows: shorter
sentences, fewer superlatives, more specific nouns.

**Concrete moves**

- **Replace adjectives with evidence.** Not *"premium quality"* but *"ordered by defence
  ministries who expect them to outlast a career."*
- **Convert brochure claims into falsifiable specifics.** *"Reliable delivery"* becomes
  *"to date, no missed production deadline."* If it cannot be made falsifiable, it is not a
  claim, it is filler — cut it.
- **End on a hard, plain sentence.** *"We don't interpret history. We measure it."* ·
  *"Nothing here is a toy."*
- **Treat credits as evidence, not decoration.** Named people, named regiments, named years.
- **Structure data as tables**, not paragraphs. Facts, milestones and service lines want
  columns.
- **Keep a load-bearing existing line.** If the client already has an epigraph or a founding
  quote that works, keep it. Replacing heritage prose with new marketing copy is a downgrade
  that is easy to make by accident.

---

## 2. Fact discipline

State the rule at the top of the research document and then hold to it:

> *Every brand fact below is traced to the project's source documents. Anything not
> traceable is marked `[ASSUMPTION]` or `[CLIENT DECISION]`.*

Then produce an explicit two-column audit — **what is verified, what is invented**:

- **Verified** — each fact with its source.
- **Invented in the current build; must be removed or re-sourced** — item by item, with the
  reason. Real examples: dossier copy fabricated for fourteen of eighteen entries; a
  statistic that conflated two categories; specifications with no origin (*"fittings poured
  at 1500 °C"*, *"blade 22 mm"*) — *either measure a real piece or drop the numbers*;
  product names that were plausible readings of photographs rather than catalogue data,
  which must be marked provisional.
- **Still needed from the client** — so that gaps become requests instead of inventions.

That third list is the important one. A gap you have written down is a question; a gap you
have filled is a fabrication.

---

## 3. The rules about numbers

These transfer to every project and are the strongest part of this method.

**Unverified means undrawn.** If a number is not verified, it is not rendered. Elevate this
to a design principle: *every line, label, tick and number carries a true value or a true
name.*

**Make the build refuse.** Put the honesty in code, not in review:

```js
// data entries carry their own provenance
{ year: 1943, claim: 'Registered', source: 'company-history.pdf p.2', verified: true }

// the renderer will not draw what is not verified
const facts = DATA.filter(d => d.verified);
```

A reviewer forgets. A filter does not.

**Derive anything time-dependent at runtime.** Compute "83 years" from the founding year so
it cannot go stale. Sites drift to a wrong number the moment a year turns.

**Resolve to a single anchor date.** Where sources conflict, pick one, correct it everywhere,
and record the correction as an editorial fix.

**Blank beats invented.** Design the register so it is beautiful with empty columns —
otherwise the layout itself will pressure someone into filling them. *"Every entry has no
invented field"* is a good exit test.

**Correct claims downward.** When the evidence is thinner than the copy, change the copy.

**Disclose designed treatments on the page.** If an inscription was composited onto a
photograph for the sheet, say so in the caption: *"unmarked blade · inscription set for the
sheet."* Disclosure costs a line and buys the credibility of everything around it.

**Label borrowed imagery.** Interim images from a catalogue or a third party get a visible
tag — *"Catalogue plate"* — on the card and in any detail view, with source and licence
recorded per row, so nobody mistakes it for the client's own photography.

---

## 4. No fake affordances

- **No fake forms.** Until a real endpoint exists, ship a real alternative: a copy-the-brief
  button, a mail link to a confirmed address, a phone number that has been verified.
- **No invented contact details.** Not an email, not an address, not a name.
- **No `#` buttons.** A control that does nothing is a defect. Either wire it or remove it.
- **No placeholder testimonials**, not even "for layout".
- **No prices or cart** until commerce is confirmed to exist.

Anything shipped as a placeholder will eventually be seen by the client's customer.

---

## 5. Recording the gaps

When content runs out before the design does, the correct move is to record the gap,
unblock yourself with something honest and labelled, and hand the client a request.

A **shoot list** or **content list** document, structured:

- What exists versus what is documented but not yet produced, with counts.
- Where the interim material comes from, per source, with licence and attribution, and which
  to replace first.
- A numbered table: `# | id | item | interim source | what is needed`.
- **How to produce it so it matches** — same backdrop, same lighting, same camera distance,
  same orientation convention, so new material drops into the existing set invisibly.
- A closing list of everything else still owed.

This converts an awkward conversation into a task list the client can act on.

---

## 6. The copy artefact

Produce a standalone editorial document early and treat it as authoritative — *use verbatim
where it provides copy*. Per page it should carry the title tag, meta description, hero
lines, rewritten blocks, corrected tables, and two closing sections:

- **Editorial fixes bundled into this rewrite** — numbered, each stating what changed and why.
- **Not addressed here; belongs to a technical pass** — so scope stays clean.

Having one authoritative source of words prevents the slow drift where three pages describe
the same company differently.

---

## 7. Accessibility of language

- Expand an uncommon acronym on first use.
- Write link text that means something out of context. *"The 1943 contract"*, not *"read more"*.
- Give every image a real `alt`, or an empty `alt=""` if it is genuinely decorative. Never
  describe a decorative texture to a screen reader.
- Keep sentences short enough to be read aloud without losing the thread.
- Never rely on colour alone to carry meaning; pair it with a label, a shape, or a position.

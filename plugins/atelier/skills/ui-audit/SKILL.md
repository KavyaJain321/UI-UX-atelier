---
name: ui-audit
description: >
  Deep UI/UX audit of a codebase you have checked out - the repository's own source AND the
  page it renders. Use this when the request is to analyse, audit, review, critique or
  "look at" an existing interface rather than to build one: "audit this UI", "review the
  UX of this repo", "what's wrong with our design system", "why does this look generic",
  "find the accessibility problems", "is our token system actually used", "why does this
  feel slow / cheap / unfinished", or before a redesign so the rebuild starts from evidence.
  Also use it to compare a branch against main, or to produce a written design review for a
  client or a team. It measures first and judges second: a static pass over the source and a
  real-Chrome pass over the running page, then a fixed-format report. Prefer this over
  reading files and giving an opinion, because an opinion about a UI that nobody measured is
  the thing this skill exists to replace. For designing or building the interface rather
  than assessing it, use the `atelier` skill instead.
---

# UI audit

A repeatable, evidence-first review of an interface that already exists in a repository.

The failure this skill prevents is the confident design opinion with nothing under it.
"The hero feels thin", "the spacing is inconsistent", "it looks a bit generic" are all
unfalsifiable, so nobody can act on them and nobody can check them later. The same three
observations as **"the subject is 7.4% of the viewport with a 34.9% dead band"**, **"121
distinct margin values against a 9-step scale"**, and **"18 gradient-text declarations and
6 full-viewport heroes"** are findings: specific, checkable, and comparable to the same
numbers next month.

So: **measure, then look, then judge — in that order, and never skip the middle one.**

---

## The three passes

Run both scripts before forming any opinion. They take about a minute together and they
see different things. All paths below are relative to this skill's directory; call them
with its full path. Node 22+ (the runtime script uses the global `WebSocket`) and a local
Chrome. No dependencies, nothing to install.

### Pass 1 — source

```bash
node scripts/audit-source.mjs /path/to/repo --out ./audit
```

Reads the repository. Writes `audit/source.md` and `audit/source.json`.

Reports the stack and how motion libraries were actually detected (dependency, source, or a
vendored file — a buildless site that vendors GSAP has no `package.json` entry); whether a
token system exists and whether anyone obeys it; distinct colour, type, spacing and radius
values; CSS health; what animates and whether any of it is layout-triggering; markup-level
accessibility; asset weight and apparently unreferenced media; and a **convergence score**
counting the mechanical signatures of a design made without looking at this client.

### Pass 2 — runtime

```bash
node scripts/audit-runtime.mjs http://localhost:3000 --out ./audit --wait 12000
```

Drives real Chrome at three viewports. Writes `audit/runtime.md`, `audit/runtime.json` and
two captures per viewport. It measures the four things source cannot show:

- **Composition.** The subject element, and the true **painted-pixel coverage** of the
  viewport, decoded from the screenshot rather than inferred from bounding boxes — a
  full-bleed transparent overlay defeats every box-based measurement. Plus the ink box and
  the largest empty band.
- **The frozen frame.** A second capture with every animation and transition disabled.
- **Idle cost.** Layouts, style recalcs, rAF callbacks and main-thread seconds per second
  while nobody touches the page.
- **Motion at rest.** What is still running once it has settled, and what loops forever.

Raise `--wait` above any intro sequence, or the idle window measures the intro; the report
warns you when that happened. Add `--dismiss` for cookie overlays (it hides them, it never
accepts them). If the project has no dev server, say so in the report and run source only —
half an audit that says which half is better than a whole one that guesses.

For palette, type inventory, asset weights, contrast and tap targets on a live URL, also
run the `atelier` skill's `scripts/audit.mjs`. This skill deliberately does not repeat it.

### Pass 3 — judgement

**Open the captures.** Every one, at every viewport, live and frozen. This is not optional
and it is where the real findings come from: numbers tell you *where* to look, images tell
you *what is wrong*. An audit written without opening the screenshots will be fluent and
wrong.

Then write the report against `references/rubric.md`, which fixes the sections and the
tests so two audits are comparable.

---

## The rules that keep it honest

1. **Never assert what was not measured.** Both scripts emit a `verify` list of everything a
   regex or a probe could not settle — dynamically composed class names, media that might
   be referenced at runtime, contrast over an image. Carry those into the report as open
   questions, not as findings. A count that inflates destroys the whole document's
   credibility; a short report that is entirely true survives review.
2. **Separate fact from judgement in the writing.** "121 distinct spacing values" is a fact.
   "There is no spacing system" is a judgement that follows from it. Keep them in that
   order and the reader can disagree with the second without doubting the first.
3. **Lead with what works.** A critique that names a genuine strength first is the one that
   gets acted on. There is always something.
4. **Rank by consequence, not by ease.** The first finding should be the one that changes
   what the team does next, even if it is expensive.
5. **Name your least-confident finding** rather than burying it. Credibility comes from the
   thing you admit, not from the length of the list.
6. **Do not redesign in the audit.** Recommendations are directions and constraints. The
   moment you start proposing hex values you have stopped auditing — that is `atelier`'s job
   and it needs approval first.

---

## Reading the numbers

| Signal | What it usually means |
|---|---|
| Painted ink under ~10% with a large empty band | A composition problem, not a scale problem. Compare across viewports before concluding: a subject that is 40% on a phone and 7% on desktop has a *desktop* problem, and making it bigger will not fix it. |
| Frozen capture collapses | Motion was doing the design's job. The still frame is what a thumbnail, a shared link and a skimming reader get. |
| Idle cost above ~200 layouts/s | Something animates that nobody asked for. A page at rest should cost nothing. |
| Distinct spacing values far above the scale's steps | The token system exists on paper only. |
| Custom properties declared ≫ used | A system that was designed and then bypassed. |
| High convergence score | The source carries the tells of a design produced without looking at this client. Report the count; the judgement about whether it matters is the reader's. |
| Layout-triggering animated properties | `width`, `top`, `height` cannot be composited; this is measurable jank. |
| `outline:none` with no `:focus-visible` | Keyboard users have no visible focus. Confirm by tabbing before reporting it. |

Two cautions. A high convergence score is not automatically a fault — a Tailwind project
will register `rounded-lg` honestly, and a deliberate choice looks identical to a default
from the outside. Say which it is only if the surrounding evidence supports it. And an
empty band is only a fault if something was meant to be there; a drafting sheet is mostly
empty on purpose.

---

## Output

Write the report to `docs/UI_AUDIT.md` in the audited repository unless the user names
somewhere else, and keep the scratch outputs (`audit/`) out of the repo. Structure and the
anti-generic tests are in `references/rubric.md`.

| File | Use |
|---|---|
| `scripts/audit-source.mjs` | Static pass over the repository |
| `scripts/audit-runtime.mjs` | Real-Chrome pass: composition, frozen frame, idle cost, motion at rest |
| `references/rubric.md` | The report's fixed sections, the four tests, and the severity scale |

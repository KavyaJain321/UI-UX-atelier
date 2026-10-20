# Atelier

A Claude Code plugin with two skills:

- **`atelier`** — a research-led method for building websites that a client will not call
  generic, plus the means to act on a review: a **fix mode** that reads a repository and
  repairs its UI/UX problems, and a **palette tournament** in which independent agents
  propose palettes, each is tried on the running site, and blind judges pick. Distilled from
  a fourteen-day heritage-manufacturer build that went through roughly fifty recorded
  rejections before it was approved.
- **`ui-audit`** — an evidence-first UI/UX auditor. It measures an interface before anyone
  forms an opinion about it: a static pass over the repository, a real-Chrome pass over the
  running page, then a report against a fixed rubric.

They are separate on purpose. Building and assessing trigger on different requests, and one
oversized skill triggers reliably on neither.

## Install

Once per machine. Works in every repository afterwards — nothing is copied into your
projects.

```
/plugin marketplace add KavyaJain321/UI-UX-atelier
/plugin install atelier@atelier
```

Update later with `/plugin marketplace update atelier`.

## Use

Both skills load themselves when the request matches. You can also ask for them by name, or
run the audit directly:

```
/ui-audit                          # audits the current repo (source pass only if no server)
/ui-audit http://localhost:3000    # source pass + runtime pass
```

Requests that change things go to `atelier`:

```
Read this repo, find the UI/UX issues and fix them. Fix the objective ones directly,
show me a plan for the systemic ones, and list the taste calls. Don't deploy.

Run a palette tournament on this project and apply the winner.
```

The scripts can be run on their own:

```bash
node plugins/atelier/skills/ui-audit/scripts/audit-source.mjs  /path/to/repo --out ./audit
node plugins/atelier/skills/ui-audit/scripts/audit-runtime.mjs http://localhost:3000 --out ./audit --wait 12000
node plugins/atelier/skills/atelier/scripts/audit.mjs          https://example.com --out ./audit
node plugins/atelier/skills/atelier/scripts/scan.mjs           /path/to/repo --out ./scan
node plugins/atelier/skills/atelier/scripts/contrast.mjs       "#6e6764" "#000" --fix 4.5
node plugins/atelier/skills/atelier/scripts/palette-lab.mjs    http://localhost:3000 --candidates ./candidates --out ./lab
node plugins/atelier/skills/atelier/scripts/tally.mjs          ./lab ./lab/judges/*.json
```

## What the audit actually measures

**Source** — stack and how motion libraries were really detected (dependency, source, or a
vendored file, so a buildless site that vendors GSAP is not reported as having no motion);
whether a token system exists and whether anyone obeys it; distinct colour, type, spacing
and radius values; CSS health; layout-triggering animation; markup-level accessibility;
asset weight and apparently unreferenced media; and a convergence score counting the
mechanical signatures of a design made without looking at the client.

**Runtime** — the four things source cannot show:

- **Painted-pixel composition**, decoded from the screenshot rather than inferred from
  bounding boxes, because a full-bleed transparent overlay defeats every box-based
  measurement. Reports subject coverage, the ink box and the largest empty band.
- **A frozen frame** with every animation disabled — if the composition collapses, motion
  was doing the design's job.
- **Idle cost** — layouts, style recalcs, rAF callbacks and main-thread seconds per second
  while nobody touches the page.
- **Motion at rest** — what is still running, and what loops forever.

Everything a regex or a probe cannot settle safely is emitted under `verify` rather than as
a finding. A count that inflates is worse than no count.

### Validated against a known result

Run against a site whose composition had already been measured by hand over several weeks,
the runtime pass independently reproduced both headline findings: **7.4% painted ink with a
34.9% dead band on desktop**, against **8.6% ink and a 2.8% band on the phone** — the same
conclusion that the phone composition was the stronger one — and an idle cost of exactly
zero layouts, zero recalcs and zero animation frames.

## Fix mode and the palette tournament

**Fix mode** reads the repository (stack, every colour token and how often it is really used,
dead tokens, hardcoded colours split into near-duplicates of a token, translucent tints and
genuinely off-system values, and source smells with file and line), runs the site to take a
*before* record, then sorts every problem into three lanes. Objective problems — contrast,
focus rings, dead controls, tap targets, overflow, `100vh`, ungated hover — are fixed
directly, at the token rather than the instance. Systemic ones get a short plan, then the fix.
Taste — palette, type, layout, copy — is proposed and the person decides. It works on a branch,
re-runs the same measurements afterwards, and never deploys.

**The palette tournament** exists because one model writing five palettes in one breath writes
five variations of one idea. Four or five generator agents each derive a palette from a
different source (the current palette repaired, the client's own photography, a theme family,
the category's opposite). `palette-lab.mjs` applies each one to the running site without
editing a file — converting values to the project's own variable format — and freezes every
video and animation on the same frame, so renders differ only in colour. Three judges with
different lenses rank them blind, from letters and measured contrast alone; `tally.mjs`
combines the rankings and un-blinds the result.

Run end to end on a real production site, the four generators produced four genuinely
different palettes, all three judges independently chose the same one, and the result held
when re-judged after the renders were made fully deterministic. The run also surfaced a real
defect the site had shipped with — button text on the accent fill at 3.93:1 — which the
generator brief now checks for explicitly.

## Requirements

Node 22+ (the runtime script uses the global `WebSocket`) and a local Chrome. Set
`CHROME_PATH` if it is somewhere unusual. `palette.py` in the `atelier` skill needs Pillow
and numpy; nothing else has a dependency.

## Layout

```
.claude-plugin/marketplace.json      makes this repo installable
plugins/atelier/
  .claude-plugin/plugin.json
  commands/ui-audit.md               /ui-audit
  skills/atelier/                    the build doctrine, fix mode, palette tournament —
                                     15 references, 7 scripts
  skills/ui-audit/                   the auditor — 2 scripts, 1 rubric
```

## Note on the personal copy

If you already have `atelier` in `~/.claude/skills/`, remove it after installing the plugin
so the same skill is not loaded twice.

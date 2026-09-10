# Atelier

A Claude Code plugin with two skills:

- **`atelier`** — a research-led method for building websites that a client will not call
  generic. Distilled from a fourteen-day heritage-manufacturer build that went through
  roughly fifty recorded rejections before it was approved.
- **`ui-audit`** — an evidence-first UI/UX auditor. It measures an interface before anyone
  forms an opinion about it: a static pass over the repository, a real-Chrome pass over the
  running page, then a report against a fixed rubric.

They are separate on purpose. Building and assessing trigger on different requests, and one
oversized skill triggers reliably on neither.

## Install

Once per machine. Works in every repository afterwards — nothing is copied into your
projects.

```
/plugin marketplace add <your-github-user>/atelier
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

The scripts can be run on their own:

```bash
node plugins/atelier/skills/ui-audit/scripts/audit-source.mjs  /path/to/repo --out ./audit
node plugins/atelier/skills/ui-audit/scripts/audit-runtime.mjs http://localhost:3000 --out ./audit --wait 12000
node plugins/atelier/skills/atelier/scripts/audit.mjs          https://example.com --out ./audit
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
  skills/atelier/                    the build doctrine — 13 references, 3 scripts
  skills/ui-audit/                   the auditor — 2 scripts, 1 rubric
```

## Note on the personal copy

If you already have `atelier` in `~/.claude/skills/`, remove it after installing the plugin
so the same skill is not loaded twice.

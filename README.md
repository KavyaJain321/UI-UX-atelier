# Atelier

**UI/UX design skills for Claude Code.** Atelier teaches Claude to audit, fix, recolour and build
websites the way a careful designer would. It measures before it judges, takes colours and
layouts from what the client actually makes, and verifies the result in a real browser.

It is a Claude Code plugin containing two skills and one command:

| | What it does | When it runs |
|---|---|---|
| **`atelier`** skill | Builds, redesigns and **fixes** interfaces; runs the **palette tournament** | Any request to build, change, fix or recolour a site |
| **`ui-audit`** skill | Measures an existing interface and writes a ranked, evidence-based report. It changes nothing | Any request to audit, review or critique a UI |
| **`/ui-audit`** command | Runs a full audit of the current repository in one step | When you type it |

---

## Why it exists

Ask an AI model to "make a nice website" and you get the same site everyone else gets: dark
background, glowing accent, gradient headline, three feature cards, a centred nav with a pill
button. Clients recognise it instantly and call it "AI-made". The problem isn't ugliness.
It's **convergence**: a page that could have been made without ever looking at this
particular business.

Atelier is the counter-method. It was distilled from a fourteen-day build for a heritage
manufacturer that went through about fifty recorded client rejections before approval, and
every rule in it exists because something specific failed without it. In short:

- **Measure first.** Opinions about a UI nobody measured are replaced by numbers with a file
  and line, or a screenshot, behind them.
- **Derive, don't invent.** Palettes come from a real artefact (the client's photos,
  packaging, reference image), never from a "mood".
- **One idea, done properly.** One signature moment and two or three motions, not fifty
  effects.
- **Honest content.** No invented statistics, testimonials, contact details or `#` buttons.
- **Verify on a real browser and a real phone**, because emulators lie.

---

## Capabilities

### 1. Audit an interface: `ui-audit`

An evidence-first review of a repository and the page it renders. Three passes:

- **Source pass:** reads the code. Reports the stack and the motion libraries really in use,
  whether a design-token system exists and whether anyone follows it, how many distinct
  colours, font sizes, spacings and radii are in use, layout-triggering animation,
  markup-level accessibility, asset weight, unreferenced media, and a *convergence score*
  counting the mechanical signatures of a templated design.
- **Runtime pass:** drives real Chrome at three viewports and measures what code can't show:
  - **Composition**, from painted pixels: how much of the screen the subject fills, and the
    largest empty band.
  - **A frozen frame** with all motion disabled, to show whether the layout holds without
    animation.
  - **Idle cost**: layouts, style recalculations and animation frames while nobody touches
    the page.
  - **What keeps moving** after the page settles.
- **Judgement:** Claude opens every capture and writes `docs/UI_AUDIT.md` against a fixed
  rubric, so audits months apart are comparable:
  - findings ranked Broken / Structural / Generic / Missing / Note;
  - what works, stated first;
  - four anti-generic tests (template, motion, object, asset);
  - a "verify manually" list for anything a script could not settle.

It never edits code and never proposes a redesign. That's `atelier`'s job, after your
approval.

### 2. Find and fix UI/UX problems: `atelier` fix mode

Point Claude at a repository and it repairs the problems instead of just listing them.

1. **Safety net:** checks `git status`, works on a branch, never deploys, never installs
   anything without asking.
2. **Reads the source** with `scan.mjs`:
   - every colour token, where it is defined, and how often it is really used;
   - dead tokens nobody references;
   - hardcoded colours, split into duplicates of a token, translucent tints, and genuinely
     off-system values;
   - smells such as removed focus rings, ungated hover, `transition: all`, missing alt text,
     dead links, disabled zoom and `100vh` traps, each with file and line.
3. **Runs the site** and records a *before* measurement.
4. **Sorts every problem into three lanes:**
   - **Objective:** fixed directly. Contrast, focus rings, tap targets, overflow, dead
     controls, alt text, reduced motion. Contrast is fixed at the token, not the instance:
     `contrast.mjs --fix` changes only lightness, so a colour still reads as itself.
   - **Systemic:** a short plan first, then the fix. Hardcoded colours routed through tokens,
     twenty font sizes consolidated into a scale.
   - **Taste:** proposed, and you decide. Palette, typefaces, layout, copy.
5. **Verifies:** runs the project's build, lint and tests, re-runs the same measurements, and
   reports before and after. Nothing may get worse.

### 3. Choose colours properly: the palette tournament

One model writing five palettes in one go writes five versions of one idea. So the
tournament keeps generating and judging separate:

1. **Four or five generator agents** each derive one palette from a different source:
   - your current palette, repaired;
   - your own photography or brand material;
   - a design family that suits the business;
   - the opposite of what every competitor does;
   - optionally, one wildcard.
2. **`palette-lab.mjs`** applies each palette to your **running site without editing a
   file**. It converts values into your project's own variable format and freezes every
   video and animation on the same frame, so the renders differ only in colour.
3. **Three blind judges**, each with a different lens (does it belong to this business? is
   it usable? does it look generated?), rank the options seeing only letters, screenshots and
   measured contrast.
4. **`tally.mjs`** combines the rankings and reveals the winner. Keeping your current palette
   is a valid outcome.
5. The winner is applied to your tokens if you asked for new colours. Otherwise you get a
   side-by-side contact sheet and choose.

### 4. Build or redesign a site: the `atelier` method

For new work, Atelier gives Claude a full design process, loading each part only when
needed:

- **Research:** competitors (and what they all share, so you can avoid it), peers from
  outside your category, award sites studied for how they work and how they are judged.
- **Direction:** a ten-step method for finding the one idea that belongs to this business
  and could not be copied by a competitor. Includes a "concept series" for when every option
  looks the same, and when to stop.
- **Design system:** tokens, colour, a fluid type scale, spacing, states, and a style-lab
  page.
- **15 aesthetic families** with full recipes, from editorial and technical drawing to
  gallery, luxury, terminal, signage and data-dense.
- **Motion:** timing and easing rules, three repeated motions, a real reduced-motion design,
  and working code for scroll scenes, gates, reveals, light effects and 3D.
- **Mobile as its own composition**, including a known Android zoom-out bug and its fix.
- **Assets and content:** footage and photo pipelines, briefs for generated media, and a
  strict refusal to invent facts.
- **Critique and QA:** a ten-question self-attack before showing work, and a real-Chrome
  test harness.

### Guardrails, in every mode

- Never deploys or pushes without an explicit instruction.
- Never clicks Accept on a cookie banner. It can hide one for a screenshot.
- Asks before applying taste changes you didn't request.
- Reports anything it couldn't measure as "verify manually" instead of guessing.
- Says what it did not test, including whether a real phone was used.

---

## Install

Once per machine, inside Claude Code:

```
/plugin marketplace add KavyaJain321/UI-UX-atelier
/plugin install atelier@atelier
```

The skills then work in every project. Nothing is copied into your repositories. Update later
with:

```
/plugin marketplace update atelier
```

If you previously copied `atelier` into `~/.claude/skills/`, delete that copy so the skill
is not loaded twice.

---

## How to use it

The skills load automatically when your request matches, or you can name them. Paste any of
these into Claude Code from inside your project.

**Audit only, no changes:**

```
/ui-audit http://localhost:3000
```

**Find and fix the problems:**

```
Read this repo and find the UI/UX issues. Fix the objective ones directly, show me a plan
for the systemic ones, and list the taste calls for me to decide. Don't deploy.
```

**Change the colours:**

```
Run a palette tournament on this project: independent palettes from different sources,
tried on the running site, judged blind. Show me the contact sheet and apply the winner.
```

**Audit a competitor or any live site:**

```
Audit https://example.com, including a product page. Three-tier critique — broken, generic,
missing — and one direction for how we beat it. Don't change anything.
```

**Build something new:**

```
New landing page for <business>. They sell <what> to <whom>. Assets: <what exists>.
Do the research first and come back with a written brief before building anything.
```

**When the feedback is "it looks generic / AI-made / boring":**

```
The client says "<their exact words>". Diagnose what kind of problem that is and fix it —
don't just restyle if the problem is structural.
```

### Running the scripts yourself

Every script is dependency-free. Paths are relative to the repository root.

```bash
# audit
node plugins/atelier/skills/ui-audit/scripts/audit-source.mjs  /path/to/repo --out ./audit
node plugins/atelier/skills/ui-audit/scripts/audit-runtime.mjs http://localhost:3000 --out ./audit --wait 12000
node plugins/atelier/skills/atelier/scripts/audit.mjs          https://example.com --pages pricing --dismiss --out ./audit

# fix and colour
node plugins/atelier/skills/atelier/scripts/scan.mjs           /path/to/repo --out ./scan
node plugins/atelier/skills/atelier/scripts/contrast.mjs       "#6e6764" "#000" --fix 4.5
node plugins/atelier/skills/atelier/scripts/palette-lab.mjs    http://localhost:3000 --candidates ./candidates --out ./lab
node plugins/atelier/skills/atelier/scripts/tally.mjs          ./lab ./lab/judges/j1.json ./lab/judges/j2.json ./lab/judges/j3.json

# verify
node plugins/atelier/skills/atelier/scripts/cdp.mjs            --sweep http://localhost:3000 --mobile
python plugins/atelier/skills/atelier/scripts/palette.py       reference.jpg --n 6 --css
```

| Script | Purpose |
|---|---|
| `audit-source.mjs` | Static pass over a repo: tokens, values, motion, accessibility, convergence score |
| `audit-runtime.mjs` | Real-Chrome pass: painted composition, frozen frame, idle cost, motion at rest |
| `audit.mjs` | Live-URL evidence: palette in use, type, page weight by host, LCP/CLS/TTFB, contrast, tap targets, overflow |
| `scan.mjs` | Source scan for fixing: tokens and their usage, dead tokens, hardcoded colours by class, smells with file:line |
| `contrast.mjs` | Check WCAG contrast, or repair a colour to a target ratio by moving lightness only |
| `palette-lab.mjs` | Apply candidate palettes to the running site; named and blind contact sheets |
| `tally.mjs` | Combine blind judges' rankings and reveal the winner |
| `cdp.mjs` | Scroll a page in real Chrome and check every stop for overflow, the Android zoom bug, paused media and errors |
| `palette.py` | Extract a palette from a reference image, with a contrast matrix |

On Git Bash for Windows, pass `--pages` paths without a leading slash. The shell rewrites
`/pricing` into a Windows path before Node sees it.

---

## Requirements

| For | Needs |
|---|---|
| All `.mjs` scripts | Node 22 or later (they use Node's built-in `WebSocket`) |
| Browser scripts | A local Chrome. Set `CHROME_PATH` if it's somewhere unusual |
| `palette.py` | Python 3 with Pillow and numpy |
| Palette tournament | A Claude Code session that can start subagents (otherwise it runs the steps one after another and says so) |

---

## How it was tested

- **Audit runtime pass:** run against a site whose composition had already been measured by
  hand over several weeks, it reproduced both headline findings independently. Desktop showed
  7.4% painted ink with a 34.9% empty band; the phone showed 8.6% ink with a 2.8% band; and
  idle cost was exactly zero.
- **Palette tournament:** run end to end on a real production site. Four generators produced
  four genuinely different palettes, all three blind judges picked the same one, and the
  result held when re-judged after renders were made fully deterministic. The run also
  caught a contrast failure the site had shipped with: button text on the accent colour at
  3.93:1.
- **Live-site audit:** given only the skill, a fresh agent audited a real competitor and
  produced a client-ready report. Its critique of the skill itself drove a second round of
  fixes to the tools.

---

## Limits

- Source scans read lines of code, not a full syntax tree. Treat each finding as a pointer
  and open the file before changing anything.
- Contrast is only asserted against flat backgrounds. Text over images is listed for a human
  to check.
- Projects that compile colours away at build time need palette candidates written as CSS
  overrides, or the tournament run on a branch.
- All browser figures come from headless Chrome on a desktop. Check a real phone before
  calling anything done.

---

## Repository layout

```
.claude-plugin/marketplace.json        makes the repo installable as a plugin
plugins/atelier/
  .claude-plugin/plugin.json
  commands/ui-audit.md                 the /ui-audit command
  skills/atelier/                      build, fix, palette tournament
    SKILL.md                           the workflow (loads when the skill triggers)
    references/                        15 method files, each loaded only when a step needs it
    scripts/                           audit, scan, contrast, palette-lab, tally, cdp, palette
  skills/ui-audit/                     measurement-only audit
    SKILL.md
    references/rubric.md               the report's fixed sections, tests and severity scale
    scripts/                           audit-source, audit-runtime
```

To change the skills, edit the files under `plugins/atelier/skills/` and push. Installed
copies pick up the change after `/plugin marketplace update atelier`.

# Palette tournament: generate independently, judge blind

Use this when the request touches colour: "change the colours", "try different palettes", "the
palette looks generic", or when an audit shows an undisciplined palette. It produces several
genuinely different palettes, tries each on the real running site, has independent judges rank
them without knowing which is which, and only then changes the code.

**Why agents, and why two kinds.** One model writing five palettes in one breath produces five
variations of one idea; that is the "all your options look the same" failure from
`direction.md`, in colour. Separate generator agents, each with a different *source* brief,
diverge. Judges must be separate from generators and blind to the labels, or the author grades
its own work and the baseline gets either favoured or punished for being familiar.

Budget: four or five generators and three judges. More rarely changes the outcome.

---

## 0. Preconditions

1. **The site runs locally** and you have its URL. See `fix.md` §2.
2. **Run the source scan** so you know the real variable names and their format:

   ```bash
   node scripts/scan.mjs <project-dir> --out <scratch>/scan
   ```

3. **There must be tokens.** If the scan reports no colour tokens, a palette change is a
   find-and-replace across the codebase. Introduce tokens first (`fix.md`, lane 2), then run
   the tournament.
4. **Write the role map**: the variables that actually carry the palette, their roles, and
   current values. Usually six to ten.

   ```
   ground   --bg           #000000
   surface  --surface      #141313
   ink      --text         #f5f2f0
   muted    --text-muted   #6e6764   (fails AA on ground: 3.79:1)
   edge     --border       #3e3939
   accent   --accent       #c1121f   (state: live, selected, recording)
   danger   --danger       #ff3b30   (destructive)
   ```

5. **Write the product brief**, one paragraph: what is sold, who arrives, what they must
   believe, what the business's own document culture looks like. Generators and judges both
   receive it. It is the only context judges get beyond the images.

---

## 1. Generate, in parallel, one agent per source

Spawn these at the same time with the Agent tool. Each gets the product brief, the role map,
the generator brief below, and **one** source assignment. Never give one agent two sources.

| Agent | Source | Its job |
|---|---|---|
| G1 **Faithful** | The current palette | Keep the identity and repair it: lift failing pairs to AA with `contrast.mjs --fix` (lightness only), separate colours that collide, push the extremes, de-mud the greys. Always include this one. It protects the equity the client already has, and it wins more often than you would expect. |
| G2 **Artefact** | The client's real material | Run `palette.py` on their logo, product photography, packaging or supplied reference images. Find them in the repo (`public/`, `assets/`, `static/`, `img/`) or ask. |
| G3 **Family** | `theme-library.md` | Pick the family whose *vernacular* fits the brief, then derive in that family's logic. Do not copy its example hexes. |
| G4 **Opposite** | The category | What every competitor's palette shares (from research, or a quick look at two or three), then the palette that refuses it. If there is no research, the light/dark inversion of the current system. |
| G5 **Wildcard** | Optional | One bold, bounded option that marks the edge of the space. Useful when the client says "surprise me". |

### Generator brief (paste this, then the assignment)

```
You are proposing ONE colour palette for an existing website. You will not edit any files.

Product brief: <paragraph>

Role map (these are the ONLY variables you may set, with their exact names):
<role map>

Your source: <G1/G2/G3/G4/G5 description>

Rules:
- Every colour must trace to your source. Say where each one came from.
- Three or four colours at full weight plus the neutrals they need. One accent, reserved for
  state (live, selected, progress), never a generic button fill.
- Body text on its ground must reach 4.5:1; large text and UI parts 3:1. Check every text pair
  with: node <skill>/scripts/contrast.mjs <fg> <bg> --fix 4.5
- Check text ON THE ACCENT too, not only text on the ground: button labels on an accent fill,
  badges, the active navigation state. These are the pairs most often missed, and they sit
  on the most important controls.
- Avoid the generated looks: dark + warm glow + one cool accent; purple-to-blue; a single
  accent sprinkled on black; pastel everything.
- Do not change non-colour tokens.

Return ONLY a JSON object, written to <scratch>/candidates/<id>.json:
{ "name": "<short name>", "source": "<one sentence naming where the colours came from>",
  "vars": { "<--exact-name>": "#rrggbb", ... },
  "notes": "<two sentences: the idea, and the one risk you see>" }
```

---

## 2. Render every candidate on the real site

```bash
node scripts/palette-lab.mjs <url> --candidates <scratch>/candidates --out <scratch>/lab
```

Add `--pre "<js>"` when the screen you care about needs an interaction first (opening a menu,
pressing a join button). Add `--wait` for slow single-page apps.

Read the console summary before anything else:

- **"no variable changed"** or **"undefined on page"**: the generator used the wrong names or
  the project does not expose its colours as variables at runtime. Send it back to that
  generator once with the error. If the project compiles colours away (some Tailwind setups),
  candidates need a `css` block instead, or the tournament has to run on a branch.
- **More contrast failures than the baseline**: repair with `contrast.mjs --fix` on the failing
  pair and re-render. A candidate is never disqualified for a fixable contrast miss, only for
  one that cannot be fixed without becoming a different palette.

**Then look at every render before any judge does.** The console numbers will not tell you
when part of the page ignored the swap. Codebases bypass their own tokens: gradient stops
written as literal white, a logo shipped as a white PNG, an active state hardcoded as
`background:#fff; color:#000`. On a palette that changes polarity (dark to light, or the
reverse) those bypasses make a good candidate look broken — headlines vanish, the logo
disappears — and the judges end up scoring the codebase's bugs instead of the colours.

Patch them per candidate, as the orchestrator, with the change a real implementation would
make: point the gradient at the candidate's ink, invert or swap the logo, and so on, using the
candidate's `vars` and `css` fields. Record it in an `"orchestratorPatch"` field so the person
deciding can see it. Every patch you needed is also a lane-2 fix (`fix.md`) to make before the
winner is applied, because it is a place where the design system does not reach.

Keep the palette key out of the judges' way: `palette-lab.mjs` writes `mapping.json` beside
`blind/`, never inside it.

**Every render must differ only in colour.** Anything that moves — a looping hero video, a CSS
animation — shows a different moment in each capture, and judges then score the photograph
instead of the palette. In the first real tournament two candidates differing in one grey
were judged as different because one caught a forge and the other a bayonet wall.
`palette-lab.mjs` therefore does a warm-up load, neutralises `play()` so the page cannot
restart its own media, seeks every video to the same moment, waits until that moment is
actually seekable (local static servers without HTTP range support make a video unseekable
until fully downloaded), pauses CSS animation, and renders with greyscale text anti-aliasing
(coloured sub-pixel fringes on small text were once read by a judge as "stray colours"). If a
visible video still cannot be frozen, the console says so — treat that run's comparisons as
suspect rather than reporting them.

---

## 3. Judge blind, three lenses

Spawn three judge agents in parallel. Give each **only**: the product brief, the path to
`<lab>/blind/contact.html` and the blind images, and the measured numbers per letter from
`scores.json` (letters only). Never the names, the sources, the notes, or `mapping.json`.

| Judge | Lens |
|---|---|
| J1 **Belonging** | Does this belong to this product and nobody else's? Swap test: could a competitor ship it unchanged? |
| J2 **Use** | Is the primary action obvious? Is the accent used as state? Is small text readable? Does the phone view hold? Does it survive the photography? |
| J3 **Generic** | Run the tell list in `anti-generic.md`. Does any candidate read as generated? Which shows restraint? |

### Judge brief

```
You are judging colour palettes applied to the same website. You do not know which is the
current site. Judge only what you see.

Product brief: <paragraph>
Images: <lab>/blind/  (A_desktop0.png, A_desktop1.png, A_mobile.png, B_..., ...)
Measured contrast per letter: <letter: fails/checked, worst ratio>

Your lens: <J1/J2/J3 description>

Open every image. Score each letter 1-5 on Fit, Distinctiveness, Hierarchy, Legibility and
Coherence, multiply the five scores, and rank. Then:
- name the single biggest weakness of your top pick;
- name one thing from a lower-ranked letter worth stealing, if any.

Return JSON: { "lens": "...", "ranking": ["C","A",...],
  "scores": { "A": {"fit":4,...,"product":...}, ... },
  "topWeakness": "...", "steal": { "from": "B", "what": "..." } | null,
  "verdict": "<three sentences>" }
```

---

## 4. Aggregate and, at most once, hybridise

Save each judge's JSON to a file and tally deterministically:

```bash
node scripts/tally.mjs <lab> <lab>/judges/j1.json <lab>/judges/j2.json <lab>/judges/j3.json
```

It applies a Borda count (on N candidates a first place earns N−1 points, last earns 0),
breaks ties on fewer measured contrast failures and then on fewer changed variables (equity is
worth something), un-blinds the result with `mapping.json`, flags near-identical candidates the
judges could not separate, and writes `tally.md` with the table you will present.

If two judges' top picks differ and each names something worth stealing from the other, build
**one** hybrid — usually one candidate's ground and ink with another's accent — render it beside
the winner only, and have one judge compare the two blind. One hybrid round. Never iterate
until something converges; that is how a tournament turns back into a single model's taste.

**The baseline winning is a real result.** Say so plainly: the palette was not the problem, and
the effort should go into hierarchy, type or the wow moment instead.

---

## 5. Present, then apply

Show the person deciding the *named* sheet, `<lab>/contact.html`, with a short table:

| Letter | Candidate | J1 | J2 | J3 | Points | Contrast fails | Verdict |

Then:

- **If they asked for the colours to change**, apply the winner.
- **If they asked for an audit or for options**, recommend the winner and ask before applying.

Colour is a taste decision. The tournament makes it an informed one; it does not make it
yours to impose.

### Applying the winner

1. Edit **only the token definitions**, at the file and line the scan reported, keeping the
   project's format (hex, channel triplets, or HSL components).
2. Route the bypasses through the system: near-duplicate literals become `var(--token)`;
   translucent tints become `color-mix(in srgb, var(--token) N%, transparent)`, or
   `rgb(var(--token) / .N)` when tokens are channel triplets.
3. Do not quietly regrade photography. If the direction depends on imagery matching the
   palette, propose it as a separate step.
4. Verify: re-run `palette-lab.mjs` with no candidates (baseline only) and `audit.mjs`, and
   compare against the pre-change numbers. Contrast failures must not increase.
5. Report the files changed and how to revert.

---

## Without subagents

If the environment cannot spawn agents, run each generator as a separate pass that sees only
its own brief and source, write each JSON before starting the next, and judge from the blind
sheet using letters only. Say in the report that independence was reduced.

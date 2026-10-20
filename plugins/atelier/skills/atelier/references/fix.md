# Fix mode: find and fix UI/UX problems in a project you can edit

Use this when the person points you at a codebase and says "find the UI issues and fix them",
"make this look better", or "change the colours". The audit tells you what is wrong; this file
is how you change the code without breaking what already works.

The governing idea comes from the source project, where it was learned expensively: **fork the
thing that works and change it; never rebuild to escape a problem.** A fix that restyles what
the client already liked is a regression, however much better it looks to you.

---

## 0. Before touching anything

- **Check the safety net.** Run `git status`. If there are uncommitted changes that are not
  yours, stop and ask. If the project is not under version control, ask whether to make a copy
  first. Never edit a directory the person has described as a frozen baseline or reference.
- **Work on a branch** when there is git: `git switch -c ui-fixes`.
- **Never deploy.** Fix mode ends at a verified local build. Deploying needs an explicit
  instruction in that message (`process.md` §8).
- **Never install dependencies without asking.** The fixes below need none.

---

## 1. Understand the project

Read the README and the package manifest, find the entry pages and routes, then scan:

```bash
node scripts/scan.mjs <project-dir> --out <scratch>/scan
```

If the `ui-audit` skill is installed alongside this one, run its source and runtime passes
here as well: its fixed-rubric report is the strongest *before* record you can have, and its
findings slot straight into the three lanes below.

The scan reports the stack and how to run it, every colour token with its file and line, every
hardcoded colour and whether it duplicates a token, the type inventory, and source-level
smells with locations. Read `report.md` before forming opinions.

Note the conventions you must keep: Tailwind stays Tailwind, CSS modules stay CSS modules,
the existing token names stay. Fixes that introduce a second styling system are not fixes.

---

## 2. Run it

Use the project's own command — `npm run dev`, `npm start`, or whatever the scan found. Prefer
the environment's preview/dev-server tooling over raw shell when it exists. For plain HTML,
serve the folder statically. Record the local URL and the routes that matter.

If it does not run, that is the first finding. Report it and fix it before anything visual,
and only if the fix is obviously in scope; otherwise ask.

---

## 3. Gather evidence on the running site

```bash
node scripts/audit.mjs <local-url> --pages <key-route>,<key-route> --out <scratch>/audit
node scripts/cdp.mjs --sweep <local-url> --mobile --out <scratch>/sweep
```

Open the interactive flows yourself — forms, menus, modals, carts, configurators. Neither script
exercises them, and they are where the worst problems usually live.

Take a **before** record now: the audit numbers and a few captures. You will need it to prove
the fixes helped.

---

## 4. Triage into three lanes

Everything you found goes into exactly one lane. The lane decides whether you ask first.

### Lane 1 — Objective. Fix directly.

Things with a right answer, where fixing cannot change what the person likes about the design.

| Problem | Fix at the source |
|---|---|
| Text below AA contrast | Adjust the **token**, not the instance: `contrast.mjs <fg> <bg> --fix 4.5` moves lightness only, so the colour still reads as itself |
| Focus ring removed | Restore with `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px }` |
| Hover not gated | Wrap hover rules in `@media (hover: hover)` |
| `transition: all` | Name the properties, normally `transform, opacity, color, background-color` |
| No reduced-motion path | Add a `prefers-reduced-motion` block that shows the finished state, not a blank one |
| Images without alt | Describe what the image *shows*; `alt=""` if purely decorative. Never write marketing copy into alt text |
| `href="#"` controls | Wired: make it a `<button type="button">`. Unwired: remove it, and list it in the report |
| Clickable `div`/`span` | `<button>`, or `role="button"`, `tabindex="0"` and a key handler |
| Zoom disabled in the viewport meta | Remove `user-scalable=no` and `maximum-scale=1` |
| Missing `lang`, or not exactly one `h1` | Add `lang`; demote or promote headings |
| Tap targets under 40px | Raise `min-height` / padding on touch layouts only |
| `100vh` on mobile | Follow it with `height: 100dvh` |
| Horizontal overflow, Android zoom-out | `overflow-x: clip` on `html, body` (`responsive.md` §2) |
| Oversized images | Re-encode or add `srcset`; do not re-crop without asking |
| Dead stylesheet or unused library CSS | Remove only after confirming nothing references it |

### Lane 2 — Systemic. Show a short plan, then fix.

Changes that touch many files but follow the design rather than altering it.

- Hardcoded colours that duplicate a token become `var(--token)`; translucent tints become
  `color-mix(...)` derived from the token. The scan lists every one with its location.
- Off-system colours: decide per colour whether it is a missing token or a mistake.
- Twenty distinct font sizes become a `clamp()` scale (`systems.md` §3).
- Ad-hoc spacing becomes the spacing scale; scattered z-indexes become a short named scale.
- An inverted hierarchy, where a secondary control outweighs the primary one, gets corrected
  by restyling the primary, not by shrinking everything else.

Show the plan as a list with the number of locations each change touches, then proceed unless
the person objects. These are mechanical but wide, and a wide change deserves a heads-up.

### Lane 3 — Taste. Propose; the person decides.

Anything that changes how the site looks or feels rather than how correctly it works:

- **The palette.** Run `palette-tournament.md`. If the request already asked for new colours,
  apply the judged winner; otherwise present it and ask.
- Typeface changes, layout changes, a new hero, a wow moment, motion added or removed.
- Copy. Never rewrite claims; never invent numbers (`content.md`).

Present lane 3 as options with reasoning, and recommend one.

---

## 5. Fix discipline

- **Fix at the source of truth.** A contrast failure in forty places is one token. Fixing forty
  instances leaves the token wrong and makes the next change harder.
- **Smallest diff that solves it.** No drive-by reformatting, no renaming, no reorganising.
- **Keep what works.** Anything in the KEEP and PRESERVE buckets (`critique.md` §3) is not to be
  "improved" on the way past.
- **One concern per commit**, with a message that says what and why. Lane 1 fixes can be grouped
  by kind: "a11y: restore focus rings", "mobile: dvh after 100vh".
- **Stop and report** if a fix needs something you did not expect: a dependency, a structural
  change, a decision only the person can make.

---

## 6. Verify

1. The project's own checks: build, lint, type check, tests — whatever the scan found. A visual
   fix that breaks the build is not a fix.
2. Re-run `audit.mjs`, `scan.mjs` and the mobile sweep with the same arguments as before.
3. Compare. Every number in the before record must be equal or better. If anything got worse,
   find out why before reporting.
4. Look at the before and after captures side by side. Numbers can improve while the page gets
   uglier; check with your eyes as well.

---

## 7. Report

```markdown
## Fixed
| Issue | Where | What changed |

## Fixed across the system (lane 2)
| Change | Locations touched |

## Proposed, not applied (lane 3)
Options with a recommendation.

## Before → after
| Measure | Before | After |

## Not done, and why
## How to revert
`git switch main` / the list of files changed
```

Say what you verified and what you did not. If you only tested in headless Chrome, say so.

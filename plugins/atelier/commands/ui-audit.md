---
description: Deep UI/UX audit of this repo — static source pass, real-Chrome runtime pass, then a ranked report
argument-hint: "[url] (optional — the dev server to audit, e.g. http://localhost:3000)"
---

Run a full UI/UX audit of the current repository using the `ui-audit` skill.

$ARGUMENTS

Follow the skill exactly, in order:

1. **Source pass** — run `audit-source.mjs` against the repository root, writing into a
   scratch directory outside the repo.
2. **Runtime pass** — if a URL was given above, run `audit-runtime.mjs` against it. If none
   was given, look for a dev server script in `package.json` and ask before starting one.
   If there is no way to run the page, do the source pass only and say so at the top of the
   report rather than guessing at anything the browser would have measured.
3. **Look at every capture** — live and frozen, at every viewport. Do not write the report
   before opening them.
4. **Write the report** to `docs/UI_AUDIT.md` following `references/rubric.md`: ranked by
   consequence, facts before judgements, every open question carried through into "Verify
   manually", and the four tests answered honestly including the weakest concept.

Do not change any code, and do not propose specific colours or a redesign — this is an
assessment. If the user wants the rebuild afterwards, that is the `atelier` skill and it
needs their approval first.

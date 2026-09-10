# Theme library

Fifteen aesthetic families, each with a working recipe. These are starting points to be
*derived into*, never applied off the shelf — the direction still has to come from what the
client makes (see `direction.md`). Use this file to widen the option space before you
choose, and to get the details right once you have.

Each entry gives: when it fits, the palette logic, type, motion vocabulary, the interface
vernacular it borrows, and the trap that makes it fail.

**Index**
1. Editorial broadsheet · 2. Technical draughtsman · 3. Archival documentary ·
4. Swiss/international · 5. Monochrome + single accent · 6. Warm minimal ·
7. Dark cinematic · 8. Kinetic maximalist · 9. Terminal/retro-computational ·
10. Specimen/scientific · 11. Gallery/museum · 12. Luxury fashion ·
13. Zine/photocopy · 14. Industrial signage · 15. Data-dense/instrument panel

---

## 1. Editorial broadsheet

**Fits** publishers, heritage manufacturers, research firms, anyone whose credibility rests
on documented fact.

**Palette** Paper base (`#f4f2ed` or true white) or its inversion (near-black `#0a0a0a`),
one ink, one accent used only for rules and marks. Three values maximum.
**Type** A workhorse serif or an extended grotesque for headlines at large sizes with tight
negative tracking; mono for captions, figure numbers, datelines. Real hierarchy: deck,
standfirst, body, caption, credit.
**Motion** Minimal and typographic. Rules that draw. Columns that settle. Nothing bounces.
**Vernacular** Section counters, folio numbers, figure captions ("Fig. 04 —"), datelines,
hairline rules, a masthead.
**Trap** Decorative use of editorial furniture. If you print "Fig. 04" it must refer to a
real figure; if you number sheets, the numbers must navigate.

---

## 2. Technical draughtsman

**Fits** engineering, manufacturing, architecture, instruments, anything made to a drawing.

**Palette** Drawing white or blueprint cyan-white; a single ink (graphite `#1a1a1a` or
blueprint `#0d3b66`); one red for annotation. Optional graph-paper grid at 4% opacity.
**Type** A technical sans or condensed grotesque in caps for labels; mono for dimensions.
Letter-spaced small caps read as a title block.
**Motion** Lines that draw themselves (SVG `stroke-dasharray`), dimensions that extend,
leader lines that reach out to labels, a drawing that morphs into the photograph.
**Vernacular** Title block, revision table, sheet numbering, dimension arrows, section
marks, tolerance callouts.
**Trap** Fake drawings. The line art must be generated *from the real photograph* so it
registers when it morphs — see `assets.md` for the edge-detect recipe. Invented blueprints
of a product that was never drawn look exactly as fake as they are.

---

## 3. Archival documentary

**Fits** family businesses, institutions with history, archives, estates, anything whose
story is the asset.

**Palette** Manila `#d9c9a3`, foxed paper, sepia photographs, faded ink, one stamp red.
Warm and desaturated; nothing pure white.
**Type** A typewriter face for documents and a handwriting face used *sparingly* for
annotations; a plain serif for body.
**Motion** Slow. Papers settle, stamps press, tape holds, folders open. Nothing slides in
from the side.
**Vernacular** Folder tabs, rubber stamps, push pins, paper clips, tape, ledger rules,
index cards, binding thread, marginalia.
**Trap** Kitsch. One or two artefacts per screen, and the documents must contain real
content — real dates, real names, real entries. Fake aged paper full of lorem is a
scrapbook, not a design.

---

## 4. Swiss / international

**Fits** consultancies, cultural institutions, design-literate B2B, anything that must read
as rigorous.

**Palette** White, black, one primary (classically red). No gradients, no shadows.
**Type** One neo-grotesque across the whole site, differentiated purely by size and weight.
Flush left, ragged right, always.
**Motion** Almost none, and strictly on the grid. Elements appear; they do not travel far.
**Vernacular** A visible modular grid, consistent column spans, generous margins, a strict
baseline rhythm.
**Trap** Boredom disguised as rigour. Swiss layouts live or die on the *scale contrast* —
something must be enormous, something tiny. Even spacing everywhere is not restraint, it is
absence of decision.

---

## 5. Monochrome + single accent

**Fits** metal, machinery, automotive, audio equipment, tools — anything where the material
itself is the aesthetic.

**Palette** True black `#000`, pure white `#fff`, two greys, one saturated accent. The key
move: **grade all imagery to monochrome** (`filter: grayscale(1) contrast(1.4)`) so
photographs reinforce the system instead of contradicting it, and let the accent be the
only colour on the page.
**Type** Extended grotesque at heavy weight (`font-stretch: 110–125%`, weight 800–900) with
negative tracking for display; mono for UI. Flat fills — no gradient text.
**Motion** Precise and mechanical. Hairline rules, shutter-style clip reveals, a progress
rail in the accent colour.
**Vernacular** Depends on the client; pairs naturally with title blocks and index cells.
**Trap** Letting the accent become decorative. Reserve it for exactly one class of thing
(navigation state, or marks, or the progress rail) and never use it as a fill for large
areas.

---

## 6. Warm minimal

**Fits** wellness, food, ceramics, hospitality, skincare, craft studios.

**Palette** Cream or oat base `#f5f0e8`, a deep warm neutral for text, one muted botanical
or clay accent. Avoid pure white and pure black entirely.
**Type** A humanist serif or a soft geometric sans, generously leaded, at comfortable
reading sizes. Restrained scale contrast.
**Motion** Slow and soft: long fades, gentle parallax, imagery that breathes. Ease durations
at the long end (500–800 ms).
**Vernacular** Recipe cards, labels, care instructions, tasting notes, index tabs.
**Trap** This is the second-most-templated aesthetic on the web. Escape it with a specific
material reference — the exact glaze, the exact linen, the exact paper — and unusual
photography crops. Generic cream plus a serif is a template.

---

## 7. Dark cinematic

**Fits** film, gaming, performance, nightlife, security, high-end services — and only when
you hold real footage.

**Palette** Near-black base, a graded highlight pulled *from the footage itself*, one accent.
Sample the palette from actual frames rather than choosing it.
**Type** High-contrast display at large sizes; keep body text above `#c8c8c8` for legibility
on black.
**Motion** Footage-driven: scroll-scrubbed sequences, a legibility scrim behind copy that
strengthens as text enters, slow push-ins.
**Vernacular** Film slates, timecodes, reel numbers, chapter marks.
**Trap** This is the most-generated aesthetic in existence. It only escapes the template
when the footage is real and specific. Dark plus glow plus a cool accent with stock video
is the archetypal AI landing page — see `anti-generic.md`. If you do not have footage,
choose a different family.

---

## 8. Kinetic maximalist

**Fits** music, fashion, events, youth culture, agencies, anything selling energy.

**Palette** Loud and deliberately clashing — but chosen, not random. Two saturated hues plus
black and white beat six pastels.
**Type** The main event. Type at 20vw and above, overlapping, rotated, masked by imagery,
scrolling horizontally, changing weight on scroll with a variable font.
**Motion** Constant but *coordinated*: a marquee, a weight axis animating on scroll,
letterforms that split and reassemble. One governing rhythm, not many.
**Vernacular** Posters, flyers, ticket stubs, tour dates, setlists.
**Trap** Illegibility and chaos. Maximalism needs *more* structural discipline than
minimalism: one grid, one rhythm, one type family pushed hard. And it must degrade to
something calm under `prefers-reduced-motion`.

---

## 9. Terminal / retro-computational

**Fits** developer tools, security, infrastructure, data products, crypto-adjacent
engineering.

**Palette** Phosphor on black (green `#33ff66`, amber `#ffb000`) or a modern inversion:
paper white with a single terminal accent. Two colours is plenty.
**Type** Monospace throughout, differentiated by weight and case only. Box-drawing
characters for rules and frames.
**Motion** Typed reveals, blinking cursors, scanlines, output streaming in. Everything
snaps — no easing curves, use steps.
**Vernacular** Prompts, exit codes, log lines, man-page headers, ASCII tables, keyboard
hints.
**Trap** Novelty exhaustion. Confine the terminal metaphor to the hero and the navigation;
make the actual documentation and content comfortably readable. Nobody reads a pricing page
in a typewriter effect.

---

## 10. Specimen / scientific

**Fits** biotech, materials, agriculture, research, natural products, museums of natural
history.

**Palette** Neutral laboratory white or slate; one accent for measurement; species-accurate
colour reserved exclusively for the specimen imagery.
**Type** A precise sans for labels, mono for measurements and identifiers, italic for
binomials. Very small type used confidently.
**Motion** Rotate, magnify, cross-section, compare. A specimen that turns; a scale bar that
extends; a layer stack that separates.
**Vernacular** Specimen labels, catalogue numbers, scale bars, magnification factors,
collection dates, herbarium sheets.
**Trap** Fabricated data. Every measurement, magnification, and identifier on screen must be
real. This aesthetic signals precision, so an invented number is a much larger breach here
than elsewhere.

---

## 11. Gallery / museum

**Fits** artists, galleries, architects, photographers, luxury goods, cultural bodies.

**Palette** Gallery white `#fafafa` or deep neutral; the work supplies all colour. Interface
approaches invisibility.
**Type** One refined family, small, with very wide tracking on labels. Text sits far from
the work.
**Motion** Almost none. Crossfades. The work does not move; the viewer does.
**Vernacular** Wall labels (title, date, medium, dimensions, credit), room numbers,
catalogue raisonné numbers, exhibition dates.
**Trap** Under-designing to the point of blandness. The rigour must be visible in the
*spacing* — margins far larger than feel comfortable, and absolute consistency in where
labels sit relative to work.

---

## 12. Luxury fashion

**Fits** fashion, jewellery, watches, hotels, spirits.

**Palette** Two neutrals and one material tone taken from the product (gold, oxblood,
bone). Deep blacks, never grey-blacks.
**Type** A high-contrast display serif at very large sizes paired with a tiny, widely
tracked sans for everything else. The gap between the two sizes is extreme and deliberate.
**Motion** Slow reveals, images that scale imperceptibly over long durations, cursor-follow
on product imagery, page transitions that hold a beat.
**Vernacular** Lookbook plates, collection numbering, seasons, atelier notes, care cards.
**Trap** Slowness without substance. Every held beat must reveal something. And luxury sites
are judged harshly on performance — a 4 MB hero image undoes the entire impression.

---

## 13. Zine / photocopy

**Fits** independent music, activism, streetwear, student and subculture work.

**Palette** Photocopy black on newsprint, plus one screaming spot colour (risograph pink,
fluorescent orange). Deliberate misregistration.
**Type** Cut-and-paste: mixed families, mixed sizes, ransom-note headlines, typewriter body.
Rules that are drawn, not straight.
**Motion** Jump cuts and stutters. `steps()` easing. Nothing smooth. Elements that jitter
slightly on hover.
**Vernacular** Staples, fold lines, tape, halftone dots, photocopy noise, hand annotation.
**Trap** Genuine unreadability, and accidental amateurism. The grid underneath must be
rigorous even when the surface is chaotic — controlled roughness reads as punk, uncontrolled
roughness reads as broken.

---

## 14. Industrial signage

**Fits** logistics, construction, energy, transport, heavy industry, safety equipment.

**Palette** Hazard yellow and black, or safety orange, plus concrete grey. High contrast by
regulation, not by taste.
**Type** A wayfinding sans (Transport, Highway Gothic lineage) in caps, at signage scale,
with tight leading.
**Motion** Mechanical and linear. Things slide on rails, counters tick, indicators switch
state. Constant speed, no easing.
**Vernacular** Warning plates, equipment nameplates, capacity ratings, inspection tags,
route numbers, hazard diamonds.
**Trap** Reading as a warning rather than an invitation. Keep the hazard palette for
structural furniture and let photography of the actual work carry the warmth.

---

## 15. Data-dense / instrument panel

**Fits** fintech, analytics, trading, logistics operations, developer platforms, monitoring —
anywhere the product *is* information and the buyer is fluent in it.

**Palette** A low-chroma ground (near-black or a cool off-white) with a restrained set of
semantic colours that mean something fixed: one for positive, one for negative, one for the
selected state. Everything else is neutral so the data carries all the colour.
**Type** A tight sans for labels and a monospace for every figure, with tabular numerals
throughout so columns align and digits do not jitter as they update. Small sizes used
confidently — 11–13px is normal here and looks expert rather than cramped.
**Motion** Almost none, and never decorative. Values transition rather than jump; a sparkline
extends; a row highlights briefly when it changes. Anything that delays a reader's access to
a number is wrong.
**Vernacular** Terminal readouts, exchange tickers, instrument panels, spreadsheet rules,
keyboard shortcuts shown inline, status pills with fixed meanings, precise timestamps.
**Trap** Two, both common. First, decorating the data — gradients on bars, glow on cards,
3D pie charts. Second, *faking* the data: screenshots and demos filled with invented figures
that do not add up. A numerate buyer checks, and a total that does not match its rows costs
the whole pitch. See `content.md`.

Density is the point here, so the discipline is alignment rather than restraint: one baseline
grid, one column rhythm, and every number in the same place relative to its label.

---

## Choosing and combining

Pick the family whose **vernacular** the client's own world would recognise, then take the
palette from their material rather than from the recipe above.

Hybrids work when one family supplies the structure and another supplies the surface — for
example editorial structure with a monochrome-plus-accent surface, or specimen labelling
inside a gallery layout. Hybrids fail when both families supply structure; the page then has
two competing grids and reads as indecision.

Whichever you choose, the checks in `anti-generic.md` still apply. A theme family is a
starting point, not a defence.

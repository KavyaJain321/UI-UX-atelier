# Assets: inventory first, because they decide the design

> *The single most useful thing to do first is inspect the footage and photography, because
> it determines whether the hero is real material or a render — and that decision cascades
> through everything else.*

Design decisions made before the asset audit are guesses. Do this first.

---

## 1. Making unwatchable media legible

You cannot watch three hours of footage, but you can read it. This pipeline turns a media
library into something a model can survey. It scaled to 366 clips without difficulty.

**1. Locate the tool and record the absolute path.** `ffmpeg` is often not on `PATH`. Write
the full binary path into the project notes so it is never rediscovered.

**2. Probe everything into a manifest.**

```bash
ffprobe -v quiet -print_format json -show_format -show_streams clip.mp4
```

Collect duration, resolution, fps, codec and size into `manifest.json`, and generate a
low-resolution proxy for each clip to work from.

**3. Build one contact sheet per clip**, with the grid density scaled to duration:

```bash
ffmpeg -i proxy.mp4 -vf "fps=N/DURATION,scale=320:-1,tile=6x5" -frames:v 1 sheet_clip.jpg
```

**4. Treat the most important asset more densely.** If the client has an existing edit or
showreel, sheet it at 2 fps with scene-cut detection. **The client's own edit is the
authoritative statement of intended direction** — it tells you the arc they already believe
in.

**5. Fan out survey agents over the sheets.** Batch roughly eight sheets per agent and
require **structured JSON per clip**, not prose:

```json
{ "clip": "C0064", "stage": "forging", "subject": "glowing billet in die",
  "shot": "macro", "camera": "locked", "stability": 5, "lighting": "single hot source",
  "themeFit": { "A": 5, "B": 1, "C": 3 }, "hero": true,
  "scrubSuitability": 5, "bestBeat": "cold open", "notes": "..." }
```

**6. Run synthesis agents as parallel lenses**, not one summary: coverage map · hero-sequence
hunt · theme recommendation · beat mapping · technical build plan. Different questions
surface different assets.

**7. Same method for stills** — montage sheets with **the filename stamped on every cell**,
so the agent can name what it found.

Subagents read contact sheets with high fidelity; this is a verified assumption, not a hope.

---

## 2. What the inventory must decide

Review in this priority order:

1. **Is there a continuous single-object sequence?** If yes, that is the hero and no 3D
   render is needed. This single question saves or costs weeks.
2. **Is every process stage covered?** Determines whether the process section is shootable
   as-is or needs pickups.
3. **Where are the hero moments** — the visually spectacular seconds.
4. **Hands, not faces.** Craft footage is stronger on hands, and it avoids releases and
   consent complications entirely.
5. **Which shots are locked off?** Handheld does not scrub cleanly.

Assess honestly rather than forcing it. **A stuttering hero is worse than a clean render.**

---

## 3. Turning inventory into site assets

**Cut short web loops** from the source clips, semantically named, around 1–2 MB each:

```bash
ffmpeg -ss 24 -t 12 -i source.mov -vf "scale=1280:-2" -c:v libx264 -crf 23 \
  -profile:v high -pix_fmt yuv420p -movflags +faststart -an out.mp4
```

**Make a phone variant of every video** — 720p, roughly a quarter of the size — and a poster
frame taken from the film's *own first frame*, so the poster never flashes a different image
than the video starts on:

```bash
ffmpeg -i out.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 26 -movflags +faststart -an out_m.mp4
ffmpeg -i out.mp4 -frames:v 1 -update 1 poster.jpg
```

**Prefer frame sequences over `<video>` for scrubbing.** Confirmed repeatedly: `<video>`
plus `currentTime` scrubbing stutters in many browsers. Budget roughly 96 frames at 1280
wide, about 1.8–2.7 MB as WebP or AVIF.

**Extract the audio bed from the footage itself** rather than using a library track — a
loudnorm pass over a real foundry clip beat a synthesised placeholder outright.

**Generate line art *from* the photograph** so a drawing-to-photo morph registers perfectly.
This is the single best trick in the project:

```bash
ffmpeg -i colour.jpg -vf "format=gray,gblur=sigma=0.7,edgedetect=low=0.05:high=0.16,negate" line.png
```

Then key black to alpha to get a mask. The drawing and the photograph are the same pixels,
so the morph cannot jump. Clean seamless backgrounds produce almost no noise.

**Key the hero object into layers** — object, container, outline — plus a `geometry.json` of
measured stations. That one asset can unlock an entire concept.

**Mine the geometry for truths, not just outlines.** Measuring the hero object produced:
*79% of the object is hidden inside the scabbard at rest.* That is a true, measured statement
about the thing being sold, and it became the whole site in one number. Look for that number
in whatever you measure.

**Reject assets out loud.** Open them, do not count them. Write down what was rejected and
why — *"the last sixty frames are 3D gold chrome with sparks, precisely the fantasy-glow
aesthetic the brief forbids."*

**Promote the unused.** The best assets in a project are often sitting unreferenced in a
folder. Look before commissioning anything new.

---

## 4. Image formats and budgets

| Use | Format | Notes |
|---|---|---|
| Photography | WebP (AVIF where supported) | Quality 80–85 is indistinguishable at web sizes |
| Cutouts with transparency | WebP | Far smaller than PNG; keep PNG sources out of the deploy |
| Line art / masks | PNG-8 or WebP | Alpha matters more than colour depth |
| Frame sequences | WebP or AVIF | Never JPEG sequences — the size difference is large |
| Icons / marks | Inline SVG | Never an icon font, never emoji |

Budgets worth holding: hero image under 400 KB, any single photograph under 250 KB, total
page weight under 2.5 MB on first load with everything else deferred.

```bash
# bulk convert, keeping sources outside the deploy
for f in src/*.png; do cwebp -q 85 "$f" -o "dist/$(basename "${f%.png}").webp"; done
```

---

## 5. Commissioning generated media

When a gap genuinely cannot be shot, the client may run a generator. Give them a brief in
this exact structure — it is the difference between one usable clip and ten wasted runs.

**Start from a frame you rendered from the client's own photograph**, already on the final
background and in the exact pose the site uses. Feed it as the first frame for
image-to-video, so the handoff into the site is invisible. *Get frame 1 right and the
handoff is invisible.*

**A global preamble pasted at the top of every prompt:**

> *Image-to-video from the supplied first frame. The object in the frame is a real
> [client] product: keep it exactly as it is — same parts, same proportions. Do not add
> hands, people, text, logos, dust, sparks, smoke, lens flares, reflections of a room, or a
> second object. The background stays [colour] at all times. No camera shake. Photographic,
> not illustrated.*

**Per brief:** source file and dimensions · length · resolution · loop yes/no · **the exact
delivery filename** · the prompt · **"where it goes"** naming the exact site slot.

**Output spec once, globally:** codec, fps, bitrate, no audio, *"colour is fine, I grade."*

**A troubleshooting section — "if the generator fights you":** lower the motion strength; add
*"the background is a void, there is no surface under the object"*; add *"the object moves by
itself as if pulled by an invisible thread; no hand, no arm, no glove"*; and *"send me
whatever comes out, even imperfect — two versions of each beat one."*

**A "not needed from the generator" section**, so runs are not wasted on things real footage
already covers.

**A delivery-status table** at the top: `Brief | Received | Used | Note`, including rejections
and why (*"the generator doubled the hilt in the first second"*), and what is still owed.

For a full hero film, the same document adds: hard technical spec → an invariant subject
description → **the exact composition measured off the existing site frame** (end positions
as a percentage of frame, angle in degrees, percentage of frame filled) → exact palette
hexes → a numbered shot list with timecodes and one prompt paragraph per shot → a negative
list → how it drops into the site.

---

## 6. Photogrammetry, if 3D is genuinely required

One object, matte-cleaned to kill glare, on a turntable against a plain mid-grey backdrop.
Roughly 150 photographs in three height rings of about forty, plus both faces, the edge, and
detail passes. Flat, even, diffuse light — **glare kills photogrammetry**. Fixed exposure and
fixed focus throughout.

And the standing rule that outranks all of this: **real steel or a line.** Show real
photographed objects, or draw the thing as a line. Low-fidelity 3D standing in for a real
product reads as a toy, and it was rejected in exactly those words.

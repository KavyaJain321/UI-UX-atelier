#!/usr/bin/env python3
"""
palette.py - derive a palette from a real reference image.

    python palette.py reference.jpg [--n 6] [--css]

Palettes should be taken from something real: the client's reference image, their product
photography, their packaging, a material sample. Invented palettes converge on the same
handful of combinations and get called "AI-looking"; derived ones do not.

Prints the dominant colours with coverage, a WCAG contrast matrix so you can see which
pairs are actually usable for text, and a suggested role assignment. With --css it emits
custom properties ready to paste into a token block.

Only needs Pillow and numpy. K-means is implemented here so there is no scikit-learn
dependency.
"""
import argparse
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("needs Pillow and numpy:  pip install pillow numpy")


def kmeans(pixels, k, iters=40, seed=0):
    """Plain Lloyd's algorithm with k-means++ seeding."""
    rng = np.random.default_rng(seed)
    centres = [pixels[rng.integers(len(pixels))]]
    for _ in range(k - 1):
        d = np.min(((pixels[:, None, :] - np.array(centres)[None, :, :]) ** 2).sum(2), axis=1)
        total = d.sum()
        probs = d / total if total > 0 else None
        centres.append(pixels[rng.choice(len(pixels), p=probs)])
    centres = np.array(centres, dtype=float)

    for _ in range(iters):
        dist = ((pixels[:, None, :] - centres[None, :, :]) ** 2).sum(2)
        labels = dist.argmin(1)
        moved = 0.0
        for i in range(k):
            members = pixels[labels == i]
            if len(members):
                new = members.mean(0)
                moved += np.abs(new - centres[i]).sum()
                centres[i] = new
        if moved < 1.0:
            break
    return centres, labels


def hexof(rgb):
    return "#{:02x}{:02x}{:02x}".format(*(int(round(max(0, min(255, c)))) for c in rgb))


def rel_luminance(rgb):
    srgb = []
    for c in rgb:
        c = c / 255.0
        srgb.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]


def contrast(a, b):
    la, lb = rel_luminance(a), rel_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def saturation(rgb):
    mx, mn = max(rgb), min(rgb)
    return 0.0 if mx == 0 else (mx - mn) / mx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--n", type=int, default=6, help="how many colours to extract")
    ap.add_argument("--css", action="store_true", help="emit CSS custom properties")
    args = ap.parse_args()

    img = Image.open(args.image).convert("RGB")
    img.thumbnail((320, 320))
    px = np.asarray(img, dtype=float).reshape(-1, 3)

    centres, labels = kmeans(px, args.n)
    counts = np.bincount(labels, minlength=args.n)
    order = np.argsort(-counts)

    entries = []
    for i in order:
        rgb = centres[i]
        entries.append({
            "hex": hexof(rgb),
            "rgb": tuple(int(round(v)) for v in rgb),
            "pct": 100.0 * counts[i] / len(px),
            "lum": rel_luminance(rgb),
            "sat": saturation(rgb),
        })

    print(f"\nPalette from {args.image}\n")
    print(f"{'hex':<10}{'coverage':>10}{'luminance':>12}{'saturation':>12}")
    print("-" * 44)
    for e in entries:
        print(f"{e['hex']:<10}{e['pct']:>9.1f}%{e['lum']:>12.3f}{e['sat']:>12.2f}")

    # contrast matrix - which pairs can legally carry text
    print("\nContrast matrix (bold = passes AA for body text at 4.5:1)\n")
    hdr = "          " + "".join(f"{e['hex']:>10}" for e in entries)
    print(hdr)
    for a in entries:
        row = f"{a['hex']:<10}"
        for b in entries:
            r = contrast(a["rgb"], b["rgb"])
            mark = "*" if r >= 4.5 else (":" if r >= 3 else " ")
            row += f"{r:>9.1f}{mark}"
        print(row)
    print("\n  * passes AA for body text   : passes AA for large text only")

    # role suggestion
    darkest = min(entries, key=lambda e: e["lum"])
    lightest = max(entries, key=lambda e: e["lum"])
    # an accent must actually be saturated; a dark neutral is not an accent
    candidates = [e for e in entries if e not in (darkest, lightest) and e["sat"] >= 0.35]
    accent = max(candidates, key=lambda e: e["sat"]) if candidates else None
    mids = [e for e in entries if e not in (darkest, lightest, accent)]
    mids.sort(key=lambda e: -e["lum"])

    print("\nSuggested roles\n")
    print(f"  ground / base    {darkest['hex']}   ({darkest['pct']:.0f}% of the image)")
    print(f"  ink / foreground {lightest['hex']}   ({lightest['pct']:.0f}%)")
    if accent:
        print(f"  accent (state)   {accent['hex']}   saturation {accent['sat']:.2f}")
    else:
        print("  accent (state)   none present - this reference is essentially monochrome.")
        print("                   Take the accent from something else the client owns:")
        print("                   their mark, their packaging, a stamp, a uniform flash.")
    for i, m in enumerate(mids[:2]):
        print(f"  neutral {i + 1}        {m['hex']}")

    base_ratio = contrast(darkest["rgb"], lightest["rgb"])
    print(f"\n  base/ink contrast: {base_ratio:.1f}:1", end="  ")
    print("(good)" if base_ratio >= 7 else "(push the extremes further apart)")

    if args.css:
        print("\n:root{")
        print(f"  --ground:{darkest['hex']};")
        print(f"  --ink:{lightest['hex']};")
        if accent:
            print(f"  --accent:{accent['hex']};        /* reserve for state, never decoration */")
        for i, m in enumerate(mids[:2]):
            print(f"  --neutral-{i + 1}:{m['hex']};")
        print("  --edge:rgba(255,255,255,.14);")
        print("}")

    print("\nReminders")
    print("  - use these at full weight, not one dominant plus a timid accent")
    print("  - enforce the palette on photography and video too, or the system will not hold")
    print("  - reserve the accent for one class of thing (live state, marks, progress)")
    print()


if __name__ == "__main__":
    main()

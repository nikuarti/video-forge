#!/usr/bin/env python3
"""contact_sheet.py :: montage a thumbnail grid across the whole timeline so a
reviewer can scan pacing, cuts, and dead air at a glance.

    contact_sheet.py <frames_dir> <out.png> [--cols 8] [--every N]
"""
import sys, os, glob, argparse

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("contact_sheet needs Pillow (PIL).")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames_dir")
    ap.add_argument("out")
    ap.add_argument("--cols", type=int, default=8)
    ap.add_argument("--every", type=int, default=0, help="0 = auto (~48 cells)")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(a.frames_dir, "frame_*.png")))
    if not files:
        sys.exit("no frames in " + a.frames_dir)
    every = a.every or max(1, len(files) // 48)
    picks = files[::every]
    thumbs = [Image.open(p).convert("RGB") for p in picks]
    tw, th = 240, int(240 * thumbs[0].height / thumbs[0].width)
    thumbs = [t.resize((tw, th)) for t in thumbs]
    cols = a.cols
    rows = (len(thumbs) + cols - 1) // cols
    pad, lab = 6, 16
    sheet = Image.new("RGB", (cols * (tw + pad) + pad,
                              rows * (th + lab + pad) + pad), (18, 18, 24))
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(thumbs):
        r, cc = divmod(i, cols)
        x = pad + cc * (tw + pad)
        y = pad + r * (th + lab + pad)
        sheet.paste(t, (x, y))
        d.text((x + 2, y + th + 2), "f%d" % (i * every), fill=(200, 200, 210))
    sheet.save(a.out)
    print("contact sheet: %d cells (every %d) -> %s" % (len(thumbs), every, a.out))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""probe.py :: quick deterministic facts about a render + contract, for the
review scorecard. Flags blank frames (dead air) and prints the message.

    probe.py <contract.json> <frames_dir> [--json out.json]
"""
import sys, os, json, glob, argparse

try:
    from PIL import Image
except ImportError:
    sys.exit("probe needs Pillow (PIL).")


def hex2rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def blankish(img, bg, tol=18):
    W, H = img.size
    px = img.load()
    step = max(1, min(W, H) // 120)
    non = 0
    for y in range(0, H, step):
        for x in range(0, W, step):
            if any(abs(px[x, y][i] - bg[i]) > tol for i in range(3)):
                non += 1
                if non > 12:
                    return False
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("contract")
    ap.add_argument("frames_dir")
    ap.add_argument("--json", default=None)
    a = ap.parse_args()

    with open(a.contract) as fh:
        c = json.load(fh)
    files = sorted(glob.glob(os.path.join(a.frames_dir, "frame_*.png")))
    if not files:
        sys.exit("no frames in " + a.frames_dir)
    meta = c["meta"]
    bg = hex2rgb(meta.get("background", "#0b0b0f"))
    blanks = [i for i, f in enumerate(files) if blankish(Image.open(f).convert("RGB"), bg)]

    facts = {
        "message": meta.get("message"),
        "fps": meta.get("fps"),
        "dims": [meta.get("width"), meta.get("height")],
        "frames_rendered": len(files),
        "durationFrames": meta.get("durationFrames"),
        "promises": len(c.get("promises", [])),
        "optOuts": len(c.get("optOuts", [])),
        "cuts": len(c.get("_scene", {}).get("cuts", [])),
        "blank_frames": blanks,
    }
    print(json.dumps(facts, indent=2))
    if facts["frames_rendered"] != facts["durationFrames"]:
        print("WARN: rendered frame count != durationFrames (%d vs %d)"
              % (facts["frames_rendered"], facts["durationFrames"]))
    if blanks:
        print("WARN: %d blank frame(s): %s%s" % (
            len(blanks), blanks[:10], " ..." if len(blanks) > 10 else ""))
    if a.json:
        with open(a.json, "w") as fh:
            json.dump(facts, fh, indent=2)


if __name__ == "__main__":
    main()

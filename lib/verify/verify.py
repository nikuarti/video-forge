#!/usr/bin/env python3
"""verify.py :: the pixel gate. A render is NOT done until this is green.

Checks each promise in the extracted contract against the rendered PNG frames.
Pure PIL (no numpy). Exit 0 = green; nonzero = red with a per-promise report.

    verify.py <contract.json> <frames_dir> [--json report.json]

Promise types (see lib/src/20-primitives.js / 30-catalog.js):
  centroid      an actor's colored blob is centered at (x,y) at a frame
  presence      an actor's color is present / absent at a frame
  ink           a text actor's region contains ink (non-bg pixels) at a frame
  absent-color  a forbidden color does NOT appear in a region before a frame
  nonblank      a frame is not blank (enough non-bg pixels)
  opaque        a frame has no transparent pixels (RGBA captures flatten
                undrawn areas to black when encoded); registered by timeline()
  detail        a region has real image detail at a frame (luma std dev above a
                floor): catches embedded footage that failed to decode/seek and
                left a flat white/black/grey panel. Register via wrapCatalog.

Every generic invariant a human catches becomes a NEW check here (never only
prose in best-practices). That is the mechanics half of the ratchet.
"""
import sys, os, json, argparse, glob

try:
    from PIL import Image
except ImportError:
    sys.exit("verify needs Pillow (PIL). pip install Pillow")


def hex2rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def close(px, rgb, tol):
    return all(abs(px[i] - rgb[i]) <= tol for i in range(3))


class Frames:
    def __init__(self, d):
        self.files = sorted(glob.glob(os.path.join(d, "frame_*.png")))
        if not self.files:
            raise SystemExit("no frames in " + d)
        self._cache = {}

    def get(self, fr):
        fr = max(0, min(fr, len(self.files) - 1))
        if fr not in self._cache:
            self._cache[fr] = Image.open(self.files[fr]).convert("RGB")
        return self._cache[fr]

    def raw(self, fr):
        """The frame as captured (keeps alpha), for opacity checks."""
        fr = max(0, min(fr, len(self.files) - 1))
        return Image.open(self.files[fr])

    def count(self):
        return len(self.files)


def match_pixels(img, rgb, tol, region=None):
    """Return (count, cx, cy) of pixels near rgb, centroid normalized 0..1."""
    W, H = img.size
    px = img.load()
    x0 = int((region["x"]) * W) if region else 0
    y0 = int((region["y"]) * H) if region else 0
    x1 = int((region["x"] + region["w"]) * W) if region else W
    y1 = int((region["y"] + region["h"]) * H) if region else H
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W, x1), min(H, y1)
    n = sx = sy = 0
    # sample stride for speed on large frames; still exact enough for gates.
    step = max(1, min((x1 - x0), (y1 - y0)) // 400)
    for y in range(y0, y1, step):
        for x in range(x0, x1, step):
            if close(px[x, y], rgb, tol):
                n += 1
                sx += x
                sy += y
    if n == 0:
        return (0, None, None)
    return (n, (sx / n) / W, (sy / n) / H)


def bg_of(contract):
    return hex2rgb(contract["meta"].get("background", "#0b0b0f"))


def actor_by_id(contract, aid):
    for a in contract.get("_scene", {}).get("actors", []):
        if a["id"] == aid:
            return a
    return None


def check_centroid(p, frames, contract):
    a = actor_by_id(contract, p["target"])
    if not a:
        return False, "unknown target actor " + p["target"]
    img = frames.get(p["atFrame"])
    n, cx, cy = match_pixels(img, hex2rgb(a["color"]), 30)
    if n == 0:
        return False, "actor not found on frame %d" % p["atFrame"]
    dx, dy = cx - p["expect"]["x"], cy - p["expect"]["y"]
    dist = (dx * dx + dy * dy) ** 0.5
    ok = dist <= p["tol"]
    return ok, "centroid=(%.3f,%.3f) want=(%.3f,%.3f) dist=%.3f tol=%.3f" % (
        cx, cy, p["expect"]["x"], p["expect"]["y"], dist, p["tol"])


def check_presence(p, frames, contract):
    a = actor_by_id(contract, p["target"])
    if not a:
        return False, "unknown target actor " + p["target"]
    img = frames.get(p["atFrame"])
    n, _, _ = match_pixels(img, hex2rgb(a["color"]), 30)
    present = n > 3
    ok = present == p["expect"]["present"]
    return ok, "present=%s want=%s (n=%d)" % (present, p["expect"]["present"], n)


def check_ink(p, frames, contract):
    a = actor_by_id(contract, p["target"])
    if not a:
        return False, "unknown target actor " + p["target"]
    img = frames.get(p["atFrame"])
    # region around the actor's stored position, generous box for text.
    region = {"x": max(0, a["x"] - 0.35), "y": max(0, a["y"] - 0.12),
              "w": 0.70, "h": 0.24}
    n, _, _ = match_pixels(img, hex2rgb(a["color"]), 40, region)
    ok = (n > 3) == p["expect"]["nonEmpty"]
    return ok, "ink pixels=%d nonEmpty=%s" % (n, p["expect"]["nonEmpty"])


def check_absent_color(p, frames, contract):
    forbid = hex2rgb(p["forbidHex"])
    before = p["beforeFrame"]
    tol = p.get("tol", 24)
    region = p.get("region")
    # sample up to ~12 frames strictly before the boundary.
    hi = min(before, frames.count())
    if hi <= 0:
        return True, "no frames before %d" % before
    idxs = sorted(set(int(i * (hi - 1) / 11) for i in range(12))) if hi > 1 else [0]
    for fr in idxs:
        n, _, _ = match_pixels(frames.get(fr), forbid, tol, region)
        if n > 3:
            return False, "forbidden %s appeared at frame %d (n=%d) before %d" % (
                p["forbidHex"], fr, n, before)
    return True, "%s absent before frame %d" % (p["forbidHex"], before)


def check_nonblank(p, frames, contract):
    img = frames.get(p["atFrame"])
    bg = bg_of(contract)
    W, H = img.size
    px = img.load()
    step = max(1, min(W, H) // 200)
    non = 0
    for y in range(0, H, step):
        for x in range(0, W, step):
            if not close(px[x, y], bg, 18):
                non += 1
                if non > 20:
                    return True, "non-blank (>%d ink samples)" % 20
    return False, "frame %d looks blank (%d ink samples)" % (p["atFrame"], non)


def check_opaque(p, frames, contract):
    img = frames.raw(p["atFrame"])
    if img.mode not in ("RGBA", "LA", "PA") and "transparency" not in img.info:
        return True, "no alpha channel"
    alpha = img.convert("RGBA").getchannel("A")
    lo, _ = alpha.getextrema()
    if lo == 255:
        return True, "fully opaque"
    hist = alpha.histogram()
    clear = sum(hist[:255])
    return False, "%d non-opaque pixels (min alpha %d): background not painted" % (clear, lo)


def check_detail(p, frames, contract):
    img = frames.get(p["atFrame"]).convert("L")
    W, H = img.size
    r = p.get("region") or {"x": 0, "y": 0, "w": 1, "h": 1}
    box = (int(r["x"] * W), int(r["y"] * H),
           int((r["x"] + r["w"]) * W), int((r["y"] + r["h"]) * H))
    px = img.crop(box).load()
    bw, bh = box[2] - box[0], box[3] - box[1]
    step = max(1, min(bw, bh) // 150)
    vals = [px[x, y] for y in range(0, bh, step) for x in range(0, bw, step)]
    mean = sum(vals) / len(vals)
    std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
    floor = p.get("minStd", 12.0)
    return std >= floor, "luma std=%.1f (min %.1f) mean=%.0f" % (std, floor, mean)


CHECKS = {
    "centroid": check_centroid,
    "presence": check_presence,
    "ink": check_ink,
    "absent-color": check_absent_color,
    "nonblank": check_nonblank,
    "detail": check_detail,
    "opaque": check_opaque,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("contract")
    ap.add_argument("frames_dir")
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    with open(args.contract) as fh:
        contract = json.load(fh)
    frames = Frames(args.frames_dir)

    results = []
    for p in contract["promises"]:
        fn = CHECKS.get(p["type"])
        if not fn:
            results.append((p["id"], False, "no verifier for type " + p["type"]))
            continue
        try:
            ok, detail = fn(p, frames, contract)
        except Exception as e:
            ok, detail = False, "check error: " + str(e)
        results.append((p["id"], ok, detail))

    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]

    print("=" * 68)
    print("VERIFY  %s" % contract["meta"].get("message", ""))
    print("  promises: %d   passed: %d   failed: %d   opt-outs: %d"
          % (len(results), passed, len(failed), len(contract.get("optOuts", []))))
    print("-" * 68)
    for pid, ok, detail in results:
        print("  %s  %s  %s" % ("PASS" if ok else "FAIL", pid, detail))
    for o in contract.get("optOuts", []):
        print("  OPT-OUT  %s  WHY: %s" % (o["id"], o["reason"]))
    print("=" * 68)

    if args.json:
        with open(args.json, "w") as fh:
            json.dump({"passed": passed, "failed": len(failed),
                       "results": [{"id": i, "ok": o, "detail": d} for i, o, d in results]},
                      fh, indent=2)

    if failed:
        print("VERIFY RED: %d promise(s) unmet. Render is NOT done." % len(failed))
        sys.exit(1)
    print("VERIFY GREEN.")


if __name__ == "__main__":
    main()

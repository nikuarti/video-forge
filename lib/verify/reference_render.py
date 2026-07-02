#!/usr/bin/env python3
"""reference_render.py :: hermetic CI stand-in renderer (pure PIL, no browser).

Replays the normalized actor tracks in contract._scene to deterministic PNG
frames. This is the CI fallback so `render + verify` runs green offline. In
DEPLOYMENT the real render comes from the HyperFrames browser (render.sh), and
the verifier checks THOSE frames, so the pixel gate is adversarial there.

    reference_render.py <contract.json> <frames_dir> [--scale 0.5]

Renders every frame 0..durationFrames-1 (verifier needs the pre-payoff frames
for absent-color guards). Resolution-independent: geometry is normalized 0..1.
"""
import sys, os, json, argparse

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("reference_render needs Pillow (PIL). pip install Pillow")


def hex2rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def lerp(a, b, t):
    return a + (b - a) * t


def prop_at(actor, tracks, prop, fr):
    """Value of a normalized prop at frame fr: hold-before-first, lerp-inside,
    hold-after-last. Falls back to the actor's stored constant."""
    segs = sorted(tracks.get(prop, []), key=lambda s: s["f0"])
    if not segs:
        return actor.get(prop)
    if fr <= segs[0]["f0"]:
        return segs[0]["v0"]
    for i, s in enumerate(segs):
        if s["f0"] <= fr <= s["f1"]:
            span = max(1, s["f1"] - s["f0"])
            return lerp(s["v0"], s["v1"], (fr - s["f0"]) / span)
        if i + 1 < len(segs) and s["f1"] < fr < segs[i + 1]["f0"]:
            return s["v1"]
    return segs[-1]["v1"]


def build_tracks_index(scene):
    # tracks were recorded on the handle, not serialized; the contract instead
    # carries per-actor tracks under actor["_tracks"] when present. If absent,
    # actors are static at their stored geometry.
    return {a["id"]: a.get("_tracks", {}) for a in scene.get("actors", [])}


def load_font(px):
    try:
        return ImageFont.load_default(size=px)   # PIL >= 10
    except TypeError:
        return ImageFont.load_default()


def render(contract_path, frames_dir, scale):
    with open(contract_path) as fh:
        c = json.load(fh)
    meta, scene = c["meta"], c.get("_scene", {"actors": [], "cuts": []})
    W = max(2, int(meta["width"] * scale))
    H = max(2, int(meta["height"] * scale))
    bg = hex2rgb(meta.get("background", "#0b0b0f"))
    dur = meta["durationFrames"]
    tracks = build_tracks_index(scene)
    os.makedirs(frames_dir, exist_ok=True)

    for fr in range(dur):
        img = Image.new("RGB", (W, H), bg)
        d = ImageDraw.Draw(img)
        for a in scene.get("actors", []):
            tr = tracks[a["id"]]
            op = prop_at(a, tr, "opacity", fr)
            op = a.get("opacity", 1) if op is None else op
            if fr < a.get("enterFrame", 0) or op is None or op <= 0.02:
                continue
            x = prop_at(a, tr, "x", fr) or a["x"]
            y = prop_at(a, tr, "y", fr) or a["y"]
            w = (a.get("w") or 0.2)
            h = (a.get("h") or 0.2)
            col = hex2rgb(a["color"])
            # alpha-composite the actor onto the frame for correct opacity.
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(layer)
            aa = int(max(0, min(1, op)) * 255)
            if a["shape"] == "text" and a.get("text"):
                font = load_font(max(8, int(a.get("fontPx", 64) * scale)))
                tb = ld.textbbox((0, 0), a["text"], font=font)
                tw, th = tb[2] - tb[0], tb[3] - tb[1]
                ld.text((x * W - tw / 2, y * H - th / 2), a["text"],
                        fill=col + (aa,), font=font)
            else:
                x0, y0 = (x - w / 2) * W, (y - h / 2) * H
                x1, y1 = (x + w / 2) * W, (y + h / 2) * H
                if a["shape"] == "ellipse":
                    ld.ellipse([x0, y0, x1, y1], fill=col + (aa,))
                else:
                    ld.rectangle([x0, y0, x1, y1], fill=col + (aa,))
            img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
        img.save(os.path.join(frames_dir, "frame_%05d.png" % fr))
    print("reference_render: %d frames @ %dx%d -> %s" % (dur, W, H, frames_dir))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("contract")
    ap.add_argument("frames_dir")
    ap.add_argument("--scale", type=float, default=0.5)
    a = ap.parse_args()
    render(a.contract, a.frames_dir, a.scale)

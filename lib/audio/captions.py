#!/usr/bin/env python3
"""captions.py :: build burned-caption subtitles from the script's phrase
timings. Emits ASS (libass) so styling (font, size, position, outline) is
controlled and deterministic.

    captions.py <script.json> <out.ass> [--font Inter] [--size 54]

script.json:
    { "phrases": [ { "text": "...", "start": 0.0, "end": 1.8 }, ... ] }
start/end are SECONDS on the SAME clock as the verified silent render. This
step never moves the visual timeline; retiming is a create-step edit that is
re-rendered and re-verified.

Enforces the no-long-dash invariant on every caption.
"""
import sys, os, json, argparse, re

LONG_DASH = re.compile(r"[‒–—―−]|--")


def ass_time(t):
    h = int(t // 3600); t -= h * 3600
    m = int(t // 60); t -= m * 60
    s = int(t)
    cs = int(round((t - s) * 100))
    if cs == 100:
        s += 1; cs = 0
    return "%d:%02d:%02d.%02d" % (h, m, s, cs)


HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{size},&H00FFFFFF,&H00000000,&H64000000,-1,0,1,4,0,2,120,120,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("out")
    ap.add_argument("--font", default="Inter")
    ap.add_argument("--size", type=int, default=54)
    a = ap.parse_args()

    with open(a.script) as fh:
        data = json.load(fh)
    phrases = data.get("phrases", [])
    if not phrases:
        sys.exit("script.json has no phrases")

    lines = [HEADER.format(font=a.font, size=a.size)]
    for i, p in enumerate(phrases):
        text = str(p["text"]).strip()
        if LONG_DASH.search(text):
            sys.exit('INVARIANT: long dash in caption %d: "%s". '
                     'Use a period, comma, colon, or "to".' % (i, text))
        if p["end"] <= p["start"]:
            sys.exit("caption %d has end <= start" % i)
        safe = text.replace("\n", "\\N")
        lines.append("Dialogue: 0,%s,%s,Cap,,0,0,0,,%s" % (
            ass_time(p["start"]), ass_time(p["end"]), safe))
    with open(a.out, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print("captions: %d phrases -> %s" % (len(phrases), a.out))


if __name__ == "__main__":
    main()

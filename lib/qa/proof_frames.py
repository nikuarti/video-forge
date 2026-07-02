#!/usr/bin/env python3
"""proof_frames.py :: pull the frames that PROVE the brief was met.

Copies first frame, payoff frame, and every proofFrame declared in the
contract meta into <out>/proof/, named by role, for human eyeballing during
review.

    proof_frames.py <contract.json> <frames_dir> <out_dir>
"""
import sys, os, json, glob, shutil


def main():
    contract, frames_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(contract) as fh:
        c = json.load(fh)
    files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
    if not files:
        sys.exit("no frames in " + frames_dir)
    proof = os.path.join(out, "proof")
    os.makedirs(proof, exist_ok=True)
    meta = c["meta"]

    def grab(fr, role):
        fr = max(0, min(fr, len(files) - 1))
        dst = os.path.join(proof, "%s_f%05d.png" % (role, fr))
        shutil.copyfile(files[fr], dst)
        print("  %-16s frame %5d -> %s" % (role, fr, os.path.basename(dst)))

    grab(meta.get("firstFrame", 0), "first")
    grab(meta.get("payoffFrame", len(files) - 1), "payoff")
    for i, pf in enumerate(meta.get("proofFrames", []) or []):
        grab(pf, "proof%02d" % (i + 1))
    print("proof frames -> " + proof)


if __name__ == "__main__":
    main()

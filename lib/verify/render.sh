#!/usr/bin/env bash
# render.sh :: produce PNG frames for a composition.
#
# PRIMARY (deployment): the official HyperFrames CLI renders the real browser
# composition frame-by-frame (png-sequence). This is the render whose pixels
# the verifier gates in production.
# FALLBACK (no Chrome / CLI unavailable): the pure-PIL reference renderer
# replays the contract's actor tracks so `render + verify` still runs offline.
#
#   render.sh <project_dir> <contract.json> <frames_dir> [--scale 0.5]
#
# --scale only applies to the fallback renderer (resolution multiplier). The
# real CLI branch forwards any other args straight to `hyperframes render`
# (e.g. --quality draft, --resolution landscape).
set -euo pipefail
PROJ="$1"; CONTRACT="$2"; FRAMES="$3"; shift 3
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pull out --scale (fallback-only) so it never leaks to the real CLI.
SCALE=""
REST=()
while [ $# -gt 0 ]; do
  case "$1" in
    --scale) SCALE="$2"; shift 2;;
    *) REST+=("$1"); shift;;
  esac
done

if npx --no-install hyperframes --version >/dev/null 2>&1; then
  echo "render: HyperFrames CLI (real browser render)"
  rm -rf "$FRAMES" && mkdir -p "$FRAMES"
  npx --no-install hyperframes render "$PROJ" --format png-sequence \
    --quality draft -o "$FRAMES" "${REST[@]}"
  # CLI names frames frame_NNNNNN.png (1-based). verify.py/qa scripts index
  # frames positionally after a lexicographic sort, not by parsing the
  # filename number, so this is compatible with our 0-based promise frames
  # as-is; no renumbering needed.
else
  echo "render: FALLBACK reference renderer (no HyperFrames CLI on PATH)."
  echo "        Production must use the HyperFrames CLI; see ARCHITECTURE.md."
  python3 "$HERE/reference_render.py" "$CONTRACT" "$FRAMES" ${SCALE:+--scale "$SCALE"}
fi

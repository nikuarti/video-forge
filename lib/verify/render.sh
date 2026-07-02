#!/usr/bin/env bash
# render.sh :: produce PNG frames for a composition.
#
# PRIMARY (deployment): the official HyperFrames CLI renders the real browser
# composition frame-by-frame. This is the render whose pixels the verifier
# gates in production.
# FALLBACK (hermetic CI / no browser): the pure-PIL reference renderer replays
# the contract's actor tracks so `render + verify` runs green offline.
#
#   render.sh <index.html> <contract.json> <frames_dir> [--scale 0.5]
set -euo pipefail
HTML="$1"; CONTRACT="$2"; FRAMES="$3"; shift 3
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prefer the real renderer if the HyperFrames CLI is resolvable.
if npx --no-install hyperframes --version >/dev/null 2>&1; then
  echo "render: HyperFrames CLI (real browser render)"
  # The CLI seeks the single paused timeline frame-by-frame and writes PNGs.
  npx --no-install hyperframes render "$HTML" --out "$FRAMES" --format png "$@"
else
  echo "render: FALLBACK reference renderer (no HyperFrames CLI on PATH)."
  echo "        Production must use the HyperFrames CLI; see ARCHITECTURE.md."
  python3 "$HERE/reference_render.py" "$CONTRACT" "$FRAMES" "$@"
fi

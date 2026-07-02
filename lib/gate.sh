#!/usr/bin/env bash
# gate.sh :: the golden gate. extract contract -> render silent -> VERIFY green.
# A render is NOT done until this exits 0.
#
#   lib/gate.sh <project_dir> [--scale 0.5]
#
# Expects <project_dir>/composition.js (exports buildComposition) and
# <project_dir>/index.html. Writes <project_dir>/out/{contract.json, frames/,
# report.json}.
set -euo pipefail
PROJ="${1:?usage: gate.sh <project_dir> [--scale N]}"; shift || true
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$PROJ/out"
mkdir -p "$OUT/frames"
rm -f "$OUT/frames"/frame_*.png

echo "==> build kit (guard: motion-kit.js in sync with src)"
node "$ROOT/lib/build.js" --check

echo "==> extract contract (headless, deterministic)"
node "$ROOT/lib/verify/extract_contract.js" "$PROJ/composition.js" "$OUT/contract.json"

echo "==> render silent"
bash "$ROOT/lib/verify/render.sh" "$PROJ/index.html" "$OUT/contract.json" "$OUT/frames" "$@"

echo "==> verify (pixel gate)"
python3 "$ROOT/lib/verify/verify.py" "$OUT/contract.json" "$OUT/frames" --json "$OUT/report.json"

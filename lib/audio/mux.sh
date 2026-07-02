#!/usr/bin/env bash
# mux.sh :: assembly finish. Encode the VERIFIED silent frames to video, mix a
# voiceover with a side-chain DUCKED music bed, and BURN captions (libass).
#
# This step must NOT move the visual timeline. It consumes the already-verified
# silent render as-is. Retiming is a create-step edit (re-render + re-verify).
#
#   mux.sh --frames <dir> --fps <n> [--vo vo.wav] [--music bed.mp3] \
#          [--captions cap.ass] --out final.mp4
#
# Requires ffmpeg built WITH libass (checked below).
set -euo pipefail

FRAMES=""; FPS="30"; VO=""; MUSIC=""; CAP=""; OUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --frames) FRAMES="$2"; shift 2;;
    --fps) FPS="$2"; shift 2;;
    --vo) VO="$2"; shift 2;;
    --music) MUSIC="$2"; shift 2;;
    --captions) CAP="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[ -n "$FRAMES" ] && [ -n "$OUT" ] || { echo "need --frames and --out" >&2; exit 2; }

if ! ffmpeg -hide_banner -version | grep -q 'enable-libass'; then
  echo "ERROR: ffmpeg lacks libass; cannot burn captions." >&2; exit 3
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
SILENT="$TMP/silent.mp4"

# 1) frames -> silent video (yuv420p for broad playback).
ffmpeg -y -hide_banner -loglevel error -framerate "$FPS" \
  -i "$FRAMES/frame_%05d.png" -pix_fmt yuv420p -c:v libx264 -crf 18 "$SILENT"

# 2) build the video filter for burned captions (if any).
VF=()
if [ -n "$CAP" ]; then VF=(-vf "ass=$CAP"); fi

# 3) audio graph: duck music under VO via sidechaincompress, then amix.
if [ -n "$VO" ] && [ -n "$MUSIC" ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$SILENT" -i "$VO" -i "$MUSIC" \
    -filter_complex "[2:a]volume=0.6[m]; \
      [m][1:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck]; \
      [1:a][duck]amix=inputs=2:duration=first:dropout_transition=0[a]" \
    -map 0:v -map "[a]" "${VF[@]}" -c:v libx264 -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -shortest "$OUT"
elif [ -n "$VO" ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$SILENT" -i "$VO" \
    -map 0:v -map 1:a "${VF[@]}" -c:v libx264 -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -shortest "$OUT"
elif [ -n "$MUSIC" ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$SILENT" -i "$MUSIC" \
    -map 0:v -map 1:a "${VF[@]}" -c:v libx264 -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -shortest "$OUT"
else
  ffmpeg -y -hide_banner -loglevel error -i "$SILENT" "${VF[@]}" \
    -c:v libx264 -crf 18 -pix_fmt yuv420p "$OUT"
fi

echo "muxed -> $OUT"

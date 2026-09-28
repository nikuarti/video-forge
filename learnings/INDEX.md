# Learnings INDEX

The MEMORY layer (inbox). One dated file per session insight; this index lists
them newest first. **Proprietary. Grows over time.** Starts empty.

How it works:
- `video-review` writes one file per session: `YYYY-MM-DD-slug.md`.
- **Mechanics-grade** learnings also land as kit code + a generic `verify.py`
  check in the same session (never only prose here).
- **Taste** learnings that recur **2+ times** are proposed for promotion into
  `best-practices/` (never silently applied).
- **Recent learnings outrank older best-practices on conflict.**

Learning file front-matter: `date`, `project`, `kind` (mechanics|taste),
`recurrence` (count), `promoted` (yes/no + target), `summary`.

| Date | Project | Kind | Recur | Summary |
|------|---------|------|-------|---------|
| 2026-09-28 | screen-recording-demo (private) | mechanics | 1 | png-sequence renders were transparent (black when encoded) but gate stayed green: kit now paints bg + `opaque` check; footage gated by new `detail` check; mux.sh frame-glob fix. |

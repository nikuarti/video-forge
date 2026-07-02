# templates/

Starter material for new work.

- `brief-template.md` — the decision-complete brief `video-create` requires.
- `change-request.md` — how edits re-enter the gate.
- `starter/` — a **render-tested** minimal composition (`index.html` +
  `composition.js`) that passes `lib/gate.sh` out of the box. Copy it to
  `projects/<slug>/` and build from there.

## One scaffold, many genres

The starter is genre-agnostic **by design**: the *mechanics* of a composition
(single paused timeline, contract-backed primitives, gate) are identical across
`product-launch`, `feature-demo`, `explainer`, `testimonial`, `social-teaser`,
and `brand-story`. What differs per genre is **beats, taste, and story spine**,
which live in `best-practices/<genre>.md`, not in HTML boilerplate. So every
genre starts from `starter/` and diverges in the composition body, guided by its
best-practices file. (Duplicating six near-identical scaffolds would rot; the
gate is the shared contract.)

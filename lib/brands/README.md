# lib/brands/ — brand UI, propagated into videos

**Component sourcing priority #2** (after kit primitives, before the catalog):
real product UI, adapted so a video shows the *actual* interface, not a
lookalike.

This directory ships as an **empty, documented template**. It contains NO real
brand assets — those are grown per deployment. `example-brand/` is a worked
stub you copy and fill.

## Per-brand layout

```
lib/brands/<brand>/
  README.md            what this brand is, source of truth, do/don't
  tokens.json          colors, type, spacing, radii  (drives colorGuard + captions)
  components/*.js       adapted product components (deterministic, no network)
  adapt.mjs            copy/adapter script: pulls source UI -> deterministic component
```

## Rules for adapted components

- **Deterministic only.** No `Math.random`, `Date.now`, or `fetch` — the
  renderer re-seeks frames. Freeze any dynamic data into props.
- **Verifiable.** A component that produces a load-bearing on-screen moment
  must be paired with a contract promise (via a kit primitive or
  `MotionKit.wrapCatalog`). If it can't be, mark a documented `MotionKit.optOut`
  with a WHY.
- **Tokens are the bridge.** Pull brand colors from `tokens.json` so
  `colorGuard` (what must / must not appear) and captions styling stay in sync
  with the real brand.

## Adding a brand

```
cp -r lib/brands/example-brand lib/brands/<brand>
# edit tokens.json + README, run adapt.mjs to bring in real components
node lib/brands/<brand>/adapt.mjs
```

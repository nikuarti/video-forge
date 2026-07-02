# example-brand (TEMPLATE)

A worked stub for the brand layer. **No real assets.** Copy this folder to
`lib/brands/<brand>/` and replace everything.

- `tokens.json` — colors / type / spacing. Source of truth for `colorGuard`
  and caption styling. **Edit these to the real brand.**
- `components/statCard.js` — one example adapted component: a deterministic
  product card that mounts into a composition stage and exposes a
  contract-friendly selector.
- `adapt.mjs` — the copy/adapter entrypoint. In a real brand this pulls the
  live product component and freezes it into a deterministic version. Here it
  just validates tokens and lists components.

## How a component reaches a video

1. The composition `place()`s a host element (selector = the component root).
2. `adapt.mjs`-produced component renders into that element deterministically.
3. A kit primitive (or `MotionKit.wrapCatalog`) registers the promise that
   gates the moment (e.g. the accent color must be present at the payoff).

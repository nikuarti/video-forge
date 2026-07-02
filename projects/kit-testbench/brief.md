# Brief: kit-testbench

Not a marketing video. The KIT's own CI composition. It exercises every
contract-backed primitive so the kit cannot change without a green
render + verify. Carries NO brand taste.

## Message (MANDATORY)
> The motion kit renders one composition and verifies every promise.

## Format
- Type/genre: internal CI fixture
- Length: 4s   Aspect: 16:9   FPS: 30   Quality: draft

## Narrative
- Hook (first frame): the hero dot is on screen at frame 0.
- Spine: hero slides to center, a cut, the title reveals, an accent pays off.
- Payoff (frame 118): title + accent present, non-blank.

## Gates exercised
- `moveTo` centroid promise (hero at center by 1.0s).
- `revealText` ink promise (title non-empty after 2.1s).
- `colorGuard`: accent #2ce6a0 absent before 2.0s.
- `fade` presence promise (accent present by 3.0s).
- `payoff` + first-frame non-blank.

## Run
```
lib/gate.sh projects/kit-testbench            # or: npm run gate:testbench
```

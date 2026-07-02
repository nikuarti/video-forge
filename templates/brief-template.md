# Brief: <slug>

A brief is **decision-complete** before any building starts. `video-create`
refuses to scaffold until the message is present; fill the rest so no creative
decisions are deferred into code.

## Message (MANDATORY, one sentence)
<!-- What must the viewer understand after watching? One idea. No long dashes. -->
>

## Format
- Type / genre: <product-launch | feature-demo | explainer | testimonial | social-teaser | brand-story>
- Length: <seconds>   Aspect: <16:9 | 9:16 | 1:1>   FPS: <30 | 60>   Quality: <draft | final>

## Narrative
- Hook (first frame): <what grabs in frame 1>
- Spine: <the through-line, one line>
- Payoff (final frame): <the landing>

## Brand
- Brand tokens: <lib/brands/<brand>/tokens.json or "none">
- Must-use accent color(s): <hex>

## Audio plan
- Voiceover: <yes/no; source>   Music bed: <track + LEGAL source; never lifted>
- Captions: <burned yes/no; font/size>

## Beats (by timestamp)
| t (s) | Beat | On screen | Notes |
|-------|------|-----------|-------|
| 0.0 | hook | | |
| | | | |

## Gates (machine-checkable)
- Must-hit beats: <timestamps>
- What must NOT appear early: <element/color + before when>
- First frame / payoff frame: <describe both>
- Proof timestamps: <times the reviewer must find proof the message landed>

## Constraints
- No long dashes anywhere on screen or in filenames.
- Deterministic composition (no Math.random / Date.now / fetch).
- Single composition unless mixing real recorded footage.

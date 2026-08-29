---
target: Teams grid + empty state (app/(public)/teams)
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-08-29T13-47-43Z
slug: app-public-teams
---
⚠️ DEGRADED: single-context (no sub-agent spawned — harness policy is not to spawn sub-agents unless the user asks; browser inspection unavailable — Chrome extension declined this session)

# Critique — Teams grid + empty state (`app/(public)/teams`)

Scope: the redesigned `PublicTeamCard.tsx` (Marquee) and `TeamsPage.tsx` grid/empty state. Match-history ledger not yet built.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hover states good; no focus-visible state on the card link |
| 2 | Match System / Real World | 4 | `N players`, captain, brick # are domain-natural |
| 3 | User Control and Freedom | 3 | n/a — grid of links, easy to leave |
| 4 | Consistency and Standards | 3 | Drops the DESIGN-mandated trailing chevron; brick-color chip is a per-team hue |
| 5 | Error Prevention | 3 | n/a for a read-only grid |
| 6 | Recognition Rather Than Recall | 4 | Logo, name, captain, count all visible |
| 7 | Flexibility and Efficiency | 2 | No keyboard focus affordance; hover-only styling |
| 8 | Aesthetic and Minimalist Design | 4 | Disciplined, one identity color on a neutral card |
| 9 | Error Recovery | 3 | Zero-teams handled; nothing else to recover |
| 10 | Help and Documentation | 3 | n/a for a grid |
| **Total** | | **32/40** | **Good** |

## Anti-Patterns Verdict

**LLM assessment:** Does not read as AI slop. The prior card had four concrete tells (4px side-stripe, `hover:shadow-md`, tinted logo backdrop, sub-12px type); all are gone. The Marquee is on-system: `.panel`, square corners, flat-at-rest, one color. It passes the product slop test — a category-fluent user would trust it.

**Deterministic scan:** `detect.mjs` over both files returned `[]` — zero findings. impeccable design hooks also clean on both writes.

**Visual overlays:** Not available — the Chrome extension was declined this session, so no browser render/overlay was captured. Findings below are from source + DESIGN.md, not a live pixel inspection.

## Overall Impression

Solid, disciplined execution of a locked design. The card is genuinely on-brand and the empty state is textbook. The real gaps are in *interaction completeness*, not aesthetics: keyboard users get no affordance, and one small color decision carries an accessibility risk. Biggest single opportunity: make the card a fully-stated interactive component (focus = hover), not a hover-only one.

## What's Working

1. **Every documented violation is actually fixed.** Side-stripe, shadow-md hover, `18`-hex logo tint, and all sub-12px/off-ramp type are gone and snapped to the ramp. This isn't cosmetic — it's the card rejoining the system.
2. **The empty state is exactly what DESIGN.md prescribes** — unboxed centered Quiet Ink at the grid's min-height. It even names the specific anti-pattern it avoids (box-around-nothing).
3. **Color restraint is correct.** One identity-colored chip on an otherwise neutral card is the right read of "the human layer is the advantage" without drifting into a rainbow-per-team grid.

## Priority Issues

**[P1] No focus-visible state on the card link.**
- Why it matters: the whole card is a `<Link>`, but `cardClasses` only defines `hover:` variants. A keyboard user tabbing through the grid gets only the browser default outline — the border→blue, shadow, and lift never fire on focus. This is the clearest a11y gap and it also breaks DESIGN's own rule that interactive panels light up on `:hover` **and** `:focus-visible`.
- Fix: mirror the hover treatment on `focus-visible` — `focus-visible:border-primary focus-visible:shadow-sm focus-visible:-translate-y-px` (plus the `motion-reduce` guard), or add the 3px Action-Blue ring the design system uses for controls. Same for the non-navigable `opacity-60` card (it shouldn't be focusable as a link — it isn't a link, so fine).
- Suggested command: `/impeccable audit`

**[P2] Brick-# chip contrast can fail 4.5:1.**
- Why it matters: the chip is `color: brickColor` on a `${brickColor}20` tint over Surface — small 12px mono text, so it needs 4.5:1. `getBrickDisplayColor` only pulls in *very* light (L>82) or *very* dark bricks; a mid-tone like gold `#D4A017` or lime stays as-is and lands around ~2.5–3:1 on white. The team's brick number is real data a user reads.
- Fix: either darken the text leg specifically for the chip (drive the text color down to ~L40–45 while keeping the tint at the brand hue), or drop the tint and render the chip as neutral (recessed bg + ink text) with the color living only in the logo. Verify the worst-case bricks (yellow/lime/cyan) at 12px.
- Suggested command: `/impeccable audit`

**[P2] The DESIGN-mandated trailing chevron is dropped.**
- Why it matters: DESIGN.md §4/§5/Do's say a clickable panel announces itself at rest with a full-strength border **and a 12px trailing chevron**. Here the affordance leans entirely on the border — but *every* `.panel` on the site carries a 1px border at rest, so "full-strength border" only reads as an affordance when a lighter static-panel border sits nearby to contrast against. On an all-clickable grid there's no such contrast, so at-rest discoverability is weaker than the system intends. You flagged this was a locked call; noting it so the deviation is explicit and consistent with how the upcoming ledger rows (which *will* have chevrons) behave.
- Fix: either add the trailing chevron (bottom-right, `text-muted-foreground`, appears/strengthens on hover) or accept the deviation knowingly and document it as a sanctioned exception like the featured-match-card carve-out.
- Suggested command: `/impeccable polish`

**[P3] Brick-color chip vs. the No-Third-Accent Rule.**
- Why it matters: DESIGN.md restricts hue to act(blue)/locate(yellow)/destroy(red) and draws everything else from neutral. A per-team brick hue is technically outside that. It's defensible as *brand identity* (like the logo) rather than categorical UI color, and it's one small chip — but it's the one place the card spends color, so it's worth being deliberate.
- Fix: no change if the identity-color read is intentional (it likely is). If you want strict compliance, neutral chip + color only in the logo.
- Suggested command: `/impeccable colorize`

## Persona Red Flags

**Sam (Accessibility-Dependent):** Tabs into the grid and sees no focus ring beyond the browser default — the rich hover affordance is invisible to keyboard nav (P1). The brick-# chip may drop below 4.5:1 for several teams (P2). Win/loss isn't in play here, so color-as-sole-meaning isn't triggered — the brick number is text, not color-only.

**Riley (Stress Tester):** Coverage is actually strong — long names truncate, no-logo → recessed initials, no-captain → "No captain", null brick color → neutral chip, zero teams → clean empty state. One rough edge: a team with 0 players renders "0 players" top-right, which reads slightly odd for a placeholder/forming team. Minor.

**Community Follower (project persona — reads without playing):** Lands on the grid to find a team fast. The logo-forward portrait card serves this well; scanning by crest is faster than by name. No complaint — this persona is well-served.

## Minor Observations

- Header padding is `py-3` (12px), footer `py-2.5` (10px). Small asymmetry; align them unless the visual weight is deliberate.
- Body reserves `min-h-[208px]` for a 108px logo — lots of air. Intentional for the marquee/portrait gravity, but worth confirming it doesn't read as sparse at 4-up on a 1024px viewport.
- `sizes="...25vw"` on the logo matches the new 4-up grid at `lg` — good, but it's `100vw`/`50vw`/`25vw` while the grid is 1/2/4 cols, so the 50vw (2-col) branch is correct; fine.

## Questions to Consider

- Should the card be a fully-stated interactive component (focus == hover) before it ships, or is hover-only acceptable for a public browse grid?
- Is the brick-# color carrying enough meaning to justify the contrast risk and the accent-rule tension — or would the color be better spent entirely in the logo?
- If the ledger rows get chevrons and these cards don't, are two different at-rest affordances for two clickable surfaces on the same feature a consistency problem?

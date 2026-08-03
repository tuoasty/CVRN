---
target: leaderboard page
total_score: 21
p0_count: 0
p1_count: 4
timestamp: 2026-08-01T06-29-21Z
slug: app-public-leaderboard-leaderboardpage-tsx
---
⚠️ DEGRADED: single-context (harness config forbids spawning sub-agents unless the user asks; Assessment A and B run inline)

Browser inspection: not run. Dev server is up on `:3000`, but the Chrome automation path needs a skill load plus site permissions, and every claim below is verifiable from source. No overlay exists in your browser — nothing was injected.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `keepPreviousData: true` with `isLoading` only true on first load — switching region silently shows the previous region's rows, and the "N players" count stays stale, with no pending cue |
| 2 | Match System / Real World | 2 | APK, DLK, WT, BF, SRV+, STE — league-specific abbreviations behind hover-only tooltips |
| 3 | User Control and Freedom | 2 | `router.replace` means Back doesn't undo a sort or view change, it exits the page; no reset-filters affordance |
| 4 | Consistency and Standards | 2 | Two differently-styled segmented controls stacked in one filter bar; a third focus-ring vocabulary (`ring-1`) |
| 5 | Error Prevention | 3 | Genuinely strong — unknown region/view/sort keys fall back safely, `viewHasColumn` blocks sorting by an invisible column |
| 6 | Recognition Rather Than Recall | 2 | No season label, no legend, no qualifier context; abbreviations must be re-hovered |
| 7 | Flexibility and Efficiency | 2 | No player search on a board whose stated primary job is looking up a specific player |
| 8 | Aesthetic and Minimalist Design | 2 | 16 columns at uniform visual weight; nothing separates rank 1 from rank 60 |
| 9 | Error Recovery | 2 | Raw `result.error.message` rendered to users; `errorCodeToUserMessage` exists and isn't used; no retry |
| 10 | Help and Documentation | 2 | Per-column tooltip descriptions are good, but hover-only and undiscoverable |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**Does this look AI-generated?** No. This reads as hand-built by someone who understands the domain. The null-sorting comment, the `viewHasColumn` guard, the deliberate count-not-rate default sorts, and the LATERAL join in the view are all evidence of real thought about failure modes, not generated boilerplate.

**Deterministic scan**: 4 findings, all advisory, all the same rule — `design-system-font-size` in `LeaderboardTable.tsx` at lines 73, 96 (11px) and 81, 177 (10px), off the type ramp `DESIGN.md` documents. No ban violations, no gradient text, no side-stripes, no glassmorphism.

**Correction to something I told you earlier**: I flagged the muted header text as a contrast failure. It isn't — `#71717A` on `#FFFFFF` is 4.6:1 and passes AA, and `text-foreground/70` data cells land around 5.3:1. The real problem is the **size**, not the contrast. 10px and 11px are below the 12px floor, which is what the detector caught.

## Overall Impression

The engineering here is ahead of the design. The data layer is careful, the URL state is well modelled, and the edge cases someone would actually hit are handled. What's missing is the hierarchy that turns a grid of numbers into a leaderboard — right now every row and nearly every cell carries the same visual weight, which is precisely the "spreadsheet on the web" anti-reference in `PRODUCT.md`. The single biggest opportunity is not the column restructure you proposed; it's that **rank 1 currently looks exactly like rank 40**.

## What's Working

1. **The null-sorting decision** (`LeaderboardTable.tsx:33-40`). Nulls sort last in *both* directions, with a comment explaining that treating `hit_eff: null` as `-Infinity` would float no-attempt players to the top of an ascending sort. That's a bug most implementations ship.
2. **URL as the state container.** `buildLeaderboardQuery` omits defaults so the clean state is a bare `/leaderboard`, and `PublicNavItems.tsx:69` pre-fills the region from season context so leaving a region doesn't reset scope. Every board state is shareable — exactly right for a league where people paste links into Discord.
3. **Count-not-rate default sorts** (`playerStatColumnMeta.ts:124-134`), with the reasoning written down: no min-sets qualifier means a rate default would land every visitor on a two-set player at 100%.

## Priority Issues

### [P1] The stat block shifts because the table uses auto layout — your fix is necessary but not sufficient

**Why it matters**: This is the complaint you led with, and fixing only the Player column width won't resolve it. `<Table>` renders a plain `<table>` with `border-collapse` and no `table-layout: fixed`, so the browser distributes width by content. Changing Overview (16 columns) → Setting (8 columns) changes the content, so *every* column is re-measured and the whole grid reflows. A fixed Player width removes one input to that calculation; the remaining columns still shift.

**Fix**: `table-fixed` on the `<table>`, an explicit `w-[...]` on the Player `<th>` (not `min-w-`), and explicit widths on the stat columns — `playerHeadWidthClass` already computes per-format widths, so switch those from `min-w-*` to `w-*`. Note the ambiguity in "align stat columns to the left": if you mean *the block should start at a consistent x-position*, `table-fixed` plus a fixed Player width delivers that for free. If you mean `text-align: left` on the numbers themselves, don't — left-aligning numerals breaks digit alignment. Right-align (or keep centered) with `tabular-nums`, which the cells already do.

**Suggested command**: `/impeccable layout app/features/leaderboard/LeaderboardTable.tsx`

### [P1] The table has no season identity, on a view whose grain is (player, season)

**Why it matters**: `20260801000000_player_leaderboard_view.sql:5-8` states the grain is one row per player-season and that "a player who appeared in two regions is two rows, **labelled**." Nothing in the UI labels the season. The row key is `${player_id}-${season_id}`, `season_slug` and `season_name` are both selected and both unused. Today this is latent because regions have one season of stat data. The moment a second season lands, the same player appears twice with visually identical rows and no way to tell which is which — on a product whose positioning is "the league's permanent record."

**Fix**: You're restructuring columns anyway; this is the moment. Add Season alongside the Region and Team columns you're planning. Note the interaction with your Region column: when a specific region is selected — the common case, since the nav pre-fills it — Region is a constant and wastes width. Render Region only when `region === "all"`; the same logic will apply to Season once a season filter exists.

**Suggested command**: `/impeccable shape leaderboard identity columns`

### [P1] Rate columns are sortable with no minimum-sets qualifier

**Why it matters**: You documented this for the *defaults* and then left the interactive path unguarded. Any visitor can click HIT%, SET%, or KB% and rank 1 becomes whoever played two sets and went 2-for-2. For a product whose first design principle is legitimacy through structure, a leaderboard toppable by a two-set sample is the exact failure that makes a league look unserious.

**Fix**: A minimum-sets threshold applied when the active sort is a rate column, with the qualifier stated in the UI ("min. 6 sets") and unqualified players shown below the qualified block rather than hidden. Hiding them silently would be worse than the current state.

**Suggested command**: `/impeccable harden app/features/leaderboard`

### [P1] This is the heaviest public query in the app and the only public page not using your cache layer

**Why it matters**: You asked me to recheck caching. It isn't broken — it's absent. `getPlayerLeaderboardAction` is a Server Action (a POST) that calls `createServerSupabase()`, which reads cookies and makes the request uncacheable at every layer. `findPlayerLeaderboard` then runs `select("*")` with no limit, returning every player-season row for the region. That is exactly the pattern the `HomePage.tsx:28-36` comment describes fixing for the home page: "six uncacheable server-action POSTs on every view of the most-trafficked page." `server/cache/publicReads.ts` already has the answer — `unstable_cache` + `createPublicClient()` + a tag + `PUBLIC_REVALIDATE_SECONDS` — applied to standings, teams, matches, player detail, and playoffs. The leaderboard is the one that skipped it.

**Fix**: `getCachedPlayerLeaderboard` in `publicReads.ts`, keyed by region, tagged on stats, consumed by a server component so the data ships with the HTML like the home page does. Then pagination on top. Worth knowing: your two changes are coupled — taller rows plus no pagination makes the page longer, so deferring pagination while shipping taller rows makes that axis worse, not neutral.

**Suggested command**: `/impeccable optimize app/(public)/leaderboard`

### [P2] Density without hierarchy — the anti-reference, in the one place it matters most

**Why it matters**: Overview renders 16 columns where every value is `text-foreground/70`, the only differentiation is a `bg-primary/5` tint on the sorted column, and rank is a bare muted number. Nothing marks the top of the board. `PRODUCT.md` names "a spreadsheet on the web" as an anti-reference and `DESIGN.md` states density must never collapse into an undifferentiated grid — this is currently that grid. The filter bar compounds it: the region group is `rounded-sm`, `bg-muted/50`, `text-xs font-semibold`, active `bg-primary`; `StatViewSelector` directly below it is `rounded-lg`, `bg-muted`, `text-sm font-medium`, active `bg-background shadow-sm`. Two segmented controls, same job, two visual languages, stacked.

**Fix**: Give the leading rank column real weight and mark the top three. Make the sorted column's *values* heavier rather than tinting the cell background. Unify the two segmented controls on one treatment. And raise 10px/11px to the 12px floor — your users are on desktop, you have the width.

**Suggested command**: `/impeccable layout app/features/leaderboard` then `/impeccable polish`

## Persona Red Flags

**Alex (Power User)** — the returning player checking his own numbers:
- No player search. On a board listing every player in the league, finding himself means Ctrl+F or scrolling. His single most common action has no affordance.
- Sorting is one click, which is good — but there's no multi-sort, no column pinning beyond Player, and no CSV export for someone who wants to do his own analysis.
- Back button doesn't undo his last sort; after five clicks, Back exits the leaderboard entirely.

**Sam (Accessibility-Dependent)**:
- Every column definition is in a hover-only tooltip. Keyboard focus does open Radix tooltips, but on touch there is no path to them at all — "APK" is unexplainable to a tablet user.
- `aria-sort` is correctly on the `<th>`; that part is right.
- Sort state is carried by color (`bg-primary/10` on the header, `bg-primary/5` on cells) plus an arrow icon. The arrow saves it — but the sorted-cell tint is color-only and invisible to him.
- 10px group headers fail a 200% zoom comfortably before the layout does.

**Project-specific — "Dimas", the rostered player** (from `PRODUCT.md`: players are co-primary, desktop, arriving to look up their own numbers):
- Lands on `/leaderboard?region=as` from the nav, sees ~60 rows sorted by total points, and has no way to jump to himself.
- His team logo renders at 16px next to a 24px avatar — the "human layer is the advantage" principle is present but too small to deliver on. Your instinct to enlarge both is correct.
- If he played in two seasons, he sees two identical-looking rows.

**Project-specific — "Rey", the spectator** (community, non-player):
- Reads "HIT%" and "SET%" with no idea they're efficiency ratios rather than percentages of something.
- Sees a player ranked #1 in HIT% at 100% and has no signal that it's a two-set sample.
- The empty state says "No player stats recorded yet" even when the real cause is that the region he filtered to has no data — "yet" implies never.

## Minor Observations

- **Rank is positional, not competition-ranked.** `rank={i + 1}` gives tied players 4 and 5 instead of 4 and 4. Small, but it's a correctness detail on a leaderboard.
- **Error copy is raw.** `usePlayerLeaderboard` surfaces `result.error.message` straight from the serialized error; `app/lib/errorMessages.ts:errorCodeToUserMessage` exists for this. No retry button either.
- **Empty state conflates two causes** — "no stats exist" and "your filter matched nothing" get the same sentence.
- **`unoptimized` on both `<Image>`s** is deliberate (per the "removed excessive image optimization" commit), but enlarging avatars and logos raises the payload on a page that already ships every row. Worth a look, not a blocker.
- **A third focus vocabulary.** `ring-1` in the filter bar, `ring-2` in `PublicNavItems`, `ring-[3px]` in the shadcn primitives.
- **`StatViewSelector` uses `rounded-lg`, `rounded-md`, and `shadow-sm`** — a resting shadow inside the page flow, against the flat-page rule.

## Questions to Consider

- The board's stated primary job is "look up a specific player." What would this page look like if search were the *first* control instead of an absent one?
- Rank is currently a 6px-wide muted number. On a leaderboard, is rank the least important thing on the row, or the most?
- If a rate column can be topped by a two-set player, is it a leaderboard column or a profile column?
- Overview shows 16 columns. If you could only show six on first paint, which six would a player actually want — and would the other ten be missed?

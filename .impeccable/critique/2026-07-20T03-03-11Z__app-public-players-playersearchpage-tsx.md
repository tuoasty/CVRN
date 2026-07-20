---
target: /players search page
total_score: 21
p0_count: 0
p1_count: 3
timestamp: 2026-07-20T03-03-11Z
slug: app-public-players-playersearchpage-tsx
---
⚠️ DEGRADED: single-context (plan mode restricted sub-agent types; no browser automation exposed — source-level analysis + CLI detector only)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Default "recent players" list unlabeled — user can't tell what state they're in |
| 2 | Match System / Real World | 3 | Bare region codes (EU/NA) never expanded |
| 3 | User Control and Freedom | 2 | No URL state — can't share, bookmark, or back-button a search; Esc not wired |
| 4 | Consistency and Standards | 2 | Two table systems in one app: CSS-grid + absolute avatars here, semantic `<Table>` + 44px logos in StandingsTable |
| 5 | Error Prevention | 3 | Low-stakes surface |
| 6 | Recognition Rather Than Recall | 3 | Labels present, header strip helps |
| 7 | Flexibility and Efficiency | 1 | No keyboard nav through results, no region/season filters despite the subtitle's promise |
| 8 | Aesthetic and Minimalist Design | 1 | Mid-row void, ragged usernames, floating logo |
| 9 | Error Recovery | 2 | usePlayerSearch error discarded; failed fetch renders as "No players found" |
| 10 | Help and Documentation | 2 | No region-code key, no explanation of the default list |
| **Total** | | **21/40** | **Acceptable — low end** |

## Anti-Patterns Verdict

**Deterministic scan:** 2 hits, both `border-l-4` side-tab accents in `app/features/players/AddPlayerToTeam.tsx:226,264` (admin surface, outside this page).

**LLM assessment:** Does not read as AI-generated in concept — the free-floating bust avatar and brick-color edge glow are genuinely non-generic choices. It reads as broken in execution. One on-page violation: gradient text in `PublicPageHeader.tsx:19` (`bg-clip-text text-transparent`), a shared component affecting every public page.

## Overall Impression

All three reported symptoms — floating team logo, stranded region column, ragged usernames — share one root cause. `PlayerRow.tsx:10` used `grid-cols-[minmax(0,1fr)_3rem_auto]` (one greedy track, two hugging) inside `page-wide` (`max-w-[1440px]`). The name track got ~1050px for ~250px of content, flushing region and team to the far edge and manufacturing a ~1000px mid-row void. No `justify-between` was ever declared.

Secondary: the avatar was not a grid column — `absolute left-4` with the grid compensating via `pl-20`, so the visual first column didn't exist in the layout system.

## What's Working

- **The avatar concept.** Transparent bust, bottom-anchored, bleeding to the row edge — a real idea with personality, suited to a Roblox league.
- **Accessibility discipline.** `role="search"`, `aria-live="polite"`, `aria-busy`, `sr-only` count, labeled clear button. Above average.
- **Skeleton parity.** Shared `PLAYER_ROW_GRID` across row, header, and skeleton means no layout shift on load.

## Priority Issues

- **[P1] 1440px canvas is the root cause.** Search list with 3 data points on a standings-table canvas. → `max-w-4xl`. *(fixed)*
- **[P1] Avatar is an absolute overlay with padding faking space.** `pl-20` compensating for `absolute left-4`; forces `overflow-hidden` which clips the bust. → real grid track. *(fixed)*
- **[P1] Display name and username share one text flow.** `@username` starts at a different x every row. → separate fixed tracks. *(fixed)*
- **[P2] Team logo floats because the pair is right-aligned.** `justify-end` with logo-then-name makes logo x a function of name length; 20px vs 44px in StandingsTable; slot collapses when `logo_url` is null. → fixed left-anchored track, 24px, reserved slot. *(fixed)*
- **[P2] Search failures indistinguishable from empty results.** Page discarded the hook's `error`; a failed fetch confidently reported the player doesn't exist. → distinct error state + retry. *(fixed)*
- **[P3] Brick-color wash sits where the layout already struggles.** `w-1/3` ≈ 460px of gradient in the stranded zone. → narrowed to `w-24`. *(fixed)*

## Persona Red Flags

**Alex (power user):** Cannot arrow-key into results — mouse required. Can't share a search URL. Subtitle promises "every region and season" with no filter.

**Sam (accessibility):** Region code `EU` announced as a bare letter pair. `focus-visible:outline-none` removed the fallback with only a 40% bg tint as indicator. *(focus ring fixed)*

**Casey (mobile):** Region and team name both `hidden` below `sm` — a name and a bare 20px logo, no way to identify the team. *(fixed via stacked mobile row)*

## Minor Observations

- `min-h-[3.75rem]` rows with a 56px avatar leave ~4px vertical breathing room.
- No result cap or "showing N of M".
- `autoFocus` scroll-jumps mobile users into the keyboard on load. *(left as-is, flagged)*

## Open / Deferred

- **`brick_color` may render as nothing.** Not a Roblox BrickColor name — `server/utils/googleSheets.ts:44` converts Sheets float RGB to `#rrggbb`, so the CSS is valid. But the value is the spreadsheet cell's background, often white or pale pastel. At low opacity that's invisible in both themes. **Dump real values before leaning on it.**
- Gradient text in `PublicPageHeader.tsx:19` — banned pattern, shared component, separate decision.
- `border-l-4` in `AddPlayerToTeam.tsx:226,264`.
- No URL state on search; no keyboard nav; no region/season filter.

## Questions to Consider

- Does this need a header strip at all? Three fields is a list, not a table.
- Should region be a column, or a tag next to the username?
- Is the default "recent players" list earning its space?

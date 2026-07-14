---
target: standings page (StandingsTable)
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-07-14T06-06-55Z
slug: app-features-standings-standingstable-tsx
---
Method: ⚠️ DEGRADED: single-context (no unprompted sub-agents per session rules)
Browser inspection: unavailable (no browser-automation tool exposed) — review is source-read + reasoning, not live-pixel.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeletons good; no "last updated"/freshness signal on a live-updating table |
| 2 | Match System / Real World | 2 | "LVR" and the ±delta are unexplained jargon to a first-time visitor |
| 3 | User Control and Freedom | 3 | Read-only surface; no column sort or team filter, but low stakes |
| 4 | Consistency and Standards | 3 | Uses tokens + shadcn table; medal colors are raw Tailwind, off-system |
| 5 | Error Prevention | 3 | Read-only; little to prevent |
| 6 | Recognition Rather Than Recall | 3 | Zone legend + dividers help; LVR still needs recall/domain knowledge |
| 7 | Flexibility and Efficiency | 2 | No sticky header, no team search, no sort control on a 20–40 row table |
| 8 | Aesthetic and Minimalist | 3 | Clean post-cleanup, but flat: no focal point, every row equal weight |
| 9 | Error Recovery | 2 | No error state — a failed load likely renders "No standings data" (misleading) |
| 10 | Help and Documentation | 2 | No tooltips/definitions for LVR, points, or zones beyond the color legend |
| **Total** | | **26/40** | **Acceptable — real improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** The flagrant tells are gone — side-stripes, gradient text, row-levitation, and alarm-red were all removed this session. What remains is *second-order* genericness: the table reads like a competent default admin grid. Nobody would shout "AI made this," but nobody would remember it either. The residual problem isn't slop, it's the absence of a point of view — this is a public marquee page for a league rendered with the personality of an internal CRUD table.

**Deterministic scan:** `detect.mjs` on `StandingsTable.tsx` + `StandingsPage.tsx` → **0 findings** (exit 0). Clean. The LLM review and the detector agree the known-tell surface is resolved; the detector simply can't see the higher-order flatness, which is the actual issue now.

**Visual overlays:** None — no browser-automation tool is exposed, so no in-page overlay was injected. This is a source-and-reasoning review, not a live-pixel one.

## Overall Impression

Competent and clean; characterless. The single biggest opportunity: **give the table a focal hierarchy.** A standings page has an inherent story — who's on top, where the cut lines fall, who's fighting elimination — and right now #1 is typographically identical to #20. Fix the hierarchy and the "mid" feeling largely dissolves.

## What's Working

1. **Zone dividers (new).** Labeling the cut by the zone below ("Play-Ins", "Eliminated") is genuinely good IA — clearer at a glance than the color legend alone, and it's the kind of information a standings reader actively wants.
2. **Density done right.** `tabular-nums` everywhere means numbers align in columns and scan cleanly; the responsive column-hiding (`hidden sm:table-cell`) is a correct product instinct.
3. **Loading + empty states exist.** Skeleton rows (not a spinner) and a real empty state put it ahead of most first drafts.

## Priority Issues

- **[P1] No focal hierarchy — the leader isn't celebrated.** Every row carries equal visual weight; the rank-1 team looks like the rank-20 team apart from a small amber numeral. A standings table's whole emotional payload is "who's winning."
  - *Why it matters:* the page buries its own headline; the eye lands nowhere first. This is the root of the "mid" read.
  - *Fix:* build a real rank scale (bigger, heavier numerals up top), give the top row(s) a subtle emphasis (weight/background, not a stripe), consider a leader treatment.
  - *Suggested command:* `/impeccable bolder` (identity + hierarchy), then `/impeccable typeset`.

- **[P1] "LVR" is unexplained jargon.** The primary metric column header, its blue/red color coding, and the ±delta are meaningless to anyone who doesn't already know the league's rating system.
  - *Why it matters:* the most important column is undecodable to a first-time visitor — a public page can't assume domain fluency.
  - *Fix:* a "?" popover or inline hint defining LVR and the delta; label the delta's baseline (vs starting 100).
  - *Suggested command:* `/impeccable clarify`.

- **[P2] Long-table ergonomics missing.** No sticky header, no team search/filter, no column sort. On a 30-team region, scrolling loses the column labels and finding one team is a manual scan.
  - *Why it matters:* the core task ("where's my team?") is slow; power users and mobile users both feel it.
  - *Fix:* sticky `thead`, optional team-name filter, consider sortable columns.
  - *Suggested command:* `/impeccable layout`, then `/impeccable harden`.

- **[P2] Meaning conveyed by color alone.** LVR above/below 100 is blue vs red; the ±delta and medal ranks are color-only. Fails WCAG for color-blind and screen-reader users.
  - *Why it matters:* ~8% of male visitors can't reliably distinguish the red/green signal; the data becomes ambiguous.
  - *Fix:* pair color with a glyph or sign (▲/▼, +/− already present for delta — extend to the main value), verify contrast on dimmed eliminated rows.
  - *Suggested command:* `/impeccable audit`, then `/impeccable colorize`.

- **[P2] No freshness signal + weak error state.** No "last updated" timestamp, and a failed data load falls through to "No standings data available" — indistinguishable from a genuinely empty season.
  - *Why it matters:* users can't tell stale/failed from empty; erodes trust on a results page.
  - *Fix:* add a last-synced line; distinguish error from empty.
  - *Suggested command:* `/impeccable harden`.

## Persona Red Flags

**Alex (Power User):** Can't sort by any column. Can't filter to a single team. No sticky header — scroll a 30-row table and the column meanings vanish. No keyboard path to jump to a team. Finding "my team's LVR" is a linear scan every time.

**Sam (Accessibility):** LVR quality is encoded as blue-vs-red with no non-color cue — invisible to color-blind users. Medal ranks 1/2/3 are color-only (amber/slate/orange numerals). Dimmed eliminated rows push `text-muted-foreground` onto tinted rows — contrast likely borderline against 4.5:1. Row link focus-visible state unverified.

**Casey (Mobile):** The header stat block (Teams / Avg / Top) is `hidden sm:flex` — mobile users lose that context entirely. The table horizontal-scrolls; the LVR column with its two stacked numbers is the widest cell to reach one-handed.

## Minor Observations

- Medal colors (`amber-500`/`slate-400`/`orange-500`) are raw Tailwind, not theme tokens — fine visually, slightly off-system.
- The `getLogoClassName` `bgRemoved` parameter is accepted but unused (always returns the same class) — dead arg.
- Footer "Showing N teams · top N qualify…" duplicates what the zone dividers now show structurally.

## Questions to Consider

- What would a *confident* version of the #1 row look like — and does the whole table get better once it exists?
- Is this a data tool (lean Alex/keyboard/filter) or a fan-facing results page (lean identity/story)? The answer changes what "better" means.
- Does "LVR" need to be on the public page at all, or is it an insider metric that should sit behind a definition?

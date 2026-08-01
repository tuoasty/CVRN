# Product

## Register

product

## Platform

web

## Users

League players and the wider Roblox volleyball community are **co-primary**. Players are rostered on one of the league's teams and arrive knowing exactly what they want — their own result, their own numbers, where their team sits. The community follows the league without playing in it and arrives for the same facts from the outside. League staff and admins are the secondary audience: the smallest group by headcount, the heaviest by usage, and the only one that writes rather than reads.

Reading happens **mostly on desktop** — the same machine Roblox runs on. Dense multi-column layouts are the right default rather than a compromise.

Two jobs dominate the public side, roughly equally: checking what happened (recent results, current standings, who won) and looking up specific stats (a player's numbers, a team's roster, a match box score). Following the season as a narrative — media, playoffs, the archive — is a bonus on top, not the reason anyone opens the site.

## Product Purpose

CVRN is the league platform for CVR Network, a competitive Roblox volleyball league. It handles the full lifecycle: match scheduling and results, per-set player statistics, team rosters, playoff brackets, season archives, and media — with results and stats flowing in automatically from the Google Sheets the league already runs on.

Success is four things at once. The community stops digging through spreadsheets and Discord history to find results, because CVRN is the single source of truth. The league grows, because organized infrastructure makes it read as a real competition to outsiders. Running a season takes less manual work, because sync and automation absorb what used to be hand-entry. And the codebase itself holds up as engineering work worth defending in an interview.

## Positioning

Everything about the league in one place, permanently. The individual pieces — stats, history, schedules — exist scattered across sheets and Discord already; what nothing else does is group them, keep them, and present them better than a spreadsheet can. Avatars, team logos, and fast syncing are the visible proof of that gap.

## Brand Personality

Broadcast-serious. The interface treats a Roblox volleyball league with the gravity of a real sport: confident, structured, a little formal. The implicit claim on every screen is *this competition matters*, and the design earns it by being organized rather than by being loud. Tone in copy follows the same rule — factual and specific, never hype, never winking at the fact that it's Roblox.

## Anti-references

**A hobby-project dashboard.** Discord-bot-panel energy: default components left untouched, inconsistent spacing, visibly unfinished surfaces. This directly undercuts the legitimacy the whole platform exists to establish.

**A generic SaaS admin template.** Untouched shadcn defaults, purple gradient cards, hero-metric tiles, `rounded-2xl` on everything — the look of every AI-generated dashboard of the last two years.

**Esports and gaming tropes.** Neon accents, angular clip-path panels, RGB glows, aggressive italics. The Valorant/Overwatch visual vocabulary is the obvious reflex for a gaming league and the wrong one for this brand.

**A spreadsheet on the web.** Undifferentiated grids of numbers with no hierarchy — literally the artifact CVRN replaces, re-rendered in HTML. Density is welcome; density without hierarchy is failure.

## Design Principles

**Consolidation is the product.** Every screen should reduce the number of places someone has to look. If a fact still requires a trip to a sheet or a Discord thread, that's the gap to close.

**Legitimacy comes from structure.** The league reads as real because the infrastructure treats it as real: a permanent archive, a working bracket, per-set box scores. Nothing should look provisional or half-built, because provisional is the anti-reference.

**Answer in seconds; reward in minutes.** The two primary jobs are lookups. Get the user to the fact fast, and keep the deeper material — season narrative, media, historical seasons — available underneath without ever putting it in the way.

**Density earns its keep through hierarchy.** This product carries more data per screen than a typical app UI, deliberately. The discipline is that dense never means flat: rank, state, and significance must be legible at a glance or the table has become the spreadsheet it replaced.

**The human layer is the advantage.** Avatars, team logos, names, and identity are exactly what a spreadsheet cannot render. They're not decoration here — they're the visible reason to use the site instead of the source data.

## Accessibility & Inclusion

Best effort, no formal conformance target. Accessibility is treated as craft rather than as a gate that blocks shipping.

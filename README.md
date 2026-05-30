# CVRN — CVR Network League Platform

League management platform for CVR Network, a competitive Roblox volleyball game with
an active league. Handles everything from match scheduling and results to player
stats, media, and season history.

Live at [cvrn.net](https://cvrn.net).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions, RSC) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL via PostgREST) |
| Auth | Supabase SSR auth with role-based middleware |
| Storage | Supabase Storage (team logos, award avatars) |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | SWR (client), Server Actions (mutations) |
| State | Zustand + localStorage |
| Testing | Vitest |
| Deployment | Vercel (cron jobs, `waitUntil` background tasks) |
| External APIs | Roblox API, Google Sheets API |

---

## Architecture

Vertical-slice CQS (Command/Query Separation). Each domain owns its own read and write
handlers with no shared service layer.

```
Server Action → Command or Query → Repository → Supabase (PostgreSQL)
```

Thirteen domain slices under `server/domains/`: `admin`, `auth`, `match`, `matchOfficial`,
`matchStats`, `media`, `player`, `playoff`, `region`, `season`, `sheets`, `standing`, `team`.

All commands and queries return `Result<T, E>` — errors are values, never thrown across
boundaries. A closed `ErrorCode` union maps to user-facing copy at the client layer.

Row-level security policies are the auth enforcement boundary, not application code.
Public reads are granted to `anon`. Admin writes check `user_roles`. Stat tracker writes
are scoped to stat tables. Deletes on high-blast-radius tables (regions, seasons, teams)
are restricted to `super_admin`. All policies are version-controlled in `supabase/migrations/`.

---

## Features

### Public

- **Standings** — live league table per region and season, computed directly from match results
- **Matches** — browse by week (regular season) or round (playoffs) with shareable URLs;
  each match has a full box score broken down by set, with a detailed stats toggle and a
  side-by-side team comparison
- **Teams** — team directory with logos and roster pages showing player roles and Roblox profiles
- **Players** — per-player profile showing season statistics, teams played for, and awards won
- **Playoffs** — bracket viewer showing progression per season
- **Archive** — historical record of past seasons: champions, runner-ups, 3rd place, and
  individual season awards with player avatars
- **Media** — GFX gallery, video embeds, home page sidebar with pinned posts

### Admin

- **Match lifecycle** — create and schedule matches, record set-by-set scores, mark complete
  or void, assign referees and media officials; completing a playoff match automatically
  advances the winner to the next round
- **Team management** — create teams with logo upload (auto-compressed to WebP), manage
  rosters, set player roles, transfer captaincy, soft-delete disbanded teams
- **Google Sheets sync** — two separate pipelines share the same sheet infrastructure:
  - *Results sync* — each region/season maps to a configured Google Sheet. A nightly
    Vercel cron pulls qualifier match rows and positional playoff bracket data, resolves
    team names, and writes results to the database. Admins can also trigger a sync manually.
    Each sync run produces a per-row error log; partial failures don't abort the whole sync,
    and previous syncs can be reverted.
  - *Stats sync* — admins link individual matches to a specific sheet tab. The system
    parses per-set player stats (kills, assists, blocks, receives, aces, errors, and more),
    shows a full preview of what will be written before any data changes, and commits
    atomically — re-syncing a match replaces the previous stats entirely.
- **Roblox player sync** — players are added by Roblox username. On first add, their
  profile and head avatar are fetched from the Roblox API and stored. On subsequent visits,
  stale profiles are re-synced lazily in the background — the page load isn't blocked and
  the update happens after the response is sent.
- **Season results** — set the final podium (1st/2nd/3rd) and assign individual season
  awards; award avatars are downloaded from Roblox and stored in Supabase for display
  in the archive
- **User management** — invite users by email; roles: `super_admin`, `admin`,
  `stat_tracker`, `staff`

---

## Development

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm test              # Vitest (once)
npm run test:watch    # Vitest watch mode

# Run a single test file
npm test -- path/to/file.test.ts
```

```bash
supabase migration new <description>   # New migration
supabase db push                       # Apply pending migrations
supabase db reset                      # Reset + replay all from scratch
supabase gen types typescript --linked > database.types.ts
```

Requires `.env.local` with Supabase URL/keys, Google Sheets service account credentials,
and a `CRON_SECRET` for the sync endpoint.

---

## Project Structure

```
app/
  (public)/          # Public pages: home, standings, matches, teams, players, playoffs, archive, media
  admin/             # Admin dashboard pages
  actions/           # Server Actions — one file per domain
  hooks/             # SWR data-fetching hooks
  features/          # Feature-specific UI components (dialogs, forms, tables)
  components/        # Shared UI: shadcn/ui primitives, layout
  api/cron/          # Vercel Cron route handlers

server/
  domains/           # 13 vertical slices — commands/, queries/, helpers/, types/
  db/                # Repository layer — direct Supabase queries, returns Result<T>
  roblox/            # Roblox API client with retry + circuit breaker
  supabase/          # Supabase clients (server, browser, admin, middleware)
  utils/             # Logger (Pino), background runner, error serialization

shared/types/        # Types shared across client and server
supabase/migrations/ # All schema changes version-controlled here
docs/                # Architecture reference, API inventory, database schema
```

---

## License

Private project. Not currently licensed for redistribution.

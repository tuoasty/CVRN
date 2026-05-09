# CVRN — Confederate Volleyball Roblox Network

> Full-stack league management platform for a competitive Roblox volleyball league. Public standings, live match results, admin dashboard, and automated Google Sheets sync.

**Live:** [cvrn.vercel.app](https://cvrn.vercel.app)

---

## What it does

- **Public site** — standings, match schedule, team rosters, playoff brackets
- **Admin dashboard** — invite admins, manage seasons / teams / matches / officials, run sync jobs
- **Automated sync** — nightly Vercel cron parses match-result spreadsheets, diffs against the database, and writes an audit log of every change

## Tech stack

- **Framework** — Next.js 15 (App Router) · React 19 · TypeScript 5
- **Backend** — Supabase (Postgres + Auth + Storage + RLS)
- **UI** — Tailwind CSS · shadcn/ui · SWR · Zustand
- **Integrations** — Google Sheets API · Roblox API
- **Tooling** — Vitest · Pino · ESLint
- **Hosting** — Vercel

## Architecture highlights

- **Vertical-slice CQS** — twelve domain slices (`match`, `playoff`, `sheets`, `team`, …), each owning its own commands, queries, helpers, and Zod schemas. No shared service layer.
- **Transactional mutations** — match completion / void / re-apply run inside Postgres RPCs (`complete_match`, `void_match`, `reapply_match_result`) with `WITH RECURSIVE` cascades so playoff brackets stay consistent in a single transaction.
- **`Result<T, E>` everywhere** — typed error codes flow from repo to UI; no thrown errors across the server boundary. The `ErrorCode` union maps directly to user-facing toast messages.
- **Resilient external calls** — Roblox API wrapped in `axios-retry` + a circuit breaker (5-fail / 60s trip). Mutation paths fire-and-forget Roblox sync via Vercel `waitUntil` so user-facing latency stays flat.
- **Append-only audit logs** — every sheet sync writes a `sheet_sync_logs` row with the diff payload; admins can browse history per config.
- **Strict RLS** — every table has row-level security; admin writes gated on `user_roles` lookup, public reads scoped to non-sensitive columns.

## Screenshots

_Coming soon._

## Local development

```bash
git clone https://github.com/tuoasty/cvrn.git
cd cvrn
cp .env.example .env.local      # fill in Supabase + Sheets + Roblox keys
npm install
supabase link --project-ref <your-ref>
supabase db push
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev             # dev server
npm run build           # production build
npm run lint            # ESLint
npm test                # Vitest
npm run test:coverage   # coverage report
```

## License

Private project. Not currently licensed for redistribution.

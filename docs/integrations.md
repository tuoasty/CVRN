# External Integrations

## Supabase

**Usage:** Database, auth, file storage

**Clients** (`server/supabase/`):
- `server.ts` — Server-side with cookie-based auth (for Server Actions)
- `server-public.ts` — Server-side without auth (public data)
- `browser.ts` — Browser-side client
- `admin.ts` — Service-role client (bypasses RLS)

**Auth flow:**
- Login via email/password (Supabase Auth)
- Middleware in `server/supabase/middleware.ts` protects admin routes
- Role check via `get_user_role()` / `has_role()` RPC functions
- Invite system: admin creates `pending_users` entry → user sets password via `/auth/set-password`

**File storage:**
- Team logos uploaded to Supabase Storage
- Handled in `team.service.ts` during create/update

**Database features used:**
- PostgREST API (`.from().select()`, `.rpc()`)
- `pg_trgm` extension for fuzzy search (players, officials)
- Database views (standings)
- Enums (match_status, match_type)

## Roblox API

**Usage:** Player and official profile data

**Client:** `server/roblox/client.ts`, `server/roblox/users.ts`

**Endpoints used:**
- User profile by Roblox user ID (username, display name)
- Avatar thumbnail URL

**Flow:**
1. Admin enters Roblox user ID
2. Service calls Roblox API to fetch profile
3. Player/official record created with Roblox data
4. `last_synced_at` tracks freshness
5. Avatar URLs point to `tr.rbxcdn.com`

**Image domains configured in `next.config.ts`:**
- `tr.rbxcdn.com` (Roblox CDN)
- Supabase storage domain

## Google Sheets

**Usage:** Data import for league management
- To be implemented

## Vercel

**Usage:** Hosting, analytics

**Packages:**
- `@vercel/analytics` — Page view tracking
- `@vercel/speed-insights` — Core Web Vitals monitoring

<!-- TODO: Document any Vercel-specific config (env vars, cron, edge functions) -->

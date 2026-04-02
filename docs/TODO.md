# TODO

## Current Session

### Phase 3: Architecture Refactor — Vertical Slice Architecture + CQS

Replace `server/services/` with `server/domains/` organized by domain. Each domain contains `commands/` (writes), `queries/` (reads), `validators/` (Zod schemas + domain rules), `types/`, and `helpers/`. Repo layer stays unchanged.

**Migration Steps (incremental — each phase builds successfully):**

- [ ] **Phase 1: Foundation** — Install Zod, create `server/domains/match/` structure, extract types, create Zod schemas
- [ ] **Phase 2: Extract Match Validators & Helpers** — Move `validateAndCalculateMatchResult` and `toMatchWithDetails` out of `match.service.ts`
- [ ] **Phase 3: Migrate Match Queries** — Move 8 query functions to `match/queries/`, update action imports
- [ ] **Phase 4: Migrate Match Commands** — Move 6 command functions to `match/commands/`, extract `advancePlayoffWinner` to `playoff/commands/`, delete `match.service.ts`
- [ ] **Phase 5: Migrate Remaining Domains** — playoff, player, team, official, season, auth, admin, standing, region (one at a time)
- [ ] **Phase 6: Add Zod Validation to All Actions** — Add `schema.parse()` at action boundary
- [ ] **Phase 7 (Optional): Transaction Support** — Supabase RPC functions for `completeMatch` and `voidMatch`

**Detailed plan:** `.claude/plans/modular-crunching-tide.md`

## Project-Wide

### Code Quality
- [ ] Fix `standing.action.ts` → `standing.actions.ts` naming
- [ ] Replace generic README with CVRN-specific documentation
- [ ] Add error codes / standardized error responses to services
- [ ] Document service method signatures

### Bug Fixes
- [ ] Improve match completion/update dialog designs

### Design Fixes
- [ ] Mobile: migrate to sidebar with burger toggle instead of double navbar

### Others
- [ ] Fix typing and typescript errors, not allowed to use :any

### Features (TBD)
- [ ] Google Sheets import integration
- [ ] Player stats tracking (schema exists, implementation TBD)

### DevEx
- [ ] Set up testing framework
- [ ] Configure Claude Code hooks (lint, type-check)
- [ ] Fix `database.types.ts` UTF-16 encoding issue

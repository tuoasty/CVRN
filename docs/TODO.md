# TODO

## Current Session

### Phase 1: Foundation (completed)
- [x] Update CLAUDE.md with discovered details and known issues
- [x] Create `docs/database.md` — full schema reference
- [x] Create `docs/api-inventory.md` — server actions and service inventory
- [x] Create `docs/integrations.md` — external API docs

### Phase 2: Code Health Audit (completed)
- [x] Dead code removal, duplicated logic extraction, sync parallelization, frontend fetch optimization
- [x] Full findings in `docs/phase2-audit.md`

### Phase 3: Architecture Refactor Plan
- [ ] Evaluate DDD / feature-sliced architecture
- [ ] Plan decomposition of `match.service.ts` (1,147 lines)
- [ ] Design runtime validation strategy (Zod for DTOs)
- [ ] Address repo layer gaps (no transaction support)

## Project-Wide

### Code Quality
- [ ] Fix `standing.action.ts` → `standing.actions.ts` naming
- [ ] Decompose `match.service.ts` into smaller focused services
- [ ] Add runtime validation (Zod schemas) to DTOs
- [ ] Replace generic README with CVRN-specific documentation
- [ ] Add error codes / standardized error responses to services
- [ ] Document service method signatures

### Architecture
- [ ] Evaluate and plan modular architecture refactor (DDD-lite)
- [ ] Add transaction support to repository layer
- [ ] Reduce tight coupling between services

### Bug fixes
- [x] ~~Player load too slow due to sequential sync~~ — fixed in Phase 2 (parallelized with `Promise.all`)
- [ ] Improve match completion/update dialog designs

### Design fixes
- [ ] Mobile needs a better UI layout, for example migrating to a sidebar with burger toggle for navigation instead of current double navbar with selector

### Others
- [ ] Fix typing and typescript errors, not allowed to use :any

### Features (TBD)
- [ ] Google Sheets import integration
- [ ] Player stats tracking (schema exists, implementation TBD)

### DevEx
- [ ] Set up testing framework
- [ ] Configure Claude Code hooks (lint, type-check)
- [ ] Fix `database.types.ts` UTF-16 encoding issue

# Phase 3: Vertical Slice Architecture + CQS Migration

## Context

`server/services/` has 11 service files (3,748 lines) in a flat structure. We're migrating to `server/domains/{domain}/` with CQS separation: `commands/`, `queries/`, `validators/`, `types/`, `helpers/`. The repo layer (`server/db/`) stays unchanged. Each migration leaves the app buildable.

## Target Domain Structure (per domain)

```
server/domains/{domain}/
  commands/        — write operations (create, update, delete, mutate)
  queries/         — read operations (get, find, list)
  helpers/         — shared internal logic (lazySyncPlayer, validateMatch, etc.)
  types/           — re-exported types from DTOs (Zod schemas added later in Phase 6)
  index.ts         — barrel export
```

## Cross-Domain Dependencies (critical for ordering)

- `auth` imports `finalizeInvitedUser` from `admin` → admin migrates first
- `matchOfficial` imports `lazySyncOfficial` from `official` → official migrates first
- `match` calls `advancePlayoffWinner` (currently private in match.service) → extract to `playoff/commands/` during playoff migration, then match imports it

## Migration Order (13 phases, one commit each)

### Phase 0: Foundation V
- Install Zod (`npm install zod`)
- Create `server/domains/` directory
- Verify build

### Phase 1: Region (49 lines, 2 queries, 0 deps) V
**Source:** `server/services/region.service.ts`
**Action:** `app/actions/region.actions.ts`

| Target | Functions |
|--------|-----------|
| `region/queries/getAllRegions.ts` | `getAllRegions` |
| `region/queries/getRegionByCode.ts` | `getRegionByCode` |

Steps: Create domain files → update action imports → verify build → delete service

### Phase 2: Standing (32 lines, 1 query, 0 deps) V
**Source:** `server/services/standing.service.ts`
**DTO:** `server/dto/standing.dto.ts`
**Action:** `app/actions/standing.action.ts`

| Target | Functions |
|--------|-----------|
| `standing/queries/getStandings.ts` | `getStandings` |
| `standing/types/index.ts` | re-export from `standing.dto` |

### Phase 3: Admin (66 lines, 2 commands, 0 deps) V
**Source:** `server/services/admin.service.ts`
**Action:** `app/actions/admin.actions.ts`
**Consumed by:** `auth.service.ts` (imports `finalizeInvitedUser`)

| Target | Functions |
|--------|-----------|
| `admin/commands/inviteUser.ts` | `inviteUser` |
| `admin/commands/finalizeInvitedUser.ts` | `finalizeInvitedUser` |

**Extra step:** Update `server/services/auth.service.ts` import of `finalizeInvitedUser` to point to `@/server/domains/admin`

### Phase 4: Auth (174 lines, 3 queries + 4 commands) V
**Source:** `server/services/auth.service.ts`
**Action:** `app/actions/auth.actions.ts`
**Depends on:** admin (migrated in Phase 3)

| Target | Functions |
|--------|-----------|
| `auth/queries/getUserRole.ts` | `getUserRole` |
| `auth/queries/getUserWithRole.ts` | `getUserWithRole` |
| `auth/queries/hasRole.ts` | `hasRole` |
| `auth/commands/signIn.ts` | `signIn` |
| `auth/commands/signOut.ts` | `signOut` |
| `auth/commands/setUserPassword.ts` | `setUserPassword` (imports from `@/server/domains/admin`) |
| `auth/commands/processAuthCallback.ts` | `processAuthCallback` |
| `auth/types/index.ts` | `AuthUser`, `AuthResponse` (currently inline in service) |

### Phase 5: Season (244 lines, 5 queries + 3 commands, 0 deps) V
**Source:** `server/services/season.service.ts`
**DTO:** `server/dto/season.dto.ts`
**Action:** `app/actions/season.actions.ts`

| Target | Functions |
|--------|-----------|
| `season/queries/getAllSeasons.ts` | `getAllSeasons` |
| `season/queries/getSeasonById.ts` | `getSeasonById` |
| `season/queries/getSeasonsByRegion.ts` | `getSeasonsByRegion` |
| `season/queries/getActiveSeasonByRegion.ts` | `getActiveSeasonByRegion` |
| `season/queries/getSeasonBySlugAndRegion.ts` | `getSeasonBySlugAndRegion` |
| `season/commands/createSeason.ts` | `createSeason` |
| `season/commands/updateSeason.ts` | `updateSeason` |
| `season/commands/deleteSeason.ts` | `deleteSeason` |
| `season/types/index.ts` | re-export from `season.dto` |

### Phase 6: Official (292 lines, 4 queries + 2 commands + helper)
**Source:** `server/services/official.service.ts`
**DTO:** `server/dto/official.dto.ts`
**Action:** `app/actions/matchOfficial.actions.ts` (shared with matchOfficial)
**Consumed by:** `matchOfficial.service.ts` (imports `lazySyncOfficial`)

| Target | Functions |
|--------|-----------|
| `official/helpers/lazySyncOfficial.ts` | `lazySyncOfficial` + `needsSync` |
| `official/queries/getOfficialsByName.ts` | `getOfficialsByName` |
| `official/queries/getAllOfficials.ts` | `getAllOfficials` |
| `official/queries/searchOfficialsInDatabase.ts` | `searchOfficialsInDatabase` |
| `official/queries/getOfficialByExactUsername.ts` | `getOfficialByExactUsername` |
| `official/commands/saveOfficial.ts` | `saveOfficial` |
| `official/commands/removeOfficial.ts` | `removeOfficial` |
| `official/types/index.ts` | re-export from `official.dto` |

**Extra step:** Update `server/services/matchOfficial.service.ts` import of `lazySyncOfficial` to `@/server/domains/official`

### Phase 7: MatchOfficial (194 lines, 2 queries + 4 commands)
**Source:** `server/services/matchOfficial.service.ts`
**DTO:** `server/dto/matchOfficial.dto.ts`
**Action:** `app/actions/matchOfficial.actions.ts`
**Depends on:** official (migrated in Phase 6)

| Target | Functions |
|--------|-----------|
| `matchOfficial/queries/getMatchOfficials.ts` | `getMatchOfficials` |
| `matchOfficial/queries/getMatchOfficialsByType.ts` | `getMatchOfficialsByType` |
| `matchOfficial/commands/assignOfficialToMatch.ts` | `assignOfficialToMatch` |
| `matchOfficial/commands/assignMultipleOfficialsToMatch.ts` | `assignMultipleOfficialsToMatch` |
| `matchOfficial/commands/removeOfficialFromMatch.ts` | `removeOfficialFromMatch` |
| `matchOfficial/commands/removeAllOfficialsOfType.ts` | `removeAllOfficialsOfType` |
| `matchOfficial/types/index.ts` | `MatchOfficialWithDetails` (inline in service) + re-export DTO |

### Phase 8: Team (379 lines, 6 queries + 3 commands)
**Source:** `server/services/team.service.ts`
**DTO:** `server/dto/team.dto.ts`
**Action:** `app/actions/team.actions.ts`

| Target | Functions |
|--------|-----------|
| `team/queries/getAllTeams.ts` | `getAllTeams` |
| `team/queries/getAllTeamsWithRegions.ts` | `getAllTeamsWithRegions` |
| `team/queries/getTeamByNameAndSeason.ts` | `getTeamByNameAndSeason` |
| `team/queries/getTeamBySlugAndSeasonWithRegion.ts` | `getTeamBySlugAndSeasonWithRegion` |
| `team/queries/getTeamWithRegionAndPlayers.ts` | `getTeamWithRegionAndPlayers` |
| `team/queries/getTeamsByIds.ts` | `getTeamsByIds` |
| `team/commands/createTeam.ts` | `createTeam` |
| `team/commands/updateTeam.ts` | `updateTeam` |
| `team/commands/deleteTeam.ts` | `deleteTeam` |
| `team/helpers/generateSlug.ts` | `generateSlug` (private util) |
| `team/types/index.ts` | re-export from `team.dto` |

### Phase 9: Player (659 lines, 5 queries + 5 commands + helper)
**Source:** `server/services/player.service.ts`
**DTO:** `server/dto/player.dto.ts`
**Action:** `app/actions/player.actions.ts`

| Target | Functions |
|--------|-----------|
| `player/helpers/lazySyncPlayer.ts` | `lazySyncPlayer` + `needsSync` |
| `player/queries/getUsersByName.ts` | `getUsersByName` |
| `player/queries/getTeamPlayers.ts` | `getTeamPlayers` |
| `player/queries/getPlayersByIds.ts` | `getPlayersByIds` |
| `player/queries/searchPlayersInDatabase.ts` | `searchPlayersInDatabase` |
| `player/queries/getPlayerByExactUsername.ts` | `getPlayerByExactUsername` |
| `player/commands/savePlayerToTeam.ts` | `savePlayerToTeam` |
| `player/commands/removePlayerFromTeam.ts` | `removePlayerFromTeamService` |
| `player/commands/addExistingPlayerToTeam.ts` | `addExistingPlayerToTeam` |
| `player/commands/setPlayerRole.ts` | `setPlayerRoleService` |
| `player/commands/transferCaptain.ts` | `transferCaptainService` |
| `player/types/index.ts` | re-export from `player.dto` |

### Phase 10: Playoff (618 lines, 1 query + 2 commands + advancePlayoffWinner extraction)
**Source:** `server/services/playoff.service.ts`
**DTO:** `server/dto/playoff.dto.ts`
**Action:** `app/actions/playoff.actions.ts`

| Target | Functions |
|--------|-----------|
| `playoff/queries/getPlayoffBracketBySeasonId.ts` | `getPlayoffBracketBySeasonId` |
| `playoff/commands/generatePlayoffBracket.ts` | `generatePlayoffBracket` |
| `playoff/commands/resetPlayoffBrackets.ts` | `resetPlayoffBracketsService` |
| `playoff/commands/advancePlayoffWinner.ts` | **Extracted from `match.service.ts`** |
| `playoff/helpers/calculateRounds.ts` | `calculateRounds` (private) |
| `playoff/helpers/getFirstRoundSeeding.ts` | `getFirstRoundSeeding` (private) |
| `playoff/types/index.ts` | re-export from `playoff.dto` |

**Extra step:** Update `server/services/match.service.ts` to import `advancePlayoffWinner` from `@/server/domains/playoff`. Delete playoff service file.

### Phase 11: Match (1,052 lines, 9 queries + 6 commands + helpers)
**Source:** `server/services/match.service.ts`
**DTO:** `server/dto/match.dto.ts`
**Action:** `app/actions/match.actions.ts`
**Depends on:** playoff (for `advancePlayoffWinner`)

| Target | Functions |
|--------|-----------|
| `match/helpers/validateAndCalculateMatchResult.ts` | `validateAndCalculateMatchResult` (pure scoring logic) |
| `match/helpers/toMatchWithDetails.ts` | `toMatchWithDetails` (data mapper) |
| `match/types/index.ts` | `MatchResultInput`, `MatchContext`, `MatchResultOutput` + re-export DTO |
| `match/queries/getAllMatches.ts` | `getAllMatches` |
| `match/queries/getAvailableTeamsForWeek.ts` | `getAvailableTeamsForWeek` |
| `match/queries/getMatchesForWeek.ts` | `getMatchesForWeek` |
| `match/queries/getMatchSets.ts` | `getMatchSets` |
| `match/queries/getWeekSchedule.ts` | `getWeekSchedule` |
| `match/queries/getPlayoffSchedule.ts` | `getPlayoffSchedule` |
| `match/queries/getAvailablePlayoffRounds.ts` | `getAvailablePlayoffRounds` |
| `match/queries/getUpcomingMatches.ts` | `getUpcomingMatches` |
| `match/queries/getRecentMatches.ts` | `getRecentMatches` |
| `match/commands/createMatches.ts` | `createMatches` |
| `match/commands/completeMatch.ts` | `completeMatchService` (imports `advancePlayoffWinner` from playoff) |
| `match/commands/voidMatch.ts` | `voidMatchService` |
| `match/commands/updateMatchSchedule.ts` | `updateMatchScheduleService` |
| `match/commands/updateMatchResults.ts` | `updateMatchResultsService` (imports `advancePlayoffWinner` from playoff) |
| `match/commands/deleteMatch.ts` | `deleteMatchService` |

### Phase 12: Cleanup
- Delete empty `server/services/` directory
- Update `CLAUDE.md` architecture section
- Update `docs/TODO.md` — mark phases complete

## Per-Service Migration Recipe

For each service, repeat these steps:
1. Create `server/domains/{domain}/` folder structure
2. Create `types/index.ts` — move inline types + re-export from DTO
3. Create `helpers/` — extract shared/private helpers first (other files depend on them)
4. Create `queries/` — one file per query function, copy verbatim
5. Create `commands/` — one file per command function, copy verbatim
6. Create `index.ts` barrel — re-export all public functions
7. Update `app/actions/*.ts` imports to `@/server/domains/{domain}`
8. Update any **other service** that imports from this service (cross-domain deps)
9. Run `npm run build` to verify
10. Delete `server/services/{domain}.service.ts`

## Key Design Decisions

- **`advancePlayoffWinner`** moves from match → `playoff/commands/` (match imports it cross-domain)
- **`lazySyncOfficial` / `lazySyncPlayer`** stay in their respective domains (not a shared abstraction)
- **DTOs stay as-is** for now; Zod schemas replace them in a later phase
- **Each migration is one buildable commit**

## Verification

After each phase:
- `npm run build` — must pass with zero errors
- `npm run lint` — no new warnings
- Spot-check the migrated action in the browser (manual)

After all phases:
- `server/services/` directory should be empty and deleted
- All action files import from `@/server/domains/*`
- No circular dependencies between domains

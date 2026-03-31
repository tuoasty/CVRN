# Phase 2: Code Health Audit — Findings

## Summary

| Category | Issues Found | Estimated Impact |
|----------|-------------|-----------------|
| Duplicated business logic | 3 major blocks (~500 lines) | HIGH — bug-fix risk |
| Dead code / unused exports | 12 items | LOW — cleanup |
| N+1 / sequential DB patterns | 5 functions | MEDIUM — performance |
| Redundant frontend fetches | 2 patterns | MEDIUM — wasted bandwidth |
| Repo-layer duplication | 2 major blocks | MEDIUM — maintenance |

---

## 1. CRITICAL — Duplicated Business Logic in `match.service.ts`

### 1a. Match completion logic duplicated verbatim (lines 315–417 vs 652–754)

`completeMatchService()` and `updateMatchResultsService()` contain **identical** blocks:
- Forfeit handling (team assignment, LVR calculation)
- Set count validation (BO3/BO5 rules)
- Set score validation (min winning score, 2-point margin, deuce rules)
- Set winner tallying + LVR computation

**Risk:** Any rule change (e.g. scoring rules, LVR formula) must be applied in two places. A missed update = silent divergence.

**Fix:** Extract a shared `validateAndCalculateMatchResult()` function that both methods call.

### 1b. MatchWithDetails transformation duplicated 4 times (lines 824, 866, 1095, 1131)

The same official-mapping lambda appears in `getWeekSchedule()`, `getPlayoffSchedule()`, `getUpcomingMatches()`, and `getRecentMatches()`:

```ts
officials: (row.match_officials ?? []).map((mo: any) => ({
    id: mo.officials.id,
    username: mo.officials.username,
    display_name: mo.officials.display_name,
    avatar_url: mo.officials.avatar_url,
    official_type: mo.official_type,
}))
```

**Fix:** Extract a `toMatchWithDetails(row)` mapper function.

### 1c. Mid-file imports (line 843)

`GetPlayoffScheduleInput` and playoff repo functions are imported **in the middle of the file** instead of at the top. This is a symptom of the file growing organically.

---

## 2. CRITICAL — Repo-layer duplication in `resetDownstreamBrackets`

**File:** `server/db/matches.repo.ts` lines 328–536 (208 lines)

The winner path (lines 348–440) and loser path (lines 442–528) are **95% identical**. Each contains:
- Fetch next bracket → fetch its match → check status
- If completed + other team exists: recursive reset, delete sets, reset match with `null` for both teams
- If completed + no other team: delete sets, reset match with `null` for one team
- If pending/scheduled: clear one team slot

The same reset update object is repeated **6 times** across these paths:
```ts
{ status: "pending", home_sets_won: null, away_sets_won: null, home_team_lvr: null, away_team_lvr: null, match_mvp_player_id: null, loser_mvp_player_id: null, is_forfeit: false, ... }
```

**Fix:** Extract a `resetBracketPath(supabase, bracketId, position, pathType)` helper that handles one path. Call it twice (winner/loser).

---

## 3. Dead Code & Unused Exports

### Server Actions
| Item | File | Lines |
|------|------|-------|
| `getRegionByCodeAction` — exported, never imported | `app/actions/region.actions.ts` | 11–14 |
| Commented-out redirect code | `app/actions/admin.actions.ts` | 14–16, 22–24 |

### Services
| Item | File | Lines |
|------|------|-------|
| Unused import `findActivePlayerTeamSeasons` | `server/services/match.service.ts` | 28 |

### Repositories
| Item | File | Lines |
|------|------|-------|
| `findOfficialById` — exported, never called | `server/db/official.repo.ts` | 25–33 |
| `findSeasonById` duplicated in playoff.repo | `server/db/playoff.repo.ts` | 75–84 (exists in `seasons.repo.ts` already) |

### Frontend Hooks
| Item | File | Lines |
|------|------|-------|
| `useMatchSets` — exported, never used | `app/hooks/useMatches.ts` | 109–116 |
| `useTeam` — exported, never used (superseded by `useTeamWithPlayers`) | `app/hooks/useTeams.ts` | 65–88 |

### Components
| Item | File |
|------|------|
| `alert.tsx` — shadcn component never imported | `app/components/ui/alert.tsx` |
| `ErrorDisplay.tsx` — never imported | `app/components/ui/ErrorDisplay.tsx` |
| `withConnection.tsx` — HOC never imported | `app/components/providers/withConnection.tsx` |

### Unused Imports in Pages
| Item | File |
|------|------|
| `useEffect` unused | `app/(public)/teams/TeamsPage.tsx` |
| `useState` unused | `app/(public)/standings/StandingsPage.tsx` |
| `useEffect`, `useState` unused | `app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage.tsx` |
| `useEffect` unused | `app/(public)/playoffs/PlayoffsPage.tsx` |

---

## 4. Redundant Frontend Data Fetching

### 4a. TeamDetailPage fetches players twice

**File:** `app/features/teams/TeamDetailPage.tsx` lines 54–71

The page calls both:
1. `useTeamWithPlayers(teamSlug, seasonSlug, regionCode)` — returns `{ team, players }`
2. `useTeamPlayers(teamData?.id, teamData?.season_id)` — fetches the **same players again**

The second call exists to get `captain`, `viceCaptain`, `courtCaptain`, `regularPlayers` role breakdowns and `mutatePlayers`. 

**Fix:** Either:
- Add role breakdown to `useTeamWithPlayers` return value, or
- Remove the `useTeamWithPlayers` call and just use `useTeam` + `useTeamPlayers` (since `useTeamWithPlayers` is doing redundant work here)

### 4b. `useSeasons()` + `useRegions()` always called together

These two hooks are called as a pair in **7+ pages** (home, matches, playoffs, standings, teams, admin dashboard, etc.). They could be combined into a single `usePublicContext()` hook that fetches both.

---

## 5. N+1 / Sequential Database Patterns

### 5a. Sequential Roblox sync in loops

These functions loop through results and call `lazySyncOfficial()` or `lazySyncPlayer()` **one at a time**, each making up to 2 API calls (Roblox fetch + DB update):

| Function | File | Lines |
|----------|------|-------|
| `getMatchOfficials()` | `server/services/matchOfficial.service.ts` | 103–118 |
| `getMatchOfficialsByType()` | `server/services/matchOfficial.service.ts` | 149–164 |
| `getAllOfficials()` | `server/services/official.service.ts` | 117–125 |
| `getTeamPlayers()` | `server/services/player.service.ts` | 254–277 |
| `getPlayersByIds()` | `server/services/player.service.ts` | 311–319 |

**Fix:** Use `Promise.all()` to sync in parallel instead of sequentially. The Roblox API calls are independent and can be batched.

### 5b. `lazySyncOfficial` and `lazySyncPlayer` are near-identical

**Files:** `server/services/official.service.ts` lines 220–288 and `server/services/player.service.ts` lines 449–513

Both follow the same pattern: check `needsSync()` → fetch Roblox user by name → fetch avatar → update DB. Could share a generic `lazySyncRobloxUser()` implementation.

---

## 6. Minor Issues

### 6a. Inconsistent `await` on return statements

Across action files, some functions `return await service(...)` and others `return service(...)`. Not harmful, but inconsistent. Pick one style.

### 6b. Duplicate auth check in team.actions.ts

`createTeamAction` and `updateTeamAction` both inline the same 4-line auth check:
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) { return Err({ message: "User not authenticated", name: "AuthError" }); }
```

Could be a shared `requireAuth(supabase)` helper.

---

## Recommended Fix Order

**Batch 1 — Dead code cleanup** (low risk, immediate)
- Remove all items in section 3
- Clean unused imports

**Batch 2 — Extract duplicated logic** (medium risk, high value)
- Extract `validateAndCalculateMatchResult()` from match.service.ts
- Extract `toMatchWithDetails()` mapper from match.service.ts
- Extract `resetBracketPath()` helper from matches.repo.ts
- Deduplicate `findSeasonById` in playoff.repo → import from seasons.repo

**Batch 3 — Frontend optimization** (low risk, medium value)
- Fix TeamDetailPage double-fetch
- Parallelize lazy sync calls with `Promise.all()`

**Batch 4 — Quality of life** (low risk, low urgency)
- Combine `useSeasons` + `useRegions` into `usePublicContext`
- Standardize `await` convention in actions
- Extract shared auth check in team.actions.ts

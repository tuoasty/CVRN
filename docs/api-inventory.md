# API Inventory

All client-accessible operations go through Server Actions in `app/actions/`. Each action delegates to a service in `server/services/`.

## Server Actions

### match.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| createMatches | match.service.createMatches | Create multiple matches for a week |
| completeMatch | match.service.completeMatch | Submit match results (sets, MVPs) |
| getMatchesBySeasonAndWeek | match.service.getMatchesBySeasonAndWeek | Fetch matches for display |
| updateMatchSchedule | match.service.updateMatchSchedule | Set/update scheduled date/time |
| voidMatch | match.service.voidMatch | Void a completed match |
| getMatchSets | match.service.getMatchSets | Get set scores for a match |

### team.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| createTeam | team.service.createTeam | Create team with logo upload |
| updateTeam | team.service.updateTeam | Update team details/logo |
| deleteTeam | team.service.deleteTeam | Soft delete a team |
| getTeamsBySeasonId | team.service.getTeamsBySeasonId | List teams for a season |
| getTeamByNameAndSeason | team.service.getTeamByNameAndSeason | Fetch single team with players |
| restoreTeam | team.service.restoreTeam | Restore soft-deleted team |

### player.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| searchPlayers | player.service.searchPlayers | Fuzzy search via pg_trgm |
| addPlayerToTeam | player.service.addPlayerToTeam | Add player to team roster |
| removePlayerFromTeam | player.service.removePlayerFromTeam | Remove from roster |
| addPlayerByRobloxId | player.service.addPlayerByRobloxId | Fetch from Roblox API + add |
| getPlayersByTeamAndSeason | player.service.getPlayersByTeamAndSeason | Get team roster |

### matchOfficial.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| assignOfficialToMatch | matchOfficial.service.assign | Assign ref/media to match |
| removeOfficialFromMatch | matchOfficial.service.remove | Remove assignment |
| getMatchOfficials | matchOfficial.service.getByMatch | List officials for a match |
| searchOfficials | official.service.search | Fuzzy search officials |
| addOfficialByRobloxId | official.service.addByRobloxId | Fetch from Roblox + create |

### playoff.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| getPlayoffBrackets | playoff.service.getBrackets | Get full bracket data |

### season.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| getSeasonsByRegionId | season.service.getByRegionId | List seasons for region |

### region.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| getRegions | region.service.getAll | List all regions |

### standing.action.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| getStandings | standing.service.getBySeasonId | Get standings view data |

### auth.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| signIn | auth.service.signIn | Email/password login |
| signOut | auth.service.signOut | Logout |

### admin.actions.ts
| Action | Service Method | Description |
|--------|---------------|-------------|
| inviteUser | admin.service.invite | Create pending user invite |

## SWR Hooks (Client Data Fetching)

Located in `app/hooks/`:

| Hook | Action Called | Key Pattern |
|------|-------------|-------------|
| useMatches | getMatchesBySeasonAndWeek | [seasonId, week] |
| useTeams | getTeamsBySeasonId | [seasonId] |
| usePlayers | getPlayersByTeamAndSeason | [teamId, seasonId] |
| useStandings | getStandings | [seasonId] |
| useSeasons | getSeasonsByRegionId | [regionId] |
| useRegions | getRegions | [] |
| usePlayoffs | getPlayoffBrackets | [seasonId] |
| useOfficials | getMatchOfficials | [matchId] |

## Services with Notable Complexity

### match.service.ts (~1,147 lines)
- Match creation with schedule parsing and timezone handling
- Match completion with set validation, LVR calculation
- Playoff bracket advancement on match completion
- Google Sheets sync integration
- Forfeit handling

### playoff.service.ts (~617 lines)
- Bracket generation from standings
- Winner/loser advancement (single + double elimination)
- Seed progression logic

### player.service.ts (~679 lines)
- Roblox API integration for profile fetching
- Avatar URL resolution
- Bulk player operations
- Sync/cache management with last_synced_at

<!-- TODO: Document service method signatures and error codes -->
Service method signatures and error codes do not exist yet.

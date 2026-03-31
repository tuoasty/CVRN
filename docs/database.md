# Database Schema

Supabase PostgreSQL. Types auto-generated into `database.types.ts`, aliased in `shared/types/db.ts`.

## Tables

### regions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| code | string | e.g. "AS", "NA", "EU" |
| name | string | |

### seasons
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | string | |
| slug | string | URL-safe name |
| region_id | uuid (FK → regions) | |
| start_date | string | |
| end_date | string? | |
| weeks | number? | Total weeks in season |
| is_active | boolean | |
| theme | string? | |
| playoff_config_id | uuid? (FK → playoff_configs) | |
| playoff_started | boolean | |
| playoff_completed | boolean | |
| created_at, updated_at | string | |

### teams
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | string | |
| slug | string | URL-safe name |
| logo_url | string? | Supabase storage |
| season_id | uuid (FK → seasons) | Teams are per-season |
| brick_number | number | Roblox brick identifier |
| brick_color | string | Roblox brick color |
| starting_lvr | number | Starting LVR rating |
| is_bye | boolean | Bye-week placeholder team |
| deleted_at | string? | Soft delete |
| previous_team_id | uuid? (FK → teams) | Links team across seasons |
| created_at, updated_at | string | |

### players
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| roblox_user_id | bigint→string | Overridden to string in db.override.ts |
| username | string | Roblox username |
| display_name | string? | Roblox display name |
| avatar_url | string? | Roblox avatar thumbnail |
| jersey_number | number? | |
| position | string? | |
| last_synced_at | string | Last Roblox API sync |
| created_at, updated_at | string | |

### player_team_seasons
Junction table: player ↔ team ↔ season membership.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| player_id | uuid (FK → players) | |
| team_id | uuid (FK → teams) | |
| season_id | uuid (FK → seasons) | |
| role | string? | e.g. captain, player |
| joined_at | string | |
| left_at | string? | |
| created_at | string | |

### matches
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| season_id | uuid (FK → seasons) | |
| home_team_id | uuid? (FK → teams) | Nullable for TBD playoff matches |
| away_team_id | uuid? (FK → teams) | |
| week | number? | Season week number |
| status | enum: pending/scheduled/completed | |
| match_type | enum: season/playoffs | |
| scheduled_at | string? | ISO timestamp |
| best_of | number | Default 3 (best of N sets) |
| home_sets_won | number? | |
| away_sets_won | number? | |
| home_team_lvr | number? | LVR at time of match |
| away_team_lvr | number? | |
| match_mvp_player_id | uuid? (FK → players) | |
| loser_mvp_player_id | uuid? (FK → players) | |
| is_forfeit | boolean? | |
| created_at, updated_at | string | |

### match_sets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| match_id | uuid (FK → matches) | |
| set_number | number | |
| home_score | number | |
| away_score | number | |
| created_at, updated_at | string | |

### officials
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| roblox_user_id | bigint→string | |
| username | string? | |
| display_name | string? | |
| avatar_url | string? | |
| last_synced_at | string? | |
| created_at, updated_at | string? | |

### match_officials
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| match_id | uuid (FK → matches) | |
| official_id | uuid (FK → officials) | |
| official_type | string | "referee" or "media" |
| created_at | string | |

### player_stats
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| match_id | uuid (FK → matches) | |
| player_id | uuid (FK → players) | |
| team_id | uuid (FK → teams) | |
| created_at | string | |

<!-- TODO: Add stat columns when schema is extended -->

### playoff_brackets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| season_id | uuid (FK → seasons) | |
| match_id | uuid (FK → matches) | One-to-one |
| round | string | Round identifier |
| seed_home | number? | |
| seed_away | number? | |
| next_bracket_id | uuid? (FK → self) | Winner advances to |
| winner_position | string? | "home" or "away" in next bracket |
| loser_next_bracket_id | uuid? (FK → self) | For double elimination |
| loser_position | string? | |
| created_at | string | |

### playoff_configs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | string | |
| elimination_type | string | e.g. "single", "double" |
| qualified_teams | number | Teams that auto-qualify |
| playin_teams | number | Teams in play-in round |
| created_at | string | |

### pending_users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| email | string | |
| role | string | |
| invited_by | uuid? | |
| accepted | boolean? | |
| expires_at | string? | |
| notes | string? | |
| requested_at | string? | |

### user_roles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid | Supabase auth user |
| role | string? | |
| promoted_by | uuid? | |
| promoted_at | string? | |
| created_at, updated_at | string? | |

## Views

### standings (computed)
Calculated from match results. Not directly writable.

| Column | Type |
|--------|------|
| team_id | uuid? |
| team_name | string? |
| team_slug | string? |
| team_logo_url | string? |
| season_id | uuid? |
| region_id | uuid? |
| wins | number? |
| losses | number? |
| sets_won | number? |
| sets_lost | number? |
| starting_lvr | number? |
| total_lvr | number? |
| rank | number? |

## Enums

- **match_status**: `"pending"` | `"scheduled"` | `"completed"`
- **match_type**: `"season"` | `"playoffs"`

## Database Functions (RPC)

- `get_user_role(check_user_id)` → string — Returns user's role
- `has_role(check_user_id)` → boolean — Checks if user has any role
- `search_players_with_similarity(search_term)` → player results with similarity score
- `search_officials_with_similarity(search_term)` → official results with similarity score

## Key Relationships

```
regions ──< seasons ──< teams ──< player_team_seasons >── players
                    │         └──< matches ──< match_sets
                    │                    ├──< match_officials >── officials
                    │                    ├──< player_stats
                    │                    └──< playoff_brackets (self-referencing)
                    └── playoff_configs
```

<!-- TODO: Add RLS policies, indexes, triggers if relevant -->
## RLS Policies and Indexes
- RLS policies are set to allow read for all public data for non authenticated users, with authenticated users checked from user_roles table for admin or super_admin role, allowed CRUD operations
- Indexes are added for almost all database tables to speed queries.

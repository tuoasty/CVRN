export type SheetType = 'qualifier' | 'playoff' | 'teams'
export type SyncStatus = 'success' | 'partial' | 'failed'
export type SyncTrigger = 'cron' | 'manual' | 'rollback'
export type SyncChangeType = 'team_rename' | 'team_disband' | 'player_add' | 'player_remove' | 'role_change' | 'match_result'

export interface SyncChange {
    type: SyncChangeType
    entityId: string
    before: Record<string, unknown>
    after: Record<string, unknown>
}

export interface SyncError {
    row: number
    message: string
}

export interface SyncResult {
    rowsProcessed: number
    rowsErrored: number
    errors: SyncError[]
    changes: SyncChange[]
}

export type PlayerRole = 'captain' | 'vice_captain' | 'court_captain' | 'player'

export interface ParsedRosterEntry {
    role: PlayerRole
    username: string
    rowNumber: number
}

export interface ParsedMatchResult {
    matchCode: string
    homeTeamName: string
    awayTeamName: string
    sets: { setNumber: number; homeScore: number; awayScore: number }[]
    winner: string | null
    isForfeit: boolean
    scheduleRaw: string | null
    rowNumber: number
}

export interface ParsedTeamResult {
    teamNumber: number
    teamName: string
    teamColor: string | null
    brickNumber: number | null
    players: ParsedRosterEntry[]
    headerCol: number
    disbanded: boolean
}

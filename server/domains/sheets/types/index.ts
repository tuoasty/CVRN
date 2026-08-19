import { PlayerMatchStats } from "@/shared/types/db"
import { PositionCode } from "@/shared/volleyball/positions"

export type SheetType = 'qualifier' | 'playoff' | 'teams'
export type SyncStatus = 'success' | 'warning' | 'partial' | 'failed'
export type SyncTrigger = 'cron' | 'manual' | 'rollback'
export type SyncChangeType =
    | 'team_creation'
    | 'team_rename'
    | 'team_disband'
    | 'player_add'
    | 'player_remove'
    | 'role_change'
    | 'position_change'
    | 'height_change'
    | 'match_result'

export interface SyncChange {
    type: SyncChangeType
    entityId: string
    before: Record<string, unknown>
    after: Record<string, unknown>
}

export interface SyncError {
    row: number
    message: string

    kind?: 'skippable' | 'fatal'
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
    position: PositionCode | null
    positionInvalid: boolean
    height: string | null
}

export interface ParsedMatchResult {
    matchCode: string
    homeTeamName: string
    awayTeamName: string
    sets: { setNumber: number; homeScore: number; awayScore: number }[]
    winner: string | null
    isForfeit: boolean
    isByeAway: boolean
    scheduleRaw: string | null
    referees: string[]
    media: string[]
    rowNumber: number
}

export interface ParsedPlayoffResult {
    matchCode: string
    homeTeamName: string
    awayTeamName: string
    sets: { setNumber: number; homeScore: number; awayScore: number }[]
    winner: string | null
    isForfeit: boolean
    scheduleRaw: string | null
    referees: string[]
    media: string[]
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
    nameCleared: boolean
}

export interface ParsedStatLine {
    username: string;
    setNumber: number;
    counts: StatCounts;
    rowNumber: number;
    position: PositionCode | null;
}

export interface ParsedSection {
    sectionIndex: number;     
    headerLabel: string;      
    lines: ParsedStatLine[];
}

export type StatCounts = Omit<PlayerMatchStats,
      "id" | "match_id" | "player_id" | "team_id" | "set_number" | "created_at" | "serve_receives" | "position">;
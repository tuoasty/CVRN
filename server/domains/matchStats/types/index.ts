export interface PlayoffMatchStatRow {
    matchId: string;
    matchCode: string | null;
    round: string | null;
    status: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    scheduledAt: string | null;
    configId: string | null;
    sheetId: string | null;
    synced: boolean;
}

export type {SaveMatchSheetConfigInput} from "./schemas";
export {SaveMatchSheetConfigSchema} from "./schemas";

export type OfficialType = 'referee' | 'media';

export interface AssignOfficialInput {
    matchId: string;
    officialId: string;
    officialType: OfficialType;
}

export interface MatchIdInput {
    matchId: string;
}

export interface AssignMultipleOfficialsInput {
    matchId: string;
    officialIds: string[];
    officialType: OfficialType;
}
import type {PICKEM_MARKET_KINDS} from "./schemas";

export type PickemMarketKind = typeof PICKEM_MARKET_KINDS[number];
export type PickemMarketStatus = "open" | "settled" | "refunded";

export interface PickemSettings {
    seed: number;
    rake: number;
    oddsFloor: number;
    sigma: number;
    shrinkSets: number;
    probClamp: number;
    stakeMin: number;
    stakeMax: number;
    updatedAt: string;
}

export interface PickemOutcomeDraft {
    key: string;
    label: string;
    startProb: number;
}

export interface PickemMarketDraft {
    matchId: string;
    kind: PickemMarketKind;
    outcomes: PickemOutcomeDraft[];
}

export interface PickemOutcomeView {
    key: string;
    label: string;
    startProb: number;
    staked: number;
    odds: number;
}

export interface PickemMarketView {
    id: string;
    kind: PickemMarketKind;
    status: PickemMarketStatus;
    pool: number;
    outcomes: PickemOutcomeView[];
}

export type PickemMatchState = "unpublishable" | "unpublished" | "open" | "locked";

export interface PickemTeamView {
    id: string;
    name: string;
    logoUrl: string | null;
}

export interface PickemMatchRow {
    matchId: string;
    matchCode: string | null;
    matchType: "season" | "playoffs";
    week: number | null;
    bestOf: number;
    scheduledAt: string | null;
    lockAt: string | null;
    home: PickemTeamView | null;
    away: PickemTeamView | null;
    state: PickemMatchState;
    blockedReason: string | null;
    markets: PickemMarketView[];
}

export interface PickemBoard {
    settings: PickemSettings;
    matches: PickemMatchRow[];
}

export interface PickemMatchSource {
    id: string;
    matchCode: string | null;
    matchType: "season" | "playoffs";
    status: "pending" | "scheduled" | "completed";
    week: number | null;
    bestOf: number;
    scheduledAt: string | null;
    home: PickemTeamView | null;
    away: PickemTeamView | null;
}

export interface PickemMarketSource {
    id: string;
    matchId: string;
    kind: PickemMarketKind;
    status: PickemMarketStatus;
}

export interface PickemOutcomeSource {
    marketId: string;
    key: string;
    label: string;
    sortOrder: number;
    startProb: number;
}

export interface PickemOddsSource {
    marketId: string;
    outcomeKey: string;
    staked: number;
    pool: number;
    odds: number;
}

export type {PickemSeasonInput, PublishPickemsInput, PickemSettingsInput} from "./schemas";
export {PICKEM_MARKET_KINDS, PICKEM_PUBLISH_LIMIT, PickemSeasonSchema, PublishPickemsSchema, PickemSettingsSchema} from "./schemas";

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
    resultOutcome: string | null;
    pool: number;
    outcomes: PickemOutcomeView[];
}

export type PickemMatchState =
    | "unpublishable"
    | "unpublished"
    | "open"
    | "locked"
    | "awaiting_settlement"
    | "partly_settled"
    | "settled"
    | "refunded";

export interface PickemMatchResult {
    homeSets: number;
    awaySets: number;
    forfeit: boolean;
}

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
    result: PickemMatchResult | null;
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
    result: PickemMatchResult | null;
}

export interface PickemMarketSource {
    id: string;
    matchId: string;
    kind: PickemMarketKind;
    status: PickemMarketStatus;
    resultOutcome: string | null;
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

export type PickemSettleResult = "win" | "loss" | "refund";

export interface PickemSettleOutcome {
    key: string;
    label: string;
    result: PickemSettleResult;
    picks: number;
    staked: number;
    finalOdds: number | null;
    payout: number;
}

export interface PickemSettleMarket {
    marketId: string;
    kind: PickemMarketKind;
    staked: number;
    paid: number;
    outcomes: PickemSettleOutcome[];
}

export interface PickemSettleMatch {
    matchId: string;
    matchCode: string | null;
    home: PickemTeamView | null;
    away: PickemTeamView | null;
    forfeit: boolean;
    markets: PickemSettleMarket[];
}

export interface PickemSettlePreview {
    matches: PickemSettleMatch[];
    staked: number;
    paid: number;
}

export interface PickemSettleRowSource {
    matchId: string;
    marketId: string;
    kind: PickemMarketKind;
    outcomeKey: string;
    result: PickemSettleResult;
    forfeit: boolean;
    picks: number;
    staked: number;
    finalOdds: number | null;
    payout: number;
}

export type PickemPickStatus = "open" | "won" | "lost" | "refunded";

export interface PickemDetailOutcome {
    key: string;
    label: string;
    odds: number;
    staked: number;
    picks: number;
    paysIfWins: number;
}

export interface PickemDetailMarket {
    id: string;
    kind: PickemMarketKind;
    status: PickemMarketStatus;
    resultOutcome: string | null;
    pool: number;
    outcomes: PickemDetailOutcome[];
}

export interface PickemDetailPick {
    pickId: string;
    robloxUserId: string;
    username: string | null;
    displayName: string | null;
    marketId: string;
    kind: PickemMarketKind;
    outcomeKey: string;
    outcomeLabel: string;
    stake: number;
    odds: number;
    payout: number;
    status: PickemPickStatus;
    claimedAt: string | null;
    updatedAt: string;
}

export interface PickemMatchDetail {
    matchId: string;
    markets: PickemDetailMarket[];
    picks: PickemDetailPick[];
    namesMissing: boolean;
}

export interface PickemDetailPickSource {
    id: string;
    marketId: string;
    robloxUserId: string;
    outcomeKey: string;
    stake: number;
    payout: number | null;
    claimedAt: string | null;
    updatedAt: string;
}

export interface RobloxName {
    username: string | null;
    displayName: string | null;
}

export type PickemActivitySource = "all" | "admin" | "game";
export type PickemPickEventKind = "placed" | "changed" | "claimed";

export interface PickemActivityCursor {
    at: string;
    source: "admin" | "game";
    id: number;
}

export interface PickemAdminActivity {
    source: "admin";
    key: string;
    createdAt: string;
    actor: string | null;
    summary: string;
    denied: boolean;
    matches: string[];
}

export interface PickemGameActivity {
    source: "game";
    key: string;
    createdAt: string;
    kind: PickemPickEventKind;
    robloxUserId: string;
    username: string | null;
    matchTitle: string;
    marketLabel: string;
    outcomeLabel: string;
    previousOutcomeLabel: string | null;
    stake: number;
    previousStake: number | null;
    charged: number | null;
    payout: number | null;
}

export type PickemActivityEntry = PickemAdminActivity | PickemGameActivity;

export interface PickemActivityPage {
    entries: PickemActivityEntry[];
    nextCursor: PickemActivityCursor | null;
}

export interface PickemActivityRowSource {
    source: "admin" | "game";
    id: number;
    createdAt: string;
    action: string | null;
    actionOutcome: string | null;
    actorName: string | null;
    target: Record<string, unknown> | null;
    eventKind: PickemPickEventKind | null;
    matchId: string | null;
    marketKind: PickemMarketKind | null;
    robloxUserId: string | null;
    outcomeKey: string | null;
    previousOutcomeKey: string | null;
    stake: number | null;
    previousStake: number | null;
    charged: number | null;
    payout: number | null;
}

export interface PickemMatchSettlement {
    open: number;
    settled: number;
    refunded: number;
}

export type {
    PickemSeasonInput,
    PublishPickemsInput,
    PickemSettingsInput,
    SettlePickemsInput,
    RefundPickemsInput,
    PickemMatchInput,
    PickemActivityInput,
} from "./schemas";
export {
    PICKEM_MARKET_KINDS,
    PICKEM_PUBLISH_LIMIT,
    PICKEM_SETTLE_LIMIT,
    PickemSeasonSchema,
    PublishPickemsSchema,
    PickemSettingsSchema,
    SettlePickemsSchema,
    RefundPickemsSchema,
    PickemMatchSchema,
    PickemActivitySchema,
    PICKEM_ACTIVITY_PAGE_SIZE,
} from "./schemas";

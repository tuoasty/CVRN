export interface GuildBooster {
    discordUserId: string;
    premiumSince: string | null;
}

export interface BoosterSyncPlan {
    toDelete: string[];
    toResolve: GuildBooster[];
    toRefreshSince: GuildBooster[];
}

export interface BoosterSyncSummary {
    boosters: number;
    added: number;
    removed: number;
    resolved: number;
    unlinked: number;
    deferred: number;
    changed: boolean;
}

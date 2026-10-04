import type {PlayerAward, PlayerSpecEntry} from "@/server/domains/player";

export type PlayerAwardListItem =
    | {kind: "award"; key: string; award: PlayerAward}
    | {kind: "spec"; key: string; spec: PlayerSpecEntry};

const CATEGORY_RANK: Record<string, number> = {
    individual_winners: 0,
    all_star: 1,
    first_team: 2,
};
const SPEC_RANK = 3;
const ALL_STAR_TEAM_RANK: Record<string, number> = {A: 0, B: 1};
const ALL_STAR_SLOT_RANK: Record<string, number> = {starter: 0, sub: 1};

function seasonStart(item: PlayerAwardListItem): string {
    return item.kind === "award" ? item.award.season_start_date : item.spec.season_start_date;
}

function categoryRank(item: PlayerAwardListItem): number {
    return item.kind === "award" ? CATEGORY_RANK[item.award.category] ?? SPEC_RANK : SPEC_RANK;
}

function withinCategory(a: PlayerAwardListItem, b: PlayerAwardListItem): number {
    if (a.kind !== "award" || b.kind !== "award") return 0;
    return (ALL_STAR_TEAM_RANK[a.award.all_star_team ?? ""] ?? 0) - (ALL_STAR_TEAM_RANK[b.award.all_star_team ?? ""] ?? 0)
        || (ALL_STAR_SLOT_RANK[a.award.all_star_slot ?? ""] ?? 0) - (ALL_STAR_SLOT_RANK[b.award.all_star_slot ?? ""] ?? 0)
        || (a.award.sort_order ?? 0) - (b.award.sort_order ?? 0);
}

export function buildPlayerAwardList(awards: PlayerAward[], specs: PlayerSpecEntry[]): PlayerAwardListItem[] {
    const items: PlayerAwardListItem[] = [
        ...awards.map(award => ({kind: "award" as const, key: `award:${award.id}`, award})),
        ...specs.map(spec => ({kind: "spec" as const, key: `spec:${spec.id}`, spec})),
    ];
    return items.sort((a, b) =>
        seasonStart(b).localeCompare(seasonStart(a))
        || categoryRank(a) - categoryRank(b)
        || withinCategory(a, b)
    );
}

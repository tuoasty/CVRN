import type {TeamCard} from "@/server/domains/playerCard/types";

export function pickCardSeason(
    cards: TeamCard[],
    rosterIds: string[],
    current: number,
): {seasonNumber: number; cards: TeamCard[]} | null {
    const roster = new Set(rosterIds);
    const mine = cards.filter((c) => roster.has(c.playerId));
    const seasonNumber = mine.some((c) => c.seasonNumber === current) ? current : current - 1;
    const chosen = mine
        .filter((c) => c.seasonNumber === seasonNumber)
        .sort((a, b) => b.ovr - a.ovr || a.playerId.localeCompare(b.playerId) || a.groupId.localeCompare(b.groupId));
    return chosen.length > 0 ? {seasonNumber, cards: chosen} : null;
}

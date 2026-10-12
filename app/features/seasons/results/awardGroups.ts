import {AllStarSlot, AllStarTeamCode, AwardCategory, SeasonAwardEntryWithPlayer} from "@/server/domains/season";

type Award = SeasonAwardEntryWithPlayer;

function sameGroup(a: Award, b: Award): boolean {
    return a.category === b.category && a.all_star_team === b.all_star_team && a.all_star_slot === b.all_star_slot;
}

export function byCaptainThenOrder(a: Award, b: Award): number {
    return Number(b.all_star_captain) - Number(a.all_star_captain) || a.sort_order - b.sort_order;
}

export function awardsIn(awards: readonly Award[], category: AwardCategory, team?: AllStarTeamCode, slot?: AllStarSlot): Award[] {
    return awards
        .filter(a => a.category === category && (team === undefined || a.all_star_team === team) && (slot === undefined || a.all_star_slot === slot))
        .sort(byCaptainThenOrder);
}

function reorderable(awards: readonly Award[], award: Award): Award[] {
    return awards.filter(a => sameGroup(a, award) && !a.all_star_captain).sort((a, b) => a.sort_order - b.sort_order);
}

export function movability(awards: readonly Award[], award: Award): {up: boolean; down: boolean} {
    if (award.all_star_captain) return {up: false, down: false};
    const group = reorderable(awards, award);
    const idx = group.findIndex(a => a.id === award.id);
    return {up: idx > 0, down: idx >= 0 && idx < group.length - 1};
}

export function reorderGroup(awards: readonly Award[], award: Award, direction: "up" | "down"): {id: string; sortOrder: number}[] | null {
    if (award.all_star_captain) return null;
    const group = reorderable(awards, award);
    const idx = group.findIndex(a => a.id === award.id);
    const other = group[direction === "up" ? idx - 1 : idx + 1];
    if (idx < 0 || !other) return null;
    return [
        {id: award.id, sortOrder: other.sort_order},
        {id: other.id, sortOrder: award.sort_order},
    ];
}

const ROSTER_ROLES: Record<string, {rank: number; label: string}> = {
    captain: {rank: 0, label: "Capt"},
    vice_captain: {rank: 1, label: "Vice"},
    court_captain: {rank: 2, label: "Court"},
};

export function rosterRoleLabel(awardName: string): string {
    return ROSTER_ROLES[awardName]?.label ?? "";
}

export function sortRoster(awards: readonly Award[]): Award[] {
    return awards
        .filter(a => a.category === "champion_roster")
        .sort((a, b) => (ROSTER_ROLES[a.award_name]?.rank ?? 3) - (ROSTER_ROLES[b.award_name]?.rank ?? 3) || a.sort_order - b.sort_order);
}

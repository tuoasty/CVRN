export type SectionKey = "matches" | "honours" | "achievements" | "awards" | "teams";

export interface PlayerLayout {
    beside: SectionKey[][];
    below: SectionKey[][];
}

function columns(...candidates: SectionKey[][]): SectionKey[][] {
    return candidates.filter(column => column.length > 0);
}

export function planPlayerLayout(p: {
    cards: number;
    achievements: boolean;
    awards: boolean;
    matches: boolean;
    teams: boolean;
}): PlayerLayout {
    const hasHonours = p.achievements || p.awards;
    const matches: SectionKey[] = p.matches ? ["matches"] : [];
    const record: SectionKey[] = [
        ...(p.achievements ? ["achievements" as const] : []),
        ...(p.awards ? ["awards" as const] : []),
    ];
    const honours: SectionKey[] = hasHonours ? ["honours"] : [];
    const teams: SectionKey[] = p.teams ? ["teams"] : [];

    if (p.cards === 0) {
        return {beside: [], below: columns([...matches, ...record], [...honours, ...teams])};
    }

    if (p.cards === 1) {
        if (p.matches && hasHonours) return {beside: [matches, honours], below: columns(record, teams)};
        if (p.matches) return {beside: columns(matches, teams), below: []};
        return {beside: columns(record, [...honours, ...teams]), below: []};
    }

    if (p.matches) return {beside: [matches], below: columns(record, [...honours, ...teams])};
    if (hasHonours) return {beside: [record], below: columns([...honours, ...teams])};
    return {beside: columns(teams), below: []};
}

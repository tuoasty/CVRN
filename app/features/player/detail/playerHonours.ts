import type {PlayerAward, PlayerSpecEntry} from "@/server/domains/player";

export interface PlayerHonour {
    label: string;
    count: number;
}

const GROUP = {champion: 0, individual: 1, allStar: 2, firstTeam: 3, spec: 4} as const;

interface Tally extends PlayerHonour {
    group: number;
}

function classify(award: PlayerAward): Omit<Tally, "count"> | null {
    switch (award.category) {
        case "champion_roster":
            return {label: "Champion", group: GROUP.champion};
        case "individual_winners":
            return {label: award.award_name, group: GROUP.individual};
        case "all_star":
            return {label: "All-Star", group: GROUP.allStar};
        case "first_team":
            return {label: "First-Team", group: GROUP.firstTeam};
        default:
            return null;
    }
}

export function buildPlayerHonours(awards: PlayerAward[], specs: PlayerSpecEntry[]): PlayerHonour[] {
    const tallies = new Map<string, Tally>();
    const add = (entry: Omit<Tally, "count">) => {
        const existing = tallies.get(entry.label);
        if (existing) existing.count += 1;
        else tallies.set(entry.label, {...entry, count: 1});
    };

    for (const award of awards) {
        const entry = classify(award);
        if (entry) add(entry);
    }
    for (let i = 0; i < specs.length; i += 1) add({label: "Spec Winner", group: GROUP.spec});

    return [...tallies.values()]
        .sort((a, b) =>
            a.group - b.group
            || b.count - a.count
            || a.label.localeCompare(b.label))
        .map(({label, count}) => ({label, count}));
}

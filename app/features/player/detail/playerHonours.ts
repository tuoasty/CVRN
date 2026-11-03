import type {PlayerAward, PlayerSpecEntry} from "@/server/domains/player";
import {formatPlacement} from "@/app/utils/placement";

export interface PlayerHonour {
    label: string;
    count: number;
}

const GROUP = {champion: 0, runnerUp: 1, third: 2, placement: 3, individual: 4, allStar: 5, firstTeam: 6, spec: 7} as const;

interface Tally extends PlayerHonour {
    group: number;
    place: number;
}

function classify(award: PlayerAward): Omit<Tally, "count"> | null {
    switch (award.category) {
        case "champion_roster":
            return {label: "Champion", group: GROUP.champion, place: 0};
        case "runner_up":
            return {label: "Runner Up", group: GROUP.runnerUp, place: 0};
        case "third_place":
            return {label: "Third Place", group: GROUP.third, place: 0};
        case "placement": {
            const place = award.place ?? 0;
            const groupSize = (award.place_end ?? place) - place + 1;
            return {label: formatPlacement(place, groupSize), group: GROUP.placement, place};
        }
        case "individual_winners":
            return {label: award.award_name, group: GROUP.individual, place: 0};
        case "all_star":
            return {label: "All-Star", group: GROUP.allStar, place: 0};
        case "first_team":
            return {label: "First-Team", group: GROUP.firstTeam, place: 0};
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
    for (let i = 0; i < specs.length; i += 1) add({label: "Spec Winner", group: GROUP.spec, place: 0});

    return [...tallies.values()]
        .sort((a, b) =>
            a.group - b.group
            || a.place - b.place
            || b.count - a.count
            || a.label.localeCompare(b.label))
        .map(({label, count}) => ({label, count}));
}

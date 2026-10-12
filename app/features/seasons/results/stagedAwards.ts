import {PlayerWithTeamInfo} from "@/server/domains/player";
import {BatchUpsertSeasonAwardsInput} from "@/server/domains/season";
import {BarTarget, CATEGORY_LABELS, StagedAward} from "./types";

export type StagedAction =
    | {type: "add"; tempId: string; target: BarTarget; awardName: string; player: PlayerWithTeamInfo}
    | {type: "remove"; tempId: string}
    | {type: "clear"};

export function stagedAwardsReducer(state: StagedAward[], action: StagedAction): StagedAward[] {
    switch (action.type) {
        case "add": {
            const awardName = action.awardName.trim();
            if (!awardName) return state;
            const {category, team, slot} = action.target;
            const award: StagedAward = {
                tempId: action.tempId,
                awardName,
                category,
                player: action.player,
                ...(category === "all_star" ? {allStarTeam: team, allStarSlot: slot} : {}),
            };
            return [...state, award];
        }
        case "remove":
            return state.filter(a => a.tempId !== action.tempId);
        case "clear":
            return state.length === 0 ? state : [];
    }
}

export function toBatchAwards(staged: readonly StagedAward[]): BatchUpsertSeasonAwardsInput["awards"] {
    return staged.map(a => ({
        playerId: a.player.id,
        awardName: a.awardName,
        category: a.category,
        allStarTeam: a.allStarTeam,
        allStarSlot: a.allStarSlot,
    }));
}

export function stagedChipLabel(a: StagedAward): string {
    const category = a.category === "all_star"
        ? `All-Star ${a.allStarTeam}${a.allStarSlot === "sub" ? " Sub" : ""}`
        : CATEGORY_LABELS[a.category];
    return `${category} · ${a.awardName} · @${a.player.username ?? a.player.id}`;
}

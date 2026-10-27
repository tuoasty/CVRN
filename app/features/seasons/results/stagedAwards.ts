import {PlayerWithTeamInfo} from "@/server/domains/player";
import {BatchUpsertSeasonAwardsInput} from "@/server/domains/season";
import type {LeagueSpec} from "@/server/domains/spec/types";
import {BarTarget, CATEGORY_LABELS, StagedAward, StagedItem, isStagedAward} from "./types";

export type StagedAction =
    | {type: "add"; tempId: string; target: BarTarget; awardName: string; player: PlayerWithTeamInfo}
    | {type: "addSpec"; tempId: string; spec: LeagueSpec; stars: number; player: PlayerWithTeamInfo}
    | {type: "remove"; tempId: string}
    | {type: "removeMany"; tempIds: readonly string[]}
    | {type: "clear"};

export function stagedAwardsReducer(state: StagedItem[], action: StagedAction): StagedItem[] {
    switch (action.type) {
        case "add": {
            const awardName = action.awardName.trim();
            const {category, team, slot} = action.target;
            if (!awardName || category === "spec") return state;
            const award: StagedAward = {
                tempId: action.tempId,
                awardName,
                category,
                player: action.player,
                ...(category === "all_star" ? {allStarTeam: team, allStarSlot: slot} : {}),
            };
            return [...state, award];
        }
        case "addSpec":
            return [
                ...state.filter(s => s.category !== "spec" || s.spec.id !== action.spec.id),
                {tempId: action.tempId, category: "spec", spec: action.spec, stars: action.stars, player: action.player},
            ];
        case "remove":
            return state.filter(a => a.tempId !== action.tempId);
        case "removeMany": {
            if (action.tempIds.length === 0) return state;
            const drop = new Set(action.tempIds);
            return state.filter(a => !drop.has(a.tempId));
        }
        case "clear":
            return state.length === 0 ? state : [];
    }
}

export function toBatchAwards(staged: readonly StagedItem[]): BatchUpsertSeasonAwardsInput["awards"] {
    return staged.filter(isStagedAward).map(a => ({
        playerId: a.player.id,
        awardName: a.awardName,
        category: a.category,
        allStarTeam: a.allStarTeam,
        allStarSlot: a.allStarSlot,
    }));
}

export function stagedChipLabel(a: StagedItem): string {
    const username = `@${a.player.username ?? a.player.id}`;
    if (a.category === "spec") return `Spec · ${a.spec.name} ★${a.stars} · ${username}`;
    const category = a.category === "all_star"
        ? `All-Star ${a.allStarTeam}${a.allStarSlot === "sub" ? " Sub" : ""}`
        : CATEGORY_LABELS[a.category];
    return `${category} · ${a.awardName} · ${username}`;
}

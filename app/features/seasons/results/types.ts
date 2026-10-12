import {AllStarSlot, AllStarTeamCode, AwardCategory} from "@/server/domains/season";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {Spec} from "@/shared/types/db";

export type AwardBarCategory = Extract<AwardCategory, "individual_winners" | "all_star" | "staff_team">;
export type BarCategory = AwardBarCategory | "spec";

export interface BarTarget {
    category: BarCategory;
    team: AllStarTeamCode;
    slot: AllStarSlot;
}

export interface StagedAward {
    tempId: string;
    awardName: string;
    category: AwardBarCategory;
    allStarTeam?: AllStarTeamCode;
    allStarSlot?: AllStarSlot;
    player: PlayerWithTeamInfo;
}

export interface StagedSpec {
    tempId: string;
    category: "spec";
    spec: Spec;
    stars: number;
    player: PlayerWithTeamInfo;
}

export type StagedItem = StagedAward | StagedSpec;

export const BAR_CATEGORIES: readonly {value: BarCategory; label: string}[] = [
    {value: "individual_winners", label: "Individual"},
    {value: "all_star", label: "All-Star"},
    {value: "staff_team", label: "Staff"},
    {value: "spec", label: "Spec"},
];

export const CATEGORY_LABELS: Record<BarCategory, string> = {
    individual_winners: "Individual",
    all_star: "All-Star",
    staff_team: "Staff",
    spec: "Spec",
};

export function isBarCategory(category: AwardCategory): category is AwardBarCategory {
    return category === "individual_winners" || category === "all_star" || category === "staff_team";
}

export function isStagedSpec(item: StagedItem): item is StagedSpec {
    return item.category === "spec";
}

export function isStagedAward(item: StagedItem): item is StagedAward {
    return item.category !== "spec";
}

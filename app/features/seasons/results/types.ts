import {AllStarSlot, AllStarTeamCode, AwardCategory} from "@/server/domains/season";
import {PlayerWithTeamInfo} from "@/server/domains/player";

export type BarCategory = Extract<AwardCategory, "individual_winners" | "all_star" | "staff_team">;

export interface BarTarget {
    category: BarCategory;
    team: AllStarTeamCode;
    slot: AllStarSlot;
}

export interface StagedAward {
    tempId: string;
    awardName: string;
    category: BarCategory;
    allStarTeam?: AllStarTeamCode;
    allStarSlot?: AllStarSlot;
    player: PlayerWithTeamInfo;
}

export const BAR_CATEGORIES: readonly {value: BarCategory; label: string}[] = [
    {value: "individual_winners", label: "Individual"},
    {value: "all_star", label: "All-Star"},
    {value: "staff_team", label: "Staff"},
];

export const CATEGORY_LABELS: Record<BarCategory, string> = {
    individual_winners: "Individual",
    all_star: "All-Star",
    staff_team: "Staff",
};

export function isBarCategory(category: AwardCategory): category is BarCategory {
    return category === "individual_winners" || category === "all_star" || category === "staff_team";
}

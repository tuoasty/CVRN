import type {PlayerAward, PlayerSpecEntry} from "@/server/domains/player";
import {buildPlayerAwardList, type PlayerAwardListItem} from "@/app/utils/playerAwardList";
import {formatPlacement} from "@/app/utils/placement";

export const ROLE_LABELS: Record<string, string> = {
    captain: "Captain",
    vice_captain: "Vice Captain",
    court_captain: "Court Captain",
};

export const PODIUM_CATEGORIES = new Set(["champion_roster", "runner_up", "third_place", "placement"]);

export function selectPlayerRecord(
    awards: PlayerAward[],
    specs: PlayerSpecEntry[],
): {achievements: PlayerAward[]; awardList: PlayerAwardListItem[]} {
    return {
        achievements: awards.filter(a => PODIUM_CATEGORIES.has(a.category)),
        awardList: buildPlayerAwardList(
            awards.filter(a => !PODIUM_CATEGORIES.has(a.category) && a.category !== "staff_team"),
            specs,
        ),
    };
}

export function formatDate(isoString: string | null): string {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
}

export function placeLabel(award: PlayerAward): {text: string; className: string} {
    if (award.category === "champion_roster") return {text: "1st", className: "font-semibold text-foreground"};
    if (award.place != null) {
        const groupSize = (award.place_end ?? award.place) - award.place + 1;
        return {text: formatPlacement(award.place, groupSize), className: "font-semibold text-muted-foreground"};
    }
    return {text: "-", className: "text-muted-foreground"};
}

export function awardLabel(award: PlayerAward): string {
    if (award.category === "first_team") return `First Team ${award.award_name}`;
    if (award.category === "all_star") return award.all_star_captain ? "All-Star Captain" : "All-Star";
    return award.award_name;
}

export function awardDetail(award: PlayerAward): string | null {
    if (award.category !== "all_star") return null;
    return [award.all_star_team_name, award.award_name].filter(Boolean).join(" · ");
}

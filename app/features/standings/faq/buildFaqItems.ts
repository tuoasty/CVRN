import type {StandingsTableModel} from "../model/types";
import {
    DIFFERENTIAL_BONUS_TIERS,
    FORFEIT_BONUS,
    FORFEIT_LVR,
    FORFEIT_POINTS_WITHOUT_BONUS,
    LVR_MAX_POINT_DIFF,
    LVR_MAX_SET_DIFF,
    LVR_POINT_WEIGHT,
    LVR_SCALE,
    LVR_SET_WEIGHT,
    POINTS_PER_SET,
    WIN_POINTS,
} from "@/shared/volleyball/matchScoring";

export interface FaqItem {
    question: string;
    answer: string;
}

type FaqInput = Pick<StandingsTableModel, "method" | "qualifiedTeams" | "playinTeams" | "hasCarryInPoints">;

const RANKED = "How is the table ranked?";
const FORFEIT_PREFIX = "Recorded as a straight-sets result, so they count in W, L and sets.";
const SWEEP_SETS = 2;
export const SPOTS_MAY_CHANGE = "The number of spots may change.";

const pct = (weight: number) => `${Math.round(weight * 100)}%`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function lvrItems(): FaqItem[] {
    return [
        {question: RANKED, answer: "By LVR (Lego Volleyball Rating), highest first."},
        {
            question: "How does LVR change?",
            answer: `Every team starts the season at a base LVR, usually 100. Each season match moves it by up to ${LVR_SCALE} either way: ${pct(LVR_SET_WEIGHT)} from the set difference and ${pct(LVR_POINT_WEIGHT)} from the rally point difference. Change = ${LVR_SCALE} × (${LVR_SET_WEIGHT} × set difference ÷ ${LVR_MAX_SET_DIFF} + ${LVR_POINT_WEIGHT} × point difference ÷ ${LVR_MAX_POINT_DIFF}). The loser loses what the winner gains.`,
        },
    ];
}

function pointsItems(hasCarryInPoints: boolean): FaqItem[] {
    const tiers = [...DIFFERENTIAL_BONUS_TIERS].reverse().map(t => `${t.minDiff}+ is ${t.bonus}`).join(", ");
    const carry = hasCarryInPoints ? " Some teams start the season with points carried over." : "";
    return [
        {question: RANKED, answer: "By wins. Teams level on wins are separated by points, then sets won, then fewest losses."},
        {
            question: "How are points earned?",
            answer: `A win is worth ${WIN_POINTS}, plus ${POINTS_PER_SET} for every set won; a loss earns ${POINTS_PER_SET} per set won. The winner also gets a bonus by rally point margin: ${tiers}. Pts includes the bonus.${carry}`,
        },
    ];
}

function pointsWithoutBonusItems(): FaqItem[] {
    const sweep = WIN_POINTS;
    const close = WIN_POINTS - POINTS_PER_SET;
    return [
        {question: RANKED, answer: "By points. Teams level on points are separated by rally point difference in the most recent round."},
        {
            question: "How are points earned?",
            answer: `A 2-0 win is worth ${sweep}, a 2-1 win ${close}, a 1-2 loss ${POINTS_PER_SET}, a 0-2 loss 0.`,
        },
    ];
}

function forfeitAnswer(method: StandingsTableModel["method"]): string {
    if (method === "lvr") return `${FORFEIT_PREFIX} The forfeiting team loses ${Math.abs(FORFEIT_LVR.forfeiter)} LVR and the opponent gains ${FORFEIT_LVR.opponent}.`;
    if (method === "points") return `${FORFEIT_PREFIX} The winner gets ${WIN_POINTS + SWEEP_SETS * POINTS_PER_SET} points and a ${FORFEIT_BONUS} point bonus.`;
    return `${FORFEIT_PREFIX} The winner gets ${plural(FORFEIT_POINTS_WITHOUT_BONUS, "point")}.`;
}

export function buildFaqItems(input: FaqInput): FaqItem[] {
    const methodItems = input.method === "lvr"
        ? lvrItems()
        : input.method === "points"
            ? pointsItems(input.hasCarryInPoints)
            : pointsWithoutBonusItems();

    const items = [...methodItems];
    if (input.qualifiedTeams) {
        const playin = input.playinTeams > 0 ? `, the next ${input.playinTeams} to the play-in` : "";
        items.push({question: "What do the lines mean?", answer: `The top ${input.qualifiedTeams} teams go to the playoffs${playin}. ${SPOTS_MAY_CHANGE}`});
    }
    items.push({question: "How do forfeits count?", answer: forfeitAnswer(input.method)});
    return items;
}


import { PLAYOFF_ROUNDS, type PlayoffRound } from "@/server/domains/playoff/types/schemas";

export const ROUND_LABEL_SHORT: Record<PlayoffRound, string> = {
    play_in: "Play-in",
    round_of_32: "R32",
    round_of_16: "R16",
    quarterfinal: "QF",
    semifinal: "SF",
    winners_final: "WF",
    losers_round_1: "LR1",
    losers_round_2: "LR2",
    losers_round_3: "LR3",
    losers_quarterfinal: "LQF",
    losers_semifinal: "LSF",
    losers_final: "LF",
    third_place: "3rd Place",
    final: "Grand Final",
    grand_final: "GF",
    bracket_reset: "BR",
};

export const ROUND_LABEL_LONG: Record<PlayoffRound, string> = {
    play_in: "Play-in",
    round_of_32: "Round of 32",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    winners_final: "Winners Final",
    losers_round_1: "Losers Round 1",
    losers_round_2: "Losers Round 2",
    losers_round_3: "Losers Round 3",
    losers_quarterfinal: "Losers Quarterfinal",
    losers_semifinal: "Losers Semifinal",
    losers_final: "Losers Final",
    third_place: "3rd Place",
    final: "Grand Finals",
    grand_final: "Grand Final",
    bracket_reset: "Bracket Reset",
};

const ROUND_ORDER = new Map<string, number>(PLAYOFF_ROUNDS.map((r, i) => [r, i]));

export const isPlayoffRound = (value: string | null | undefined): value is PlayoffRound =>
    !!value && ROUND_ORDER.has(value);

export const roundLabelShort = (round: string): string =>
    isPlayoffRound(round) ? ROUND_LABEL_SHORT[round] : round;

export const roundLabelLong = (round: string): string =>
    isPlayoffRound(round) ? ROUND_LABEL_LONG[round] : round;

export const sortRounds = <T extends string>(rounds: readonly T[]): T[] =>
    [...rounds].sort(
        (a, b) => (ROUND_ORDER.get(a) ?? Infinity) - (ROUND_ORDER.get(b) ?? Infinity)
    );

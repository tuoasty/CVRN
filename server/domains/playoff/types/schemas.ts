import {z} from "zod"

export const PLAYOFF_ROUNDS = [
    "play_in",
    "round_of_32",
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "winners_final",
    "losers_round_1",
    "losers_round_2",
    "losers_round_3",
    "losers_quarterfinal",
    "losers_semifinal",
    "losers_final",
    "third_place",
    "final",
    "grand_final",
    "bracket_reset",
] as const

export const PlayoffRoundSchema = z.enum(PLAYOFF_ROUNDS)
export type PlayoffRound = z.infer<typeof PlayoffRoundSchema>

export const GeneratePlayoffBracketSchema = z.object({
    seasonId: z.uuid(),

    seedOrder: z.array(z.uuid()).optional(),
})
export type GeneratePlayoffBracketInput = z.infer<typeof GeneratePlayoffBracketSchema>

export const GetPlayoffScheduleSchema = z.object({
    seasonId: z.uuid(),
    round: PlayoffRoundSchema,
})
export type GetPlayoffScheduleInput = z.infer<typeof GetPlayoffScheduleSchema>

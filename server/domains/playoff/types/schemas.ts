import {z} from "zod"

// Canonical round vocabulary, in bracket progression order: winners bracket,
// then losers bracket, then the deciding matches. Templates in
// `server/domains/playoff/templates/` are the source of these values; the DB
// dropped its CHECK constraint in 20260707000000_playoff_bracket_group.sql, so
// this enum is the only gate. Array order doubles as sort order for UI steppers.
export const PLAYOFF_ROUNDS = [
    "play_in",
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
    // Optional custom seed order: index 0 = seed 1 … N-1 = seed N (team UUIDs).
    // When omitted, seeds are auto-filled from standings order.
    seedOrder: z.array(z.uuid()).optional(),
})
export type GeneratePlayoffBracketInput = z.infer<typeof GeneratePlayoffBracketSchema>

export const GetPlayoffScheduleSchema = z.object({
    seasonId: z.uuid(),
    round: PlayoffRoundSchema,
})
export type GetPlayoffScheduleInput = z.infer<typeof GetPlayoffScheduleSchema>

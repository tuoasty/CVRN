import {z} from "zod"

export const PlayoffRoundSchema = z.enum(["play_in", "round_of_16", "quarterfinal", "semifinal", "final", "third_place"])
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

import {z} from "zod"

export const PlayoffRoundSchema = z.enum(["play_in", "round_of_16", "quarterfinal", "semifinal", "final", "third_place"])
export type PlayoffRound = z.infer<typeof PlayoffRoundSchema>

export const GeneratePlayoffBracketSchema = z.object({
    seasonId: z.uuid(),
})
export type GeneratePlayoffBracketInput = z.infer<typeof GeneratePlayoffBracketSchema>

export const GetPlayoffScheduleSchema = z.object({
    seasonId: z.uuid(),
    round: PlayoffRoundSchema,
})
export type GetPlayoffScheduleInput = z.infer<typeof GetPlayoffScheduleSchema>

import { z } from "zod"
import { TERM_CATEGORIES, TERM_KINDS } from "../terms/types"
import { POSITIONS, type PositionCode } from "@/shared/volleyball/positions"
import { SPEC_STARS } from "./specLinks"

export const GAME_DATA_TEXT_MAX = 1_000_000

export const GameDataTextSchema = z.object({
    text: z.string().trim().min(1, 'Paste some Lua first').max(GAME_DATA_TEXT_MAX, 'Paste is too large'),
})
export type GameDataTextInput = z.infer<typeof GameDataTextSchema>

const POSITION_CODES = POSITIONS.map(p => p.code) as [PositionCode, ...PositionCode[]]

export const SpecLinkDecisionSchema = z.discriminatedUnion('action', [
    z.object({ gameKey: z.string().min(1).max(200), action: z.literal('link'), specId: z.string().uuid(), rename: z.boolean() }),
    z.object({ gameKey: z.string().min(1).max(200), action: z.literal('create'), stars: z.union(SPEC_STARS.map(s => z.literal(s)) as [z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]), position: z.enum(POSITION_CODES) }),
    z.object({ gameKey: z.string().min(1).max(200), action: z.literal('leave') }),
    z.object({ gameKey: z.string().min(1).max(200), action: z.literal('skip') }),
])

export const PublishGameDataSchema = GameDataTextSchema.extend({
    specLinks: z.array(SpecLinkDecisionSchema).max(500).default([]),
})
export type PublishGameDataInput = z.input<typeof PublishGameDataSchema>

export const DESCRIPTION_SOURCES = ['original', 'derived'] as const
export type DescriptionSource = (typeof DESCRIPTION_SOURCES)[number]

export const SaveGameTermSchema = z.object({
    kind: z.enum(TERM_KINDS),
    tag: z.string().trim().min(1, 'Tag is required').max(100),
    category: z.enum(TERM_CATEGORIES),
    label: z.string().max(200).nullable(),
    unit: z.string().max(20).nullable(),
    template: z.string().max(300).nullable(),
    grants: z.string().max(100).nullable(),
})
export type SaveGameTermInput = z.infer<typeof SaveGameTermSchema>

export const SetGameTermVerifiedSchema = z.object({
    kind: z.enum(TERM_KINDS),
    tag: z.string().min(1).max(100),
    verified: z.boolean(),
})
export type SetGameTermVerifiedInput = z.infer<typeof SetGameTermVerifiedSchema>

export const SetAbilityDescriptionSourceSchema = z.object({
    abilityKey: z.string().min(1).max(100),
    source: z.enum(DESCRIPTION_SOURCES),
})
export type SetAbilityDescriptionSourceInput = z.infer<typeof SetAbilityDescriptionSourceSchema>

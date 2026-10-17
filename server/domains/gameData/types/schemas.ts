import { z } from "zod"
import { TERM_CATEGORIES, TERM_KINDS } from "../terms/types"

export const GAME_DATA_TEXT_MAX = 1_000_000

export const GameDataTextSchema = z.object({
    text: z.string().trim().min(1, 'Paste some Lua first').max(GAME_DATA_TEXT_MAX, 'Paste is too large'),
})
export type GameDataTextInput = z.infer<typeof GameDataTextSchema>

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

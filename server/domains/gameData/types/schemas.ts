import { z } from "zod"

export const GAME_DATA_TEXT_MAX = 1_000_000

export const GameDataTextSchema = z.object({
    text: z.string().trim().min(1, 'Paste some Lua first').max(GAME_DATA_TEXT_MAX, 'Paste is too large'),
})
export type GameDataTextInput = z.infer<typeof GameDataTextSchema>

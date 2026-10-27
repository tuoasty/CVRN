import { z } from "zod"

export const SeasonIdSchema = z.object({ seasonId: z.string().uuid() })
export type SeasonIdInput = z.infer<typeof SeasonIdSchema>

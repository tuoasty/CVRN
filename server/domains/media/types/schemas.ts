import { z } from "zod"

export const CreateMediaFormSchema = z.object({
    type:        z.enum(['gfx', 'video', 'clip']),
    title:       z.string(),
    description: z.string().optional(),
    videoUrl:    z.string().url('Invalid URL').optional().or(z.literal('')),
    matchId:     z.string().uuid().optional().or(z.literal('')),
    teamId:      z.string().uuid().optional().or(z.literal('')),
    seasonId:    z.string().uuid().optional().or(z.literal('')),
})
export type CreateMediaFormInput = z.infer<typeof CreateMediaFormSchema>

export const MediaPostIdSchema = z.object({ postId: z.string().uuid() })
export type MediaPostIdInput = z.infer<typeof MediaPostIdSchema>

export const GetAllMediaSchema = z.object({
    type:     z.enum(['gfx', 'video', 'news', 'recap', 'clip']).optional(),
    matchId:  z.string().uuid().optional(),
    teamId:   z.string().uuid().optional(),
    seasonId: z.string().uuid().optional(),
})
export type GetAllMediaInput = z.infer<typeof GetAllMediaSchema>

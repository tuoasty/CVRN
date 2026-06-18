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

export const MEDIA_FILTER_TYPES = ['all', 'videos', 'gfx', 'clips'] as const
export type MediaFilterType = typeof MEDIA_FILTER_TYPES[number]

export const GetPagedMediaSchema = z.object({
    filter:   z.enum(MEDIA_FILTER_TYPES).default('all'),
    page:     z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(12),
    search:   z.string().optional(),
})
export type GetPagedMediaInput = z.infer<typeof GetPagedMediaSchema>

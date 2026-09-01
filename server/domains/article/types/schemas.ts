import { z } from "zod"

export const CreateArticleFormSchema = z.object({
    title:     z.string().min(1, 'Title is required'),
    body:      z.string().min(1, 'Body is required'),
    slug:      z.string().optional().or(z.literal('')),
    authorId:  z.string().uuid().optional().or(z.literal('')),
    matchId:   z.string().uuid().optional().or(z.literal('')),
    seasonId:  z.string().uuid().optional().or(z.literal('')),
    published: z.boolean().default(false),
})
export type CreateArticleFormInput = z.infer<typeof CreateArticleFormSchema>

export const UpdateArticleFormSchema = z.object({
    articleId:   z.string().uuid(),
    title:       z.string().min(1).optional(),
    body:        z.string().min(1).optional(),
    slug:        z.string().optional().or(z.literal('')),
    authorId:    z.string().uuid().nullable().optional(),
    matchId:     z.string().uuid().nullable().optional(),
    seasonId:    z.string().uuid().nullable().optional(),
    removeCover: z.boolean().default(false),
})
export type UpdateArticleFormInput = z.infer<typeof UpdateArticleFormSchema>

export const ArticleIdSchema = z.object({ articleId: z.string().uuid() })
export type ArticleIdInput = z.infer<typeof ArticleIdSchema>

export const SetArticlePublishedSchema = z.object({
    articleId: z.string().uuid(),
    published: z.boolean(),
})
export type SetArticlePublishedInput = z.infer<typeof SetArticlePublishedSchema>

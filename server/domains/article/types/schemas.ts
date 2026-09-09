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
})
export type UpdateArticleFormInput = z.infer<typeof UpdateArticleFormSchema>

export const ImagePlacementSchema = z.enum(['left', 'center', 'right'])

export const ArticleImageMetaSchema = z.object({
    handle:      z.string().min(1).max(20).regex(/^[a-z0-9]+$/, 'Invalid image handle'),
    placement:   ImagePlacementSchema,
    kind:        z.enum(['upload', 'link']),
    mediaPostId: z.string().uuid().nullable().optional(),
})
export type ArticleImageMetaInput = z.infer<typeof ArticleImageMetaSchema>

export const ArticleImagesMetaSchema = z.array(ArticleImageMetaSchema).superRefine((imgs, ctx) => {
    const handles = new Set<string>()
    let coverCount = 0
    for (const img of imgs) {
        if (handles.has(img.handle)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate image handle: ${img.handle}` })
        }
        handles.add(img.handle)
        if (img.handle === 'cover') coverCount++
        if (img.kind === 'link' && !img.mediaPostId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Linked image is missing a media reference' })
        }
    }
    if (coverCount > 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only one cover image is allowed' })
    }
})

export const ArticleIdSchema = z.object({ articleId: z.string().uuid() })
export type ArticleIdInput = z.infer<typeof ArticleIdSchema>

export const SetArticlePublishedSchema = z.object({
    articleId: z.string().uuid(),
    published: z.boolean(),
})
export type SetArticlePublishedInput = z.infer<typeof SetArticlePublishedSchema>

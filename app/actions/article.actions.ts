"use server"

import { revalidatePublicData } from "@/server/cache/revalidate";
import { CACHE_TAGS } from "@/server/cache/tags";

import { Err, Result } from '@/shared/types/result'
import { Article } from '@/shared/types/db'
import { createServerSupabase } from '@/server/supabase/server'
import {
    createArticle,
    updateArticle,
    deleteArticle,
    setArticlePublished,
    getPublishedArticles,
    getArticlesForAdmin,
    getArticleBySlug,
    ArticleListItem,
    ArticleDetail,
    CreateArticleFormSchema,
    UpdateArticleFormSchema,
    ArticleIdSchema,
    SetArticlePublishedSchema,
} from '@/server/domains/article'
import { requireAdmin } from '@/server/domains/auth'

const ARTICLE_TAGS = [CACHE_TAGS.articles, CACHE_TAGS.media]

export async function createArticleAction(formData: FormData): Promise<Result<Article>> {
    const parsed = CreateArticleFormSchema.safeParse({
        title:     formData.get('title'),
        body:      formData.get('body'),
        slug:      formData.get('slug') || undefined,
        authorId:  formData.get('authorId') || undefined,
        matchId:   formData.get('matchId') || undefined,
        seasonId:  formData.get('seasonId') || undefined,
        published: formData.get('published') === 'true',
    })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const imageFile = formData.get('imageFile') as File | null

    const result = await createArticle(supabase, {
        title:     parsed.data.title,
        body:      parsed.data.body,
        slug:      parsed.data.slug || null,
        authorId:  parsed.data.authorId || null,
        matchId:   parsed.data.matchId || null,
        seasonId:  parsed.data.seasonId || null,
        published: parsed.data.published,
        imageFile: imageFile && imageFile.size > 0 ? imageFile : null,
        userId:    guard.value,
    })
    if (result.ok) revalidatePublicData(ARTICLE_TAGS)
    return result
}

export async function updateArticleAction(formData: FormData): Promise<Result<Article>> {
    const parsed = UpdateArticleFormSchema.safeParse({
        articleId:   formData.get('articleId'),
        title:       formData.get('title') || undefined,
        body:        formData.get('body') || undefined,
        slug:        formData.get('slug') || undefined,
        authorId:    formData.has('authorId') ? (formData.get('authorId') || null) : undefined,
        matchId:     formData.has('matchId') ? (formData.get('matchId') || null) : undefined,
        seasonId:    formData.has('seasonId') ? (formData.get('seasonId') || null) : undefined,
        removeCover: formData.get('removeCover') === 'true',
    })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const imageFile = formData.get('imageFile') as File | null

    const result = await updateArticle(supabase, {
        articleId:   parsed.data.articleId,
        title:       parsed.data.title,
        body:        parsed.data.body,
        slug:        parsed.data.slug || null,
        authorId:    parsed.data.authorId,
        matchId:     parsed.data.matchId,
        seasonId:    parsed.data.seasonId,
        removeCover: parsed.data.removeCover,
        imageFile:   imageFile && imageFile.size > 0 ? imageFile : null,
        userId:      guard.value,
    })
    if (result.ok) revalidatePublicData(ARTICLE_TAGS)
    return result
}

export async function deleteArticleAction(input: unknown): Promise<Result<void>> {
    const parsed = ArticleIdSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid article ID', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await deleteArticle(supabase, { articleId: parsed.data.articleId })
    if (result.ok) revalidatePublicData(ARTICLE_TAGS)
    return result
}

export async function setArticlePublishedAction(input: unknown): Promise<Result<Article>> {
    const parsed = SetArticlePublishedSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid input', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await setArticlePublished(supabase, parsed.data)
    if (result.ok) revalidatePublicData(ARTICLE_TAGS)
    return result
}

export async function getPublishedArticlesAction(seasonId?: string): Promise<Result<ArticleListItem[]>> {
    const supabase = await createServerSupabase()
    return getPublishedArticles(supabase, seasonId)
}

export async function getArticlesForAdminAction(): Promise<Result<ArticleListItem[]>> {
    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard
    return getArticlesForAdmin(supabase)
}

export async function getArticleBySlugAction(slug: string): Promise<Result<ArticleDetail | null>> {
    const supabase = await createServerSupabase()
    return getArticleBySlug(supabase, slug)
}

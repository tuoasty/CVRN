"use server"

import {revalidatePublicData} from "@/server/cache/revalidate";
import {CACHE_TAGS} from "@/server/cache/tags";

import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import {
    createMediaPost,
    deleteMediaPost,
    getAllMediaPosts,
    getRecentMediaPosts,
    getPagedMediaPosts,
    togglePinMediaPost,
    getMediaPostById,
    MediaPost,
    PagedMediaResult,
    assignMediaToMatch,
    CreateMediaFormSchema,
    MediaPostIdSchema,
    GetAllMediaSchema,
    GetPagedMediaSchema,
    AssignMediaToMatchSchema,
} from '@/server/domains/media'
import { requireAdmin } from '@/server/domains/auth'

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function createMediaPostAction(formData: FormData): Promise<Result<MediaPost>> {
    const parsed = CreateMediaFormSchema.safeParse({
        type:        formData.get('type'),
        title:       formData.get('title'),
        description: formData.get('description') || undefined,
        videoUrl:    formData.get('videoUrl') || undefined,
        matchId:     formData.get('matchId') || undefined,
        teamId:      formData.get('teamId') || undefined,
        seasonId:    formData.get('seasonId') || undefined,
    })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const user = await requireAuth(supabase)
    if (!user) return Err({ message: 'Not authenticated', code: 'UNAUTHORIZED' })

    const imageFile = formData.get('imageFile') as File | null

    const result = await createMediaPost(supabase, {
        type:        parsed.data.type,
        title:       parsed.data.title,
        description: parsed.data.description ?? null,
        imageFile:   imageFile && imageFile.size > 0 ? imageFile : null,
        videoUrl:    parsed.data.videoUrl || null,
        matchId:     parsed.data.matchId || null,
        teamId:      parsed.data.teamId || null,
        seasonId:    parsed.data.seasonId || null,
        userId:      user.id,
    })
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

export async function deleteMediaPostAction(input: unknown): Promise<Result<void>> {
    const parsed = MediaPostIdSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid post ID', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const user = await requireAuth(supabase)
    if (!user) return Err({ message: 'Not authenticated', code: 'UNAUTHORIZED' })

    const result = await deleteMediaPost(supabase, { postId: parsed.data.postId, userId: user.id })
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

export async function assignMediaToMatchAction(input: unknown): Promise<Result<MediaPost>> {
    const parsed = AssignMediaToMatchSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid assignment input', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await assignMediaToMatch(supabase, parsed.data)
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

export async function getAllMediaPostsAction(filters?: unknown): Promise<Result<MediaPost[]>> {
    const parsed = GetAllMediaSchema.safeParse(filters ?? {})
    if (!parsed.success) return Err({ message: 'Invalid filters', code: 'VALIDATION_ERROR' })
    const supabase = await createServerSupabase()
    return getAllMediaPosts(supabase, parsed.data)
}

export async function getPagedMediaPostsAction(input: unknown): Promise<Result<PagedMediaResult>> {
    const parsed = GetPagedMediaSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid pagination input', code: 'VALIDATION_ERROR' })
    const supabase = await createServerSupabase()
    return getPagedMediaPosts(supabase, parsed.data)
}

export async function getRecentMediaPostsAction(limit = 4): Promise<Result<MediaPost[]>> {
    const supabase = await createServerSupabase()
    return getRecentMediaPosts(supabase, limit)
}

export async function togglePinMediaPostAction(input: unknown): Promise<Result<MediaPost>> {
    const parsed = MediaPostIdSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid post ID', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const user = await requireAuth(supabase)
    if (!user) return Err({ message: 'Not authenticated', code: 'UNAUTHORIZED' })

    const postResult = await getMediaPostById(supabase, parsed.data.postId)
    if (!postResult.ok) return postResult
    if (!postResult.value) return Err({ message: 'Post not found', code: 'NOT_FOUND' })

    const result = await togglePinMediaPost(supabase, parsed.data.postId, !postResult.value.is_pinned, postResult.value.type)
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

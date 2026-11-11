"use server"

import {revalidatePublicData} from "@/server/cache/revalidate";
import {CACHE_TAGS} from "@/server/cache/tags";

import { Err, Ok, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import {
    createMediaPost,
    deleteMediaPost,
    getAllMediaPosts,
    getRecentMediaPosts,
    getPagedMediaPosts,
    togglePinMediaPost,
    getMediaPostById,
    updateMediaPost,
    MediaPost,
    PagedMediaResult,
    assignMediaToMatch,
    CreateMediaFormSchema,
    MediaPostIdSchema,
    UpdateMediaPostSchema,
    GetAllMediaSchema,
    GetPagedMediaSchema,
    AssignMediaToMatchSchema,
} from '@/server/domains/media'
import { requireGroups } from '@/server/domains/auth'
import { canWriteMediaType, mediaWritersFor } from '@/shared/auth/mediaAccess'
import { createError } from '@/server/utils/serializeableError'
import type { DBClient } from '@/shared/types/db'

const forbiddenType = () => Err(createError('You cannot manage this type of post.', 'FORBIDDEN', 403))

async function findPostType(supabase: DBClient, postId: string): Promise<Result<string>> {
    const post = await getMediaPostById(supabase, postId)
    if (!post.ok) return post
    if (!post.value) return Err(createError('Post not found', 'NOT_FOUND', 404))
    return Ok(post.value.type)
}

function typeGuardError<T>(guard: Result<T>): Result<never> {
    if (guard.ok) return forbiddenType()
    return guard.error.code === 'FORBIDDEN' ? forbiddenType() : guard
}

export async function createMediaPostAction(formData: FormData): Promise<Result<MediaPost>> {
    const parsed = CreateMediaFormSchema.safeParse({
        type:        formData.get('type'),
        title:       formData.get('title'),
        description: formData.get('description') || undefined,
        videoUrl:    formData.get('videoUrl') || undefined,
        authorId:    formData.get('authorId') || undefined,
        matchId:     formData.get('matchId') || undefined,
        teamId:      formData.get('teamId') || undefined,
        playerId:    formData.get('playerId') || undefined,
        seasonId:    formData.get('seasonId') || undefined,
        roundKey:    formData.get('roundKey') || undefined,
    })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, mediaWritersFor(parsed.data.type), { action: "createMediaPost", target: parsed.data })
    if (!guard.ok || !canWriteMediaType(guard.value.groups, parsed.data.type)) return typeGuardError(guard)

    const imageFile = formData.get('imageFile') as File | null

    const result = await createMediaPost(supabase, {
        type:        parsed.data.type,
        title:       parsed.data.title,
        description: parsed.data.description ?? null,
        imageFile:   imageFile && imageFile.size > 0 ? imageFile : null,
        videoUrl:    parsed.data.videoUrl || null,
        authorId:    parsed.data.authorId || null,
        matchId:     parsed.data.matchId || null,
        teamId:      parsed.data.teamId || null,
        playerId:    parsed.data.playerId || null,
        seasonId:    parsed.data.seasonId || null,
        roundKey:    parsed.data.roundKey || null,
        userId:      guard.value.userId,
    })
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

export async function updateMediaPostAction(input: unknown): Promise<Result<MediaPost>> {
    const parsed = UpdateMediaPostSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const postType = await findPostType(supabase, parsed.data.postId)
    if (!postType.ok) return postType
    const guard = await requireGroups(supabase, mediaWritersFor(postType.value), { action: "updateMediaPost", target: parsed.data })
    if (!guard.ok || !canWriteMediaType(guard.value.groups, postType.value)) return typeGuardError(guard)

    const result = await updateMediaPost(supabase, parsed.data)
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

export async function deleteMediaPostAction(input: unknown): Promise<Result<void>> {
    const parsed = MediaPostIdSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid post ID', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'], { action: "deleteMediaPost", target: parsed.data })
    if (!guard.ok) return guard

    const result = await deleteMediaPost(supabase, { postId: parsed.data.postId, userId: guard.value.userId })
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

export async function assignMediaToMatchAction(input: unknown): Promise<Result<MediaPost>> {
    const parsed = AssignMediaToMatchSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid assignment input', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const postType = await findPostType(supabase, parsed.data.postId)
    if (!postType.ok) return postType
    const guard = await requireGroups(supabase, mediaWritersFor(postType.value), { action: "assignMediaToMatch", target: parsed.data })
    if (!guard.ok || !canWriteMediaType(guard.value.groups, postType.value)) return typeGuardError(guard)

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
    const guard = await requireGroups(supabase, ['admin'], { action: "togglePinMediaPost", target: parsed.data })
    if (!guard.ok) return guard

    const postResult = await getMediaPostById(supabase, parsed.data.postId)
    if (!postResult.ok) return postResult
    if (!postResult.value) return Err({ message: 'Post not found', code: 'NOT_FOUND' })

    const result = await togglePinMediaPost(supabase, parsed.data.postId, !postResult.value.is_pinned, postResult.value.type)
    if (result.ok) revalidatePublicData([CACHE_TAGS.media])
    return result
}

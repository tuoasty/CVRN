"use server"

import { revalidatePublicData } from "@/server/cache/revalidate";
import { CACHE_TAGS } from "@/server/cache/tags";

import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import {
    createUpdateLog,
    updateUpdateLog,
    setUpdateLogPublished,
    deleteUpdateLog,
    getUpdateLogsForAdmin,
    getUpdateLogForAdmin,
    uploadUpdateLogImage,
    updateUpdateLogImages,
    UpdateLogListItem,
    UpdateLogAdminDetail,
    UpdateLogAdminImage,
    UpdateLogEditorData,
    UploadUpdateLogImageFormSchema,
    UpdateUpdateLogImagesSchema,
    UPDATE_LOG_IMAGE_MAX_BYTES,
    CreateUpdateLogFormSchema,
    UpdateUpdateLogFormSchema,
    UpdateLogIdSchema,
    SetUpdateLogPublishedSchema,
} from '@/server/domains/updateLog'
import { requireGroups } from '@/server/domains/auth'

const UPDATE_LOG_TAGS = [CACHE_TAGS.updateLogs]

function readFields(formData: FormData) {
    return {
        version:    formData.get('version'),
        title:      formData.get('title') ?? '',
        body:       formData.get('body'),
        releasedAt: formData.get('releasedAt'),
    }
}

export async function createUpdateLogAction(formData: FormData): Promise<Result<UpdateLogAdminDetail>> {
    const parsed = CreateUpdateLogFormSchema.safeParse(readFields(formData))
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'], { action: "createUpdateLog", target: parsed.data })
    if (!guard.ok) return guard

    const result = await createUpdateLog(supabase, {
        version:    parsed.data.version,
        title:      parsed.data.title || null,
        body:       parsed.data.body,
        releasedAt: parsed.data.releasedAt,
        userId:     guard.value.userId,
    })
    if (result.ok) revalidatePublicData(UPDATE_LOG_TAGS)
    return result
}

export async function updateUpdateLogAction(formData: FormData): Promise<Result<UpdateLogAdminDetail>> {
    const parsed = UpdateUpdateLogFormSchema.safeParse({
        ...readFields(formData),
        updateLogId: formData.get('updateLogId'),
    })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'], { action: "updateUpdateLog", target: parsed.data })
    if (!guard.ok) return guard

    const result = await updateUpdateLog(supabase, {
        updateLogId: parsed.data.updateLogId,
        version:     parsed.data.version,
        title:       parsed.data.title || null,
        body:        parsed.data.body,
        releasedAt:  parsed.data.releasedAt,
    })
    if (result.ok) revalidatePublicData(UPDATE_LOG_TAGS)
    return result
}

export async function setUpdateLogPublishedAction(input: unknown): Promise<Result<UpdateLogAdminDetail>> {
    const parsed = SetUpdateLogPublishedSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid input', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'], { action: "setUpdateLogPublished", target: parsed.data })
    if (!guard.ok) return guard

    const result = await setUpdateLogPublished(supabase, parsed.data)
    if (result.ok) revalidatePublicData(UPDATE_LOG_TAGS)
    return result
}

export async function deleteUpdateLogAction(input: unknown): Promise<Result<void>> {
    const parsed = UpdateLogIdSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Invalid update log ID', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['super_admin'], { action: "deleteUpdateLog", target: parsed.data })
    if (!guard.ok) return guard

    const result = await deleteUpdateLog(supabase, { updateLogId: parsed.data.updateLogId })
    if (result.ok) revalidatePublicData(UPDATE_LOG_TAGS)
    return result
}

export async function getUpdateLogsForAdminAction(): Promise<Result<UpdateLogListItem[]>> {
    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'])
    if (!guard.ok) return guard
    return getUpdateLogsForAdmin(supabase)
}

export async function getUpdateLogForAdminAction(input: unknown): Promise<Result<UpdateLogEditorData>> {
    const parsed = UpdateLogIdSchema.safeParse(input)
    if (!parsed.success) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'])
    if (!guard.ok) return guard
    return getUpdateLogForAdmin(supabase, parsed.data.updateLogId)
}

export async function uploadUpdateLogImageAction(formData: FormData): Promise<Result<UpdateLogAdminImage>> {
    const parsed = UploadUpdateLogImageFormSchema.safeParse({
        updateLogId: formData.get('updateLogId'),
        name:        formData.get('name'),
        caption:     formData.get('caption') ?? '',
    })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) return Err({ message: 'No image attached', code: 'VALIDATION_ERROR' })
    if (!file.type.startsWith('image/')) return Err({ message: 'Only images can be attached', code: 'VALIDATION_ERROR' })
    if (file.size > UPDATE_LOG_IMAGE_MAX_BYTES) return Err({ message: 'Images must be 2 MB or smaller', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'], { action: "uploadUpdateLogImage", target: parsed.data })
    if (!guard.ok) return guard

    const result = await uploadUpdateLogImage(supabase, {
        updateLogId: parsed.data.updateLogId,
        name:        parsed.data.name,
        caption:     parsed.data.caption || null,
        file,
        userId:      guard.value.userId,
    })
    if (result.ok) revalidatePublicData(UPDATE_LOG_TAGS)
    return result
}

export async function updateUpdateLogImagesAction(input: unknown): Promise<Result<UpdateLogAdminImage[]>> {
    const parsed = UpdateUpdateLogImagesSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'], { action: "updateUpdateLogImages", target: parsed.data })
    if (!guard.ok) return guard

    const result = await updateUpdateLogImages(supabase, {
        updateLogId: parsed.data.updateLogId,
        changes:     parsed.data.changes.map(c => ({ id: c.id, name: c.name, caption: c.caption || null })),
        removedIds:  parsed.data.removedIds,
    })
    if (result.ok) revalidatePublicData(UPDATE_LOG_TAGS)
    return result
}

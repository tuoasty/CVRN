"use server"

import { revalidatePublicData } from '@/server/cache/revalidate'
import { CACHE_TAGS } from '@/server/cache/tags'
import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { requireAdmin } from '@/server/domains/auth'
import {
    previewGameDataImport,
    publishGameDataImport,
    GameDataTextSchema,
    GameDataPreview,
    PublishGameDataResult,
} from '@/server/domains/gameData'

export async function previewGameDataImportAction(input: { text: string }): Promise<Result<GameDataPreview>> {
    const parsed = GameDataTextSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return previewGameDataImport(supabase, parsed.data.text)
}

export async function publishGameDataImportAction(input: { text: string }): Promise<Result<PublishGameDataResult>> {
    const parsed = GameDataTextSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await publishGameDataImport(supabase, { text: parsed.data.text, userId: guard.value })
    if (result.ok && result.value.published.length > 0) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

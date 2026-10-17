"use server"

import { revalidatePublicData } from '@/server/cache/revalidate'
import { CACHE_TAGS } from '@/server/cache/tags'
import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { requireAdmin } from '@/server/domains/auth'
import {
    previewGameDataImport,
    publishGameDataImport,
    saveGameTerm,
    setGameTermVerified,
    setAbilityDescriptionSource,
    GameDataTextSchema,
    SaveGameTermSchema,
    SetGameTermVerifiedSchema,
    SetAbilityDescriptionSourceSchema,
    GameDataPreview,
    GameTerm,
    PublishGameDataResult,
    SaveGameTermInput,
    SetGameTermVerifiedInput,
    SetAbilityDescriptionSourceInput,
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

export async function saveGameTermAction(input: SaveGameTermInput): Promise<Result<GameTerm>> {
    const parsed = SaveGameTermSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await saveGameTerm(supabase, { input: parsed.data, userId: guard.value })
    if (result.ok) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

export async function setGameTermVerifiedAction(input: SetGameTermVerifiedInput): Promise<Result<GameTerm>> {
    const parsed = SetGameTermVerifiedSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await setGameTermVerified(supabase, { input: parsed.data, userId: guard.value })
    if (result.ok) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

export async function setAbilityDescriptionSourceAction(input: SetAbilityDescriptionSourceInput): Promise<Result<null>> {
    const parsed = SetAbilityDescriptionSourceSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const result = await setAbilityDescriptionSource(supabase, { input: parsed.data, userId: guard.value })
    if (result.ok) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

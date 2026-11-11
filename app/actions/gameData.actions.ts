"use server"

import { revalidatePath } from 'next/cache'
import { revalidatePublicData } from '@/server/cache/revalidate'
import { CACHE_TAGS } from '@/server/cache/tags'
import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { requireGroups } from '@/server/domains/auth'
import {
    previewGameDataImport,
    publishGameDataImport,
    saveGameTerm,
    setGameTermVerified,
    setAbilityDescriptionSource,
    GameDataTextSchema,
    PublishGameDataSchema,
    PublishGameDataInput,
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
    const guard = await requireGroups(supabase, ['admin'])
    if (!guard.ok) return guard

    return previewGameDataImport(supabase, parsed.data.text)
}

export async function publishGameDataImportAction(input: PublishGameDataInput): Promise<Result<PublishGameDataResult>> {
    const parsed = PublishGameDataSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin'])
    if (!guard.ok) return guard

    const result = await publishGameDataImport(supabase, { text: parsed.data.text, specLinks: parsed.data.specLinks, userId: guard.value.userId })
    if (result.ok && (result.value.published.length > 0 || result.value.specOps > 0)) revalidatePublicData([CACHE_TAGS.gameData])
    if (result.ok && result.value.specOps > 0) {
        revalidatePublicData([CACHE_TAGS.specs])
        revalidatePath('/admin/specs')
    }
    return result
}

export async function saveGameTermAction(input: SaveGameTermInput): Promise<Result<GameTerm>> {
    const parsed = SaveGameTermSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'information', 'specs'])
    if (!guard.ok) return guard

    const result = await saveGameTerm(supabase, { input: parsed.data, userId: guard.value.userId })
    if (result.ok) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

export async function setGameTermVerifiedAction(input: SetGameTermVerifiedInput): Promise<Result<GameTerm>> {
    const parsed = SetGameTermVerifiedSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'information', 'specs'])
    if (!guard.ok) return guard

    const result = await setGameTermVerified(supabase, { input: parsed.data, userId: guard.value.userId })
    if (result.ok) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

export async function setAbilityDescriptionSourceAction(input: SetAbilityDescriptionSourceInput): Promise<Result<null>> {
    const parsed = SetAbilityDescriptionSourceSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'information', 'specs'])
    if (!guard.ok) return guard

    const result = await setAbilityDescriptionSource(supabase, { input: parsed.data, userId: guard.value.userId })
    if (result.ok) revalidatePublicData([CACHE_TAGS.gameData])
    return result
}

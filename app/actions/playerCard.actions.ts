"use server"

import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { createServerSupabase } from '@/server/supabase/server'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { serializeError } from '@/server/utils/serializeableError'
import { requireAdmin, requireSuperAdmin } from '@/server/domains/auth'
import {
    createCardGroup,
    createCardTemplate,
    deleteCardGroup,
    deleteCardTemplate,
    generateCustomPlayerCard,
    generatePlayerCard,
    getCardCatalog,
    getBoardPlayerCardTemplate,
    getCardTierTemplate,
    getCustomPlayerCardTemplate,
    getPlayerCards,
    previewCustomPlayerCard,
    previewPlayerCard,
    updateCardGroup,
    updateCardTemplate,
    updateCardGroupLayers,
    uploadCardTemplateArt,
    deletePlayerCard,
    assertNoRunningBulk,
    getCardBulkStatus,
    getCardPlayerIds,
    startCardBulkJob,
    stopCardBulkJob,
    CardBulkJobIdSchema,
    CardPlayerIdsSchema,
    StartCardBulkSchema,
    DeletePlayerCardSchema,
    CardGroupIdSchema,
    CardTemplateIdSchema,
    CreateCardGroupSchema,
    CreateCardTemplateSchema,
    GenerateCustomPlayerCardSchema,
    GeneratePlayerCardSchema,
    PlayerCardsQuerySchema,
    PreviewCustomPlayerCardSchema,
    PreviewPlayerCardSchema,
    UpdateCardGroupSchema,
    UpdateCardGroupLayersSchema,
    UpdateCardTemplateSchema,
    UploadCardArtSchema,
} from '@/server/domains/playerCard'
import type { CardBulkJob, CardGroup, CardLayer, PlayerCard } from '@/server/domains/playerCard'
import type { OverallInputRow } from '@/server/domains/overall'
import { getCachedSeasonOverallInputs } from '@/server/cache/publicReads'
import { revalidatePublicData } from '@/server/cache/revalidate'
import { CACHE_TAGS } from '@/server/cache/tags'

function validationError(issues: { message: string }[]) {
    return Err({ message: issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' as const })
}

async function findSeasonPlayer(seasonNumber: number, playerId: string): Promise<Result<OverallInputRow>> {
    const players = await getCachedSeasonOverallInputs(seasonNumber)
    const player = players.find(row => row.playerId === playerId)
    if (!player) return Err({ message: 'Player has no overall data for this season', code: 'NOT_FOUND' })
    return Ok(player)
}

export async function getCardCatalogAction(): Promise<Result<CardGroup[]>> {
    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getCardCatalog(supabase)
}

export async function getPlayerCardsAction(input: unknown): Promise<Result<PlayerCard[]>> {
    const parsed = PlayerCardsQuerySchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getPlayerCards(supabase, parsed.data)
}

export async function previewPlayerCardAction(input: unknown): Promise<Result<string>> {
    const parsed = PreviewPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    try {
        const player = await findSeasonPlayer(parsed.data.seasonNumber, parsed.data.playerId)
        if (!player.ok) return player
        return previewPlayerCard(supabase, { ...parsed.data, player: player.value })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function updateCardGroupLayersAction(input: unknown): Promise<Result<CardLayer[]>> {
    const parsed = UpdateCardGroupLayersSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return updateCardGroupLayers(supabase, parsed.data)
}

export async function generatePlayerCardAction(input: unknown): Promise<Result<PlayerCard>> {
    const parsed = GeneratePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    try {
        const player = await findSeasonPlayer(parsed.data.seasonNumber, parsed.data.playerId)
        if (!player.ok) return player
        return generatePlayerCard(supabase, {
            seasonNumber: parsed.data.seasonNumber,
            groupId: parsed.data.groupId,
            overrides: parsed.data.overrides,
            player: player.value,
        })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function previewCustomPlayerCardAction(input: unknown): Promise<Result<string>> {
    const parsed = PreviewCustomPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return previewCustomPlayerCard(supabase, parsed.data)
}

export async function generateCustomPlayerCardAction(input: unknown): Promise<Result<PlayerCard>> {
    const parsed = GenerateCustomPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    const result = await generateCustomPlayerCard(supabase, parsed.data)
    if (!result.ok) return result
    if (result.value.registered) revalidatePublicData([CACHE_TAGS.players])
    return Ok(result.value.card)
}

export async function createCardGroupAction(input: unknown): Promise<Result<{ id: string }>> {
    const parsed = CreateCardGroupSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return createCardGroup(supabase, parsed.data)
}

export async function updateCardGroupAction(input: unknown): Promise<Result<null>> {
    const parsed = UpdateCardGroupSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return updateCardGroup(supabase, parsed.data)
}

export async function deleteCardGroupAction(input: unknown): Promise<Result<null>> {
    const parsed = CardGroupIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireSuperAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return deleteCardGroup(supabase, parsed.data.groupId)
}

export async function createCardTemplateAction(input: unknown): Promise<Result<{ id: string }>> {
    const parsed = CreateCardTemplateSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return createCardTemplate(supabase, parsed.data)
}

export async function updateCardTemplateAction(input: unknown): Promise<Result<null>> {
    const parsed = UpdateCardTemplateSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { templateId: parsed.data.templateId })
    if (!lock.ok) return lock

    return updateCardTemplate(supabase, parsed.data)
}

export async function uploadCardTemplateArtAction(formData: FormData): Promise<Result<{ width: number; height: number }>> {
    const parsed = UploadCardArtSchema.safeParse({ templateId: formData.get('templateId'), fileName: formData.get('fileName') })
    if (!parsed.success) return validationError(parsed.error.issues)

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) return Err({ message: 'Choose a PNG file', code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { templateId: parsed.data.templateId })
    if (!lock.ok) return lock

    const admin = getSupabaseAdmin() as unknown as DBClient
    return uploadCardTemplateArt(admin, { ...parsed.data, file, userId: guard.value })
}

export async function downloadCardTierTemplateAction(input: unknown): Promise<Result<{ fileName: string; dataUri: string }>> {
    const parsed = CardTemplateIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getCardTierTemplate(supabase, parsed.data.templateId)
}

export async function downloadPlayerCardTemplateAction(input: unknown): Promise<Result<{ fileName: string; dataUri: string }>> {
    const parsed = GeneratePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    try {
        const player = await findSeasonPlayer(parsed.data.seasonNumber, parsed.data.playerId)
        if (!player.ok) return player
        return getBoardPlayerCardTemplate(supabase, {
            seasonNumber: parsed.data.seasonNumber,
            groupId: parsed.data.groupId,
            overrides: parsed.data.overrides,
            player: player.value,
        })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function downloadCustomPlayerCardTemplateAction(input: unknown): Promise<Result<{ fileName: string; dataUri: string }>> {
    const parsed = GenerateCustomPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getCustomPlayerCardTemplate(supabase, parsed.data)
}

export async function deletePlayerCardAction(input: unknown): Promise<Result<null>> {
    const parsed = DeletePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireSuperAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    return deletePlayerCard(supabase, parsed.data)
}

export async function deleteCardTemplateAction(input: unknown): Promise<Result<null>> {
    const parsed = CardTemplateIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireSuperAdmin(supabase)
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { templateId: parsed.data.templateId })
    if (!lock.ok) return lock

    return deleteCardTemplate(supabase, parsed.data.templateId)
}

export async function startCardBulkJobAction(input: unknown): Promise<Result<CardBulkJob>> {
    const parsed = StartCardBulkSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = parsed.data.mode === 'all' ? await requireSuperAdmin(supabase) : await requireAdmin(supabase)
    if (!guard.ok) return guard

    try {
        const rows = await getCachedSeasonOverallInputs(parsed.data.seasonNumber)
        const admin = getSupabaseAdmin() as unknown as DBClient
        return startCardBulkJob(admin, { ...parsed.data, rows, startedBy: guard.value })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function stopCardBulkJobAction(input: unknown): Promise<Result<null>> {
    const parsed = CardBulkJobIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const admin = getSupabaseAdmin() as unknown as DBClient
    return stopCardBulkJob(admin, parsed.data.jobId)
}

export async function getCardBulkStatusAction(): Promise<Result<CardBulkJob | null>> {
    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    const admin = getSupabaseAdmin() as unknown as DBClient
    return getCardBulkStatus(admin)
}

export async function getCardPlayerIdsAction(input: unknown): Promise<Result<string[]>> {
    const parsed = CardPlayerIdsSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getCardPlayerIds(supabase, parsed.data)
}

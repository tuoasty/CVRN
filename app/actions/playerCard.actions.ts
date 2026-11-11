"use server"

import { after } from 'next/server'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { createServerSupabase } from '@/server/supabase/server'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { serializeError } from '@/server/utils/serializeableError'
import { requireGroups } from '@/server/domains/auth'
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
    buildCardData,
    buildCustomCardData,
    customPlayerIdResolver,
    resolveCustomSubject,
    uploadPlayerCardGfx,
    UploadPlayerCardGfxSchema,
    uploadPlayerCardRig,
    deletePlayerCardRig,
    updatePlayerCardRigPlacement,
    getPlayerCardRig,
    PlayerCardRigKeySchema,
    UploadPlayerCardRigSchema,
    UpdatePlayerCardRigPlacementSchema,
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
import type { CardBulkJob, CardGroup, CardLayer, PlayerCard, PlayerCardRig } from '@/server/domains/playerCard'
import { getOverallConfig } from '@/server/domains/overall'
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
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return getCardCatalog(supabase)
}

export async function getPlayerCardsAction(input: unknown): Promise<Result<PlayerCard[]>> {
    const parsed = PlayerCardsQuerySchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return getPlayerCards(supabase, parsed.data)
}

export async function previewPlayerCardAction(input: unknown): Promise<Result<string>> {
    const parsed = PreviewPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
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
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return updateCardGroupLayers(supabase, parsed.data)
}

export async function generatePlayerCardAction(input: unknown): Promise<Result<PlayerCard>> {
    const parsed = GeneratePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    try {
        const player = await findSeasonPlayer(parsed.data.seasonNumber, parsed.data.playerId)
        if (!player.ok) return player
        const result = await generatePlayerCard(supabase, {
            seasonNumber: parsed.data.seasonNumber,
            groupId: parsed.data.groupId,
            overrides: parsed.data.overrides,
            player: player.value,
        })
        if (result.ok) revalidatePublicData([CACHE_TAGS.playerCards])
        return result
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function previewCustomPlayerCardAction(input: unknown): Promise<Result<string>> {
    const parsed = PreviewCustomPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return previewCustomPlayerCard(supabase, parsed.data)
}

export async function generateCustomPlayerCardAction(input: unknown): Promise<Result<PlayerCard>> {
    const parsed = GenerateCustomPlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    const result = await generateCustomPlayerCard(supabase, parsed.data)
    if (!result.ok) return result
    if (result.value.registered) revalidatePublicData([CACHE_TAGS.players])
    revalidatePublicData([CACHE_TAGS.playerCards])
    return Ok(result.value.card)
}

export async function createCardGroupAction(input: unknown): Promise<Result<{ id: string }>> {
    const parsed = CreateCardGroupSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return createCardGroup(supabase, parsed.data)
}

export async function updateCardGroupAction(input: unknown): Promise<Result<null>> {
    const parsed = UpdateCardGroupSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    const result = await updateCardGroup(supabase, parsed.data)
    if (result.ok) revalidatePublicData([CACHE_TAGS.playerCards])
    return result
}

export async function deleteCardGroupAction(input: unknown): Promise<Result<null>> {
    const parsed = CardGroupIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['super_admin'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return deleteCardGroup(supabase, parsed.data.groupId)
}

export async function createCardTemplateAction(input: unknown): Promise<Result<{ id: string }>> {
    const parsed = CreateCardTemplateSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { groupId: parsed.data.groupId })
    if (!lock.ok) return lock

    return createCardTemplate(supabase, parsed.data)
}

export async function updateCardTemplateAction(input: unknown): Promise<Result<null>> {
    const parsed = UpdateCardTemplateSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
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
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { templateId: parsed.data.templateId })
    if (!lock.ok) return lock

    const admin = getSupabaseAdmin() as unknown as DBClient
    return uploadCardTemplateArt(admin, { ...parsed.data, file, userId: guard.value.userId })
}

export async function downloadCardTierTemplateAction(input: unknown): Promise<Result<{ fileName: string; dataUri: string }>> {
    const parsed = CardTemplateIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return getCardTierTemplate(supabase, parsed.data.templateId)
}

export async function downloadPlayerCardTemplateAction(input: unknown): Promise<Result<{ fileName: string; dataUri: string }>> {
    const parsed = GeneratePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
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
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return getCustomPlayerCardTemplate(supabase, parsed.data)
}

export async function deletePlayerCardAction(input: unknown): Promise<Result<null>> {
    const parsed = DeletePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['super_admin'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    const result = await deletePlayerCard(supabase, parsed.data)
    if (result.ok) revalidatePublicData([CACHE_TAGS.playerCards])
    return result
}

export async function deleteCardTemplateAction(input: unknown): Promise<Result<null>> {
    const parsed = CardTemplateIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['super_admin'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase, { templateId: parsed.data.templateId })
    if (!lock.ok) return lock

    return deleteCardTemplate(supabase, parsed.data.templateId)
}

export async function startCardBulkJobAction(input: unknown): Promise<Result<CardBulkJob>> {
    const parsed = StartCardBulkSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, parsed.data.mode === 'all' ? ['super_admin'] : ['admin', 'player_cards'])
    if (!guard.ok) return guard

    try {
        const rows = await getCachedSeasonOverallInputs(parsed.data.seasonNumber)
        const admin = getSupabaseAdmin() as unknown as DBClient
        return startCardBulkJob(admin, {
            ...parsed.data,
            rows,
            startedBy: guard.value.userId,
            schedule: task => after(async () => {
                try {
                    await task()
                } finally {
                    revalidatePublicData([CACHE_TAGS.playerCards])
                }
            }),
        })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function stopCardBulkJobAction(input: unknown): Promise<Result<null>> {
    const parsed = CardBulkJobIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const admin = getSupabaseAdmin() as unknown as DBClient
    return stopCardBulkJob(admin, parsed.data.jobId)
}

export async function getCardBulkStatusAction(): Promise<Result<CardBulkJob | null>> {
    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const admin = getSupabaseAdmin() as unknown as DBClient
    return getCardBulkStatus(admin)
}

export async function getCardPlayerIdsAction(input: unknown): Promise<Result<string[]>> {
    const parsed = CardPlayerIdsSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return getCardPlayerIds(supabase, parsed.data)
}

export async function uploadPlayerCardGfxAction(formData: FormData): Promise<Result<PlayerCard>> {
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) return Err({ message: 'Choose a PNG file', code: 'VALIDATION_ERROR' })

    let payload: unknown
    try {
        payload = JSON.parse(String(formData.get('payload')))
    } catch {
        return Err({ message: 'Upload details could not be read', code: 'VALIDATION_ERROR' })
    }
    const parsed = UploadPlayerCardGfxSchema.safeParse(payload)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    try {
        const { seasonNumber, groupId } = parsed.data

        if (parsed.data.kind === 'board') {
            const player = await findSeasonPlayer(seasonNumber, parsed.data.playerId)
            if (!player.ok) return player
            const config = await getOverallConfig(supabase, seasonNumber)
            if (!config.ok) return config
            const boardPlayerId = player.value.playerId
            const uploaded = await uploadPlayerCardGfx(supabase, {
                seasonNumber,
                groupId,
                subject: player.value,
                data: buildCardData(player.value, config.value, seasonNumber, parsed.data.overrides),
                file,
                ensurePlayerId: async () => Ok(boardPlayerId),
            })
            if (uploaded.ok) revalidatePublicData([CACHE_TAGS.playerCards])
            return uploaded
        }

        const subject = await resolveCustomSubject(supabase, parsed.data)
        if (!subject.ok) return subject
        const playerId = customPlayerIdResolver(supabase, parsed.data.player, subject.value)
        const card = await uploadPlayerCardGfx(supabase, {
            seasonNumber,
            groupId,
            subject: subject.value,
            data: buildCustomCardData(subject.value, parsed.data.values, seasonNumber),
            file,
            ensurePlayerId: playerId.ensure,
        })
        if (playerId.wasRegistered()) revalidatePublicData([CACHE_TAGS.players])
        if (card.ok) revalidatePublicData([CACHE_TAGS.playerCards])
        return card
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function getPlayerCardRigAction(input: unknown): Promise<Result<PlayerCardRig | null>> {
    const parsed = PlayerCardRigKeySchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    return getPlayerCardRig(supabase, parsed.data)
}

export async function uploadPlayerCardRigAction(formData: FormData): Promise<Result<PlayerCardRig>> {
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) return Err({ message: 'Choose a PNG file', code: 'VALIDATION_ERROR' })

    let payload: unknown
    try {
        payload = JSON.parse(String(formData.get('payload')))
    } catch {
        return Err({ message: 'Upload details could not be read', code: 'VALIDATION_ERROR' })
    }
    const parsed = UploadPlayerCardRigSchema.safeParse(payload)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    try {
        const { seasonNumber, groupId } = parsed.data

        if (parsed.data.kind === 'board') {
            const boardPlayerId = parsed.data.playerId
            return await uploadPlayerCardRig(supabase, {
                seasonNumber,
                groupId,
                file,
                ensurePlayerId: async () => Ok(boardPlayerId),
            })
        }

        const subject = await resolveCustomSubject(supabase, parsed.data)
        if (!subject.ok) return subject
        const playerId = customPlayerIdResolver(supabase, parsed.data.player, subject.value)
        const rig = await uploadPlayerCardRig(supabase, {
            seasonNumber,
            groupId,
            file,
            ensurePlayerId: playerId.ensure,
        })
        if (playerId.wasRegistered()) revalidatePublicData([CACHE_TAGS.players])
        return rig
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function updatePlayerCardRigPlacementAction(input: unknown): Promise<Result<PlayerCardRig>> {
    const parsed = UpdatePlayerCardRigPlacementSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    return updatePlayerCardRigPlacement(supabase, parsed.data)
}

export async function deletePlayerCardRigAction(input: unknown): Promise<Result<null>> {
    const parsed = PlayerCardRigKeySchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireGroups(supabase, ['admin', 'player_cards'])
    if (!guard.ok) return guard

    const lock = await assertNoRunningBulk(supabase)
    if (!lock.ok) return lock

    return deletePlayerCardRig(supabase, parsed.data)
}

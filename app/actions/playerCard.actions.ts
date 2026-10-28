"use server"

import { Err, Ok, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { serializeError } from '@/server/utils/serializeableError'
import { requireAdmin, requireSuperAdmin } from '@/server/domains/auth'
import {
    createCardGroup,
    createCardTemplate,
    deleteCardGroup,
    deleteCardTemplate,
    generatePlayerCard,
    getCardCatalog,
    getPlayerCards,
    previewPlayerCard,
    updateCardGroup,
    updateCardTemplate,
    updateCardGroupLayers,
    CardGroupIdSchema,
    CardTemplateIdSchema,
    CreateCardGroupSchema,
    CreateCardTemplateSchema,
    GeneratePlayerCardSchema,
    PlayerCardsQuerySchema,
    PreviewPlayerCardSchema,
    UpdateCardGroupSchema,
    UpdateCardGroupLayersSchema,
    UpdateCardTemplateSchema,
} from '@/server/domains/playerCard'
import type { CardGroup, CardLayer, PlayerCard } from '@/server/domains/playerCard'
import type { OverallInputRow } from '@/server/domains/overall'
import { getCachedSeasonOverallInputs } from '@/server/cache/publicReads'

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

    return updateCardGroupLayers(supabase, parsed.data)
}

export async function generatePlayerCardAction(input: unknown): Promise<Result<PlayerCard>> {
    const parsed = GeneratePlayerCardSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

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

    return updateCardGroup(supabase, parsed.data)
}

export async function deleteCardGroupAction(input: unknown): Promise<Result<null>> {
    const parsed = CardGroupIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireSuperAdmin(supabase)
    if (!guard.ok) return guard

    return deleteCardGroup(supabase, parsed.data.groupId)
}

export async function createCardTemplateAction(input: unknown): Promise<Result<{ id: string }>> {
    const parsed = CreateCardTemplateSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return createCardTemplate(supabase, parsed.data)
}

export async function updateCardTemplateAction(input: unknown): Promise<Result<null>> {
    const parsed = UpdateCardTemplateSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return updateCardTemplate(supabase, parsed.data)
}

export async function deleteCardTemplateAction(input: unknown): Promise<Result<null>> {
    const parsed = CardTemplateIdSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireSuperAdmin(supabase)
    if (!guard.ok) return guard

    return deleteCardTemplate(supabase, parsed.data.templateId)
}

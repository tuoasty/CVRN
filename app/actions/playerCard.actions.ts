"use server"

import { Err, Ok, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { serializeError } from '@/server/utils/serializeableError'
import { requireAdmin } from '@/server/domains/auth'
import {
    generatePlayerCard,
    getCardCatalog,
    getPlayerCards,
    previewPlayerCard,
    updateCardTemplateLayers,
    GeneratePlayerCardSchema,
    PlayerCardsQuerySchema,
    PreviewPlayerCardSchema,
    UpdateCardTemplateLayersSchema,
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

export async function updateCardTemplateLayersAction(input: unknown): Promise<Result<CardLayer[]>> {
    const parsed = UpdateCardTemplateLayersSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error.issues)

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return updateCardTemplateLayers(supabase, parsed.data)
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

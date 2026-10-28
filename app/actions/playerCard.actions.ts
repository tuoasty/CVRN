"use server"

import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { serializeError } from '@/server/utils/serializeableError'
import { requireAdmin } from '@/server/domains/auth'
import {
    generatePlayerCard,
    getCardCatalog,
    getPlayerCards,
    GeneratePlayerCardSchema,
    PlayerCardsQuerySchema,
} from '@/server/domains/playerCard'
import type { CardGroup, PlayerCard } from '@/server/domains/playerCard'
import { getCachedSeasonOverallInputs } from '@/server/cache/publicReads'

export async function getCardCatalogAction(): Promise<Result<CardGroup[]>> {
    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getCardCatalog(supabase)
}

export async function getPlayerCardsAction(input: unknown): Promise<Result<PlayerCard[]>> {
    const parsed = PlayerCardsQuerySchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return getPlayerCards(supabase, parsed.data)
}

export async function generatePlayerCardAction(input: unknown): Promise<Result<PlayerCard>> {
    const parsed = GeneratePlayerCardSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    try {
        const players = await getCachedSeasonOverallInputs(parsed.data.seasonNumber)
        const player = players.find(row => row.playerId === parsed.data.playerId)
        if (!player) return Err({ message: 'Player has no overall data for this season', code: 'NOT_FOUND' })
        return generatePlayerCard(supabase, { seasonNumber: parsed.data.seasonNumber, groupId: parsed.data.groupId, player })
    } catch (error) {
        return Err(serializeError(error))
    }
}

import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getOverallConfig } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardLayer, CardOverrides } from '../types'
import { buildCardData } from '../helpers/buildCardData'
import { renderCardPreview } from '../helpers/renderCardPreview'

export async function previewPlayerCard(
    supabase: DBClient,
    p: { seasonNumber: number; templateId: string; layers: CardLayer[]; player: OverallInputRow; overrides?: CardOverrides },
): Promise<Result<string>> {
    try {
        const config = await getOverallConfig(supabase, p.seasonNumber)
        if (!config.ok) return config

        return await renderCardPreview(supabase, {
            templateId: p.templateId,
            layers: p.layers,
            avatarUrl: p.player.avatarUrl,
            teamLogoUrl: p.player.teamLogoUrl,
            data: buildCardData(p.player, config.value, p.seasonNumber, p.overrides),
        })
    } catch (error) {
        logger.error({ error }, 'previewPlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}

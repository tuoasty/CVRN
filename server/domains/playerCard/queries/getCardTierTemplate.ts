import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findCardGroupById, findCardTemplateById } from '@/server/db/playerCards.repo'
import { CardData, CardTemplate } from '../types'
import { toCardTemplate } from '../helpers/toCardShapes'
import { loadTemplateArt } from '../helpers/loadTemplateArt'
import { loadCardFonts } from '../helpers/cardFont'
import { renderCard } from '../helpers/renderCard'

const NO_DATA: CardData = {
    username: '',
    displayName: null,
    ovr: 1,
    position: null,
    teamName: null,
    season: '',
    attributes: { scoring: 1, spiking: 1, setting: 1, blocking: 1, receiving: 1, serving: 1 },
}

function slug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function cardTemplateFileName(groupName: string, tierName: string): string {
    return [slug(groupName), slug(tierName), 'template'].filter(Boolean).join('-') + '.png'
}

export async function getCardTierTemplate(
    supabase: DBClient,
    templateId: string,
): Promise<Result<{ fileName: string; dataUri: string }>> {
    try {
        const tier = await findCardTemplateById(supabase, templateId)
        if (!tier.ok) return tier
        if (!tier.value) return Err({ message: 'Card tier not found', code: 'NOT_FOUND' })

        const group = await findCardGroupById(supabase, tier.value.group_id)
        if (!group.ok) return group
        if (!group.value) return Err({ message: 'Card group not found', code: 'NOT_FOUND' })

        const parsed = toCardTemplate(tier.value, group.value)
        if (!parsed.ok) return parsed

        const artLayer = parsed.value.layers.find(layer => layer.kind === 'art')
        if (artLayer?.kind !== 'art') {
            return Err({ message: `The ${group.value.name} layout has no art layer`, code: 'VALIDATION_ERROR' })
        }

        const template: CardTemplate = {
            ...parsed.value,
            layers: [{ kind: 'art', src: artLayer.src, x: 0, y: 0, w: parsed.value.width, h: parsed.value.height }],
        }

        const art = await loadTemplateArt(template, { cached: false, allowMissing: false })
        if (!art.ok) return art

        const fonts = await loadCardFonts()
        if (!fonts.ok) return fonts

        const png = await renderCard(template, NO_DATA, { art: art.value, headshot: null, teamLogo: null }, fonts.value)

        return Ok({
            fileName: cardTemplateFileName(group.value.name, tier.value.name),
            dataUri: `data:image/png;base64,${png.toString('base64')}`,
        })
    } catch (error) {
        logger.error({ error }, 'getCardTierTemplate: unexpected error')
        return Err(serializeError(error))
    }
}

import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findCardGroups, findCardTemplates } from '@/server/db/playerCards.repo'
import { CardGroup } from '../types'
import { firstArtSrc, toCardGroup } from '../helpers/toCardShapes'
import { resolveTemplateArtUrls } from '../helpers/templateArtStorage'

export async function getCardCatalog(supabase: DBClient): Promise<Result<CardGroup[]>> {
    try {
        const [groups, templates] = await Promise.all([findCardGroups(supabase), findCardTemplates(supabase)])
        if (!groups.ok) return groups
        if (!templates.ok) return templates

        const thumbSrc = new Map(groups.value.map(g => [g.id, firstArtSrc(g)]))
        const thumbs = new Map(await Promise.all(templates.value.map(async tier => {
            const src = thumbSrc.get(tier.group_id)
            if (!src) return [tier.id, null] as const
            const urls = await resolveTemplateArtUrls(tier.id, [src])
            return [tier.id, urls.ok ? urls.value[src] : null] as const
        })))

        return Ok(groups.value.map(group => toCardGroup(group, templates.value, id => thumbs.get(id) ?? null)))
    } catch (error) {
        return Err(serializeError(error))
    }
}

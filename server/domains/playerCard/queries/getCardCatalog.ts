import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findCardGroups, findCardTemplates } from '@/server/db/playerCards.repo'
import { CardGroup } from '../types'
import { toCardGroup } from '../helpers/toCardShapes'
import { listTemplateArt } from '../helpers/templateArtStorage'

export async function getCardCatalog(supabase: DBClient): Promise<Result<CardGroup[]>> {
    try {
        const [groups, templates] = await Promise.all([findCardGroups(supabase), findCardTemplates(supabase)])
        if (!groups.ok) return groups
        if (!templates.ok) return templates

        const art = new Map(await Promise.all(templates.value.map(async tier => {
            const files = await listTemplateArt(tier.id)
            return [tier.id, files.ok ? files.value : []] as const
        })))

        return Ok(groups.value.map(group => toCardGroup(group, templates.value, id => art.get(id) ?? [])))
    } catch (error) {
        return Err(serializeError(error))
    }
}

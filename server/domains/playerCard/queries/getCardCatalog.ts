import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { BUCKETS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { findCardGroups, findCardTemplates } from '@/server/db/playerCards.repo'
import { CardGroup } from '../types'
import { toCardGroup } from '../helpers/toCardShapes'

export async function getCardCatalog(supabase: DBClient): Promise<Result<CardGroup[]>> {
    try {
        const [groups, templates] = await Promise.all([findCardGroups(supabase), findCardTemplates(supabase)])
        if (!groups.ok) return groups
        if (!templates.ok) return templates
        const toPublicUrl = (location: { url: string } | { path: string }) =>
            'url' in location
                ? location.url
                : toCdnUrl(supabase.storage.from(BUCKETS.PUBLIC).getPublicUrl(location.path).data.publicUrl)
        return Ok(groups.value.map(group => toCardGroup(group, templates.value, toPublicUrl)))
    } catch (error) {
        return Err(serializeError(error))
    }
}

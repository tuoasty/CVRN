import { Err, Ok, Result } from '@/shared/types/result'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { CardTemplate } from '../types'
import { resolveArtLocation } from './toCardShapes'
import { loadImageAsPngDataUri, loadImageCached } from './loadImage'

export async function loadTemplateArt(template: CardTemplate, opts: { cached: boolean }): Promise<Result<Record<string, string>>> {
    const storage = getSupabaseAdmin().storage.from(BUCKETS.PUBLIC)
    const load = opts.cached ? loadImageCached : loadImageAsPngDataUri

    const art: Record<string, string> = {}
    for (const layer of template.layers) {
        if (layer.kind !== 'art' || layer.src in art) continue
        const location = resolveArtLocation(layer.src, template.groupSlug, template.tier)
        const url = 'url' in location ? location.url : toCdnUrl(storage.getPublicUrl(location.path).data.publicUrl)
        const loaded = await load(url)
        if (!loaded.ok) return Err({ message: `Card template art could not be loaded: ${layer.src}`, code: 'INTEGRATION_ERROR' })
        art[layer.src] = loaded.value
    }
    return Ok(art)
}

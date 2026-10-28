import { Err, Ok, Result } from '@/shared/types/result'
import { CardTemplate } from '../types'
import { loadImageAsPngDataUri, loadImageCached } from './loadImage'
import { resolveTemplateArtUrls } from './templateArtStorage'

export async function loadTemplateArt(template: CardTemplate, opts: { cached: boolean }): Promise<Result<Record<string, string>>> {
    const load = opts.cached ? loadImageCached : loadImageAsPngDataUri
    const srcs = [...new Set(template.layers.flatMap(layer => (layer.kind === 'art' ? [layer.src] : [])))]
    if (srcs.length === 0) return Ok({})

    const urls = await resolveTemplateArtUrls(template.id, srcs)
    if (!urls.ok) return urls

    const art: Record<string, string> = {}
    for (const src of srcs) {
        const url = urls.value[src]
        if (!url) return Err({ message: `Tier ${template.name} has no art file "${src}" in its folder`, code: 'NOT_FOUND' })
        const loaded = await load(url)
        if (!loaded.ok) return Err({ message: `Card template art could not be loaded: ${src}`, code: 'INTEGRATION_ERROR' })
        art[src] = loaded.value
    }
    return Ok(art)
}

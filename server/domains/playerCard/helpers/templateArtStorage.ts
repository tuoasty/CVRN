import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { ArtLocation, isBareArtSrc, resolveArtLocation, withArtVersion } from './toCardShapes'

export interface StoredArtFile {
    name: string
    size: number
    uploadedAt: string | null
    version: number
}

function artBucket() {
    return getSupabaseAdmin().storage.from(BUCKETS.PUBLIC)
}

export function publicArtUrl(location: ArtLocation): string {
    return 'url' in location ? location.url : toCdnUrl(artBucket().getPublicUrl(location.path).data.publicUrl)
}

export async function listTemplateArtFiles(templateId: string): Promise<Result<StoredArtFile[]>> {
    const { data, error } = await artBucket().list(STORAGE_PATHS.cardTemplateFolder(templateId), {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
    })
    if (error) return Err(serializeError(error, 'INTEGRATION_ERROR'))
    return Ok((data ?? [])
        .filter(o => o.id !== null && !o.name.startsWith('.'))
        .map(o => {
            const changed = o.updated_at ?? o.created_at ?? null
            return {
                name: o.name,
                size: Number((o.metadata as { size?: number } | null)?.size ?? 0),
                uploadedAt: changed,
                version: changed ? Date.parse(changed) : 0,
            }
        }))
}

export async function resolveTemplateArtUrls(templateId: string, srcs: string[]): Promise<Result<Record<string, string | null>>> {
    const files = srcs.some(isBareArtSrc) ? await listTemplateArtFiles(templateId) : Ok<StoredArtFile[]>([])
    if (!files.ok) return files
    const versions = new Map(files.value.map(f => [f.name, f.version]))

    const urls: Record<string, string | null> = {}
    for (const src of srcs) {
        const url = publicArtUrl(resolveArtLocation(src, templateId))
        if (!isBareArtSrc(src)) urls[src] = url
        else urls[src] = versions.has(src) ? withArtVersion(url, versions.get(src)) : null
    }
    return Ok(urls)
}

export async function removeTemplateArtFolder(templateId: string): Promise<Result<null>> {
    const files = await listTemplateArtFiles(templateId)
    if (!files.ok) return files
    if (files.value.length === 0) return Ok(null)
    const { error } = await artBucket().remove(files.value.map(f => STORAGE_PATHS.cardTemplateAsset(templateId, f.name)))
    if (error) return Err(serializeError(error, 'INTEGRATION_ERROR'))
    return Ok(null)
}

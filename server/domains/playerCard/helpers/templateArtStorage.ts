import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { CardArtFile } from '../types'
import { withArtVersion } from './toCardShapes'

export interface StoredArtFile {
    name: string
    size: number
    uploadedAt: string | null
    version: number
}

const LISTING_TTL_MS = 30 * 24 * 60 * 60 * 1000
const LISTING_MAX_ENTRIES = 40

const listings = new Map<string, { at: number; files: StoredArtFile[] }>()

function rememberListing(templateId: string, files: StoredArtFile[]) {
    listings.delete(templateId)
    listings.set(templateId, { at: Date.now(), files })
    while (listings.size > LISTING_MAX_ENTRIES) {
        const oldest = listings.keys().next().value
        if (oldest === undefined) break
        listings.delete(oldest)
    }
}

function artBucket() {
    return getSupabaseAdmin().storage.from(BUCKETS.PUBLIC)
}

function publicArtUrl(templateId: string, file: string): string {
    return toCdnUrl(artBucket().getPublicUrl(STORAGE_PATHS.cardTemplateAsset(templateId, file)).data.publicUrl)
}

export async function listTemplateArtFiles(templateId: string): Promise<Result<StoredArtFile[]>> {
    const { data, error } = await artBucket().list(STORAGE_PATHS.cardTemplateFolder(templateId), {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
    })
    if (error) return Err(serializeError(error, 'INTEGRATION_ERROR'))
    const files = (data ?? [])
        .filter(o => o.id !== null && !o.name.startsWith('.'))
        .map(o => {
            const changed = o.updated_at ?? o.created_at ?? null
            return {
                name: o.name,
                size: Number((o.metadata as { size?: number } | null)?.size ?? 0),
                uploadedAt: changed,
                version: changed ? Date.parse(changed) : 0,
            }
        })
    rememberListing(templateId, files)
    return Ok(files)
}

export function forgetTemplateArtListing(templateId: string) {
    listings.delete(templateId)
}

export async function listTemplateArt(templateId: string): Promise<Result<CardArtFile[]>> {
    const files = await listTemplateArtFiles(templateId)
    if (!files.ok) return files
    return Ok(files.value.map(file => ({
        name: file.name,
        size: file.size,
        url: withArtVersion(publicArtUrl(templateId, file.name), file.version),
    })))
}

async function readArtListing(templateId: string, required: string[], cached: boolean): Promise<Result<StoredArtFile[]>> {
    const hit = cached ? listings.get(templateId) : undefined
    const usable = hit
        && Date.now() - hit.at < LISTING_TTL_MS
        && required.every(name => hit.files.some(f => f.name === name))
    return usable ? Ok(hit.files) : listTemplateArtFiles(templateId)
}

export async function resolveTemplateArtUrls(
    templateId: string,
    srcs: string[],
    opts: { cached?: boolean } = {},
): Promise<Result<Record<string, string | null>>> {
    const files = srcs.length > 0 ? await readArtListing(templateId, srcs, opts.cached ?? false) : Ok<StoredArtFile[]>([])
    if (!files.ok) return files
    const versions = new Map(files.value.map(f => [f.name, f.version]))

    const urls: Record<string, string | null> = {}
    for (const src of srcs) {
        urls[src] = versions.has(src) ? withArtVersion(publicArtUrl(templateId, src), versions.get(src)) : null
    }
    return Ok(urls)
}

export async function removeTemplateArtFolder(templateId: string): Promise<Result<null>> {
    const files = await listTemplateArtFiles(templateId)
    if (!files.ok) return files
    if (files.value.length === 0) return Ok(null)
    const { error } = await artBucket().remove(files.value.map(f => STORAGE_PATHS.cardTemplateAsset(templateId, f.name)))
    if (error) return Err(serializeError(error, 'INTEGRATION_ERROR'))
    listings.delete(templateId)
    return Ok(null)
}

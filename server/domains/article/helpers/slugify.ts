import { randomUUID } from 'node:crypto'
import { DBClient } from '@/shared/types/db'
import { findArticleSlugExists } from '@/server/db/article.repo'

export function slugify(input: string): string {
    const base = input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
    return base || 'article'
}

export async function generateUniqueSlug(supabase: DBClient, title: string): Promise<string> {
    const base = slugify(title)
    const exists = await findArticleSlugExists(supabase, base)
    if (exists.ok && !exists.value) return base
    return `${base}-${randomUUID().slice(0, 8)}`
}

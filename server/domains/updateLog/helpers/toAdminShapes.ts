import { UpdateLog, UpdateLogImage } from '@/shared/types/db'
import { UpdateLogAdminDetail, UpdateLogAdminImage, UpdateLogImageRef, UpdateLogListItem } from '../types'

export function toUpdateLogListItem(row: UpdateLog): UpdateLogListItem {
    return {
        id:           row.id,
        version:      row.version,
        title:        row.title,
        released_at:  row.released_at,
        published_at: row.published_at,
        created_at:   row.created_at,
        updated_at:   row.updated_at,
    }
}

export function toUpdateLogAdminDetail(row: UpdateLog): UpdateLogAdminDetail {
    return { ...toUpdateLogListItem(row), body: row.body }
}

export function toUpdateLogAdminImage(row: UpdateLogImage): UpdateLogAdminImage {
    return { id: row.id, name: row.handle, url: row.url, caption: row.caption ?? null }
}

export function toUpdateLogImageRef(row: UpdateLogImage): UpdateLogImageRef {
    return { name: row.handle, url: row.url, caption: row.caption ?? null }
}
